import { INodeProperties } from 'n8n-workflow';

export const enrollmentTokenOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['enrollmentToken'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an enrollment token for a host',
				action: 'Create enrollment token',
			},
		],
		default: 'create',
	},
];

export const enrollmentTokenFields: INodeProperties[] = [
	{
		displayName: 'Host ID',
		name: 'hostId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['enrollmentToken'],
				operation: ['create'],
			},
		},
		description: 'The UUID of the host to generate an enrollment token for',
	},
];
