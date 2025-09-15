# Analyze Commits for Bump Action

A GitHub Action that analyzes commits between two Git references to determine the appropriate semantic version bump type (major, minor, or patch) based on conventional commit patterns.

## Features

- **Intelligent bump detection**: Analyzes commit messages to determine semantic version bump type
- **Configurable patterns**: Customize patterns for major and minor version detection
- **Flexible reference handling**: Works with tags, branches, and commit SHAs
- **Graceful fallbacks**: Handles missing references by analyzing recent commits
- **Conventional commits support**: Works with conventional commit standards out of the box

## Usage

### Basic Usage

```yaml
- uses: temporalio/pack-dependency-actions/analyze-commits-for-bump@main
  with:
    from-ref: 'v1.0.0'
    to-ref: 'HEAD'
```

### Advanced Usage

```yaml
- uses: temporalio/pack-dependency-actions/analyze-commits-for-bump@main
  with:
    from-ref: ${{ steps.last-tag.outputs.tag }}
    to-ref: 'main'
    max-commits: 20
    major-patterns: 'BREAKING CHANGE,!:,BREAKING'
    minor-patterns: 'feat,feature,add,new'
```

### In a Version Bump Workflow

```yaml
jobs:
  version-bump:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Required for commit history
      
      - name: Get last version tag
        id: last-tag
        run: |
          LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
          echo "tag=$LAST_TAG" >> $GITHUB_OUTPUT
      
      - name: Analyze commits for version bump
        id: analyze
        uses: temporalio/pack-dependency-actions/analyze-commits-for-bump@main
        with:
          from-ref: ${{ steps.last-tag.outputs.tag }}
          to-ref: HEAD
      
      - name: Calculate new version
        uses: temporalio/pack-dependency-actions/calculate-semantic-version@main
        with:
          current-version: ${{ steps.last-tag.outputs.tag }}
          bump-type: ${{ steps.analyze.outputs.bump-type }}
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `from-ref` | Starting reference (tag, SHA, or branch) to analyze from | Yes | - |
| `to-ref` | Ending reference to analyze to | No | `HEAD` |
| `max-commits` | Maximum commits to analyze if from-ref not found | No | `10` |
| `major-patterns` | Comma-separated regex patterns for major version bumps | No | `BREAKING CHANGE,BREAKING,breaking change,major` |
| `minor-patterns` | Comma-separated regex patterns for minor version bumps | No | `feat,feature,minor,add` |

## Outputs

| Output | Description | Example |
|--------|-------------|---------|
| `bump-type` | Determined bump type | `major`, `minor`, or `patch` |
| `commit-count` | Number of commits analyzed | `15` |
| `latest-sha` | Latest commit SHA in the range | `abc123def456` |
| `has-commits` | Whether any commits were found | `true` or `false` |

## Pattern Matching Logic

The action determines the bump type using the following precedence:

1. **Major**: If any commit message matches the major patterns
2. **Minor**: If any commit message matches the minor patterns (and no major patterns found)
3. **Patch**: Default if no major or minor patterns are matched

### Default Patterns

#### Major Version Patterns
- `BREAKING CHANGE` - Conventional commits breaking change footer
- `BREAKING` - Alternative breaking change indicator
- `breaking change` - Case variations
- `major` - Explicit major bump indicator

#### Minor Version Patterns
- `feat` - Conventional commits feature type
- `feature` - Alternative feature indicator
- `minor` - Explicit minor bump indicator
- `add` - Common indicator for new functionality

## Example Scenarios

### Scenario 1: Breaking Change Detection
```yaml
# Commits:
# - "feat: add new API endpoint"
# - "BREAKING CHANGE: remove deprecated methods"
# - "fix: resolve edge case"
# Result: bump-type = "major"
```

### Scenario 2: Feature Addition
```yaml
# Commits:
# - "feat: add dark mode support"
# - "fix: correct typo in docs"
# - "chore: update dependencies"
# Result: bump-type = "minor"
```

### Scenario 3: Bug Fixes Only
```yaml
# Commits:
# - "fix: resolve memory leak"
# - "docs: update README"
# - "chore: clean up code"
# Result: bump-type = "patch"
```

### Scenario 4: No Previous Tag
```yaml
# from-ref: "v1.0.0" (doesn't exist)
# Action analyzes last 10 commits (or configured max-commits)
# Result: Analyzes recent history and determines bump type
```

## Custom Pattern Configuration

You can customize the patterns to match your project's commit conventions:

```yaml
- uses: temporalio/pack-dependency-actions/analyze-commits-for-bump@main
  with:
    from-ref: ${{ steps.last-tag.outputs.tag }}
    # Angular commit style
    major-patterns: 'BREAKING CHANGE,perf.*BREAKING'
    # Include more keywords for features
    minor-patterns: 'feat,feature,enhance,improvement'
```

## Conventional Commits Compatibility

This action works seamlessly with [Conventional Commits](https://www.conventionalcommits.org/):

- `fix:` → patch
- `feat:` → minor
- `BREAKING CHANGE:` → major
- Any commit with `!` after type (e.g., `feat!:`) → major (when included in patterns)

## Requirements

- Repository must use `fetch-depth: 0` in checkout to access full commit history
- Git must be available in the runner environment
- Works with any Git reference (tags, branches, SHAs)

## Use with Other Actions

This action pairs well with:
- [`calculate-semantic-version`](../calculate-semantic-version/README.md) - Calculate the new version number
- [`generate-changelog`](../generate-changelog/README.md) - Generate a changelog for the commits

## Complete Workflow Example

```yaml
name: Auto Version Bump

on:
  push:
    branches: [main]

jobs:
  bump-version:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Get current version
        id: current
        run: |
          VERSION=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
          echo "version=$VERSION" >> $GITHUB_OUTPUT
      
      - name: Analyze commits
        id: analyze
        uses: temporalio/pack-dependency-actions/analyze-commits-for-bump@main
        with:
          from-ref: ${{ steps.current.outputs.version }}
      
      - name: Generate changelog
        id: changelog
        uses: temporalio/pack-dependency-actions/generate-changelog@main
        with:
          repository: ${{ github.repository }}
          from-sha: ${{ steps.current.outputs.version }}
          to-sha: ${{ steps.analyze.outputs.latest-sha }}
      
      - name: Calculate new version
        id: new-version
        uses: temporalio/pack-dependency-actions/calculate-semantic-version@main
        with:
          current-version: ${{ steps.current.outputs.version }}
          bump-type: ${{ steps.analyze.outputs.bump-type }}
      
      - name: Create Release
        if: steps.new-version.outputs.version-changed == 'true'
        uses: actions/create-release@v1
        with:
          tag_name: v${{ steps.new-version.outputs.new-version }}
          release_name: Release v${{ steps.new-version.outputs.new-version }}
          body: ${{ steps.changelog.outputs.changelog }}
```