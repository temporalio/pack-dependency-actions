# Example Workflows

This directory contains example workflows demonstrating how to use the pack-dependency-actions in your projects.

## Workflow Files

### check-ui-pack-version.yml
Checks version consistency on every PR. Can be called directly or via workflow_call.

### check-ui-pack-version-sweep.yml  
Periodically sweeps all open PRs to check for version mismatches. Runs on:
- Push to main when .ui-sha changes
- Manual dispatch
- Schedule (every 6 hours)

### generate-ui-pr.yml
Generates PRs with packed dependencies from temporalio/ui. Includes:
- SHA validation and rollback protection
- Commit changelog generation
- Full pack workflow with pre-pack commands
- Draft PR creation

### auto-delete-generated-prs.yaml
Cleans up stale automated PRs. Features:
- Configurable age threshold
- Dry run mode
- Label filtering
- Author filtering

## Usage

Copy these workflows to your repository's `.github/workflows/` directory and customize:

1. Update repository references
2. Adjust schedules and triggers
3. Customize labels and PR templates
4. Configure pack commands for your project type

## Integration Pattern

```yaml
# In your .github/workflows/check-version.yml
- uses: temporalio/pack-dependency-actions/check-version@v1
  with:
    file-path: '.ui-sha'
    pr-number: ${{ github.event.pull_request.number }}
```