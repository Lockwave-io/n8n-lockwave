import { INodeProperties } from 'n8n-workflow';

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Get Current User',
				value: 'get',
				description: 'Get the authenticated user profile',
				action: 'Get authenticated user',
			},
		],
		default: 'get',
	},
];

export const userFields: INodeProperties[] = [];
