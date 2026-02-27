import { INodeProperties } from 'n8n-workflow';

export const assignmentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['assignment'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List all key-to-host assignments in the team',
				action: 'List assignments',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific assignment by ID',
				action: 'Get assignment',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Assign an SSH key to a host user',
				action: 'Create assignment',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an assignment (revoke access)',
				action: 'Delete assignment',
			},
		],
		default: 'getAll',
	},
];

export const assignmentFields: INodeProperties[] = [
	{
		displayName: 'Assignment ID',
		name: 'assignmentId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['assignment'],
				operation: ['get', 'delete'],
			},
		},
		description: 'The UUID of the assignment',
	},
	// --- CREATE ---
	{
		displayName: 'SSH Key ID',
		name: 'sshKeyId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['assignment'],
				operation: ['create'],
			},
		},
		description: 'The UUID of the SSH key to assign',
	},
	{
		displayName: 'Host User ID',
		name: 'hostUserId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['assignment'],
				operation: ['create'],
			},
		},
		description: 'The UUID of the host user (OS user on a specific host)',
	},
	{
		displayName: 'Expires At',
		name: 'expiresAt',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				resource: ['assignment'],
				operation: ['create'],
			},
		},
		description: 'Optional expiration date for the assignment (ISO 8601). Leave blank for permanent.',
	},
	// --- PAGINATION ---
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['assignment'],
				operation: ['getAll'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 100 },
		default: 25,
		displayOptions: {
			show: {
				resource: ['assignment'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	},
];
