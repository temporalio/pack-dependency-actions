# Sample App - Pack Dependency Actions Demo

This sample application demonstrates how to use the pack-dependency-actions in a real project.

## Features

- Tracks UI dependency version in `.ui-sha` file
- Automatically generates update PRs when actions are released
- Checks version consistency on all PRs
- Cleans up stale automated PRs

## Setup

1. This app uses the pack-dependency-actions from the parent directory
2. When a new release is published to pack-dependency-actions, it triggers a workflow
3. The workflow generates a PR to update the UI dependency

## Workflows

### Generate UI PR on Release
Triggered when pack-dependency-actions publishes a new release.

### Check Version on PRs
Runs on every PR to ensure version consistency.

### Weekly Sweep
Checks all open PRs weekly for version mismatches.

### Cleanup Stale PRs
Daily cleanup of automated PRs older than 7 days.

## Testing

To test locally:
1. Update `.ui-sha` with a different SHA
2. Push to a branch
3. Open a PR
4. The check-version action will comment about the mismatch