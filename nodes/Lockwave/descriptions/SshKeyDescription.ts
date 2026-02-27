import { INodeProperties } from 'n8n-workflow';

export const sshKeyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['sshKey'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List all SSH keys in the team',
				action: 'List SSH keys',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific SSH key by ID',
				action: 'Get SSH key',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Import or generate an SSH key',
				action: 'Create SSH key',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an SSH key name or comment',
				action: 'Update SSH key',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Soft-delete an SSH key',
				action: 'Delete SSH key',
			},
			{
				name: 'Block',
				value: 'block',
				description: 'Block an SSH key from being deployed',
				action: 'Block SSH key',
			},
			{
				name: 'Unblock',
				value: 'unblock',
				description: 'Unblock a previously blocked SSH key',
				action: 'Unblock SSH key',
			},
		],
		default: 'getAll',
	},
];

export const sshKeyFields: INodeProperties[] = [
	// --- GET ---
	{
		displayName: 'SSH Key ID',
		name: 'sshKeyId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['sshKey'],
				operation: ['get', 'update', 'delete', 'block', 'unblock'],
			},
		},
		description: 'The UUID of the SSH key',
	},
	// --- CREATE ---
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['sshKey'],
				operation: ['create'],
			},
		},
		description: 'A descriptive name for the SSH key',
	},
	{
		displayName: 'Mode',
		name: 'mode',
		type: 'options',
		required: true,
		default: 'import',
		displayOptions: {
			show: {
				resource: ['sshKey'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Import',
				value: 'import',
				description: 'Import an existing public key',
			},
			{
				name: 'Generate',
				value: 'generate',
				description: 'Generate a new key pair server-side',
			},
		],
	},
	{
		displayName: 'Public Key',
		name: 'publicKey',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['sshKey'],
				operation: ['create'],
				mode: ['import'],
			},
		},
		description: 'The OpenSSH public key string (e.g. ssh-ed25519 AAAA...)',
	},
	{
		displayName: 'Key Type',
		name: 'keyType',
		type: 'options',
		required: true,
		default: 'ed25519',
		displayOptions: {
			show: {
				resource: ['sshKey'],
				operation: ['create'],
				mode: ['generate'],
			},
		},
		options: [
			{ name: 'Ed25519 (Recommended)', value: 'ed25519' },
			{ name: 'RSA 4096', value: 'rsa' },
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
				resource: ['sshKey'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'New name for the SSH key',
			},
			{
				displayName: 'Comment',
				name: 'comment',
				type: 'string',
				default: '',
				description: 'New comment for the SSH key',
			},
		],
	},
	// --- BLOCK ---
	{
		displayName: 'Block Options',
		name: 'blockOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['sshKey'],
				operation: ['block'],
			},
		},
		options: [
			{
				displayName: 'Block Indefinitely',
				name: 'blockedIndefinite',
				type: 'boolean',
				default: true,
				description: 'Whether to block the key indefinitely',
			},
			{
				displayName: 'Block Until',
				name: 'blockedUntil',
				type: 'dateTime',
				default: '',
				description: 'Block the key until this date/time (ISO 8601)',
			},
			{
				displayName: 'Reason',
				name: 'reason',
				type: 'string',
				default: '',
				description: 'Reason for blocking the key',
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
				resource: ['sshKey'],
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
				resource: ['sshKey'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	},
];
