# BlackRoad Agent Instructions

This document provides comprehensive instructions for AI agents working on the BlackRoad GraphQL Server.

## Table of Contents

1. [Overview](#overview)
2. [Repository Structure](#repository-structure)
3. [Development Workflow](#development-workflow)
4. [PR Guidelines](#pr-guidelines)
5. [Integration Guide](#integration-guide)
6. [Hashing System](#hashing-system)
7. [Todo Management](#todo-management)
8. [Common Tasks](#common-tasks)

---

## Overview

The BlackRoad GraphQL Server is a unified API gateway that:
- Manages **Projects** (Salesforce-like project management)
- Handles **CRM State** (Cloudflare KV + Salesforce sync)
- Integrates with **Multiple Cloud Providers** (Vercel, Cloudflare, Digital Ocean)
- Supports **iOS Development Tools** (Working Copy, Pyto, Shellfish, iSH)
- Uses **SHA-Infinity** for extensible, secure hashing

### Core Principles

1. **Git is the Source of Truth** - All state derives from Git
2. **Hash Everything** - All state changes are hashed for integrity
3. **Sync Bidirectionally** - Keep CRM, Cloudflare, and Git in sync
4. **Fail Safely** - Always have rollback procedures

---

## Repository Structure

```
blackroad-graphql-server/
├── src/
│   ├── index.ts              # Server entry point
│   ├── context.ts            # GraphQL context
│   ├── config/
│   │   └── index.ts          # Environment configuration
│   ├── schemas/
│   │   └── index.ts          # GraphQL type definitions
│   ├── resolvers/
│   │   ├── index.ts          # Resolver aggregation
│   │   ├── projects.ts       # Project CRUD
│   │   ├── crm.ts            # CRM operations
│   │   ├── cloud.ts          # Cloud deployments
│   │   ├── agents.ts         # Agent management
│   │   ├── hash.ts           # Hash operations
│   │   ├── ios-tools.ts      # iOS tool integration
│   │   └── integrations.ts   # Health checks
│   ├── integrations/
│   │   ├── cloudflare.ts     # Cloudflare Workers, KV, DNS
│   │   ├── salesforce.ts     # Salesforce CRM
│   │   ├── vercel.ts         # Vercel deployments
│   │   ├── digitalocean.ts   # Digital Ocean apps
│   │   ├── anthropic.ts      # Claude AI
│   │   ├── github.ts         # GitHub repos, PRs, issues
│   │   ├── termius.ts        # SSH host management
│   │   └── ios-tools.ts      # iOS app integration
│   ├── utils/
│   │   ├── logger.ts         # Pino logging
│   │   └── hash/
│   │       ├── index.ts      # SHA256, SHA-Infinity
│   │       └── test.ts       # Hash tests
│   └── agents/
│       └── setup.ts          # Agent configuration
├── package.json
├── tsconfig.json
├── .env.example
├── AGENTS.md                 # This file
├── CONTRIBUTING.md           # PR guidelines
└── README.md
```

---

## Development Workflow

### Setting Up

```bash
# Clone the repository
git clone https://github.com/BlackRoad-OS/blackroad-graphql-server.git
cd blackroad-graphql-server

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start development server
npm run dev
```

### Branch Naming

Use the following format:
```
claude/<feature-or-fix>-<session-id>
```

Examples:
- `claude/add-salesforce-sync-abc123`
- `claude/fix-hash-verification-xyz789`

### Commit Messages

Follow conventional commits:
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance

---

## PR Guidelines

### Before Creating a PR

1. **Run all checks locally**:
   ```bash
   npm run lint
   npm run build
   npm test
   ```

2. **Update documentation** if needed

3. **Add/update tests** for new functionality

4. **Verify environment variables** are documented in `.env.example`

### PR Checklist

```markdown
## PR Checklist

- [ ] Code compiles without errors (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] No security vulnerabilities introduced
- [ ] Documentation updated (if applicable)
- [ ] Environment variables documented
- [ ] Breaking changes noted
- [ ] Linked to related issue(s)
```

### Common PR Failures and Fixes

| Failure | Fix |
|---------|-----|
| TypeScript errors | Run `npm run build` and fix type issues |
| Lint errors | Run `npm run lint -- --fix` |
| Test failures | Check test output, update tests as needed |
| Missing dependencies | Add to `package.json`, run `npm install` |
| Env var not documented | Add to `.env.example` |

---

## Integration Guide

### Adding a New Integration

1. **Create the client** in `src/integrations/`:
   ```typescript
   // src/integrations/new-service.ts
   export class NewServiceClient {
     async healthCheck(): Promise<void> { ... }
     // Add methods
   }
   ```

2. **Add configuration** in `src/config/index.ts`:
   ```typescript
   newService: {
     enabled: !!env.NEW_SERVICE_API_KEY,
     apiKey: env.NEW_SERVICE_API_KEY,
   }
   ```

3. **Add to context** in `src/context.ts`:
   ```typescript
   integrations: {
     ...
     newService: config.newService.enabled ? new NewServiceClient() : null,
   }
   ```

4. **Add GraphQL types** in `src/schemas/index.ts`

5. **Add resolvers** in `src/resolvers/`

6. **Document environment variables** in `.env.example`

7. **Add health check** in `src/resolvers/integrations.ts`

---

## Hashing System

### SHA256 (Standard)

```typescript
import { sha256 } from './utils/hash';

const hash = sha256('data to hash');
// Returns: 64-char hex string
```

### SHA-Infinity (Extensible)

SHA-Infinity is our custom extensible hashing system:

```typescript
import { generateShaInfinityHash, verifyShaInfinityHash } from './utils/hash';

// Generate with default 10000 iterations
const hash = await generateShaInfinityHash('sensitive data');
// Returns: $sha-inf$v1$10000$sha512$64$<salt>$<hash>

// Generate with custom iterations
const strongHash = await generateShaInfinityHash('data', 100000);

// Verify
const isValid = await verifyShaInfinityHash('sensitive data', hash);
```

### When to Use Each

| Use Case | Algorithm |
|----------|-----------|
| Content integrity | SHA256 |
| Quick hashing | SHA256/SHA512 |
| Passwords | SHA-Infinity (100k+ iterations) |
| API keys | SHA-Infinity (10k iterations) |
| State verification | SHA256 + content hash |

---

## Todo Management

### GraphQL Operations

```graphql
# Create a todo
mutation {
  createTodo(input: {
    projectId: "proj-123"
    title: "Implement feature X"
    priority: HIGH
    tags: ["feature", "sprint-1"]
  }) {
    id
    title
    status
    hash
  }
}

# Update status
mutation {
  updateTodo(id: "todo-456", input: {
    status: IN_PROGRESS
  }) {
    id
    status
  }
}

# Complete todo
mutation {
  completeTodo(id: "todo-456") {
    id
    status
    completedAt
  }
}
```

### Best Practices

1. **One todo = one task** - Keep todos atomic
2. **Use priority levels** - CRITICAL > HIGH > MEDIUM > LOW
3. **Tag consistently** - Use standardized tags
4. **Link to projects** - Always associate todos with projects
5. **Update status promptly** - Move to IN_PROGRESS when starting

---

## Common Tasks

### Syncing Project to Salesforce

```graphql
mutation {
  syncProjectToSalesforce(id: "proj-123") {
    success
    salesforceId
    errors
  }
}
```

### Deploying to Vercel

```graphql
mutation {
  deployToCloud(
    provider: VERCEL
    input: {
      projectId: "proj-123"
      environment: "production"
      gitRef: "main"
    }
  ) {
    success
    deploymentId
    url
  }
}
```

### Generating a Secure Hash

```graphql
mutation {
  generateShaInfinityHash(
    input: "sensitive data"
    iterations: 50000
  ) {
    hash
    iterations
    algorithm
    verificationHash
  }
}
```

### Checking Integration Health

```graphql
query {
  integrationHealth {
    cloudflare { enabled connected latency }
    salesforce { enabled connected latency }
    vercel { enabled connected latency }
    github { enabled connected latency }
    overall
    timestamp
  }
}
```

---

## Emergency Procedures

### If a PR Fails

1. Check the CI logs for the specific failure
2. Fix locally and push updates
3. Re-run checks
4. Request re-review if needed

### If a Deployment Fails

1. Check deployment logs
2. Identify the failure point
3. Rollback if necessary
4. Fix and redeploy

### If Sync Conflicts Occur

1. Git is always the source of truth
2. Pull latest from Git
3. Resolve conflicts locally
4. Push resolved state
5. Re-sync to CRM/Cloudflare

---

## Contact

For issues or questions:
- Email: blackroad.systems@gmail.com
- GitHub Issues: https://github.com/BlackRoad-OS/blackroad-graphql-server/issues

---

*Part of the BlackRoad OS ecosystem - 350+ products across 46 categories*
