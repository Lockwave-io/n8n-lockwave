import { INodeProperties } from 'n8n-workflow';

export const breakGlassOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['breakGlass'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List break-glass events (active and history)',
				action: 'List break glass events',
			},
			{
				name: 'Activate',
				value: 'activate',
				description: 'Activate break-glass to freeze all SSH access',
				action: 'Activate break glass',
			},
			{
				name: 'Deactivate',
				value: 'deactivate',
				description: 'Deactivate a break-glass event to restore access',
				action: 'Deactivate break glass',
			},
		],
		default: 'getAll',
	},
];

export const breakGlassFields: INodeProperties[] = [
	// --- ACTIVATE ---
	{
		displayName: 'Scope Type',
		name: 'scopeType',
		type: 'options',
		required: true,
		default: 'team',
		displayOptions: {
			show: {
				resource: ['breakGlass'],
				operation: ['activate'],
			},
		},
		options: [
			{
				name: 'Team (All Hosts)',
				value: 'team',
				description: 'Freeze all SSH access across the entire team',
			},
			{
				name: 'Host',
				value: 'host',
				description: 'Freeze SSH access on a specific host',
			},
		],
	},
	{
		displayName: 'Host ID (Scope)',
		name: 'scopeId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['breakGlass'],
				operation: ['activate'],
				scopeType: ['host'],
			},
		},
		description: 'The UUID of the host to scope the break-glass to',
	},
	{
		displayName: 'Reason',
		name: 'reason',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['breakGlass'],
				operation: ['activate', 'deactivate'],
			},
		},
		description: 'Reason for activating or deactivating break-glass (recorded in audit log)',
	},
	// --- DEACTIVATE ---
	{
		displayName: 'Break Glass Event ID',
		name: 'breakGlassEventId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['breakGlass'],
				operation: ['deactivate'],
			},
		},
		description: 'The UUID of the break-glass event to deactivate',
	},
	// --- PAGINATION ---
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['breakGlass'],
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
				resource: ['breakGlass'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	},
];
