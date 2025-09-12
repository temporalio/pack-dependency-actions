# Check Version Action

A GitHub Action that checks and compares dependency versions between the main branch and pull requests. It creates helpful, non-blocking review comments when versions differ, with smart deduplication and support for various scenarios.

## Features

- **Non-blocking reviews**: Uses `COMMENT` type reviews instead of `REQUEST_CHANGES`, allowing PRs to be merged even with version mismatches
- **Smart deduplication**: Updates existing comments instead of creating duplicates when new commits are pushed
- **Intelligent detection**: Distinguishes between:
  - PR modifications (invalid test versions)
  - Outdated versions (PR hasn't touched the file)
  - New files (version file doesn't exist on main)
  - Divergent versions (both branches changed differently)
- **Branch pattern support**: Allow certain branch patterns to modify versions (e.g., automated update branches)
- **Customizable messaging**: Full control over comment title and body templates

## Usage

### Basic Usage

```yaml
- uses: temporalio/pack-dependency-actions/check-version@v1
  with:
    pr-number: ${{ github.event.pull_request.number }}
```

### Advanced Usage

```yaml
- uses: temporalio/pack-dependency-actions/check-version@v1
  with:
    file-path: '.ui-sha'
    pr-number: ${{ github.event.pull_request.number }}
    comment-title: 'UI Pack Version Mismatch'
    allow-pattern: '^(update|generate|release)-ui-.*'
    update-command: 'pnpm run update-ui'
    comment-body-template: |
      ## {comment_title} 🔄
      
      The pack version in `{file_path}` differs from the main branch.
      
      **Main branch:** `{main_version}`
      **This PR:** `{pr_version}`
      
      To update this PR with the latest version from main, run:
      ```bash
      {update_command}
      ```
      
      **Reason:** {reason}
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `file-path` | Path to version file to check | No | `.ui-sha` |
| `pr-number` | PR number (for workflow_call scenarios) | No | - |
| `comment-title` | Title for PR comment | No | `Version Mismatch Detected` |
| `comment-body-template` | Template for comment body with placeholders | No | See below |
| `update-command` | Command to fix version mismatch | No | `git fetch origin main && git merge origin main` |
| `token` | GitHub token | No | `${{ github.token }}` |
| `allow-pattern` | Regex pattern for branch names allowed to change versions | No | `^(update\|generate\|auto)-.*` |

### Comment Body Template Placeholders

The `comment-body-template` supports these placeholders:
- `{comment_title}` - The comment title
- `{file_path}` - Path to the version file
- `{main_version}` - Version from main branch
- `{pr_version}` - Version from PR
- `{update_command}` - Command to fix the mismatch
- `{reason}` - Human-readable reason for the decision

## Outputs

| Output | Description |
|--------|-------------|
| `should-block` | Boolean indicating if PR should be blocked |
| `main-version` | Version from main branch |
| `pr-version` | Version from PR branch |
| `base-version` | Version from merge base |
| `pr-modified` | Boolean indicating if PR modified the file |
| `reason` | Human-readable reason for the decision |

## Decision Logic

The action makes intelligent decisions based on the following logic:

### ✅ Passes (No Comment)
1. **Allowed branch**: Branch name matches `allow-pattern`
2. **Versions match**: PR and main have the same version
3. **Not modified**: PR hasn't touched the version file (just outdated)
4. **Both missing**: Version file doesn't exist in either branch
5. **New file**: Version file is new (doesn't exist on main)

### ❌ Fails (Creates Comment)
1. **Invalid test version**: PR modified version while main hasn't changed
2. **Divergent versions**: Both PR and main modified the version differently
3. **Other modifications**: Any other case where PR has modified the file

## Example Scenarios

### Scenario 1: Testing with Invalid Version
```yaml
# PR branch changes .ui-sha to "test-version-123"
# Main branch has "abc123def456"
# Result: Comment created with reason "PR modified version while main hasn't changed"
```

### Scenario 2: Adding New Pack File
```yaml
# PR adds new .registry-sha file
# File doesn't exist on main branch
# Result: Passes - "New version file added (doesn't exist on main)"
```

### Scenario 3: Outdated PR
```yaml
# PR created with .ui-sha = "abc123"
# Main updated to "def456" after PR was created
# PR hasn't modified .ui-sha
# Result: Passes - "PR hasn't modified the version file"
```

### Scenario 4: Automated Update Branch
```yaml
# Branch name: "update-ui-dependencies"
# Matches allow-pattern: '^(update|generate|auto)-.*'
# Result: Passes - "Branch is allowed to modify versions"
```

## Multiple Pack Files

To check multiple pack files, use the action multiple times with `continue-on-error`:

```yaml
jobs:
  check-packs:
    runs-on: ubuntu-latest
    steps:
      - name: Check UI pack
        id: check-ui
        continue-on-error: true
        uses: temporalio/pack-dependency-actions/check-version@v1
        with:
          file-path: '.ui-sha'
          pr-number: ${{ github.event.pull_request.number }}
      
      - name: Check Registry pack
        id: check-registry
        continue-on-error: true
        uses: temporalio/pack-dependency-actions/check-version@v1
        with:
          file-path: '.registry-sha'
          pr-number: ${{ github.event.pull_request.number }}
      
      - name: Fail if any check failed
        if: steps.check-ui.outcome == 'failure' || steps.check-registry.outcome == 'failure'
        run: exit 1
```

## Comment Deduplication

The action intelligently manages PR comments:
1. **First run**: Creates a new review with a comment on the file
2. **Subsequent runs**: Updates the existing comment with new information
3. **Commit SHA tracking**: Comments are updated to point to the latest commit
4. **No duplicates**: Only one comment per file, updated as needed

## Requirements

- Repository must have `fetch-depth: 0` in checkout to access full history
- GitHub token needs `pull-requests: write` permission
- Works with `pull_request` events

## Complete Workflow Example

See [example.yml](./example.yml) for a complete workflow example including:
- Basic usage
- Advanced configuration
- Multiple pack files
- Using outputs for conditional logic