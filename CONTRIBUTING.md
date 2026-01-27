# Contributing to BlackRoad GraphQL Server

Thank you for your interest in contributing to the BlackRoad GraphQL Server! This guide will help you get started and ensure your contributions are successful.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Code Standards](#code-standards)
4. [Pull Request Process](#pull-request-process)
5. [PR Checklist](#pr-checklist)
6. [Common Issues](#common-issues)
7. [Testing](#testing)

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Git
- A code editor (VS Code recommended)

### Clone and Setup

```bash
# Clone the repository
git clone https://github.com/BlackRoad-OS/blackroad-graphql-server.git
cd blackroad-graphql-server

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# (Most integrations are optional for local development)
```

---

## Development Setup

### Running Locally

```bash
# Start development server with hot reload
npm run dev

# Server runs at http://localhost:4000/graphql
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled server |
| `npm test` | Run tests |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run hash:test` | Run hash utility tests |

### Environment Variables

See `.env.example` for all available configuration options. For local development, most integrations can be disabled by leaving their API keys empty.

---

## Code Standards

### TypeScript

- Use strict mode
- Define explicit types (avoid `any`)
- Use interfaces for object shapes
- Export types that are used across modules

```typescript
// Good
interface ProjectInput {
  name: string;
  description?: string;
  priority: Priority;
}

// Avoid
const createProject = (input: any) => { ... }
```

### Code Style

- Use 2-space indentation
- Use single quotes for strings
- Add trailing commas
- Maximum line length: 100 characters

Run `npm run format` to auto-format code.

### File Organization

- One component/class per file
- Group related files in directories
- Use index.ts for re-exports
- Keep files under 500 lines

### Logging

Use the structured logger:

```typescript
import { logger } from './utils/logger.js';

logger.info('Operation completed', { userId, projectId });
logger.error('Operation failed', { error, context });
```

---

## Pull Request Process

### 1. Create a Branch

```bash
# For agents/bots
git checkout -b claude/<description>-<session-id>

# For humans
git checkout -b feature/<description>
git checkout -b fix/<description>
```

### 2. Make Changes

- Keep commits atomic and focused
- Write clear commit messages
- Update tests for new features
- Update documentation as needed

### 3. Test Locally

```bash
# Run all checks
npm run lint
npm run build
npm test
```

### 4. Push and Create PR

```bash
git push -u origin <branch-name>
```

Then create a PR on GitHub with:
- Clear title
- Description of changes
- Link to related issues
- Completed checklist

### 5. Address Review Feedback

- Respond to all comments
- Make requested changes
- Re-request review when ready

---

## PR Checklist

Copy this checklist into your PR description:

```markdown
## Changes
<!-- Describe your changes here -->

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Checklist
- [ ] My code follows the project's code style
- [ ] I have run `npm run lint` with no errors
- [ ] I have run `npm run build` with no errors
- [ ] I have run `npm test` with all tests passing
- [ ] I have added tests for new functionality
- [ ] I have updated documentation as needed
- [ ] I have updated `.env.example` if new env vars added
- [ ] My changes don't introduce security vulnerabilities
- [ ] I have checked for exposed secrets/credentials

## Testing Instructions
<!-- How can reviewers test your changes? -->

## Screenshots (if applicable)
<!-- Add screenshots for UI changes -->

## Related Issues
<!-- Link related issues: Fixes #123, Relates to #456 -->
```

---

## Common Issues

### PR Failing: TypeScript Errors

**Symptoms**: Build fails with type errors

**Fix**:
```bash
npm run build
# Fix any errors shown
# Common issues:
# - Missing type imports
# - Incorrect parameter types
# - Missing return types
```

### PR Failing: Lint Errors

**Symptoms**: Lint check fails

**Fix**:
```bash
npm run lint -- --fix
# Manual fixes may be needed for some issues
```

### PR Failing: Test Failures

**Symptoms**: Tests fail in CI

**Fix**:
```bash
npm test
# Review failing tests
# Update tests if behavior changed intentionally
# Fix bugs if tests reveal issues
```

### PR Failing: Missing Environment Variable

**Symptoms**: Runtime error about undefined config

**Fix**:
1. Add the variable to `.env.example`
2. Add to the config schema in `src/config/index.ts`
3. Document in README if needed

### PR Failing: Import Errors

**Symptoms**: Module not found errors

**Fix**:
- Ensure imports use `.js` extension for ESM
- Check that the file exists
- Verify the export exists in the source file

```typescript
// Correct (ESM)
import { something } from './file.js';

// Incorrect
import { something } from './file';
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- hash
```

### Writing Tests

Use Vitest for testing:

```typescript
import { describe, it, expect } from 'vitest';
import { sha256 } from './hash';

describe('sha256', () => {
  it('should produce consistent hashes', () => {
    const hash1 = sha256('test');
    const hash2 = sha256('test');
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different inputs', () => {
    const hash1 = sha256('test1');
    const hash2 = sha256('test2');
    expect(hash1).not.toBe(hash2);
  });
});
```

### Test Guidelines

- Test happy paths and edge cases
- Mock external services
- Keep tests focused and fast
- Use descriptive test names

---

## Questions?

- Check existing issues and PRs
- Read the [Agent Instructions](./AGENTS.md)
- Contact: blackroad.systems@gmail.com

---

*Part of the BlackRoad OS ecosystem - 350+ products across 46 categories*
