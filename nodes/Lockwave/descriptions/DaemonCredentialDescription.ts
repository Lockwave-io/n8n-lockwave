import { INodeProperties } from 'n8n-workflow';

export const daemonCredentialOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['daemonCredential'],
			},
		},
		options: [
			{
				name: 'Rotate',
				value: 'rotate',
				description: 'Rotate the daemon credentials for a host',
				action: 'Rotate daemon credentials',
			},
		],
		default: 'rotate',
	},
];

export const daemonCredentialFields: INodeProperties[] = [
	{
		displayName: 'Host ID',
		name: 'hostId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['daemonCredential'],
				operation: ['rotate'],
			},
		},
		description: 'The UUID of the host whose daemon credentials to rotate',
	},
];
