import { INodeProperties } from 'n8n-workflow';

export const hostUserOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['hostUser'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List OS users for a host',
				action: 'List host users',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new OS user on a host',
				action: 'Create host user',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an OS user',
				action: 'Update host user',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an OS user from a host',
				action: 'Delete host user',
			},
		],
		default: 'getAll',
	},
];

export const hostUserFields: INodeProperties[] = [
	{
		displayName: 'Host ID',
		name: 'hostId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['hostUser'],
			},
		},
		description: 'The UUID of the parent host',
	},
	{
		displayName: 'Host User ID',
		name: 'hostUserId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['hostUser'],
				operation: ['update', 'delete'],
			},
		},
		description: 'The UUID of the host user',
	},
	// --- CREATE ---
	{
		displayName: 'OS User',
		name: 'osUser',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['hostUser'],
				operation: ['create'],
			},
		},
		description: 'The OS username (e.g. "deploy", "ubuntu", "root")',
	},
	{
		displayName: 'Authorized Keys Path',
		name: 'authorizedKeysPath',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['hostUser'],
				operation: ['create', 'update'],
			},
		},
		description: 'Custom path to the authorized_keys file. Leave blank for default.',
	},
	// --- PAGINATION ---
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['hostUser'],
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
				resource: ['hostUser'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	},
];
