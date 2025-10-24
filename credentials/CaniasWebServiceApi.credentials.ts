import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CaniasWebServiceApi implements ICredentialType {
	name = 'caniasWebServiceApi';

	displayName = 'CANIAS WebService API';

	documentationUrl = 'https://github.com/bymcs/n8n-nodes-caniaswebservice';

	properties: INodeProperties[] = [
		{
			displayName: 'WSDL URL',
			name: 'wsdlUrl',
			type: 'string',
			default: 'http://your-canias-server:8080/CaniasWS-v1/services/iasWebService?wsdl',
			required: true,
			description: 'WSDL endpoint for the CANIAS IAS service',
		},
		{
			displayName: 'Client',
			name: 'client',
			type: 'string',
			default: '00',
			required: true,
			description: 'CANIAS client number',
		},
		{
			displayName: 'Language',
			name: 'language',
			type: 'string',
			default: 'T',
			required: true,
			description: 'Language code (e.g. T for Turkish, E for English)',
		},
		{
			displayName: 'DB Name',
			name: 'dbName',
			type: 'string',
			default: 'IAS803RDB',
			required: true,
			description: 'Database name',
		},
		{
			displayName: 'DB Server',
			name: 'dbServer',
			type: 'string',
			default: 'CANIAS',
			required: true,
			description: 'Database server name',
		},
		{
			displayName: 'App Server',
			name: 'appServer',
			type: 'string',
			default: 'your-canias-server:27499',
			required: true,
			description: 'Application server address with port',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: 'IASSETUP',
			required: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {},
	};

	test: ICredentialTestRequest = {
		request: {
			method: 'GET',
			url: '={{$credentials.wsdlUrl}}',
		},
	};
}
