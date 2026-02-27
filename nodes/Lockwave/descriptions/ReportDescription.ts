import { INodeProperties } from 'n8n-workflow';

export const reportOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['report'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List all compliance reports',
				action: 'List reports',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Request a new compliance report',
				action: 'Create report',
			},
			{
				name: 'Download',
				value: 'download',
				description: 'Download a completed report file',
				action: 'Download report',
			},
		],
		default: 'getAll',
	},
];

export const reportFields: INodeProperties[] = [
	// --- CREATE ---
	{
		displayName: 'Report Type',
		name: 'reportType',
		type: 'options',
		required: true,
		default: 'team_access',
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Team Access',
				value: 'team_access',
				description: 'Report of all key assignments across the team',
			},
			{
				name: 'Host Access',
				value: 'host_access',
				description: 'Report of all keys assigned per host',
			},
			{
				name: 'Audit Log',
				value: 'audit_log',
				description: 'Export of the team audit log',
			},
		],
	},
	{
		displayName: 'Format',
		name: 'format',
		type: 'options',
		required: true,
		default: 'csv',
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['create'],
			},
		},
		options: [
			{ name: 'CSV', value: 'csv' },
		],
	},
	// --- DOWNLOAD ---
	{
		displayName: 'Report ID',
		name: 'reportId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['report'],
				operation: ['download'],
			},
		},
		description: 'The UUID of the report to download',
	},
	// --- PAGINATION ---
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['report'],
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
				resource: ['report'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	},
];
