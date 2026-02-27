# n8n-nodes-lockwave

Community node for [n8n](https://n8n.io/) that integrates with the [Lockwave](https://lockwave.io) SSH Key Management API.

Manage SSH keys, hosts, assignments, break-glass events, audit logs, and compliance reports — all from your n8n workflows.

## Installation

### Community Nodes (recommended)

1. Open **Settings > Community Nodes** in your n8n instance
2. Select **Install a community node**
3. Enter `n8n-nodes-lockwave`
4. Agree to the risks and click **Install**

After installation the **Lockwave** and **Lockwave Trigger** nodes appear in the node palette.

### Manual Installation

```bash
cd ~/.n8n/nodes
npm install n8n-nodes-lockwave
```

Restart n8n after installing.

## Credentials

| Field | Description |
|-------|-------------|
| **API Token** | A Sanctum personal-access token. Create one at **Profile > API Tokens** in the Lockwave dashboard. |
| **Base URL** | Your Lockwave instance URL, e.g. `https://lockwave.io`. No trailing slash. |
| **Team ID** *(optional)* | A team UUID. When set, every request includes the `X-Team-Id` header. Leave blank to use your current team. |

The credential is verified by calling `GET /api/v1/user`.

## Nodes

### Lockwave

The main node exposes **11 resources** with full CRUD operations:

| Resource | Operations |
|----------|-----------|
| **SSH Key** | List, Get, Create (generate or import), Update, Delete, Block, Unblock |
| **Host** | List, Get, Create, Update, Delete |
| **Host User** | List, Create, Update, Delete |
| **Assignment** | List, Get, Create, Delete |
| **Audit Event** | List, Get |
| **Break Glass** | List, Activate, Deactivate |
| **Report** | List, Create (request export), Download |
| **Enrollment Token** | Create |
| **Daemon Credential** | Rotate |
| **Team** | List, Get |
| **User** | Get (current user) |

All list operations support **Return All** (automatic cursor pagination) and configurable limits.

### Lockwave Trigger

A polling trigger node that starts workflows when events occur in Lockwave:

| Event | Description |
|-------|-------------|
| **New Audit Event** | Fires when new audit events are recorded |
| **Break Glass Activated** | Fires when a break-glass event is activated |
| **Host Status Change** | Fires when a host transitions between online/offline |
| **Report Ready** | Fires when a requested report finishes generating |

The trigger uses n8n's polling mechanism and stores state between executions to emit only new events.

## Resources

### SSH Key

Manage SSH public keys within your team.

**Create** supports two modes:
- **Generate** — Server generates an ed25519 or RSA 4096 key pair. The private key is returned once and never stored.
- **Import** — Provide an existing public key.

**Block / Unblock** — Temporarily or indefinitely block a key with an optional reason and expiration date.

### Host

Register and manage Linux/Unix hosts in your fleet.

Required fields for creation: display name, hostname, OS (`linux`, `freebsd`, `openbsd`), and architecture (`amd64`, `arm64`, `arm`, `386`).

### Host User

Manage OS-level users on a specific host. Each host user maps to an `authorized_keys` file path.

### Assignment

Map SSH keys to host users. Assignments define who can access what. Optional `expires_at` for time-limited access.

### Break Glass

Emergency access controls:
- **Activate** — Freeze all access globally or scoped to a specific host. Requires a reason.
- **Deactivate** — Lift a break-glass freeze.

### Report

Generate compliance reports in PDF or CSV format:
- **Create** — Request report generation (types: `access`, `compliance`, `audit`).
- **Download** — Retrieve the generated report file.

### Enrollment Token

Generate one-time tokens for host registration with the Lockwave daemon.

### Daemon Credential

Rotate the HMAC credentials used by the daemon on a specific host.

## Example Workflows

Seven ready-to-import workflow templates are included in the [`workflows/`](./workflows/) directory:

| # | Workflow | Description |
|---|----------|-------------|
| 1 | **Onboard Developer** | Creates an SSH key, assigns it to a group of hosts, and notifies the team via Slack |
| 2 | **Break Glass Alert** | Triggers on break-glass activation and sends alerts to Slack and PagerDuty |
| 3 | **Offboard Developer** | Removes all assignments for a user and deletes their SSH keys |
| 4 | **Weekly Compliance Report** | Generates a weekly access compliance report and emails it to stakeholders |
| 5 | **Audit Log to SIEM** | Streams new audit events to your SIEM (Splunk, Elastic, etc.) |
| 6 | **Host Offline Monitor** | Detects host status changes and alerts when hosts go offline |
| 7 | **Temporary Access Grant** | Creates a time-limited assignment and auto-deletes it after expiration |

To import a workflow: copy the JSON file contents and paste into **n8n > Import Workflow**.

## API Reference

This node communicates with the Lockwave REST API at `/api/v1/`. Full API documentation is available at [lockwave.io/docs](https://lockwave.io/docs).

### Pagination

List endpoints use **cursor-based pagination**. The node handles this automatically:
- When **Return All** is enabled, all pages are fetched using `next_cursor`
- When a **Limit** is set, only the requested number of items is returned

### Authentication

All requests use **Bearer token** authentication via `Authorization: Bearer <token>`. The token is a Laravel Sanctum personal-access token.

### Team Context

When a Team ID is configured in the credentials, every request includes the `X-Team-Id` header to scope operations to that team.

## Development

### Prerequisites

- Node.js >= 18
- npm >= 9
- n8n installed globally or via Docker

### Setup

```bash
git clone https://github.com/lockwave-io/n8n-nodes-lockwave.git
cd n8n-nodes-lockwave
npm install
```

### Build

```bash
npm run build
```

This compiles TypeScript to `dist/` and copies SVG icons via gulp.

### Watch Mode

```bash
npm run dev
```

Runs `tsc --watch` for live recompilation during development.

### Link for Local Testing

```bash
# In the node package directory
npm link

# In your n8n custom nodes directory (~/.n8n/nodes)
npm link n8n-nodes-lockwave
```

Restart n8n after linking. Changes require a rebuild (`npm run build`) and n8n restart.

### Lint

```bash
npm run lint
npm run lintfix  # auto-fix
```

### Project Structure

```
n8n-nodes-lockwave/
├── credentials/
│   └── LockwaveApi.credentials.ts    # Bearer token + base URL + team ID
├── nodes/
│   └── Lockwave/
│       ├── Lockwave.node.ts           # Main node (11 resources)
│       ├── LockwaveTrigger.node.ts    # Polling trigger (4 event types)
│       ├── lockwave.svg               # Node icon
│       └── descriptions/
│           ├── index.ts               # Barrel export
│           ├── UserDescription.ts
│           ├── TeamDescription.ts
│           ├── SshKeyDescription.ts
│           ├── HostDescription.ts
│           ├── HostUserDescription.ts
│           ├── AssignmentDescription.ts
│           ├── AuditEventDescription.ts
│           ├── BreakGlassDescription.ts
│           ├── ReportDescription.ts
│           ├── EnrollmentTokenDescription.ts
│           └── DaemonCredentialDescription.ts
├── workflows/                         # 7 example workflow JSONs
├── gulpfile.js                        # Copies SVG icons to dist/
├── tsconfig.json
├── package.json
└── index.js                           # Entry point (re-exports via n8n section)
```

## Compatibility

| Requirement | Version |
|-------------|---------|
| n8n | >= 0.214.0 |
| Node.js | >= 18 |

## License

[MIT](./LICENSE)

## Links

- [Lockwave](https://lockwave.io)
- [Lockwave API Documentation](https://lockwave.io/docs)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)
- [Report Issues](https://github.com/lockwave-io/n8n-nodes-lockwave/issues)
