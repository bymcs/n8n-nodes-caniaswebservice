import * as soap from 'soap';
import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import type {
	CallArgsMode,
	ICANIASClient,
	ICallIASServiceResponse,
	IListIASServicesResponse,
	ILoginResponse,
	IParsedListServicesResult,
	IParsedLoginResult,
	IParsedLogoutResult,
	OperationType,
} from './types';
import { handleSOAPError, validateServiceId, validateSessionId } from './errorHandling';

// ============================================================================
// RESPONSE PARSING HELPERS
// ============================================================================

/**
 * Parse login response (Axis 1.4 rpc/encoded format)
 */
function parseLoginResponse(res: ILoginResponse): IParsedLoginResult {
	if (res && typeof res === 'object' && 'loginReturn' in res && res.loginReturn) {
		return { sessionId: res.loginReturn };
	}
	// Fallback for direct string response
	if (typeof res === 'string') {
		return { sessionId: res as any };
	}
	// If no session ID found, something is wrong
	throw new Error('Login failed: No session ID returned from server');
}

/**
 * Parse list services response (Axis 1.4 rpc/encoded format)
 */
function parseListServicesResponse(res: IListIASServicesResponse): IParsedListServicesResult {
	if (res && typeof res === 'object' && 'listIASServicesReturn' in res) {
		return { services: res.listIASServicesReturn ?? [] };
	}
	// Fallback for direct array response
	if (Array.isArray(res)) {
		return { services: res };
	}
	return { services: [] };
}

/**
 * Parse call service response (Axis 1.4 rpc/encoded format)
 */
function parseCallServiceResponse(res: ICallIASServiceResponse): any {
	if (res && typeof res === 'object' && 'callIASServiceReturn' in res) {
		return res.callIASServiceReturn;
	}
	// Return as-is for direct responses
	return res;
}

/**
 * Parse logout response
 */
function parseLogoutResponse(res: any): IParsedLogoutResult {
	return {
		success: true,
		response: res ?? null,
	};
}

export class CaniasWebService implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Canias WebService',
		name: 'caniasWebService',
		icon: { light: 'file:canias.png', dark: 'file:canias.png' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'CANIAS IAS SOAP WebService: login, callIASService, logout',
		defaults: {
			name: 'Canias WebService',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'caniasWebServiceApi',
				required: true,
			},
		],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Endpoint Override',
				name: 'endpoint',
				type: 'string',
				default: '',
				description:
					'Optional. Override the service endpoint URL if different from the WSDL binding address',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{ name: 'Login', value: 'login', description: 'Obtain a session ID' },
					{ name: 'List IAS Services', value: 'listIASServices', description: 'List available IAS services' },
					{ name: 'Call IAS Service', value: 'callIASService', description: 'Call a specific IAS service method' },
					{ name: 'Logout', value: 'logout', description: 'Terminate the session' },
				],
				default: 'login',
				required: true,
			},

			// listIASServices params
			{
				displayName: 'Session ID',
				name: 'listSessionId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['listIASServices'] } },
			},

			// callIASService params
			{
				displayName: 'Session ID',
				name: 'sessionid',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['callIASService'] } },
			},
			{
				displayName: 'Service ID',
				name: 'serviceid',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['callIASService'] } },
			},
			{
				displayName: 'Args Mode',
				name: 'argsMode',
				type: 'options',
				options: [
					{ name: 'Raw String', value: 'rawString' },
					{ name: 'JSON Object (stringified)', value: 'jsonString' },
				],
				default: 'rawString',
				displayOptions: { show: { operation: ['callIASService'] } },
				description:
					'How to provide the "args" parameter. Select JSON to build a JSON object that will be stringified.',
			},
			{
				displayName: 'Args (String)',
				name: 'argsRaw',
				type: 'string',
				default: '',
				displayOptions: { show: { operation: ['callIASService'], argsMode: ['rawString'] } },
				description: 'The args string passed to the service',
			},
			{
				displayName: 'Args (JSON)',
				name: 'argsJson',
				type: 'json',
				default: {},
				displayOptions: { show: { operation: ['callIASService'], argsMode: ['jsonString'] } },
				description: 'A JSON object that will be JSON.stringify-ed and sent as the "args" string',
			},
			{
				displayName: 'Return Type',
				name: 'returntype',
				type: 'string',
				default: 'json',
				required: true,
				displayOptions: { show: { operation: ['callIASService'] } },
				description: 'Desired return type as expected by the service (e.g. json, xml, string)',
			},
			{
				displayName: 'Permanent',
				name: 'permanent',
				type: 'boolean',
				default: false,
				displayOptions: { show: { operation: ['callIASService'] } },
				description: 'Whether the call should be treated as permanent by the service',
			},

			// logout params
			{
				displayName: 'Session ID',
				name: 'p_strSessionId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['logout'] } },
			},

			// Other options
			{
				displayName: 'Return Full Response',
				name: 'returnFull',
				type: 'boolean',
				default: false,
				description:
					'If true, returns { result, rawResponse, soapHeaders } instead of just the parsed result',
			},
			{
				displayName: 'Advanced',
				name: 'advanced',
				type: 'collection',
				default: {},
				placeholder: 'Advanced Options',
				options: [
					{
						displayName: 'Timeout (ms)',
						name: 'timeout',
						type: 'number',
						default: 120000,
						description: 'Request timeout in milliseconds',
					},
					{
						displayName: 'Disable SSL Verification',
						name: 'disableSslVerification',
						type: 'boolean',
						default: false,
						description: 'If enabled, SSL certificate errors will be ignored (not recommended for production)',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Get credentials once for all items
		const credentials = await this.getCredentials('caniasWebServiceApi');

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as OperationType;

			try {
				const wsdlUrl = credentials.wsdlUrl as string;
				const endpoint = this.getNodeParameter('endpoint', i, '') as string;
				const returnFull = this.getNodeParameter('returnFull', i, false) as boolean;
				const advanced = this.getNodeParameter('advanced', i, {}) as {
					timeout?: number;
					disableSslVerification?: boolean;
				};

				// Configure SOAP client options
				const clientOptions: any = {};
				if (advanced?.timeout) {
					clientOptions.timeout = advanced.timeout;
				}
				if (endpoint) {
					clientOptions.endpoint = endpoint;
				}
				if (advanced?.disableSslVerification) {
					// Disable SSL verification for self-signed certificates
					clientOptions.wsdl_options = {
						rejectUnauthorized: false,
					};
					clientOptions.request_options = {
						rejectUnauthorized: false,
					};
				}

				// Create typed SOAP client
				const client = (await soap.createClientAsync(wsdlUrl, clientOptions)) as ICANIASClient;

				// Execute operation and collect response
				let result: IParsedLoginResult | IParsedListServicesResult | any | IParsedLogoutResult;
				let rawResponse: string;
				let soapHeaders: Record<string, any>;

				if (operation === 'login') {
					// Login operation
					const [res, raw, headers] = await client.loginAsync({
						p_strClient: credentials.client as string,
						p_strLanguage: credentials.language as string,
						p_strDBName: credentials.dbName as string,
						p_strDBServer: credentials.dbServer as string,
						p_strAppServer: credentials.appServer as string,
						p_strUserName: credentials.username as string,
						p_strPassword: credentials.password as string,
					});

					rawResponse = raw;
					soapHeaders = headers;

					// Parse login response (Axis 1.4 rpc/encoded format)
					result = parseLoginResponse(res);
				} else if (operation === 'listIASServices') {
					// List IAS Services operation
					const sessionId = this.getNodeParameter('listSessionId', i) as string;
					validateSessionId(sessionId);

					const [res, raw, headers] = await client.listIASServicesAsync({
						p_strSessionId: sessionId,
					});

					rawResponse = raw;
					soapHeaders = headers;

					// Parse list services response
					result = parseListServicesResponse(res);
				} else if (operation === 'callIASService') {
					// Call IAS Service operation
					const sessionId = this.getNodeParameter('sessionid', i) as string;
					const serviceId = this.getNodeParameter('serviceid', i) as string;
					const returntype = this.getNodeParameter('returntype', i) as string;
					const permanent = this.getNodeParameter('permanent', i) as boolean;
					const argsMode = this.getNodeParameter('argsMode', i) as CallArgsMode;

					// Validate inputs
					validateSessionId(sessionId);
					validateServiceId(serviceId);

					// Prepare args parameter
					let args: string;
					if (argsMode === 'jsonString') {
						const argsJson = this.getNodeParameter('argsJson', i, {}) as object;
						args = JSON.stringify(argsJson ?? {});
					} else {
						args = this.getNodeParameter('argsRaw', i, '') as string;
					}

					const [res, raw, headers] = await client.callIASServiceAsync({
						sessionid: sessionId,
						serviceid: serviceId,
						args,
						returntype,
						permanent,
					});

					rawResponse = raw;
					soapHeaders = headers;

					// Parse call service response
					result = parseCallServiceResponse(res);
				} else if (operation === 'logout') {
					// Logout operation
					const sessionId = this.getNodeParameter('p_strSessionId', i) as string;
					validateSessionId(sessionId);

					const [res, raw, headers] = await client.logoutAsync({
						p_strSessionId: sessionId,
					});

					rawResponse = raw;
					soapHeaders = headers;

					// Parse logout response
					result = parseLogoutResponse(res);
				} else {
					// This should never happen due to TypeScript types, but added for safety
					throw new Error(`Unsupported operation: ${operation}`);
				}

				// Prepare output based on returnFull setting
				if (returnFull) {
					returnData.push({
						json: {
							result,
							rawResponse,
							soapHeaders,
						},
					});
				} else {
					// Return clean result
					if (['string', 'number', 'boolean'].includes(typeof result)) {
						returnData.push({ json: { data: result } });
					} else {
						returnData.push({ json: result ?? {} });
					}
				}
			} catch (error) {
				// Enhanced error handling with SOAP fault parsing
				handleSOAPError(error, this.getNode(), i, operation);
			}
		}

		return this.prepareOutputData(returnData);
	}
}