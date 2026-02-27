import { INodeProperties } from 'n8n-workflow';

export const auditEventOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['auditEvent'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List paginated audit events for the team',
				action: 'List audit events',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific audit event by ID',
				action: 'Get audit event',
			},
		],
		default: 'getAll',
	},
];

export const auditEventFields: INodeProperties[] = [
	{
		displayName: 'Audit Event ID',
		name: 'auditEventId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['auditEvent'],
				operation: ['get'],
			},
		},
		description: 'The UUID of the audit event',
	},
	// --- PAGINATION ---
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['auditEvent'],
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
				resource: ['auditEvent'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	},
];
