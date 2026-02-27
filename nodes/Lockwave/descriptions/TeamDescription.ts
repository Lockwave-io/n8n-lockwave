import { INodeProperties } from 'n8n-workflow';

export const teamOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['team'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List all teams the user belongs to',
				action: 'List teams',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific team by ID',
				action: 'Get team',
			},
		],
		default: 'getAll',
	},
];

export const teamFields: INodeProperties[] = [
	{
		displayName: 'Team ID',
		name: 'teamId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['team'],
				operation: ['get'],
			},
		},
		description: 'The UUID of the team to retrieve',
	},
];
