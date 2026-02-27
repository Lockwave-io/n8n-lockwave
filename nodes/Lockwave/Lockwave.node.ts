import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestMethods,
} from 'n8n-workflow';

import { userOperations, userFields } from './descriptions/UserDescription';
import { teamOperations, teamFields } from './descriptions/TeamDescription';
import { sshKeyOperations, sshKeyFields } from './descriptions/SshKeyDescription';
import { hostOperations, hostFields } from './descriptions/HostDescription';
import { hostUserOperations, hostUserFields } from './descriptions/HostUserDescription';
import { assignmentOperations, assignmentFields } from './descriptions/AssignmentDescription';
import { auditEventOperations, auditEventFields } from './descriptions/AuditEventDescription';
import { breakGlassOperations, breakGlassFields } from './descriptions/BreakGlassDescription';
import { reportOperations, reportFields } from './descriptions/ReportDescription';
import {
	enrollmentTokenOperations,
	enrollmentTokenFields,
} from './descriptions/EnrollmentTokenDescription';
import {
	daemonCredentialOperations,
	daemonCredentialFields,
} from './descriptions/DaemonCredentialDescription';

export class Lockwave implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Lockwave',
		name: 'lockwave',
		icon: 'file:lockwave.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage SSH keys, hosts, assignments, and access controls via the Lockwave API',
		defaults: {
			name: 'Lockwave',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'lockwaveApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Assignment', value: 'assignment' },
					{ name: 'Audit Event', value: 'auditEvent' },
					{ name: 'Break Glass', value: 'breakGlass' },
					{ name: 'Daemon Credential', value: 'daemonCredential' },
					{ name: 'Enrollment Token', value: 'enrollmentToken' },
					{ name: 'Host', value: 'host' },
					{ name: 'Host User', value: 'hostUser' },
					{ name: 'Report', value: 'report' },
					{ name: 'SSH Key', value: 'sshKey' },
					{ name: 'Team', value: 'team' },
					{ name: 'User', value: 'user' },
				],
				default: 'sshKey',
			},
			// Operations
			...userOperations,
			...teamOperations,
			...sshKeyOperations,
			...hostOperations,
			...hostUserOperations,
			...assignmentOperations,
			...auditEventOperations,
			...breakGlassOperations,
			...reportOperations,
			...enrollmentTokenOperations,
			...daemonCredentialOperations,
			// Fields
			...userFields,
			...teamFields,
			...sshKeyFields,
			...hostFields,
			...hostUserFields,
			...assignmentFields,
			...auditEventFields,
			...breakGlassFields,
			...reportFields,
			...enrollmentTokenFields,
			...daemonCredentialFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: any;

				// ─── USER ───
				if (resource === 'user') {
					if (operation === 'get') {
						responseData = await lockwaveRequest.call(this, 'GET', '/user');
					}
				}

				// ─── TEAM ───
				if (resource === 'team') {
					if (operation === 'getAll') {
						responseData = await handleGetAll.call(this, i, '/teams');
					}
					if (operation === 'get') {
						const teamId = this.getNodeParameter('teamId', i) as string;
						responseData = await lockwaveRequest.call(this, 'GET', `/teams/${teamId}`);
					}
				}

				// ─── SSH KEY ───
				if (resource === 'sshKey') {
					if (operation === 'getAll') {
						responseData = await handleGetAll.call(this, i, '/ssh-keys');
					}
					if (operation === 'get') {
						const id = this.getNodeParameter('sshKeyId', i) as string;
						responseData = await lockwaveRequest.call(this, 'GET', `/ssh-keys/${id}`);
					}
					if (operation === 'create') {
						const mode = this.getNodeParameter('mode', i) as string;
						const body: Record<string, any> = {
							name: this.getNodeParameter('name', i) as string,
							mode,
						};
						if (mode === 'import') {
							body.public_key = this.getNodeParameter('publicKey', i) as string;
						} else {
							body.key_type = this.getNodeParameter('keyType', i) as string;
						}
						responseData = await lockwaveRequest.call(this, 'POST', '/ssh-keys', body);
					}
					if (operation === 'update') {
						const id = this.getNodeParameter('sshKeyId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as Record<string, any>;
						responseData = await lockwaveRequest.call(
							this,
							'PATCH',
							`/ssh-keys/${id}`,
							updateFields,
						);
					}
					if (operation === 'delete') {
						const id = this.getNodeParameter('sshKeyId', i) as string;
						responseData = await lockwaveRequest.call(this, 'DELETE', `/ssh-keys/${id}`);
					}
					if (operation === 'block') {
						const id = this.getNodeParameter('sshKeyId', i) as string;
						const blockOptions = this.getNodeParameter('blockOptions', i) as Record<string, any>;
						const body: Record<string, any> = {};
						if (blockOptions.blockedIndefinite !== undefined) {
							body.blocked_indefinite = blockOptions.blockedIndefinite;
						}
						if (blockOptions.blockedUntil) {
							body.blocked_until = blockOptions.blockedUntil;
						}
						if (blockOptions.reason) {
							body.reason = blockOptions.reason;
						}
						responseData = await lockwaveRequest.call(
							this,
							'POST',
							`/ssh-keys/${id}/block`,
							body,
						);
					}
					if (operation === 'unblock') {
						const id = this.getNodeParameter('sshKeyId', i) as string;
						responseData = await lockwaveRequest.call(
							this,
							'POST',
							`/ssh-keys/${id}/unblock`,
						);
					}
				}

				// ─── HOST ───
				if (resource === 'host') {
					if (operation === 'getAll') {
						responseData = await handleGetAll.call(this, i, '/hosts');
					}
					if (operation === 'get') {
						const id = this.getNodeParameter('hostId', i) as string;
						responseData = await lockwaveRequest.call(this, 'GET', `/hosts/${id}`);
					}
					if (operation === 'create') {
						const body: Record<string, any> = {
							display_name: this.getNodeParameter('displayName', i) as string,
							hostname: this.getNodeParameter('hostname', i) as string,
							os: this.getNodeParameter('os', i) as string,
							arch: this.getNodeParameter('arch', i) as string,
						};
						responseData = await lockwaveRequest.call(this, 'POST', '/hosts', body);
					}
					if (operation === 'update') {
						const id = this.getNodeParameter('hostId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i) as Record<string, any>;
						responseData = await lockwaveRequest.call(
							this,
							'PATCH',
							`/hosts/${id}`,
							updateFields,
						);
					}
					if (operation === 'delete') {
						const id = this.getNodeParameter('hostId', i) as string;
						responseData = await lockwaveRequest.call(this, 'DELETE', `/hosts/${id}`);
					}
				}

				// ─── HOST USER ───
				if (resource === 'hostUser') {
					const hostId = this.getNodeParameter('hostId', i) as string;

					if (operation === 'getAll') {
						responseData = await handleGetAll.call(this, i, `/hosts/${hostId}/users`);
					}
					if (operation === 'create') {
						const body: Record<string, any> = {
							os_user: this.getNodeParameter('osUser', i) as string,
						};
						const authKeysPath = this.getNodeParameter('authorizedKeysPath', i) as string;
						if (authKeysPath) {
							body.authorized_keys_path = authKeysPath;
						}
						responseData = await lockwaveRequest.call(
							this,
							'POST',
							`/hosts/${hostId}/users`,
							body,
						);
					}
					if (operation === 'update') {
						const hostUserId = this.getNodeParameter('hostUserId', i) as string;
						const body: Record<string, any> = {};
						const authKeysPath = this.getNodeParameter('authorizedKeysPath', i) as string;
						if (authKeysPath) {
							body.authorized_keys_path = authKeysPath;
						}
						responseData = await lockwaveRequest.call(
							this,
							'PATCH',
							`/hosts/${hostId}/users/${hostUserId}`,
							body,
						);
					}
					if (operation === 'delete') {
						const hostUserId = this.getNodeParameter('hostUserId', i) as string;
						responseData = await lockwaveRequest.call(
							this,
							'DELETE',
							`/hosts/${hostId}/users/${hostUserId}`,
						);
					}
				}

				// ─── ASSIGNMENT ───
				if (resource === 'assignment') {
					if (operation === 'getAll') {
						responseData = await handleGetAll.call(this, i, '/assignments');
					}
					if (operation === 'get') {
						const id = this.getNodeParameter('assignmentId', i) as string;
						responseData = await lockwaveRequest.call(this, 'GET', `/assignments/${id}`);
					}
					if (operation === 'create') {
						const body: Record<string, any> = {
							ssh_key_id: this.getNodeParameter('sshKeyId', i) as string,
							host_user_id: this.getNodeParameter('hostUserId', i) as string,
						};
						const expiresAt = this.getNodeParameter('expiresAt', i) as string;
						if (expiresAt) {
							body.expires_at = expiresAt;
						}
						responseData = await lockwaveRequest.call(this, 'POST', '/assignments', body);
					}
					if (operation === 'delete') {
						const id = this.getNodeParameter('assignmentId', i) as string;
						responseData = await lockwaveRequest.call(this, 'DELETE', `/assignments/${id}`);
					}
				}

				// ─── AUDIT EVENT ───
				if (resource === 'auditEvent') {
					if (operation === 'getAll') {
						responseData = await handleGetAll.call(this, i, '/audit-events');
					}
					if (operation === 'get') {
						const id = this.getNodeParameter('auditEventId', i) as string;
						responseData = await lockwaveRequest.call(this, 'GET', `/audit-events/${id}`);
					}
				}

				// ─── BREAK GLASS ───
				if (resource === 'breakGlass') {
					if (operation === 'getAll') {
						responseData = await handleGetAll.call(this, i, '/break-glass');
					}
					if (operation === 'activate') {
						const body: Record<string, any> = {
							scope_type: this.getNodeParameter('scopeType', i) as string,
							reason: this.getNodeParameter('reason', i) as string,
						};
						const scopeType = body.scope_type;
						if (scopeType === 'host') {
							const scopeId = this.getNodeParameter('scopeId', i) as string;
							if (scopeId) {
								body.scope_id = scopeId;
							}
						}
						responseData = await lockwaveRequest.call(
							this,
							'POST',
							'/break-glass/activate',
							body,
						);
					}
					if (operation === 'deactivate') {
						const eventId = this.getNodeParameter('breakGlassEventId', i) as string;
						const body = {
							reason: this.getNodeParameter('reason', i) as string,
						};
						responseData = await lockwaveRequest.call(
							this,
							'POST',
							`/break-glass/${eventId}/deactivate`,
							body,
						);
					}
				}

				// ─── REPORT ───
				if (resource === 'report') {
					if (operation === 'getAll') {
						responseData = await handleGetAll.call(this, i, '/reports');
					}
					if (operation === 'create') {
						const body = {
							type: this.getNodeParameter('reportType', i) as string,
							format: this.getNodeParameter('format', i) as string,
						};
						responseData = await lockwaveRequest.call(this, 'POST', '/reports', body);
					}
					if (operation === 'download') {
						const id = this.getNodeParameter('reportId', i) as string;
						const binaryItem = await lockwaveRequestBinary.call(this, `/reports/${id}/download`);
						returnData.push(binaryItem);
						continue;
					}
				}

				// ─── ENROLLMENT TOKEN ───
				if (resource === 'enrollmentToken') {
					if (operation === 'create') {
						const hostId = this.getNodeParameter('hostId', i) as string;
						responseData = await lockwaveRequest.call(
							this,
							'POST',
							`/hosts/${hostId}/enrollment-tokens`,
						);
					}
				}

				// ─── DAEMON CREDENTIAL ───
				if (resource === 'daemonCredential') {
					if (operation === 'rotate') {
						const hostId = this.getNodeParameter('hostId', i) as string;
						responseData = await lockwaveRequest.call(
							this,
							'POST',
							`/hosts/${hostId}/credentials/rotate`,
						);
					}
				}

				// Normalize response into items
				if (responseData !== undefined) {
					if (Array.isArray(responseData)) {
						returnData.push(
							...responseData.map((item) => ({ json: item } as INodeExecutionData)),
						);
					} else {
						returnData.push({ json: responseData } as INodeExecutionData);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: i });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

// ─── Helpers ───

async function lockwaveRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: Record<string, any>,
	qs?: Record<string, any>,
): Promise<any> {
	const credentials = await this.getCredentials('lockwaveApi');
	const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');

	const options: any = {
		method,
		url: `${baseUrl}/api/v1${endpoint}`,
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		json: true,
	};

	if (credentials.teamId) {
		options.headers['X-Team-Id'] = credentials.teamId;
	}

	if (body && Object.keys(body).length > 0) {
		options.body = body;
	}

	if (qs && Object.keys(qs).length > 0) {
		options.qs = qs;
	}

	const response = await this.helpers.httpRequestWithAuthentication.call(
		this,
		'lockwaveApi',
		options,
	);

	// Unwrap { data: ... } envelope if present
	if (response && response.data !== undefined) {
		return response.data;
	}

	return response;
}

async function handleGetAll(
	this: IExecuteFunctions,
	itemIndex: number,
	endpoint: string,
): Promise<any[]> {
	const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;

	if (returnAll) {
		return lockwaveRequestAllPages.call(this, endpoint);
	}

	const limit = this.getNodeParameter('limit', itemIndex) as number;
	const qs: Record<string, any> = { per_page: Math.min(limit, 100) };
	const result = await lockwaveRequest.call(this, 'GET', endpoint, undefined, qs);
	if (Array.isArray(result)) {
		return result.slice(0, limit);
	}
	return [result];
}

async function lockwaveRequestAllPages(
	this: IExecuteFunctions,
	endpoint: string,
): Promise<any[]> {
	const allResults: any[] = [];
	let cursor: string | null = null;

	const maxPages = 100;
	let pageCount = 0;

	do {
		if (++pageCount > maxPages) {
			console.warn(`lockwaveRequestAllPages: reached max page limit (${maxPages}) for ${endpoint}`);
			break;
		}
		const qs: Record<string, any> = { per_page: 100 };
		if (cursor) {
			qs.cursor = cursor;
		}

		const credentials = await this.getCredentials('lockwaveApi');
		const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');

		const options: any = {
			method: 'GET' as IHttpRequestMethods,
			url: `${baseUrl}/api/v1${endpoint}`,
			headers: {
				Accept: 'application/json',
			},
			qs,
			json: true,
		};

		if (credentials.teamId) {
			options.headers['X-Team-Id'] = credentials.teamId;
		}

		const response = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'lockwaveApi',
			options,
		);

		if (response.data && Array.isArray(response.data)) {
			allResults.push(...response.data);
		} else if (Array.isArray(response)) {
			allResults.push(...response);
			break;
		}

		// Cursor pagination: look for next_cursor in meta
		cursor = response.meta?.next_cursor ?? null;
	} while (cursor);

	return allResults;
}

async function lockwaveRequestBinary(
	this: IExecuteFunctions,
	endpoint: string,
): Promise<INodeExecutionData> {
	const credentials = await this.getCredentials('lockwaveApi');
	const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');

	const options: any = {
		method: 'GET' as IHttpRequestMethods,
		url: `${baseUrl}/api/v1${endpoint}`,
		headers: {
			Accept: '*/*',
		},
		encoding: 'arraybuffer',
		returnFullResponse: true,
		json: false,
	};

	if (credentials.teamId) {
		options.headers['X-Team-Id'] = credentials.teamId;
	}

	const response = await this.helpers.httpRequestWithAuthentication.call(
		this,
		'lockwaveApi',
		options,
	);

	const contentDisposition = response.headers?.['content-disposition'] || '';
	const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
	const filename = filenameMatch ? filenameMatch[1].replace(/['"]/g, '') : 'report.pdf';

	const contentType = response.headers?.['content-type'] || 'application/octet-stream';

	const binaryData = await this.helpers.prepareBinaryData(
		Buffer.from(response.body),
		filename,
		contentType,
	);

	return {
		json: { filename, contentType },
		binary: { data: binaryData },
	};
}
