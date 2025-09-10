# Pack Dependency Actions

A collection of modular GitHub Actions for managing packed dependencies from upstream repositories. These actions automate the process of building, packing, and updating dependencies from source, particularly useful for monorepos and projects that need to consume pre-release versions of dependencies.

## Philosophy

This repository provides individual, focused actions rather than composite workflows. This design allows consuming repositories to:
- Compose actions in ways specific to their needs
- Add custom steps between actions
- Use only the actions they need
- Maintain full control over their workflow logic

## Current Actions

This repository provides 9 specialized actions that can be composed together to create complete dependency management workflows:

### Core Actions

#### validate-sha
Validates and resolves target SHA for a repository, preventing accidental rollbacks.

**Usage:**
```yaml
- uses: temporalio/pack-dependency-actions/validate-sha@main
  with:
    repository: 'owner/repo'
    target-sha: ${{ github.event.inputs.target-sha }}
    file-path: '.registry-sha'
    allow-rollback: false
```

#### download-source
Downloads source code from a repository at a specific SHA.

**Usage:**
```yaml
- uses: temporalio/pack-dependency-actions/download-source@main
  with:
    repository: 'owner/repo'
    sha: ${{ steps.validate.outputs.resolved-sha }}
    token: ${{ secrets.GITHUB_TOKEN }}
```

#### build-and-pack
Builds and packs a project from source.

**Usage:**
```yaml
- uses: temporalio/pack-dependency-actions/build-and-pack@main
  with:
    source-path: 'source'
    build-command: 'pnpm build'
    pack-command: 'pnpm pack'
```

#### move-pack
Moves and renames packed tarballs with SHA for traceability.

**Usage:**
```yaml
- uses: temporalio/pack-dependency-actions/move-pack@main
  with:
    source-path: 'source'
    pack-destination: './packs'
    package-name: 'my-package'
    sha: ${{ steps.validate.outputs.resolved-sha }}
    source-pattern: '*.tgz'
```

#### update-dependencies
Updates package.json dependencies to use packed tarballs.

**Usage:**
```yaml
- uses: temporalio/pack-dependency-actions/update-dependencies@main
  with:
    package-names: '@org/package1,@org/package2'
    pack-files: './packs/package1.tgz,./packs/package2.tgz'
    package-manager: 'pnpm'
```

#### generate-changelog
Generates a changelog between two commits.

**Usage:**
```yaml
- uses: temporalio/pack-dependency-actions/generate-changelog@main
  with:
    repository: 'owner/repo'
    from-sha: ${{ steps.validate.outputs.last-sha }}
    to-sha: ${{ steps.validate.outputs.resolved-sha }}
    format: 'markdown'
```

### PR Management Actions

#### check-version
Checks and compares dependency versions between main branch and PRs, posting comments when versions differ.

**Usage:**
```yaml
- uses: temporalio/pack-dependency-actions/check-version@main
  with:
    file-path: '.ui-sha'
    pr-number: ${{ github.event.pull_request.number }}
    update-command: 'pnpm run update-ui'
```

#### version-sweep
Sweeps all open PRs to check version consistency across the repository.

**Usage:**
```yaml
- uses: temporalio/pack-dependency-actions/version-sweep@main
  with:
    file-path: '.ui-sha'
    base-branch: 'main'
    labels-filter: 'needs-update'
```

### Automation Actions

#### dispatch-workflow
Triggers workflows in remote repositories.

**Usage:**
```yaml
- uses: temporalio/pack-dependency-actions/dispatch-workflow@main
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    repository: 'owner/repo'
    workflow: 'update-dependencies.yml'
    inputs: '{"target-sha": "${{ github.sha }}"}'
    wait-for-completion: true
```

**Key Features:**
- Triggers workflows in other repositories
- Pass custom inputs to the target workflow
- Optional waiting for workflow completion
- Returns workflow run ID and URL

**Common Use Case:**
Trigger dependency update workflows in downstream repositories when upstream changes are merged:
```yaml
# In frontend-workflow-runner repo, on push to main:
- uses: temporalio/pack-dependency-actions/dispatch-workflow@main
  with:
    repository: 'temporalio/frontend-shared-workflows'
    workflow: 'update-temporal-workers.yml'
    inputs: '{"target-sha": "${{ github.sha }}"}'
```

**Note:** PR reuse is handled automatically by `peter-evans/create-pull-request` in the target workflow when using the same branch name. Consider implementing a "mode" parameter in your target workflow to control whether to create test PRs (with SHA in branch name) or release PRs (with fixed branch name for automatic updates).

#### auto-delete
Automatically closes and deletes stale generated PRs to keep the repository clean.

**Usage:**
```yaml
- uses: temporalio/pack-dependency-actions/auto-delete@main
  with:
    days-old: 7
    labels-filter: 'test-ui,automated'
    dry-run: false
```

## Composing Actions in Your Workflow

These actions are designed to be composed together in your repository's workflows. Here's a complete example showing how to combine them:

### Example: Complete Update Workflow

This real-world example from `frontend-shared-workflows` demonstrates composing multiple actions to update packed dependencies:

```yaml
name: Update Temporal Workers Packages

on:
  workflow_dispatch:
    inputs:
      target-sha:
        description: 'Target commit SHA or branch (leave blank for latest)'
        required: false

jobs:
  update-packs:
    runs-on: ubuntu-latest
    steps:
      # 1. Validate the target SHA
      - name: Validate SHA
        id: validate
        uses: temporalio/pack-dependency-actions/validate-sha@main
        with:
          repository: temporalio/frontend-workflow-runner
          target-sha: ${{ github.event.inputs.target-sha }}
          file-path: .registry-sha
          allow-rollback: true

      # 2. Download the source code
      - name: Download source
        uses: temporalio/pack-dependency-actions/download-source@main
        with:
          repository: temporalio/frontend-workflow-runner
          sha: ${{ steps.validate.outputs.resolved-sha }}

      # 3. Build and pack multiple packages
      - name: Build and pack registry
        uses: temporalio/pack-dependency-actions/build-and-pack@main
        with:
          source-path: source
          build-command: 'pnpm -r build'
          pack-command: 'pnpm pack:registry'

      # 4. Move packed files with SHA naming
      - name: Move registry pack
        uses: temporalio/pack-dependency-actions/move-pack@main
        with:
          source-path: source
          pack-destination: ./packs
          package-name: 'temporal-workers-registry'
          sha: ${{ steps.validate.outputs.resolved-sha }}

      # 5. Update package.json dependencies
      - name: Update dependencies
        uses: temporalio/pack-dependency-actions/update-dependencies@main
        with:
          package-names: '@temporal-workers/registry,@temporal-workers/ui'
          pack-files: './packs/temporal-workers-registry-${{ steps.validate.outputs.short-sha }}.tgz,./packs/temporal-workers-ui-${{ steps.validate.outputs.short-sha }}.tgz'

      # 6. Generate changelog
      - name: Generate changelog
        uses: temporalio/pack-dependency-actions/generate-changelog@main
        with:
          repository: temporalio/frontend-workflow-runner
          from-sha: ${{ steps.validate.outputs.last-sha }}
          to-sha: ${{ steps.validate.outputs.resolved-sha }}

      # 7. Create PR with all changes
      - uses: peter-evans/create-pull-request@v7
        with:
          title: 'Update to ${{ steps.validate.outputs.short-sha }}'
          body: ${{ steps.changelog.outputs.changelog }}
```

## Common Patterns

### Building and Packing from Source

A typical workflow for building and packing dependencies from source follows this pattern:

1. **Validate** the target SHA to prevent rollbacks
2. **Download** the source code
3. **Build and pack** the project
4. **Move** packed files with SHA naming
5. **Update** package.json dependencies
6. **Generate** a changelog
7. **Create** a PR with the changes

### Automated Dependency Updates Pattern

For automated dependency updates triggered from upstream repositories:

1. **Upstream repo** (e.g., frontend-workflow-runner) merges to main
2. **Dispatch action** triggers workflow in downstream repo
3. **Downstream workflow** supports two modes:
   - **Test mode**: Creates new PR with SHA in branch/title (for testing specific versions)
   - **Release mode**: Updates single reusable PR (for automated continuous updates)
4. **peter-evans/create-pull-request** automatically handles PR reuse when branch name is consistent

Example implementation in target workflow:
```yaml
inputs:
  mode:
    type: choice
    options: [test, release]
    default: test

# In PR creation step:
- if: inputs.mode == 'release'
  run: echo "branch=update-dependencies" >> $GITHUB_OUTPUT
- if: inputs.mode == 'test'  
  run: echo "branch=test-dependencies-${{ sha }}" >> $GITHUB_OUTPUT
```

### Versioning Strategy

The actions use SHA-based versioning for packed dependencies:
- Pack files are named with the commit SHA: `package-name-{short-sha}.tgz`
- Version files (`.ui-sha`, `.registry-sha`) track the current SHA
- This provides complete traceability back to the source commit

## Action Parameters

### Common Input Parameters

Most actions share these common parameters:

| Parameter | Description | Used By |
|-----------|-------------|---------|
| `repository` | Source repository (owner/name) | validate-sha, download-source, generate-changelog |
| `sha` / `target-sha` | Commit SHA or branch | validate-sha, download-source, move-pack |
| `file-path` | Version tracking file | validate-sha, check-version |
| `source-path` | Path to source code | build-and-pack, move-pack |
| `pack-destination` | Output directory for packs | move-pack |
| `package-name` | Package name for naming | move-pack |
| `build-command` | Build command to run | build-and-pack |
| `pack-command` | Pack command to run | build-and-pack |
| `package-manager` | npm, pnpm, or yarn | update-dependencies |


## Installation

1. Reference the actions directly from this repository:
   ```yaml
   uses: temporalio/pack-dependency-actions/action-name@main
   ```

2. Or fork to your organization for customization:
   ```yaml
   uses: your-org/pack-dependency-actions/action-name@main
   ```

3. Add necessary secrets:
   - `GITHUB_TOKEN` (usually available by default)
   - App tokens for cross-repository access (if needed)

## Use Cases

### 1. Consuming Pre-Release Dependencies
When you need to use the latest changes from an upstream repository before they're published to npm:
- Build and pack dependencies directly from source
- Version with commit SHA for traceability
- Automatically update when upstream changes

### 2. Monorepo Package Distribution
For distributing packages within a monorepo or across organizations:
- Pack workspace packages for consumption
- Maintain version consistency across projects
- Automate dependency updates with PRs

### 3. Testing Integration Changes
When testing integration between multiple repositories:
- Create test PRs with specific dependency versions
- Validate changes before official releases
- Clean up stale test PRs automatically

## Key Features

- **Modular Design**: Each action performs a specific task and can be used independently
- **SHA Tracking**: All packed dependencies are versioned with commit SHAs for complete traceability
- **Rollback Prevention**: Built-in validation prevents accidental downgrades
- **Automated Workflows**: Combine actions to create fully automated dependency update pipelines
- **Cross-Repository Support**: Works with any GitHub repository using appropriate tokens
- **Package Manager Agnostic**: Supports npm, pnpm, and yarn

## Action Outputs

Each action provides specific outputs for chaining:

### validate-sha
- `resolved-sha`: Full SHA that was validated
- `short-sha`: Short version (8 chars) of the SHA
- `last-sha`: Previous SHA from the version file
- `is-rollback`: Whether this is a rollback

### build-and-pack
- `pack-files`: List of generated pack files

### generate-changelog
- `changelog`: Formatted changelog content

### dispatch-workflow
- `workflow-id`: ID of the dispatched workflow run
- `workflow-url`: URL of the dispatched workflow run
- `status`: Final status if wait-for-completion is true
- `conclusion`: Final conclusion if wait-for-completion is true

## Requirements

- GitHub Actions enabled in your repository
- Appropriate permissions for the GitHub token:
  - `contents: read` (minimum)
  - `contents: write` (for PR creation)
  - `pull-requests: write` (for PR operations)
- Node.js and package manager (npm/pnpm/yarn) in workflow
- Dependencies on external actions:
  - `actions/checkout@v4`
  - `actions/setup-node@v4`
  - `pnpm/action-setup@v2` (if using pnpm)
  - `peter-evans/create-pull-request@v7` (for PR creation)
  - `peter-evans/find-comment@v3` (for PR comments)
  - `peter-evans/create-or-update-comment@v4` (for PR comments)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT