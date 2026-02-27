import {
	IPollFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestMethods,
} from 'n8n-workflow';

export class LockwaveTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Lockwave Trigger',
		name: 'lockwaveTrigger',
		icon: 'file:lockwave.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Polls Lockwave for new events and triggers workflows',
		defaults: {
			name: 'Lockwave Trigger',
		},
		polling: true,
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'lockwaveApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				default: 'auditEvent',
				options: [
					{
						name: 'New Audit Event',
						value: 'auditEvent',
						description: 'Trigger when a new audit event is recorded',
					},
					{
						name: 'Break Glass Activated',
						value: 'breakGlassActivated',
						description: 'Trigger when a break-glass event is activated',
					},
					{
						name: 'Host Status Change',
						value: 'hostStatusChange',
						description: 'Trigger when a host comes online or goes offline',
					},
					{
						name: 'Report Ready',
						value: 'reportReady',
						description: 'Trigger when a requested report finishes generating',
					},
				],
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const event = this.getNodeParameter('event') as string;
		const webhookData = this.getWorkflowStaticData('node');

		const credentials = await this.getCredentials('lockwaveApi');
		const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');

		const options: any = {
			method: 'GET' as IHttpRequestMethods,
			url: '',
			headers: {
				Accept: 'application/json',
			},
			json: true,
		};

		if (credentials.teamId) {
			options.headers['X-Team-Id'] = credentials.teamId;
		}

		let responseData: any[];

		if (event === 'auditEvent') {
			options.url = `${baseUrl}/api/v1/audit-events`;
			options.qs = { per_page: 25 };

			const response = await this.helpers.httpRequestWithAuthentication.call(
				this,
				'lockwaveApi',
				options,
			);

			const events = response.data ?? response ?? [];
			const lastKnownId = webhookData.lastId as string | undefined;

			if (!lastKnownId) {
				// First run: store the latest ID and return nothing
				if (events.length > 0) {
					webhookData.lastId = events[0].id;
				}
				return null;
			}

			// Return only events newer than the last known
			responseData = [];
			for (const evt of events) {
				if (evt.id === lastKnownId) break;
				responseData.push(evt);
			}

			if (responseData.length > 0) {
				webhookData.lastId = responseData[0].id;
			}
		} else if (event === 'breakGlassActivated') {
			options.url = `${baseUrl}/api/v1/break-glass`;
			options.qs = { per_page: 25 };

			const response = await this.helpers.httpRequestWithAuthentication.call(
				this,
				'lockwaveApi',
				options,
			);

			const events = response.data ?? response ?? [];
			const lastKnownId = webhookData.lastId as string | undefined;

			if (!lastKnownId) {
				if (events.length > 0) {
					webhookData.lastId = events[0].id;
				}
				return null;
			}

			responseData = [];
			for (const evt of events) {
				if (evt.id === lastKnownId) break;
				if (evt.active) {
					responseData.push(evt);
				}
			}

			if (events.length > 0) {
				webhookData.lastId = events[0].id;
			}
		} else if (event === 'hostStatusChange') {
			options.url = `${baseUrl}/api/v1/hosts`;
			options.qs = { per_page: 100 };

			const response = await this.helpers.httpRequestWithAuthentication.call(
				this,
				'lockwaveApi',
				options,
			);

			const hosts = response.data ?? response ?? [];
			const previousStatuses = (webhookData.hostStatuses as Record<string, string>) ?? {};

			if (Object.keys(previousStatuses).length === 0) {
				// First run: record all statuses, don't trigger
				const statuses: Record<string, string> = {};
				for (const host of hosts) {
					statuses[host.id] = host.status;
				}
				webhookData.hostStatuses = statuses;
				return null;
			}

			responseData = [];
			const currentStatuses: Record<string, string> = {};
			for (const host of hosts) {
				currentStatuses[host.id] = host.status;
				if (previousStatuses[host.id] && previousStatuses[host.id] !== host.status) {
					responseData.push({
						...host,
						previous_status: previousStatuses[host.id],
						new_status: host.status,
					});
				}
			}
			webhookData.hostStatuses = currentStatuses;
		} else if (event === 'reportReady') {
			options.url = `${baseUrl}/api/v1/reports`;
			options.qs = { per_page: 10 };

			const response = await this.helpers.httpRequestWithAuthentication.call(
				this,
				'lockwaveApi',
				options,
			);

			const reports = response.data ?? response ?? [];
			const lastKnownId = webhookData.lastId as string | undefined;

			if (!lastKnownId) {
				if (reports.length > 0) {
					webhookData.lastId = reports[0].id;
				}
				return null;
			}

			responseData = [];
			for (const report of reports) {
				if (report.id === lastKnownId) break;
				if (report.status === 'ready') {
					responseData.push(report);
				}
			}

			if (reports.length > 0) {
				webhookData.lastId = reports[0].id;
			}
		} else {
			return null;
		}

		if (!responseData || responseData.length === 0) {
			return null;
		}

		return [responseData.map((item) => ({ json: item } as INodeExecutionData))];
	}
}
