# BlackRoad GraphQL Server

**Unified API Gateway for Projects, CRM, and Multi-Cloud Integrations**

Part of the BlackRoad OS ecosystem - 350+ products across 46 categories

## Features

- **Salesforce-like Projects** - Full project management with status tracking, priorities, and custom fields
- **CRM State Management** - Bidirectional sync with Salesforce and Cloudflare KV
- **Multi-Cloud Deployments** - Deploy to Vercel, Cloudflare Workers, and Digital Ocean
- **AI-Powered Agents** - Claude integration for code review, documentation, and task automation
- **iOS Tool Integration** - Working Copy, Pyto, Shellfish, iSH support
- **SHA-Infinity Hashing** - Extensible, configurable hash system with 10k+ iterations
- **GitHub Integration** - Repos, PRs, issues, and Actions management
- **SSH Management** - Termius integration for host management

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start development server
npm run dev

# Server runs at http://localhost:4000/graphql
```

## Architecture

```
Projects (Git) ←→ CRM (Salesforce) ←→ State (Cloudflare KV)
                        ↓
              GraphQL Server (Apollo)
                        ↓
    ┌───────────┬───────────┬───────────┐
    │  Vercel   │ Cloudflare│DigitalOcean│
    │  Deploy   │  Workers  │   Apps    │
    └───────────┴───────────┴───────────┘
```

## GraphQL API

### Projects

```graphql
# Create a project
mutation {
  createProject(input: {
    name: "My Project"
    status: IN_PROGRESS
    priority: HIGH
    tags: ["feature", "sprint-1"]
  }) {
    id
    slug
    contentHash
    stateHash
  }
}

# Query projects
query {
  projects(filter: { status: [IN_PROGRESS, REVIEW] }) {
    edges {
      node {
        id
        name
        status
        todos { id title status }
      }
    }
    totalCount
  }
}
```

### CRM State

```graphql
# Sync state to Cloudflare KV
mutation {
  syncCRMState(key: "project-123-state", value: {
    lastSync: "2026-01-27T00:00:00Z"
    version: 5
  }) {
    key
    hash
    cloudflareKVId
  }
}

# Query state
query {
  crmState(key: "project-123-state") {
    key
    value
    hash
    version
  }
}
```

### Deployments

```graphql
mutation {
  deployToCloud(provider: VERCEL, input: {
    projectId: "proj-123"
    environment: "production"
    gitRef: "main"
  }) {
    success
    deploymentId
    url
  }
}
```

### Hashing

```graphql
# SHA-Infinity hash (extensible, configurable iterations)
mutation {
  generateShaInfinityHash(input: "sensitive data", iterations: 50000) {
    hash
    iterations
    algorithm
    verificationHash
  }
}

# Standard SHA256
mutation {
  generateHash(input: "data", algorithm: SHA256) {
    hash
    algorithm
  }
}
```

### iOS Tools

```graphql
# Trigger Working Copy
mutation {
  triggerWorkingCopy(action: PUSH, params: { repo: "my-repo" }) {
    success
    callbackUrl
  }
}

# Run Pyto script
mutation {
  triggerPyto(script: "process_data.py", args: ["--input", "data.json"]) {
    success
    output
  }
}
```

## Configuration

See `.env.example` for all configuration options. Key integrations:

| Integration | Required Variables |
|-------------|-------------------|
| Cloudflare | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| Salesforce | `SALESFORCE_USERNAME`, `SALESFORCE_PASSWORD` |
| Vercel | `VERCEL_TOKEN` |
| Digital Ocean | `DIGITALOCEAN_TOKEN` |
| Claude/Anthropic | `ANTHROPIC_API_KEY` |
| GitHub | `GITHUB_TOKEN` |
| Termius | `TERMIUS_API_KEY` |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Compile TypeScript |
| `npm start` | Run production server |
| `npm test` | Run tests |
| `npm run lint` | Run ESLint |
| `npm run hash:test` | Test hashing utilities |

## Documentation

- [Agent Instructions](./AGENTS.md) - For AI agents working on this project
- [Contributing Guide](./CONTRIBUTING.md) - PR guidelines and code standards

## Project Structure

```
src/
├── index.ts              # Server entry point
├── context.ts            # GraphQL context
├── config/               # Environment configuration
├── schemas/              # GraphQL type definitions
├── resolvers/            # Query and mutation resolvers
├── integrations/         # API client implementations
├── utils/
│   ├── logger.ts         # Structured logging
│   └── hash/             # SHA256, SHA-Infinity
└── agents/               # AI agent configuration
```

## Design System

- **Hot Pink**: #FF1D6C
- **Amber**: #F5A623
- **Electric Blue**: #2979FF
- **Violet**: #9C27B0

## License

Proprietary - See [LICENSE](./LICENSE) file

## Contact

**BlackRoad OS, Inc.**
- Email: blackroad.systems@gmail.com
- Docs: https://docs.blackroad.io

---

*Built with Claude | Part of the BlackRoad OS ecosystem*
