# Pack Dependency Actions

A collection of GitHub Actions for managing dependency version consistency across PRs in monorepo setups using packed dependencies (like `.ui-sha` files tracking upstream commits).

## Actions

This repository contains multiple reusable actions:

### 1. check-version
Checks and compares dependency versions between main branch and PRs, posting comments when versions differ.

**Usage:**
```yaml
- uses: your-org/pack-dependency-actions/check-version@v0
  with:
    file-path: '.ui-sha'
    pr-number: ${{ github.event.pull_request.number }}
    update-command: 'pnpm run update-ui'
```

### 2. version-sweep
Sweeps all open PRs to check version consistency across the repository.

**Usage:**
```yaml
- uses: your-org/pack-dependency-actions/version-sweep@v0
  with:
    file-path: '.ui-sha'
    base-branch: 'main'
    labels-filter: 'needs-update'
```

### 3. generate-pr
Automatically generates PRs with packed dependencies from source repositories, with complete build and pack workflow.

**Usage:**
```yaml
- uses: your-org/pack-dependency-actions/generate-pr@v0
  with:
    repository: 'temporalio/ui'
    target-sha: 'main'  # or specific commit SHA
    allow-rollback: false
    mode: 'test'  # or 'release'
    file-path: '.ui-sha'
    pack-destination: './packs'
    package-name: '@temporalio/ui'
    pre-pack-commands: 'pnpm svelte-kit sync'
    package-command: 'pnpm package'
    remove-prepare-script: true
    ignore-scripts: true
```

**Key Features:**
- Downloads and builds dependencies from source
- Validates target SHA against last merged version
- Prevents accidental rollbacks (configurable)
- Generates commit changelog automatically
- Removes prepare scripts and handles install flags
- Renames packed files with SHA for traceability
- Creates draft PRs with detailed commit history

### 4. auto-delete
Automatically closes and deletes stale generated PRs to keep the repository clean.

**Usage:**
```yaml
- uses: your-org/pack-dependency-actions/auto-delete@v0
  with:
    days-old: 7
    labels-filter: 'test-ui,automated'
    dry-run: false
```

## Complete Workflow Examples

The repository includes complete workflow files that combine these actions:

### Input Parameters for generate-pr

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `target-sha` | Target commit SHA or branch name | No | Latest commit |
| `allow-rollback` | Allow commits older than last merged | No | `false` |
| `mode` | PR mode (test or release) | No | `test` |
| `repository` | Source repository (owner/name) | Yes | - |
| `file-path` | Path to version file | No | `.ui-sha` |
| `pack-destination` | Directory for packed files | No | `./packs` |
| `package-name` | Name of package being packed | No | - |
| `pre-pack-commands` | Commands to run before packing | No | - |
| `package-command` | Build command before packing | No | - |
| `remove-prepare-script` | Remove prepare script from package.json | No | `true` |
| `ignore-scripts` | Use --ignore-scripts when installing | No | `true` |
| `pr-title-template` | Template for PR title | No | `{mode} {repository}@{short_sha}` |
| `pr-body-template` | Template for PR body | No | See action.yml |
| `labels` | Labels to add to PR | No | `{mode}-ui` |
| `draft` | Create as draft PR | No | `always-true` |

### check-ui-pack-version.yml
Checks UI pack version on PRs and can be called from other workflows:

```yaml
name: Check UI Pack Version
on:
  pull_request:
    branches: [main]
  workflow_call:
    inputs:
      pr_number:
        type: number
        required: true

jobs:
  check-ui-pack:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v0
      - uses: ./check-version
        with:
          file-path: '.ui-sha'
          pr-number: ${{ inputs.pr_number || github.event.pull_request.number }}
```

### check-ui-pack-version-sweep.yml
Runs periodically to check all open PRs:

```yaml
name: UI Pack Version Sweep
on:
  push:
    branches: [main]
    paths: ['.ui-sha']
  schedule:
    - cron: '0 */6 * * *'

jobs:
  sweep:
    # Uses version-sweep action to get PRs
    # Then calls check-ui-pack-version.yml for each PR
```

### generate-ui-pr.yml
Creates automated update PRs with fully packed dependencies from source:

```yaml
name: Generate temporalio/ui PR
on:
  workflow_dispatch:
    inputs:
      ui_commit_sha:
        description: 'Commit SHA or Branch Name'
        required: false
      allow_rollback:
        description: 'Allow older commits'
        type: boolean
        default: false
      mode:
        description: 'PR mode: test or release'
        type: choice
        options:
          - test
          - release

jobs:
  build-ui-pr:
    steps:
      - uses: ./generate-pr
        with:
          repository: 'temporalio/ui'
          target-sha: ${{ inputs.ui_commit_sha }}
          allow-rollback: ${{ inputs.allow_rollback }}
          mode: ${{ inputs.mode }}
```

### auto-delete-generated-prs.yaml
Cleans up stale automated PRs:

```yaml
name: Auto Delete Generated PRs
on:
  schedule:
    - cron: '0 0 * * *'
  workflow_dispatch:
    inputs:
      dry-run:
        type: boolean
        default: false

jobs:
  cleanup-stale-prs:
    # Uses auto-delete action to clean up
```

## Installation

1. Fork or copy this repository to your organization
2. Update the action references in the workflow files to point to your organization
3. Customize the configuration for your specific needs
4. Add the workflow files to your repository's `.github/workflows/` directory

## Configuration

Each action supports extensive configuration through inputs. Common configurations include:

- **Version file paths**: Customize which files to track (`.ui-sha`, `package.json`, etc.)
- **Build workflow**: Configure pre-pack commands, package commands, and pack destinations
- **Package handling**: Remove prepare scripts, ignore install scripts, rename with SHA
- **PR labels**: Control which labels are added to automated PRs
- **Cleanup policies**: Configure when to close stale PRs (days old, labels to exclude, etc.)
- **SHA validation**: Prevent accidental rollbacks with `allow-rollback` flag
- **PR modes**: Differentiate between test and release PRs with labels and naming

### Example: SvelteKit Project
```yaml
uses: your-org/pack-dependency-actions/generate-pr@v0
with:
  repository: 'your-org/sveltekit-app'
  pre-pack-commands: 'pnpm svelte-kit sync'
  package-command: 'pnpm package'
  package-name: '@your-org/ui'
```

### Example: React Project
```yaml
uses: your-org/pack-dependency-actions/generate-pr@v0
with:
  repository: 'your-org/react-app'
  package-command: 'pnpm build'
  package-name: '@your-org/components'
```

## Benefits

- **Consistency**: Ensures all PRs use the same dependency versions as main branch
- **Automation**: Reduces manual work in dependency management
- **Visibility**: Clear PR comments show version mismatches
- **Cleanliness**: Automatic cleanup prevents PR accumulation
- **Flexibility**: Each action can be used independently or combined

## Requirements

- GitHub Actions enabled in your repository
- Appropriate permissions for the GitHub token (contents: read, pull-requests: write)
- Dependencies on external actions:
  - `actions/checkout@v0`
  - `peter-evans/find-comment@v0`
  - `peter-evans/create-or-update-comment@v0`
  - `peter-evans/create-pull-request@v0`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT