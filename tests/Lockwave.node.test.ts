import { Lockwave } from '../nodes/Lockwave/Lockwave.node';
import { LockwaveTrigger } from '../nodes/Lockwave/LockwaveTrigger.node';
import { IExecuteFunctions, INodeExecutionData, IPollFunctions } from 'n8n-workflow';

// ─── Test Helpers ──────────────────────────────────────────────────

const FAKE_CREDENTIALS = {
	apiToken: 'test-token-123',
	baseUrl: 'https://lockwave.io',
	teamId: 'team-uuid-456',
};

const FAKE_CREDENTIALS_NO_TEAM = {
	...FAKE_CREDENTIALS,
	teamId: '',
};

let capturedRequest: any;

function createMockExecuteFunctions(overrides: {
	resource: string;
	operation: string;
	params?: Record<string, any>;
	credentials?: Record<string, any>;
	continueOnFail?: boolean;
	httpResponse?: any;
	httpError?: Error;
}): IExecuteFunctions {
	const params: Record<string, any> = {
		resource: overrides.resource,
		operation: overrides.operation,
		...overrides.params,
	};

	const creds = overrides.credentials ?? FAKE_CREDENTIALS;

	capturedRequest = null;

	const mockFns = {
		getInputData: jest.fn().mockReturnValue([{ json: {} }]),
		getNodeParameter: jest.fn((name: string, _index: number) => {
			if (params[name] !== undefined) return params[name];
			throw new Error(`Unexpected parameter: ${name}`);
		}),
		getCredentials: jest.fn().mockResolvedValue(creds),
		continueOnFail: jest.fn().mockReturnValue(overrides.continueOnFail ?? false),
		helpers: {
			httpRequestWithAuthentication: jest.fn(async (_credType: string, opts: any) => {
				capturedRequest = opts;
				if (overrides.httpError) throw overrides.httpError;
				return overrides.httpResponse ?? { data: {} };
			}),
			prepareBinaryData: jest.fn(async (buffer: Buffer, filename: string, mimeType: string) => {
				return {
					data: buffer.toString('base64'),
					fileName: filename,
					mimeType,
				};
			}),
		},
	};

	return mockFns as unknown as IExecuteFunctions;
}

async function executeNode(mock: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const node = new Lockwave();
	return node.description.properties ? node.execute.call(mock) : [[]];
}

// ─── Trigger Test Helpers ──────────────────────────────────────────

function createMockPollFunctions(overrides: {
	event: string;
	staticData?: Record<string, any>;
	credentials?: Record<string, any>;
	httpResponse?: any;
	httpError?: Error;
}): IPollFunctions & { _staticData: Record<string, any> } {
	const creds = overrides.credentials ?? FAKE_CREDENTIALS;
	const staticData = overrides.staticData ?? {};

	const mockFns = {
		_staticData: staticData,
		getNodeParameter: jest.fn((name: string) => {
			if (name === 'event') return overrides.event;
			throw new Error(`Unexpected parameter: ${name}`);
		}),
		getWorkflowStaticData: jest.fn(() => staticData),
		getCredentials: jest.fn().mockResolvedValue(creds),
		helpers: {
			httpRequestWithAuthentication: jest.fn(async (_credType: string, opts: any) => {
				capturedRequest = opts;
				if (overrides.httpError) throw overrides.httpError;
				return overrides.httpResponse ?? { data: [] };
			}),
		},
	};

	return mockFns as unknown as IPollFunctions & { _staticData: Record<string, any> };
}

async function pollTrigger(mock: IPollFunctions): Promise<INodeExecutionData[][] | null> {
	const trigger = new LockwaveTrigger();
	return trigger.poll.call(mock);
}

// ─── Tests ─────────────────────────────────────────────────────────

describe('Lockwave Node', () => {
	describe('Node description', () => {
		it('has correct metadata', () => {
			const node = new Lockwave();
			expect(node.description.displayName).toBe('Lockwave');
			expect(node.description.name).toBe('lockwave');
			expect(node.description.credentials).toEqual([
				{ name: 'lockwaveApi', required: true },
			]);
		});

		it('defines 11 resources', () => {
			const node = new Lockwave();
			const resourceProp = node.description.properties.find((p) => p.name === 'resource');
			expect(resourceProp).toBeDefined();
			expect((resourceProp as any).options).toHaveLength(11);
		});
	});

	// ─── USER ──────────────────────────────────────────

	describe('user.get', () => {
		it('calls GET /user', async () => {
			const userData = { id: 'u1', name: 'Test User', email: 'test@example.com' };
			const mock = createMockExecuteFunctions({
				resource: 'user',
				operation: 'get',
				httpResponse: { data: userData },
			});

			const result = await executeNode(mock);
			expect(capturedRequest.method).toBe('GET');
			expect(capturedRequest.url).toBe('https://lockwave.io/api/v1/user');
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual(userData);
		});
	});

	// ─── TEAM ──────────────────────────────────────────

	describe('team.getAll', () => {
		it('calls GET /teams with limit when returnAll=false', async () => {
			const teams = [{ id: 't1' }, { id: 't2' }];
			const mock = createMockExecuteFunctions({
				resource: 'team',
				operation: 'getAll',
				params: { returnAll: false, limit: 10 },
				httpResponse: { data: teams },
			});

			const result = await executeNode(mock);
			expect(capturedRequest.method).toBe('GET');
			expect(capturedRequest.url).toContain('/api/v1/teams');
			expect(capturedRequest.qs.per_page).toBe(10);
			expect(result[0]).toHaveLength(2);
		});

		it('paginates when returnAll=true', async () => {
			const page1 = [{ id: 't1' }, { id: 't2' }];
			const page2 = [{ id: 't3' }];
			let callCount = 0;

			const mock = createMockExecuteFunctions({
				resource: 'team',
				operation: 'getAll',
				params: { returnAll: true },
			});

			(mock.helpers.httpRequestWithAuthentication as jest.Mock).mockImplementation(
				async (_cred: string, opts: any) => {
					capturedRequest = opts;
					callCount++;
					if (callCount === 1) {
						return { data: page1, meta: { next_cursor: 'cursor-abc' } };
					}
					return { data: page2, meta: { next_cursor: null } };
				},
			);

			const result = await executeNode(mock);
			expect(callCount).toBe(2);
			expect(result[0]).toHaveLength(3);
		});
	});

	describe('team.get', () => {
		it('calls GET /teams/:id', async () => {
			const team = { id: 't1', name: 'My Team' };
			const mock = createMockExecuteFunctions({
				resource: 'team',
				operation: 'get',
				params: { teamId: 't1' },
				httpResponse: { data: team },
			});

			const result = await executeNode(mock);
			expect(capturedRequest.url).toBe('https://lockwave.io/api/v1/teams/t1');
			expect(result[0][0].json).toEqual(team);
		});
	});

	// ─── SSH KEY ────────────────────────────────────────

	describe('sshKey.getAll', () => {
		it('returns paginated results', async () => {
			const keys = [{ id: 'k1' }, { id: 'k2' }];
			const mock = createMockExecuteFunctions({
				resource: 'sshKey',
				operation: 'getAll',
				params: { returnAll: false, limit: 25 },
				httpResponse: { data: keys },
			});

			const result = await executeNode(mock);
			expect(capturedRequest.url).toContain('/api/v1/ssh-keys');
			expect(result[0]).toHaveLength(2);
		});
	});

	describe('sshKey.get', () => {
		it('calls GET /ssh-keys/:id', async () => {
			const key = { id: 'k1', name: 'My Key' };
			const mock = createMockExecuteFunctions({
				resource: 'sshKey',
				operation: 'get',
				params: { sshKeyId: 'k1' },
				httpResponse: { data: key },
			});

			const result = await executeNode(mock);
			expect(capturedRequest.url).toBe('https://lockwave.io/api/v1/ssh-keys/k1');
			expect(result[0][0].json).toEqual(key);
		});
	});

	describe('sshKey.create (import mode)', () => {
		it('sends POST with public_key', async () => {
			const created = { id: 'k1', name: 'Imported', mode: 'import' };
			const mock = createMockExecuteFunctions({
				resource: 'sshKey',
				operation: 'create',
				params: {
					mode: 'import',
					name: 'Imported',
					publicKey: 'ssh-ed25519 AAAA...',
				},
				httpResponse: { data: created },
			});

			const result = await executeNode(mock);
			expect(capturedRequest.method).toBe('POST');
			expect(capturedRequest.url).toContain('/api/v1/ssh-keys');
			expect(capturedRequest.body).toEqual({
				name: 'Imported',
				mode: 'import',
				public_key: 'ssh-ed25519 AAAA...',
			});
			expect(result[0][0].json).toEqual(created);
		});
	});

	describe('sshKey.create (generate mode)', () => {
		it('sends POST with key_type', async () => {
			const created = { id: 'k2', name: 'Generated', mode: 'generate' };
			const mock = createMockExecuteFunctions({
				resource: 'sshKey',
				operation: 'create',
				params: {
					mode: 'generate',
					name: 'Generated',
					keyType: 'ed25519',
				},
				httpResponse: { data: created },
			});

			const result = await executeNode(mock);
			expect(capturedRequest.body).toEqual({
				name: 'Generated',
				mode: 'generate',
				key_type: 'ed25519',
			});
			expect(result[0][0].json).toEqual(created);
		});
	});

	describe('sshKey.update', () => {
		it('sends PATCH with updateFields', async () => {
			const updated = { id: 'k1', name: 'Renamed' };
			const mock = createMockExecuteFunctions({
				resource: 'sshKey',
				operation: 'update',
				params: {
					sshKeyId: 'k1',
					updateFields: { name: 'Renamed' },
				},
				httpResponse: { data: updated },
			});

			const result = await executeNode(mock);
			expect(capturedRequest.method).toBe('PATCH');
			expect(capturedRequest.url).toBe('https://lockwave.io/api/v1/ssh-keys/k1');
			expect(capturedRequest.body).toEqual({ name: 'Renamed' });
			expect(result[0][0].json).toEqual(updated);
		});
	});

	describe('sshKey.delete', () => {
		it('sends DELETE /ssh-keys/:id', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'sshKey',
				operation: 'delete',
				params: { sshKeyId: 'k1' },
				httpResponse: {},
			});

			await executeNode(mock);
			expect(capturedRequest.method).toBe('DELETE');
			expect(capturedRequest.url).toBe('https://lockwave.io/api/v1/ssh-keys/k1');
		});
	});

	describe('sshKey.block', () => {
		it('sends POST with block options', async () => {
			const blocked = { id: 'k1', blocked: true };
			const mock = createMockExecuteFunctions({
				resource: 'sshKey',
				operation: 'block',
				params: {
					sshKeyId: 'k1',
					blockOptions: {
						blockedIndefinite: true,
						reason: 'Compromised',
					},
				},
				httpResponse: { data: blocked },
			});

			const result = await executeNode(mock);
			expect(capturedRequest.method).toBe('POST');
			expect(capturedRequest.url).toBe('https://lockwave.io/api/v1/ssh-keys/k1/block');
			expect(capturedRequest.body).toEqual({
				blocked_indefinite: true,
				reason: 'Compromised',
			});
			expect(result[0][0].json).toEqual(blocked);
		});

		it('sends POST with blockedUntil date', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'sshKey',
				operation: 'block',
				params: {
					sshKeyId: 'k1',
					blockOptions: {
						blockedUntil: '2026-12-31T23:59:59Z',
					},
				},
				httpResponse: { data: { id: 'k1' } },
			});

			await executeNode(mock);
			expect(capturedRequest.body).toEqual({
				blocked_until: '2026-12-31T23:59:59Z',
			});
		});
	});

	describe('sshKey.unblock', () => {
		it('sends POST /ssh-keys/:id/unblock', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'sshKey',
				operation: 'unblock',
				params: { sshKeyId: 'k1' },
				httpResponse: { data: { id: 'k1', blocked: false } },
			});

			await executeNode(mock);
			expect(capturedRequest.method).toBe('POST');
			expect(capturedRequest.url).toBe('https://lockwave.io/api/v1/ssh-keys/k1/unblock');
		});
	});

	// ─── HOST ──────────────────────────────────────────

	describe('host.getAll', () => {
		it('returns paginated hosts', async () => {
			const hosts = [{ id: 'h1' }];
			const mock = createMockExecuteFunctions({
				resource: 'host',
				operation: 'getAll',
				params: { returnAll: false, limit: 5 },
				httpResponse: { data: hosts },
			});

			const result = await executeNode(mock);
			expect(capturedRequest.url).toContain('/api/v1/hosts');
			expect(result[0]).toHaveLength(1);
		});
	});

	describe('host.get', () => {
		it('calls GET /hosts/:id', async () => {
			const host = { id: 'h1', display_name: 'web-01' };
			const mock = createMockExecuteFunctions({
				resource: 'host',
				operation: 'get',
				params: { hostId: 'h1' },
				httpResponse: { data: host },
			});

			const result = await executeNode(mock);
			expect(capturedRequest.url).toBe('https://lockwave.io/api/v1/hosts/h1');
			expect(result[0][0].json).toEqual(host);
		});
	});

	describe('host.create', () => {
		it('sends POST /hosts with all required fields', async () => {
			const created = { id: 'h1' };
			const mock = createMockExecuteFunctions({
				resource: 'host',
				operation: 'create',
				params: {
					displayName: 'web-01',
					hostname: 'web-01.example.com',
					os: 'linux',
					arch: 'amd64',
				},
				httpResponse: { data: created },
			});

			await executeNode(mock);
			expect(capturedRequest.method).toBe('POST');
			expect(capturedRequest.body).toEqual({
				display_name: 'web-01',
				hostname: 'web-01.example.com',
				os: 'linux',
				arch: 'amd64',
			});
		});
	});

	describe('host.update', () => {
		it('sends PATCH /hosts/:id with updateFields', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'host',
				operation: 'update',
				params: {
					hostId: 'h1',
					updateFields: { display_name: 'web-02' },
				},
				httpResponse: { data: { id: 'h1' } },
			});

			await executeNode(mock);
			expect(capturedRequest.method).toBe('PATCH');
			expect(capturedRequest.url).toBe('https://lockwave.io/api/v1/hosts/h1');
			expect(capturedRequest.body).toEqual({ display_name: 'web-02' });
		});
	});

	describe('host.delete', () => {
		it('sends DELETE /hosts/:id', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'host',
				operation: 'delete',
				params: { hostId: 'h1' },
				httpResponse: {},
			});

			await executeNode(mock);
			expect(capturedRequest.method).toBe('DELETE');
			expect(capturedRequest.url).toBe('https://lockwave.io/api/v1/hosts/h1');
		});
	});

	// ─── HOST USER ─────────────────────────────────────

	describe('hostUser.getAll', () => {
		it('calls GET /hosts/:hostId/users', async () => {
			const users = [{ id: 'hu1', os_user: 'deploy' }];
			const mock = createMockExecuteFunctions({
				resource: 'hostUser',
				operation: 'getAll',
				params: { hostId: 'h1', returnAll: false, limit: 10 },
				httpResponse: { data: users },
			});

			const result = await executeNode(mock);
			expect(capturedRequest.url).toContain('/api/v1/hosts/h1/users');
			expect(result[0]).toHaveLength(1);
		});
	});

	describe('hostUser.create', () => {
		it('sends POST /hosts/:hostId/users with os_user', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'hostUser',
				operation: 'create',
				params: {
					hostId: 'h1',
					osUser: 'deploy',
					authorizedKeysPath: '/home/deploy/.ssh/authorized_keys',
				},
				httpResponse: { data: { id: 'hu1' } },
			});

			await executeNode(mock);
			expect(capturedRequest.method).toBe('POST');
			expect(capturedRequest.url).toBe('https://lockwave.io/api/v1/hosts/h1/users');
			expect(capturedRequest.body).toEqual({
				os_user: 'deploy',
				authorized_keys_path: '/home/deploy/.ssh/authorized_keys',
			});
		});

		it('omits authorized_keys_path when empty', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'hostUser',
				operation: 'create',
				params: {
					hostId: 'h1',
					osUser: 'root',
					authorizedKeysPath: '',
				},
				httpResponse: { data: { id: 'hu2' } },
			});

			await executeNode(mock);
			expect(capturedRequest.body).toEqual({ os_user: 'root' });
		});
	});

	describe('hostUser.update', () => {
		it('sends PATCH /hosts/:hostId/users/:hostUserId', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'hostUser',
				operation: 'update',
				params: {
					hostId: 'h1',
					hostUserId: 'hu1',
					authorizedKeysPath: '/custom/path',
				},
				httpResponse: { data: { id: 'hu1' } },
			});

			await executeNode(mock);
			expect(capturedRequest.method).toBe('PATCH');
			expect(capturedRequest.url).toBe('https://lockwave.io/api/v1/hosts/h1/users/hu1');
			expect(capturedRequest.body).toEqual({ authorized_keys_path: '/custom/path' });
		});
	});

	describe('hostUser.delete', () => {
		it('sends DELETE /hosts/:hostId/users/:hostUserId', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'hostUser',
				operation: 'delete',
				params: { hostId: 'h1', hostUserId: 'hu1' },
				httpResponse: {},
			});

			await executeNode(mock);
			expect(capturedRequest.method).toBe('DELETE');
			expect(capturedRequest.url).toBe('https://lockwave.io/api/v1/hosts/h1/users/hu1');
		});
	});

	// ─── ASSIGNMENT ────────────────────────────────────

	describe('assignment.getAll', () => {
		it('calls GET /assignments', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'assignment',
				operation: 'getAll',
				params: { returnAll: false, limit: 20 },
				httpResponse: { data: [{ id: 'a1' }] },
			});

			const result = await executeNode(mock);
			expect(capturedRequest.url).toContain('/api/v1/assignments');
			expect(result[0]).toHaveLength(1);
		});
	});

	describe('assignment.get', () => {
		it('calls GET /assignments/:id', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'assignment',
				operation: 'get',
				params: { assignmentId: 'a1' },
				httpResponse: { data: { id: 'a1' } },
			});

			await executeNode(mock);
			expect(capturedRequest.url).toBe('https://lockwave.io/api/v1/assignments/a1');
		});
	});

	describe('assignment.create', () => {
		it('sends POST /assignments with required fields', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'assignment',
				operation: 'create',
				params: {
					sshKeyId: 'k1',
					hostUserId: 'hu1',
					expiresAt: '',
				},
				httpResponse: { data: { id: 'a1' } },
			});

			await executeNode(mock);
			expect(capturedRequest.method).toBe('POST');
			expect(capturedRequest.body).toEqual({
				ssh_key_id: 'k1',
				host_user_id: 'hu1',
			});
		});

		it('includes expires_at when provided', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'assignment',
				operation: 'create',
				params: {
					sshKeyId: 'k1',
					hostUserId: 'hu1',
					expiresAt: '2026-12-31T00:00:00Z',
				},
				httpResponse: { data: { id: 'a1' } },
			});

			await executeNode(mock);
			expect(capturedRequest.body.expires_at).toBe('2026-12-31T00:00:00Z');
		});
	});

	describe('assignment.delete', () => {
		it('sends DELETE /assignments/:id', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'assignment',
				operation: 'delete',
				params: { assignmentId: 'a1' },
				httpResponse: {},
			});

			await executeNode(mock);
			expect(capturedRequest.method).toBe('DELETE');
			expect(capturedRequest.url).toBe('https://lockwave.io/api/v1/assignments/a1');
		});
	});

	// ─── AUDIT EVENT ───────────────────────────────────

	describe('auditEvent.getAll', () => {
		it('calls GET /audit-events', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'auditEvent',
				operation: 'getAll',
				params: { returnAll: false, limit: 50 },
				httpResponse: { data: [{ id: 'ae1' }] },
			});

			const result = await executeNode(mock);
			expect(capturedRequest.url).toContain('/api/v1/audit-events');
			expect(result[0]).toHaveLength(1);
		});
	});

	describe('auditEvent.get', () => {
		it('calls GET /audit-events/:id', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'auditEvent',
				operation: 'get',
				params: { auditEventId: 'ae1' },
				httpResponse: { data: { id: 'ae1', action: 'key.created' } },
			});

			const result = await executeNode(mock);
			expect(capturedRequest.url).toBe('https://lockwave.io/api/v1/audit-events/ae1');
			expect(result[0][0].json.action).toBe('key.created');
		});
	});

	// ─── BREAK GLASS ───────────────────────────────────

	describe('breakGlass.getAll', () => {
		it('calls GET /break-glass', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'breakGlass',
				operation: 'getAll',
				params: { returnAll: false, limit: 10 },
				httpResponse: { data: [{ id: 'bg1' }] },
			});

			const result = await executeNode(mock);
			expect(capturedRequest.url).toContain('/api/v1/break-glass');
			expect(result[0]).toHaveLength(1);
		});
	});

	describe('breakGlass.activate', () => {
		it('sends POST /break-glass/activate with team scope', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'breakGlass',
				operation: 'activate',
				params: {
					scopeType: 'team',
					reason: 'Security incident',
				},
				httpResponse: { data: { id: 'bg1', active: true } },
			});

			await executeNode(mock);
			expect(capturedRequest.method).toBe('POST');
			expect(capturedRequest.url).toBe('https://lockwave.io/api/v1/break-glass/activate');
			expect(capturedRequest.body).toEqual({
				scope_type: 'team',
				reason: 'Security incident',
			});
		});

		it('includes scope_id for host scope', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'breakGlass',
				operation: 'activate',
				params: {
					scopeType: 'host',
					reason: 'Host compromised',
					scopeId: 'h1',
				},
				httpResponse: { data: { id: 'bg2' } },
			});

			await executeNode(mock);
			expect(capturedRequest.body).toEqual({
				scope_type: 'host',
				reason: 'Host compromised',
				scope_id: 'h1',
			});
		});
	});

	describe('breakGlass.deactivate', () => {
		it('sends POST /break-glass/:id/deactivate', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'breakGlass',
				operation: 'deactivate',
				params: {
					breakGlassEventId: 'bg1',
					reason: 'Incident resolved',
				},
				httpResponse: { data: { id: 'bg1', active: false } },
			});

			await executeNode(mock);
			expect(capturedRequest.method).toBe('POST');
			expect(capturedRequest.url).toBe(
				'https://lockwave.io/api/v1/break-glass/bg1/deactivate',
			);
			expect(capturedRequest.body).toEqual({ reason: 'Incident resolved' });
		});
	});

	// ─── REPORT ────────────────────────────────────────

	describe('report.getAll', () => {
		it('calls GET /reports', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'report',
				operation: 'getAll',
				params: { returnAll: false, limit: 10 },
				httpResponse: { data: [{ id: 'r1' }] },
			});

			const result = await executeNode(mock);
			expect(capturedRequest.url).toContain('/api/v1/reports');
			expect(result[0]).toHaveLength(1);
		});
	});

	describe('report.create', () => {
		it('sends POST /reports with type and format', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'report',
				operation: 'create',
				params: {
					reportType: 'team_access',
					format: 'csv',
				},
				httpResponse: { data: { id: 'r1', status: 'pending' } },
			});

			await executeNode(mock);
			expect(capturedRequest.method).toBe('POST');
			expect(capturedRequest.body).toEqual({
				type: 'team_access',
				format: 'csv',
			});
		});
	});

	describe('report.download', () => {
		it('returns binary data with correct filename and content type', async () => {
			const pdfContent = Buffer.from('%PDF-1.4 fake pdf content');
			const mock = createMockExecuteFunctions({
				resource: 'report',
				operation: 'download',
				params: { reportId: 'r1' },
			});

			// Override the httpRequestWithAuthentication to return a full response with body/headers
			(mock.helpers.httpRequestWithAuthentication as jest.Mock).mockImplementation(
				async (_credType: string, opts: any) => {
					capturedRequest = opts;
					return {
						body: pdfContent,
						headers: {
							'content-disposition': 'attachment; filename="team-access-report.pdf"',
							'content-type': 'application/pdf',
						},
					};
				},
			);

			const result = await executeNode(mock);
			expect(capturedRequest.method).toBe('GET');
			expect(capturedRequest.url).toBe('https://lockwave.io/api/v1/reports/r1/download');
			expect(capturedRequest.encoding).toBe('arraybuffer');
			expect(capturedRequest.returnFullResponse).toBe(true);
			expect(capturedRequest.json).toBe(false);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({
				filename: 'team-access-report.pdf',
				contentType: 'application/pdf',
			});
			expect(result[0][0].binary).toBeDefined();
			expect(result[0][0].binary!.data).toBeDefined();
		});

		it('uses default filename when content-disposition is missing', async () => {
			const csvContent = Buffer.from('id,name\n1,test');
			const mock = createMockExecuteFunctions({
				resource: 'report',
				operation: 'download',
				params: { reportId: 'r2' },
			});

			(mock.helpers.httpRequestWithAuthentication as jest.Mock).mockImplementation(
				async (_credType: string, opts: any) => {
					capturedRequest = opts;
					return {
						body: csvContent,
						headers: {
							'content-type': 'text/csv',
						},
					};
				},
			);

			const result = await executeNode(mock);
			expect(result[0][0].json.filename).toBe('report.pdf');
			expect(result[0][0].json.contentType).toBe('text/csv');
		});

		it('uses default content type when header is missing', async () => {
			const data = Buffer.from('binary data');
			const mock = createMockExecuteFunctions({
				resource: 'report',
				operation: 'download',
				params: { reportId: 'r3' },
			});

			(mock.helpers.httpRequestWithAuthentication as jest.Mock).mockImplementation(
				async (_credType: string, opts: any) => {
					capturedRequest = opts;
					return {
						body: data,
						headers: {},
					};
				},
			);

			const result = await executeNode(mock);
			expect(result[0][0].json.contentType).toBe('application/octet-stream');
		});
	});

	// ─── ENROLLMENT TOKEN ──────────────────────────────

	describe('enrollmentToken.create', () => {
		it('sends POST /hosts/:hostId/enrollment-tokens', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'enrollmentToken',
				operation: 'create',
				params: { hostId: 'h1' },
				httpResponse: { data: { token: 'enroll-token-xyz' } },
			});

			const result = await executeNode(mock);
			expect(capturedRequest.method).toBe('POST');
			expect(capturedRequest.url).toBe(
				'https://lockwave.io/api/v1/hosts/h1/enrollment-tokens',
			);
			expect(result[0][0].json.token).toBe('enroll-token-xyz');
		});
	});

	// ─── DAEMON CREDENTIAL ─────────────────────────────

	describe('daemonCredential.rotate', () => {
		it('sends POST /hosts/:hostId/credentials/rotate', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'daemonCredential',
				operation: 'rotate',
				params: { hostId: 'h1' },
				httpResponse: { data: { rotated: true } },
			});

			const result = await executeNode(mock);
			expect(capturedRequest.method).toBe('POST');
			expect(capturedRequest.url).toBe(
				'https://lockwave.io/api/v1/hosts/h1/credentials/rotate',
			);
			expect(result[0][0].json.rotated).toBe(true);
		});
	});

	// ─── CROSS-CUTTING CONCERNS ────────────────────────

	describe('X-Team-Id header', () => {
		it('includes X-Team-Id when teamId is set', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'user',
				operation: 'get',
				credentials: FAKE_CREDENTIALS,
				httpResponse: { data: { id: 'u1' } },
			});

			await executeNode(mock);
			expect(capturedRequest.headers['X-Team-Id']).toBe('team-uuid-456');
		});

		it('omits X-Team-Id when teamId is empty', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'user',
				operation: 'get',
				credentials: FAKE_CREDENTIALS_NO_TEAM,
				httpResponse: { data: { id: 'u1' } },
			});

			await executeNode(mock);
			expect(capturedRequest.headers['X-Team-Id']).toBeUndefined();
		});
	});

	describe('response envelope unwrapping', () => {
		it('unwraps { data: ... } envelope', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'user',
				operation: 'get',
				httpResponse: { data: { id: 'u1', name: 'Test' } },
			});

			const result = await executeNode(mock);
			expect(result[0][0].json).toEqual({ id: 'u1', name: 'Test' });
		});

		it('handles raw response without envelope', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'user',
				operation: 'get',
				httpResponse: { id: 'u1', name: 'Test' },
			});

			const result = await executeNode(mock);
			// When data is undefined in response, the whole response is returned
			expect(result[0][0].json).toEqual({ id: 'u1', name: 'Test' });
		});
	});

	describe('array response normalization', () => {
		it('spreads array responses into multiple items', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'sshKey',
				operation: 'getAll',
				params: { returnAll: false, limit: 10 },
				httpResponse: { data: [{ id: 'k1' }, { id: 'k2' }, { id: 'k3' }] },
			});

			const result = await executeNode(mock);
			expect(result[0]).toHaveLength(3);
			expect(result[0][0].json).toEqual({ id: 'k1' });
			expect(result[0][2].json).toEqual({ id: 'k3' });
		});
	});

	describe('error handling with continueOnFail', () => {
		it('returns error item when continueOnFail is true', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'user',
				operation: 'get',
				continueOnFail: true,
				httpError: new Error('API rate limited'),
			});

			const result = await executeNode(mock);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({ error: 'API rate limited' });
			expect(result[0][0].pairedItem).toBe(0);
		});

		it('throws when continueOnFail is false', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'user',
				operation: 'get',
				continueOnFail: false,
				httpError: new Error('Server error'),
			});

			await expect(executeNode(mock)).rejects.toThrow('Server error');
		});
	});

	describe('error handling for HTTP status codes', () => {
		it('propagates 401 Unauthorized errors', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'user',
				operation: 'get',
				continueOnFail: false,
				httpError: new Error('401 Unauthorized'),
			});

			await expect(executeNode(mock)).rejects.toThrow('401 Unauthorized');
		});

		it('propagates 404 Not Found errors', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'host',
				operation: 'get',
				params: { hostId: 'nonexistent' },
				continueOnFail: false,
				httpError: new Error('404 Not Found'),
			});

			await expect(executeNode(mock)).rejects.toThrow('404 Not Found');
		});

		it('propagates 500 Internal Server Error', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'sshKey',
				operation: 'getAll',
				params: { returnAll: false, limit: 10 },
				continueOnFail: false,
				httpError: new Error('500 Internal Server Error'),
			});

			await expect(executeNode(mock)).rejects.toThrow('500 Internal Server Error');
		});

		it('captures 401 error in continueOnFail mode', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'user',
				operation: 'get',
				continueOnFail: true,
				httpError: new Error('401 Unauthorized'),
			});

			const result = await executeNode(mock);
			expect(result[0][0].json).toEqual({ error: '401 Unauthorized' });
		});

		it('captures 404 error in continueOnFail mode', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'host',
				operation: 'get',
				params: { hostId: 'missing' },
				continueOnFail: true,
				httpError: new Error('404 Not Found'),
			});

			const result = await executeNode(mock);
			expect(result[0][0].json).toEqual({ error: '404 Not Found' });
		});

		it('captures 500 error in continueOnFail mode', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'assignment',
				operation: 'create',
				params: { sshKeyId: 'k1', hostUserId: 'hu1', expiresAt: '' },
				continueOnFail: true,
				httpError: new Error('500 Internal Server Error'),
			});

			const result = await executeNode(mock);
			expect(result[0][0].json).toEqual({ error: '500 Internal Server Error' });
		});
	});

	describe('pagination via handleGetAll', () => {
		it('respects limit and slices results', async () => {
			const items = Array.from({ length: 10 }, (_, i) => ({ id: `item-${i}` }));
			const mock = createMockExecuteFunctions({
				resource: 'host',
				operation: 'getAll',
				params: { returnAll: false, limit: 3 },
				httpResponse: { data: items },
			});

			const result = await executeNode(mock);
			expect(result[0]).toHaveLength(3);
		});

		it('caps per_page at 100 even with higher limit', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'host',
				operation: 'getAll',
				params: { returnAll: false, limit: 200 },
				httpResponse: { data: [{ id: 'h1' }] },
			});

			await executeNode(mock);
			expect(capturedRequest.qs.per_page).toBe(100);
		});

		it('handles non-array result by wrapping in array', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'host',
				operation: 'getAll',
				params: { returnAll: false, limit: 5 },
				httpResponse: { id: 'single-host', name: 'web-01' },
			});

			const result = await executeNode(mock);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({ id: 'single-host', name: 'web-01' });
		});
	});

	describe('pagination guard (max 100 pages)', () => {
		it('stops after 100 pages to prevent infinite loops', async () => {
			let callCount = 0;
			const mock = createMockExecuteFunctions({
				resource: 'host',
				operation: 'getAll',
				params: { returnAll: true },
			});

			(mock.helpers.httpRequestWithAuthentication as jest.Mock).mockImplementation(
				async (_cred: string, opts: any) => {
					capturedRequest = opts;
					callCount++;
					// Always return a next_cursor to simulate infinite pagination
					return {
						data: [{ id: `item-${callCount}` }],
						meta: { next_cursor: `cursor-${callCount}` },
					};
				},
			);

			const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

			const result = await executeNode(mock);
			expect(callCount).toBe(100);
			expect(result[0]).toHaveLength(100);
			expect(warnSpy).toHaveBeenCalledWith(
				expect.stringContaining('reached max page limit (100)'),
			);

			warnSpy.mockRestore();
		});
	});

	describe('trailing slash removal from baseUrl', () => {
		it('strips trailing slash from baseUrl', async () => {
			const mock = createMockExecuteFunctions({
				resource: 'user',
				operation: 'get',
				credentials: { ...FAKE_CREDENTIALS, baseUrl: 'https://lockwave.io/' },
				httpResponse: { data: { id: 'u1' } },
			});

			await executeNode(mock);
			expect(capturedRequest.url).toBe('https://lockwave.io/api/v1/user');
		});
	});

	describe('multiple input items', () => {
		it('processes each input item independently', async () => {
			const node = new Lockwave();
			const params: Record<string, any> = {
				resource: 'host',
				operation: 'get',
			};

			const hostIds = ['h1', 'h2', 'h3'];
			let callIdx = 0;

			const mock = {
				getInputData: jest.fn().mockReturnValue([
					{ json: {} },
					{ json: {} },
					{ json: {} },
				]),
				getNodeParameter: jest.fn((name: string, index: number) => {
					if (name === 'resource') return 'host';
					if (name === 'operation') return 'get';
					if (name === 'hostId') return hostIds[index];
					throw new Error(`Unexpected parameter: ${name}`);
				}),
				getCredentials: jest.fn().mockResolvedValue(FAKE_CREDENTIALS),
				continueOnFail: jest.fn().mockReturnValue(false),
				helpers: {
					httpRequestWithAuthentication: jest.fn(async (_credType: string, opts: any) => {
						const id = hostIds[callIdx++];
						return { data: { id, display_name: `host-${id}` } };
					}),
				},
			} as unknown as IExecuteFunctions;

			const result = await node.execute.call(mock);
			expect(result[0]).toHaveLength(3);
			expect(result[0][0].json).toEqual({ id: 'h1', display_name: 'host-h1' });
			expect(result[0][1].json).toEqual({ id: 'h2', display_name: 'host-h2' });
			expect(result[0][2].json).toEqual({ id: 'h3', display_name: 'host-h3' });
		});
	});
});

// ─── Lockwave Trigger Node Tests ──────────────────────────────────

describe('LockwaveTrigger Node', () => {
	describe('Node description', () => {
		it('has correct metadata', () => {
			const trigger = new LockwaveTrigger();
			expect(trigger.description.displayName).toBe('Lockwave Trigger');
			expect(trigger.description.name).toBe('lockwaveTrigger');
			expect(trigger.description.polling).toBe(true);
			expect(trigger.description.group).toEqual(['trigger']);
		});

		it('defines 4 event types', () => {
			const trigger = new LockwaveTrigger();
			const eventProp = trigger.description.properties.find((p) => p.name === 'event');
			expect(eventProp).toBeDefined();
			expect((eventProp as any).options).toHaveLength(4);
		});
	});

	// ─── AUDIT EVENT TRIGGER ─────────────────────────

	describe('auditEvent polling', () => {
		it('stores lastId on first run and returns null', async () => {
			const staticData: Record<string, any> = {};
			const mock = createMockPollFunctions({
				event: 'auditEvent',
				staticData,
				httpResponse: {
					data: [
						{ id: 'ae3', action: 'key.created' },
						{ id: 'ae2', action: 'host.updated' },
						{ id: 'ae1', action: 'assignment.created' },
					],
				},
			});

			const result = await pollTrigger(mock);
			expect(result).toBeNull();
			expect(staticData['lastId_auditEvent']).toBe('ae3');
		});

		it('returns new events on subsequent runs', async () => {
			const staticData: Record<string, any> = { lastId_auditEvent: 'ae2' };
			const mock = createMockPollFunctions({
				event: 'auditEvent',
				staticData,
				httpResponse: {
					data: [
						{ id: 'ae5', action: 'key.deleted' },
						{ id: 'ae4', action: 'host.created' },
						{ id: 'ae3', action: 'key.created' },
						{ id: 'ae2', action: 'host.updated' },
					],
				},
			});

			const result = await pollTrigger(mock);
			expect(result).not.toBeNull();
			expect(result![0]).toHaveLength(3);
			expect(result![0][0].json).toEqual({ id: 'ae5', action: 'key.deleted' });
			expect(result![0][1].json).toEqual({ id: 'ae4', action: 'host.created' });
			expect(result![0][2].json).toEqual({ id: 'ae3', action: 'key.created' });
			expect(staticData['lastId_auditEvent']).toBe('ae5');
		});

		it('returns null when no new events', async () => {
			const staticData: Record<string, any> = { lastId_auditEvent: 'ae3' };
			const mock = createMockPollFunctions({
				event: 'auditEvent',
				staticData,
				httpResponse: {
					data: [
						{ id: 'ae3', action: 'key.created' },
						{ id: 'ae2', action: 'host.updated' },
					],
				},
			});

			const result = await pollTrigger(mock);
			expect(result).toBeNull();
		});

		it('handles empty event list on first run', async () => {
			const staticData: Record<string, any> = {};
			const mock = createMockPollFunctions({
				event: 'auditEvent',
				staticData,
				httpResponse: { data: [] },
			});

			const result = await pollTrigger(mock);
			expect(result).toBeNull();
			expect(staticData['lastId_auditEvent']).toBeUndefined();
		});
	});

	// ─── BREAK GLASS TRIGGER ─────────────────────────

	describe('breakGlassActivated polling', () => {
		it('stores lastId on first run and returns null', async () => {
			const staticData: Record<string, any> = {};
			const mock = createMockPollFunctions({
				event: 'breakGlassActivated',
				staticData,
				httpResponse: {
					data: [
						{ id: 'bg2', active: true, reason: 'Incident 2' },
						{ id: 'bg1', active: false, reason: 'Incident 1' },
					],
				},
			});

			const result = await pollTrigger(mock);
			expect(result).toBeNull();
			expect(staticData['lastId_breakGlassActivated']).toBe('bg2');
		});

		it('returns only active break-glass events on subsequent runs', async () => {
			const staticData: Record<string, any> = { lastId_breakGlassActivated: 'bg1' };
			const mock = createMockPollFunctions({
				event: 'breakGlassActivated',
				staticData,
				httpResponse: {
					data: [
						{ id: 'bg4', active: true, reason: 'New incident' },
						{ id: 'bg3', active: false, reason: 'Resolved' },
						{ id: 'bg2', active: true, reason: 'Another one' },
						{ id: 'bg1', active: false, reason: 'Old' },
					],
				},
			});

			const result = await pollTrigger(mock);
			expect(result).not.toBeNull();
			// bg4 is active, bg3 is not active (skipped), bg2 is active
			expect(result![0]).toHaveLength(2);
			expect(result![0][0].json).toEqual({ id: 'bg4', active: true, reason: 'New incident' });
			expect(result![0][1].json).toEqual({ id: 'bg2', active: true, reason: 'Another one' });
			expect(staticData['lastId_breakGlassActivated']).toBe('bg4');
		});

		it('returns null when no new active events', async () => {
			const staticData: Record<string, any> = { lastId_breakGlassActivated: 'bg2' };
			const mock = createMockPollFunctions({
				event: 'breakGlassActivated',
				staticData,
				httpResponse: {
					data: [
						{ id: 'bg2', active: false, reason: 'Resolved' },
					],
				},
			});

			const result = await pollTrigger(mock);
			expect(result).toBeNull();
		});
	});

	// ─── HOST STATUS CHANGE TRIGGER ──────────────────

	describe('hostStatusChange polling', () => {
		it('records initial statuses on first run and returns null', async () => {
			const staticData: Record<string, any> = {};
			const mock = createMockPollFunctions({
				event: 'hostStatusChange',
				staticData,
				httpResponse: {
					data: [
						{ id: 'h1', display_name: 'web-01', status: 'online' },
						{ id: 'h2', display_name: 'web-02', status: 'offline' },
					],
				},
			});

			const result = await pollTrigger(mock);
			expect(result).toBeNull();
			expect(staticData.hostStatuses).toEqual({ h1: 'online', h2: 'offline' });
		});

		it('detects status changes on subsequent runs', async () => {
			const staticData: Record<string, any> = {
				hostStatuses: { h1: 'online', h2: 'offline', h3: 'online' },
			};
			const mock = createMockPollFunctions({
				event: 'hostStatusChange',
				staticData,
				httpResponse: {
					data: [
						{ id: 'h1', display_name: 'web-01', status: 'offline' },  // changed
						{ id: 'h2', display_name: 'web-02', status: 'online' },   // changed
						{ id: 'h3', display_name: 'web-03', status: 'online' },   // same
					],
				},
			});

			const result = await pollTrigger(mock);
			expect(result).not.toBeNull();
			expect(result![0]).toHaveLength(2);
			expect(result![0][0].json).toMatchObject({
				id: 'h1',
				previous_status: 'online',
				new_status: 'offline',
			});
			expect(result![0][1].json).toMatchObject({
				id: 'h2',
				previous_status: 'offline',
				new_status: 'online',
			});
			// Updated statuses
			expect(staticData.hostStatuses).toEqual({ h1: 'offline', h2: 'online', h3: 'online' });
		});

		it('returns null when no statuses changed', async () => {
			const staticData: Record<string, any> = {
				hostStatuses: { h1: 'online', h2: 'offline' },
			};
			const mock = createMockPollFunctions({
				event: 'hostStatusChange',
				staticData,
				httpResponse: {
					data: [
						{ id: 'h1', display_name: 'web-01', status: 'online' },
						{ id: 'h2', display_name: 'web-02', status: 'offline' },
					],
				},
			});

			const result = await pollTrigger(mock);
			expect(result).toBeNull();
		});

		it('does not trigger for newly added hosts', async () => {
			const staticData: Record<string, any> = {
				hostStatuses: { h1: 'online' },
			};
			const mock = createMockPollFunctions({
				event: 'hostStatusChange',
				staticData,
				httpResponse: {
					data: [
						{ id: 'h1', display_name: 'web-01', status: 'online' },
						{ id: 'h2', display_name: 'web-02', status: 'online' },  // new host, not tracked before
					],
				},
			});

			const result = await pollTrigger(mock);
			expect(result).toBeNull();
			// But the new host should be tracked now
			expect(staticData.hostStatuses).toEqual({ h1: 'online', h2: 'online' });
		});
	});

	// ─── REPORT READY TRIGGER ────────────────────────

	describe('reportReady polling', () => {
		it('stores lastId on first run and returns null', async () => {
			const staticData: Record<string, any> = {};
			const mock = createMockPollFunctions({
				event: 'reportReady',
				staticData,
				httpResponse: {
					data: [
						{ id: 'r2', status: 'ready', type: 'team_access' },
						{ id: 'r1', status: 'pending', type: 'host_access' },
					],
				},
			});

			const result = await pollTrigger(mock);
			expect(result).toBeNull();
			expect(staticData['lastId_reportReady']).toBe('r2');
		});

		it('returns only ready reports on subsequent runs', async () => {
			const staticData: Record<string, any> = { lastId_reportReady: 'r2' };
			const mock = createMockPollFunctions({
				event: 'reportReady',
				staticData,
				httpResponse: {
					data: [
						{ id: 'r5', status: 'ready', type: 'team_access' },
						{ id: 'r4', status: 'pending', type: 'host_access' },
						{ id: 'r3', status: 'ready', type: 'compliance' },
						{ id: 'r2', status: 'ready', type: 'team_access' },
					],
				},
			});

			const result = await pollTrigger(mock);
			expect(result).not.toBeNull();
			expect(result![0]).toHaveLength(2);
			expect(result![0][0].json).toEqual({ id: 'r5', status: 'ready', type: 'team_access' });
			expect(result![0][1].json).toEqual({ id: 'r3', status: 'ready', type: 'compliance' });
			expect(staticData['lastId_reportReady']).toBe('r5');
		});

		it('returns null when no new ready reports', async () => {
			const staticData: Record<string, any> = { lastId_reportReady: 'r3' };
			const mock = createMockPollFunctions({
				event: 'reportReady',
				staticData,
				httpResponse: {
					data: [
						{ id: 'r3', status: 'ready', type: 'compliance' },
					],
				},
			});

			const result = await pollTrigger(mock);
			expect(result).toBeNull();
		});
	});

	// ─── UNKNOWN EVENT ───────────────────────────────

	describe('unknown event type', () => {
		it('returns null for unrecognized event', async () => {
			const staticData: Record<string, any> = {};
			const mock = createMockPollFunctions({
				event: 'unknownEvent',
				staticData,
			});

			const result = await pollTrigger(mock);
			expect(result).toBeNull();
		});
	});

	// ─── TRIGGER CROSS-CUTTING ───────────────────────

	describe('trigger X-Team-Id header', () => {
		it('includes X-Team-Id when teamId is set', async () => {
			const mock = createMockPollFunctions({
				event: 'auditEvent',
				staticData: {},
				credentials: FAKE_CREDENTIALS,
				httpResponse: { data: [] },
			});

			await pollTrigger(mock);
			expect(capturedRequest.headers['X-Team-Id']).toBe('team-uuid-456');
		});

		it('omits X-Team-Id when teamId is empty', async () => {
			const mock = createMockPollFunctions({
				event: 'auditEvent',
				staticData: {},
				credentials: FAKE_CREDENTIALS_NO_TEAM,
				httpResponse: { data: [] },
			});

			await pollTrigger(mock);
			expect(capturedRequest.headers['X-Team-Id']).toBeUndefined();
		});
	});

	describe('trigger state isolation (per-event-type keys)', () => {
		it('uses separate state keys for different event types', async () => {
			const staticData: Record<string, any> = {};

			// First: audit event first run
			const auditMock = createMockPollFunctions({
				event: 'auditEvent',
				staticData,
				httpResponse: { data: [{ id: 'ae1', action: 'key.created' }] },
			});
			await pollTrigger(auditMock);

			// Second: report ready first run
			const reportMock = createMockPollFunctions({
				event: 'reportReady',
				staticData,
				httpResponse: { data: [{ id: 'r1', status: 'ready' }] },
			});
			await pollTrigger(reportMock);

			// Both state keys should coexist
			expect(staticData['lastId_auditEvent']).toBe('ae1');
			expect(staticData['lastId_reportReady']).toBe('r1');
		});
	});

	describe('trigger response envelope handling', () => {
		it('handles response without data envelope', async () => {
			const staticData: Record<string, any> = {};
			const mock = createMockPollFunctions({
				event: 'auditEvent',
				staticData,
				httpResponse: [
					{ id: 'ae1', action: 'key.created' },
				],
			});

			const result = await pollTrigger(mock);
			expect(result).toBeNull();
			// Falls through to response ?? [] handling
			expect(staticData['lastId_auditEvent']).toBe('ae1');
		});
	});

	describe('trigger error propagation', () => {
		it('propagates API errors from the trigger', async () => {
			const mock = createMockPollFunctions({
				event: 'auditEvent',
				staticData: {},
				httpError: new Error('503 Service Unavailable'),
			});

			await expect(pollTrigger(mock)).rejects.toThrow('503 Service Unavailable');
		});
	});
});
