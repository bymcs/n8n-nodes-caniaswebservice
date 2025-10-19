import * as soap from 'soap';
import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

type CallArgsMode = 'rawString' | 'jsonString';

export class CaniasWebService implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Canias WebService',
		name: 'caniasWebService',
		icon: 'file:icons/canias.svg',
		group: ['transform'],
		version: 1,
		description: 'CANIAS IAS SOAP WebService: login, callIASService, logout',
		defaults: {
			name: 'Canias WebService',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'WSDL URL',
				name: 'wsdlUrl',
				type: 'string',
				default: 'http://your-canias-server:8080/CaniasWS-v1/services/iasWebService?wsdl',
				required: true,
				description: 'WSDL endpoint for the CANIAS IAS service',
			},
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

			// login params
			{
				displayName: 'Client',
				name: 'p_strClient',
				type: 'string',
				default: '00',
				required: true,
				displayOptions: { show: { operation: ['login'] } },
			},
			{
				displayName: 'Language',
				name: 'p_strLanguage',
				type: 'string',
				default: 'T',
				required: true,
				displayOptions: { show: { operation: ['login'] } },
			},
			{
				displayName: 'DB Name',
				name: 'p_strDBName',
				type: 'string',
				default: 'IAS803RDB',
				required: true,
				displayOptions: { show: { operation: ['login'] } },
			},
			{
				displayName: 'DB Server',
				name: 'p_strDBServer',
				type: 'string',
				default: 'CANIAS',
				required: true,
				displayOptions: { show: { operation: ['login'] } },
			},
			{
				displayName: 'App Server',
				name: 'p_strAppServer',
				type: 'string',
				default: 'your-canias-server:27499',
				required: true,
				displayOptions: { show: { operation: ['login'] } },
			},
			{
				displayName: 'Username',
				name: 'p_strUserName',
				type: 'string',
				default: 'IASSETUP',
				required: true,
				displayOptions: { show: { operation: ['login'] } },
			},
			{
				displayName: 'Password',
				name: 'p_strPassword',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				required: true,
				displayOptions: { show: { operation: ['login'] } },
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

		for (let i = 0; i < items.length; i++) {
			try {
				const wsdlUrl = this.getNodeParameter('wsdlUrl', i) as string;
				const endpoint = this.getNodeParameter('endpoint', i, '') as string;
				const operation = this.getNodeParameter('operation', i) as 'login' | 'listIASServices' | 'callIASService' | 'logout';
				const returnFull = this.getNodeParameter('returnFull', i, false) as boolean;
				const advanced = this.getNodeParameter('advanced', i, {}) as {
					timeout?: number;
					disableSslVerification?: boolean;
				};

				const clientOptions: Record<string, any> = {};
				if (advanced?.timeout) clientOptions.timeout = advanced.timeout;
				if (endpoint) clientOptions.endpoint = endpoint;
				if (advanced?.disableSslVerification) {
					// Disable SSL verification for this request only
					clientOptions.wsdl_options = { 
						rejectUnauthorized: false 
					};
					clientOptions.request_options = { 
						rejectUnauthorized: false 
					};
				}

				const client = await soap.createClientAsync(wsdlUrl, clientOptions);

				let result: any;
				let rawResponse: any;
				let soapHeaders: any;

				if (operation === 'login') {
					const p_strClient = this.getNodeParameter('p_strClient', i) as string;
					const p_strLanguage = this.getNodeParameter('p_strLanguage', i) as string;
					const p_strDBName = this.getNodeParameter('p_strDBName', i) as string;
					const p_strDBServer = this.getNodeParameter('p_strDBServer', i) as string;
					const p_strAppServer = this.getNodeParameter('p_strAppServer', i) as string;
					const p_strUserName = this.getNodeParameter('p_strUserName', i) as string;
					const p_strPassword = this.getNodeParameter('p_strPassword', i) as string;

					const [res, raw, headers] = await (client as any).loginAsync({
						p_strClient,
						p_strLanguage,
						p_strDBName,
						p_strDBServer,
						p_strAppServer,
						p_strUserName,
						p_strPassword,
					});

					rawResponse = raw;
					soapHeaders = headers;

					if (res && typeof res === 'object' && 'loginReturn' in res) {
						result = { sessionId: (res as any).loginReturn };
					} else if (typeof res === 'string') {
						result = { sessionId: res };
					} else {
						result = res;
					}
				} else if (operation === 'listIASServices') {
					const p_strSessionId = this.getNodeParameter('listSessionId', i) as string;

					const [res, raw, headers] = await (client as any).listIASServicesAsync({
						p_strSessionId,
					});

					rawResponse = raw;
					soapHeaders = headers;

					if (res && typeof res === 'object' && 'listIASServicesReturn' in res) {
						result = { services: (res as any).listIASServicesReturn };
					} else {
						result = res;
					}
				} else if (operation === 'callIASService') {
					const sessionid = this.getNodeParameter('sessionid', i) as string;
					const serviceid = this.getNodeParameter('serviceid', i) as string;
					const returntype = this.getNodeParameter('returntype', i) as string;
					const permanent = this.getNodeParameter('permanent', i) as boolean;
					const argsMode = this.getNodeParameter('argsMode', i) as CallArgsMode;

					let args: string;
					if (argsMode === 'jsonString') {
						const argsJson = this.getNodeParameter('argsJson', i, {}) as object;
						args = JSON.stringify(argsJson ?? {});
					} else {
						args = this.getNodeParameter('argsRaw', i, '') as string;
					}

					const [res, raw, headers] = await (client as any).callIASServiceAsync({
						sessionid,
						serviceid,
						args,
						returntype,
						permanent,
					});

					rawResponse = raw;
					soapHeaders = headers;

					if (res && typeof res === 'object' && 'callIASServiceReturn' in res) {
						result = (res as any).callIASServiceReturn;
					} else {
						result = res;
					}
				} else if (operation === 'logout') {
					const p_strSessionId = this.getNodeParameter('p_strSessionId', i) as string;

					const [res, raw, headers] = await (client as any).logoutAsync({
						p_strSessionId,
					});

					rawResponse = raw;
					soapHeaders = headers;

					result = { success: true, response: res ?? null };
				} else {
					throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, {
						itemIndex: i,
					});
				}

				if (returnFull) {
					returnData.push({
						json: {
							result,
							rawResponse,
							soapHeaders,
						},
					});
				} else {
					if (['string', 'number', 'boolean'].includes(typeof result)) {
						returnData.push({ json: { data: result } });
					} else {
						returnData.push({ json: result ?? {} });
					}
				}
			} catch (error) {
				throw new NodeOperationError(this.getNode(), (error as Error).message, {
					itemIndex: i,
				});
			}
		}

		return this.prepareOutputData(returnData);
	}
}