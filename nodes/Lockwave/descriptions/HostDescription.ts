import { INodeProperties } from 'n8n-workflow';

export const hostOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['host'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List all hosts in the team',
				action: 'List hosts',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific host by ID',
				action: 'Get host',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new host',
				action: 'Create host',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a host',
				action: 'Update host',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a host',
				action: 'Delete host',
			},
		],
		default: 'getAll',
	},
];

export const hostFields: INodeProperties[] = [
	{
		displayName: 'Host ID',
		name: 'hostId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['host'],
				operation: ['get', 'update', 'delete'],
			},
		},
		description: 'The UUID of the host',
	},
	// --- CREATE ---
	{
		displayName: 'Display Name',
		name: 'displayName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['host'],
				operation: ['create'],
			},
		},
		description: 'A human-readable name for the host (e.g. "web-01")',
	},
	{
		displayName: 'Hostname',
		name: 'hostname',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['host'],
				operation: ['create'],
			},
		},
		description: 'The FQDN or IP address of the host',
	},
	{
		displayName: 'OS',
		name: 'os',
		type: 'options',
		required: true,
		default: 'linux',
		displayOptions: {
			show: {
				resource: ['host'],
				operation: ['create'],
			},
		},
		options: [
			{ name: 'Linux', value: 'linux' },
			{ name: 'macOS / Darwin', value: 'darwin' },
			{ name: 'FreeBSD', value: 'freebsd' },
		],
	},
	{
		displayName: 'Architecture',
		name: 'arch',
		type: 'options',
		default: 'amd64',
		displayOptions: {
			show: {
				resource: ['host'],
				operation: ['create'],
			},
		},
		options: [
			{ name: 'amd64 (x86_64)', value: 'amd64' },
			{ name: 'arm64 (aarch64)', value: 'aarch64' },
		],
	},
	// --- UPDATE ---
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['host'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Display Name',
				name: 'display_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Hostname',
				name: 'hostname',
				type: 'string',
				default: '',
			},
			{
				displayName: 'OS',
				name: 'os',
				type: 'options',
				default: 'linux',
				options: [
					{ name: 'Linux', value: 'linux' },
					{ name: 'macOS / Darwin', value: 'darwin' },
					{ name: 'FreeBSD', value: 'freebsd' },
				],
			},
		],
	},
	// --- PAGINATION ---
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['host'],
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
				resource: ['host'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	},
];
