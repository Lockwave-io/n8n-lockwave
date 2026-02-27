import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class LockwaveApi implements ICredentialType {
	name = 'lockwaveApi';
	displayName = 'Lockwave API';
	documentationUrl = 'https://lockwave.io/docs#api';

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Create an API token from Profile → API Tokens in the Lockwave dashboard',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://lockwave.io',
			required: true,
			description: 'The base URL of your Lockwave instance (no trailing slash)',
		},
		{
			displayName: 'Team ID',
			name: 'teamId',
			type: 'string',
			default: '',
			description:
				'Optional default team UUID. If set, all requests include the X-Team-Id header. Leave blank to use your current team.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiToken}}',
				Accept: 'application/json',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v1/user',
			method: 'GET',
		},
	};
}
