# DangerJS Pack Version Check Plugin

A reusable DangerJS plugin that provides feature parity with the GitHub Actions check-version workflow. This plugin checks pack version files in PRs and posts helpful comments when versions differ from the main branch.

## Features

- 🔄 **Feature parity** with GitHub Actions check-version
- 📝 **Smart commenting** with deduplication (Danger handles this automatically)
- 🎯 **Intelligent detection** of version mismatches
- 🔧 **Highly configurable** with custom templates
- 📦 **TypeScript support** with full type definitions
- 🚀 **Reusable** across multiple repositories
- ⚡ **Lightweight** with minimal dependencies

## Installation

### Option 1: NPM Package (Recommended for multiple repos)

```bash
# Install as a dev dependency
npm install --save-dev @temporalio/danger-pack-version-check

# Or with pnpm
pnpm add -D @temporalio/danger-pack-version-check

# Or with yarn
yarn add -D @temporalio/danger-pack-version-check
```

### Option 2: Direct from Repository

```bash
# Install from GitHub
npm install --save-dev github:temporalio/pack-dependency-actions#main
```

### Option 3: Copy Files Directly

Copy the `pack-version-check.js` or `pack-version-check.ts` file to your repository's danger plugins folder.

## Basic Usage

### JavaScript

```javascript
// dangerfile.js
const { checkPackVersion } = require('@temporalio/danger-pack-version-check');

(async () => {
  await checkPackVersion({
    filePath: '.ui-sha',
    commentTitle: 'UI Pack Version Mismatch',
    allowPattern: '^(update|generate|release)-ui-.*',
    updateCommand: 'pnpm run update-ui'
  });
})();
```

### TypeScript

```typescript
// dangerfile.ts
import { checkPackVersion } from '@temporalio/danger-pack-version-check';

(async (): Promise<void> => {
  await checkPackVersion({
    filePath: '.ui-sha',
    commentTitle: 'UI Pack Version Mismatch',
    allowPattern: '^(update|generate|release)-ui-.*',
    updateCommand: 'pnpm run update-ui'
  });
})();
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `filePath` | string | `.ui-sha` | Path to version file to check |
| `commentTitle` | string | `Version Mismatch Detected` | Title for PR comment |
| `allowPattern` | string | `^(update\|generate\|auto)-.*` | Regex for allowed branch names |
| `updateCommand` | string | `git fetch origin main && git merge origin/main` | Command to fix mismatch |
| `commentBodyTemplate` | string | See below | Custom comment template |

## Advanced Usage

### Multiple Pack Files

```javascript
const { checkMultiplePackVersions } = require('@temporalio/danger-pack-version-check');

(async () => {
  const results = await checkMultiplePackVersions([
    {
      filePath: '.ui-sha',
      commentTitle: 'UI Pack Version Mismatch',
      allowPattern: '^(update|generate|release)-ui-.*'
    },
    {
      filePath: '.registry-sha',
      commentTitle: 'Registry Pack Version Mismatch',
      allowPattern: '^(update|generate|release)-registry-.*'
    }
  ]);
  
  if (results.hasFailures) {
    console.log('Some checks failed:', results.results);
  }
})();
```

### Custom Comment Template

```javascript
await checkPackVersion({
  filePath: '.ui-sha',
  commentBodyTemplate: `
## ⚠️ {comment_title}

Your PR has a version mismatch in \`{file_path}\`.

| Branch | Version |
|--------|---------|
| main   | \`{main_version}\` |
| PR     | \`{pr_version}\` |

**Fix:** \`{update_command}\`
**Reason:** {reason}
`
});
```

### Template Placeholders

- `{comment_title}` - The comment title
- `{file_path}` - Path to version file
- `{main_version}` - Version from main branch
- `{pr_version}` - Version from PR
- `{update_command}` - Command to fix mismatch
- `{reason}` - Human-readable reason

### Conditional Checks

```javascript
// Only check if UI files were modified
const hasUIChanges = danger.git.modified_files.some(
  file => file.startsWith('packages/ui/')
);

if (hasUIChanges) {
  await checkPackVersion({
    filePath: '.ui-sha',
    commentTitle: 'UI Pack Version Mismatch'
  });
}
```

### Environment-Specific Rules

```javascript
const targetBranch = danger.github.pr.base.ref;

if (targetBranch === 'main') {
  // Strict for main
  await checkPackVersion({
    filePath: '.ui-sha',
    allowPattern: '^release-.*'
  });
} else if (targetBranch === 'develop') {
  // Lenient for develop
  await checkPackVersion({
    filePath: '.ui-sha',
    allowPattern: '^(update|test|release)-.*'
  });
}
```

## Return Values

### CheckResult

```typescript
interface CheckResult {
  shouldBlock: boolean;
  reason: string;
  mainVersion?: string | null;
  prVersion?: string | null;
  baseVersion?: string | null;
}
```

### MultiCheckResult

```typescript
interface MultiCheckResult {
  results: Array<CheckResult & { filePath: string }>;
  hasFailures: boolean;
}
```

## Setting Up Danger in Your Repository

1. **Install Danger**:
```bash
npm install --save-dev danger
```

2. **Create a Dangerfile**:
```javascript
// dangerfile.js
const { checkPackVersion } = require('@temporalio/danger-pack-version-check');

(async () => {
  await checkPackVersion({
    filePath: '.ui-sha'
  });
})();
```

3. **Add to CI** (GitHub Actions example):
```yaml
name: Danger

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  danger:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - run: npm ci
      
      - name: Run Danger
        run: npx danger ci
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Comparison with GitHub Action

| Feature | GitHub Action | DangerJS Plugin |
|---------|--------------|-----------------|
| Version checking | ✅ | ✅ |
| PR comments | ✅ | ✅ |
| Comment deduplication | Manual | Automatic |
| Branch patterns | ✅ | ✅ |
| Multiple files | Sequential | Parallel |
| Custom templates | ✅ | ✅ |
| TypeScript support | ❌ | ✅ |
| Local testing | ❌ | ✅ |
| Reusability | Via action | Via npm package |

## Benefits of DangerJS Approach

1. **Unified PR Checks**: Combine with other code review checks
2. **Local Testing**: Run `danger pr <PR_URL>` locally
3. **Better Deduplication**: Danger automatically manages comment updates
4. **Type Safety**: Full TypeScript support
5. **Flexibility**: Easy to add custom logic
6. **Performance**: Runs in single Node process
7. **Reusability**: Share via npm across organizations

## Examples

See the [examples](./examples) directory for complete Dangerfile examples:
- [JavaScript Example](./examples/dangerfile.js)
- [TypeScript Example](./examples/dangerfile.ts)

## Migration from GitHub Action

```yaml
# Before (GitHub Action)
- uses: temporalio/pack-dependency-actions/check-version@main
  with:
    file-path: '.ui-sha'
    comment-title: 'UI Pack Version Mismatch'
    allow-pattern: '^(update|generate|release)-ui-.*'
```

```javascript
// After (DangerJS)
await checkPackVersion({
  filePath: '.ui-sha',
  commentTitle: 'UI Pack Version Mismatch',
  allowPattern: '^(update|generate|release)-ui-.*'
});
```

## Contributing

Contributions welcome! The plugin is maintained in the [pack-dependency-actions](https://github.com/temporalio/pack-dependency-actions) repository.

## License

MIT