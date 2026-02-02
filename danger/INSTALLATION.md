# Installing DangerJS Pack Version Check in Your Project

This guide shows how to add the DangerJS pack version check plugin to projects outside this repository.

## Quick Start

### 1. Install Dependencies

```bash
# Install Danger and the plugin from GitHub
npm install --save-dev danger github:temporalio/pack-dependency-actions#main

# Or with pnpm
pnpm add -D danger github:temporalio/pack-dependency-actions#main

# Or with yarn
yarn add -D danger github:temporalio/pack-dependency-actions#main
```

### 2. Create Dangerfile

Create `dangerfile.js` in your repository root:

```javascript
const { checkPackVersion } = require('pack-dependency-actions/danger/pack-version-check');

(async () => {
  await checkPackVersion({
    filePath: '.ui-sha',
    commentTitle: 'UI Pack Version Mismatch',
    allowPattern: '^(release)-ui-.*',
    updateCommand: '', // Empty if no specific command
    commentBodyTemplate: `
## UI Pack Version Mismatch 🔄

The UI pack version in \`{file_path}\` differs from the main branch.

**Main branch:** \`{main_version}\`
**This PR:** \`{pr_version}\`

To update this PR with the latest version from main, run:
\`\`\`bash
git fetch origin main && git merge origin/main
\`\`\`

**Reason:** {reason}`
  });
})();
```

### 3. Add GitHub Action

Create `.github/workflows/danger.yml`:

```yaml
name: Danger

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  danger:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Required for version comparisons
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci  # or pnpm install
      
      - name: Run Danger
        run: npx danger ci
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Installation Options

### Option 1: Install from GitHub (Recommended)

```bash
npm install --save-dev github:temporalio/pack-dependency-actions#main
```

Then import in your Dangerfile:
```javascript
const { checkPackVersion } = require('pack-dependency-actions/danger/pack-version-check');
```

### Option 2: Copy Files Directly

If you prefer to vendor the code:

```bash
# Create danger plugins directory
mkdir -p .danger

# Download the plugin
curl -o .danger/pack-version-check.js \
  https://raw.githubusercontent.com/temporalio/pack-dependency-actions/main/danger/pack-version-check.js
```

Then import locally:
```javascript
const { checkPackVersion } = require('./.danger/pack-version-check');
```

### Option 3: Git Submodule

```bash
# Add as submodule
git submodule add https://github.com/temporalio/pack-dependency-actions.git .danger/pack-dependency-actions

# Import from submodule
const { checkPackVersion } = require('./.danger/pack-dependency-actions/danger/pack-version-check');
```

## Configuration Examples

### Basic Configuration

```javascript
await checkPackVersion({
  filePath: '.ui-sha'  // Minimum required
});
```

### Advanced Configuration

```javascript
await checkPackVersion({
  filePath: '.ui-sha',
  commentTitle: 'UI Pack Version Mismatch',
  allowPattern: '^(release|update|generate)-ui-.*',
  updateCommand: 'pnpm run update-ui',
  commentBodyTemplate: 'custom template here...'
});
```

### Multiple Pack Files

```javascript
const { checkMultiplePackVersions } = require('pack-dependency-actions/danger/pack-version-check');

await checkMultiplePackVersions([
  {
    filePath: '.ui-sha',
    commentTitle: 'UI Pack Version Mismatch',
    allowPattern: '^(release)-ui-.*'
  },
  {
    filePath: '.registry-sha',
    commentTitle: 'Registry Pack Version Mismatch',
    allowPattern: '^(release)-registry-.*'
  }
]);
```

### Smart Checks (Only Check Modified Files)

```javascript
const { smartPackChecks } = require('pack-dependency-actions/danger/shared-config');

// Only checks packs if relevant files were modified
await smartPackChecks();
```

## TypeScript Support

### 1. Install Types

```bash
pnpm add -D @types/danger typescript ts-node
```

### 2. Create `dangerfile.ts`

```typescript
import { danger } from 'danger';
// @ts-ignore (until types are published)
import { checkPackVersion } from 'pack-dependency-actions/danger/pack-version-check';

(async (): Promise<void> => {
  await checkPackVersion({
    filePath: '.ui-sha',
    commentTitle: 'UI Pack Version Mismatch',
    allowPattern: '^(release)-ui-.*'
  });
})();
```

### 3. Update package.json

```json
{
  "scripts": {
    "danger": "danger ci --dangerfile dangerfile.ts"
  }
}
```

## Testing Locally

Before committing, test your Dangerfile:

```bash
# Test against a specific PR
npx danger pr https://github.com/your-org/your-repo/pull/123

# Test with local changes (dry run)
npx danger local
```

## Troubleshooting

### Error: Cannot find module

Ensure you've installed the package:
```bash
npm ls pack-dependency-actions
```

### No comments appearing

1. Check GitHub token has `pull-requests: write` permission
2. Verify `fetch-depth: 0` in checkout action
3. Test locally with `npx danger pr <URL>`

### Version comparisons not working

Ensure full git history is available:
```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0  # Must be 0, not 1
```

## Comparison with GitHub Action

| Feature | GitHub Action | DangerJS |
|---------|--------------|----------|
| Setup complexity | Simple | Moderate |
| Local testing | ❌ | ✅ |
| Comment deduplication | Manual | Automatic |
| Integration with other checks | Separate | Unified |
| Performance | New container | Same process |
| Reusability | Action reference | NPM package |

## Benefits

- **Unified PR checks**: Combine with other Danger rules
- **Local testing**: Test before pushing
- **Better deduplication**: Danger handles comment updates
- **Flexible**: Easy to add custom logic
- **Performant**: Runs in single Node process

## Need Help?

- [Danger Documentation](https://danger.systems/js/)
- [Pack Dependency Actions Repository](https://github.com/temporalio/pack-dependency-actions)
- [Example Dangerfiles](https://github.com/temporalio/pack-dependency-actions/tree/main/danger/examples)