import type {
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CapitalComApi implements ICredentialType {
	name = 'capitalComApi';

	displayName = 'Capital.com (Unofficial) API';

	// eslint-disable-next-line n8n-nodes-base/cred-class-field-documentation-url-miscased -- community package uses a full HTTPS URL, not the main-repo camelCase key form
	documentationUrl = 'https://github.com/SimonTarara62/capitalcom-n8n';

	properties: INodeProperties[] = [
		{
			// eslint-disable-next-line n8n-nodes-base/cred-class-field-name-unsuffixed
			displayName:
				'Unofficial — not affiliated with Capital.com. This API key can place real trades; use a demo account while testing.',
			name: 'unofficialNotice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			options: [
				{ name: 'Demo', value: 'demo' },
				{ name: 'Live', value: 'live' },
			],
			default: 'demo',
			description: 'Which Capital.com environment to connect to',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'API key generated in your Capital.com account settings',
		},
		{
			displayName: 'Identifier',
			name: 'identifier',
			type: 'string',
			default: '',
			required: true,
			description: 'Your Capital.com login email',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'The custom password set for the API key',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{$credentials.environment === "live" ? "https://api-capital.backend-capital.com" : "https://demo-api-capital.backend-capital.com"}}',
			url: '/api/v1/session',
			method: 'POST',
			headers: { 'X-CAP-API-KEY': '={{$credentials.apiKey}}' },
			body: {
				identifier: '={{$credentials.identifier}}',
				password: '={{$credentials.password}}',
				encryptedPassword: false,
			},
		},
	};
}
