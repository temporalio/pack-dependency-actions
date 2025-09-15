# Calculate Semantic Version Action

A GitHub Action that calculates new semantic versions based on the current version and a specified bump type or explicit version. Supports standard semantic versioning with optional prerelease identifiers.

## Features

- **Semantic version calculation**: Automatic major.minor.patch version bumping
- **Explicit version override**: Set a specific version directly
- **Prerelease support**: Add prerelease identifiers like beta, rc, alpha
- **Version validation**: Ensures valid semantic version format
- **Detailed outputs**: Returns parsed version components for further use
- **v-prefix handling**: Works with or without the 'v' prefix

## Usage

### Basic Usage

```yaml
- uses: temporalio/pack-dependency-actions/calculate-semantic-version@main
  with:
    current-version: '1.2.3'
    bump-type: 'minor'
```

### With Specific Version

```yaml
- uses: temporalio/pack-dependency-actions/calculate-semantic-version@main
  with:
    current-version: 'v1.2.3'
    specific-version: '2.0.0'
```

### With Prerelease

```yaml
- uses: temporalio/pack-dependency-actions/calculate-semantic-version@main
  with:
    current-version: '1.2.3'
    bump-type: 'minor'
    prerelease: 'beta'
    prerelease-number: '1'
```

### In a Version Bump Workflow

```yaml
jobs:
  version-bump:
    runs-on: ubuntu-latest
    steps:
      - name: Get current version
        id: current
        run: |
          VERSION=$(cat package.json | jq -r .version)
          echo "version=$VERSION" >> $GITHUB_OUTPUT
      
      - name: Determine bump type
        id: analyze
        uses: temporalio/pack-dependency-actions/analyze-commits-for-bump@main
        with:
          from-ref: 'v${{ steps.current.outputs.version }}'
      
      - name: Calculate new version
        id: new-version
        uses: temporalio/pack-dependency-actions/calculate-semantic-version@main
        with:
          current-version: ${{ steps.current.outputs.version }}
          bump-type: ${{ steps.analyze.outputs.bump-type }}
      
      - name: Update version
        if: steps.new-version.outputs.version-changed == 'true'
        run: |
          npm version ${{ steps.new-version.outputs.new-version }} --no-git-tag-version
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `current-version` | Current semantic version (with or without v prefix) | Yes | - |
| `bump-type` | Type of version bump (`major`, `minor`, `patch`) | No | - |
| `specific-version` | Specific version to set (overrides bump-type) | No | - |
| `prerelease` | Prerelease identifier (e.g., `beta`, `rc`, `alpha`) | No | - |
| `prerelease-number` | Prerelease number | No | - |

## Outputs

| Output | Description | Example |
|--------|-------------|---------|
| `new-version` | Calculated new version (without v prefix) | `2.1.0` |
| `new-version-with-v` | Calculated new version with v prefix | `v2.1.0` |
| `version-changed` | Whether version will change | `true` or `false` |
| `major` | Major version number of new version | `2` |
| `minor` | Minor version number of new version | `1` |
| `patch` | Patch version number of new version | `0` |
| `previous-major` | Previous major version number | `1` |
| `previous-minor` | Previous minor version number | `5` |
| `previous-patch` | Previous patch version number | `3` |

## Version Bump Logic

### Major Version Bump
- Increments major version
- Resets minor and patch to 0
- Example: `1.5.3` → `2.0.0`

### Minor Version Bump
- Increments minor version
- Resets patch to 0
- Example: `1.5.3` → `1.6.0`

### Patch Version Bump
- Increments patch version only
- Example: `1.5.3` → `1.5.4`

### Specific Version
- Sets exact version specified
- Overrides bump-type if both provided
- Example: `1.5.3` → `3.0.0` (when specific-version='3.0.0')

## Example Scenarios

### Scenario 1: Standard Minor Bump
```yaml
# Input:
#   current-version: "1.2.3"
#   bump-type: "minor"
# Output:
#   new-version: "1.3.0"
#   version-changed: "true"
```

### Scenario 2: Major Bump with v-prefix
```yaml
# Input:
#   current-version: "v2.5.1"
#   bump-type: "major"
# Output:
#   new-version: "3.0.0"
#   new-version-with-v: "v3.0.0"
#   version-changed: "true"
```

### Scenario 3: Prerelease Version
```yaml
# Input:
#   current-version: "1.0.0"
#   bump-type: "minor"
#   prerelease: "beta"
#   prerelease-number: "1"
# Output:
#   new-version: "1.1.0-beta.1"
#   version-changed: "true"
```

### Scenario 4: No Change
```yaml
# Input:
#   current-version: "1.0.0"
#   specific-version: "1.0.0"
# Output:
#   new-version: "1.0.0"
#   version-changed: "false"
```

### Scenario 5: Override with Specific Version
```yaml
# Input:
#   current-version: "1.5.3"
#   bump-type: "patch"  # Will be ignored
#   specific-version: "2.0.0"
# Output:
#   new-version: "2.0.0"
#   version-changed: "true"
```

## Prerelease Support

Create prerelease versions by combining bump types with prerelease identifiers:

```yaml
# Create 2.0.0-beta.1
- uses: temporalio/pack-dependency-actions/calculate-semantic-version@main
  with:
    current-version: '1.5.3'
    bump-type: 'major'
    prerelease: 'beta'
    prerelease-number: '1'

# Create 1.6.0-rc.2
- uses: temporalio/pack-dependency-actions/calculate-semantic-version@main
  with:
    current-version: '1.5.3'
    bump-type: 'minor'
    prerelease: 'rc'
    prerelease-number: '2'
```

## Version Format Validation

The action validates semantic version format:
- Must follow `MAJOR.MINOR.PATCH` pattern
- Optional prerelease suffix: `-PRERELEASE`
- Optional build metadata: `+BUILD`
- Examples of valid versions:
  - `1.0.0`
  - `v2.1.3`
  - `1.0.0-beta.1`
  - `2.0.0-rc.1+build.123`

Invalid formats will cause the action to fail with an error.

## Use with Other Actions

This action pairs well with:
- [`analyze-commits-for-bump`](../analyze-commits-for-bump/README.md) - Determine bump type from commits
- [`generate-changelog`](../generate-changelog/README.md) - Generate changelog for the version

## Complete Workflow Examples

### Automated Version Bumping

```yaml
name: Auto Version Bump

on:
  workflow_dispatch:
    inputs:
      bump-type:
        description: 'Version bump type'
        required: false
        type: choice
        options:
          - auto
          - patch
          - minor
          - major

jobs:
  bump:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Get current version
        id: current
        run: |
          VERSION=$(jq -r .version package.json)
          echo "version=$VERSION" >> $GITHUB_OUTPUT
      
      - name: Determine bump type
        id: bump-type
        uses: temporalio/pack-dependency-actions/analyze-commits-for-bump@main
        if: inputs.bump-type == 'auto' || inputs.bump-type == ''
        with:
          from-ref: "v${{ steps.current.outputs.version }}"
      
      - name: Calculate new version
        id: new-version
        uses: temporalio/pack-dependency-actions/calculate-semantic-version@main
        with:
          current-version: ${{ steps.current.outputs.version }}
          bump-type: ${{ inputs.bump-type == 'auto' && steps.bump-type.outputs.bump-type || inputs.bump-type }}
      
      - name: Update package.json
        if: steps.new-version.outputs.version-changed == 'true'
        run: |
          jq '.version = "${{ steps.new-version.outputs.new-version }}"' package.json > tmp.json
          mv tmp.json package.json
      
      - name: Create Pull Request
        if: steps.new-version.outputs.version-changed == 'true'
        uses: peter-evans/create-pull-request@v5
        with:
          title: "chore: bump version to ${{ steps.new-version.outputs.new-version }}"
          body: |
            Bumping version from ${{ steps.current.outputs.version }} to ${{ steps.new-version.outputs.new-version }}
            
            Bump type: ${{ inputs.bump-type }}
          branch: version-bump-${{ steps.new-version.outputs.new-version }}
```

### Release Workflow with Prereleases

```yaml
name: Create Release

on:
  workflow_dispatch:
    inputs:
      release-type:
        description: 'Release type'
        required: true
        type: choice
        options:
          - stable
          - beta
          - rc

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Get current version
        id: current
        run: |
          VERSION=$(git describe --tags --abbrev=0 | sed 's/v//')
          echo "version=$VERSION" >> $GITHUB_OUTPUT
      
      - name: Calculate release version
        id: version
        uses: temporalio/pack-dependency-actions/calculate-semantic-version@main
        with:
          current-version: ${{ steps.current.outputs.version }}
          bump-type: ${{ inputs.release-type == 'stable' && 'minor' || 'patch' }}
          prerelease: ${{ inputs.release-type != 'stable' && inputs.release-type || '' }}
          prerelease-number: ${{ inputs.release-type != 'stable' && '1' || '' }}
      
      - name: Create tag
        run: |
          git tag v${{ steps.version.outputs.new-version }}
          git push origin v${{ steps.version.outputs.new-version }}
      
      - name: Create Release
        uses: actions/create-release@v1
        with:
          tag_name: v${{ steps.version.outputs.new-version }}
          release_name: Version ${{ steps.version.outputs.new-version }}
          prerelease: ${{ inputs.release-type != 'stable' }}
```

## Error Handling

The action will fail with a descriptive error if:
- Current version is not a valid semantic version
- Specific version (if provided) is not a valid semantic version
- Invalid bump type is provided (not major/minor/patch)

Example error:
```
Error: Invalid semantic version format: not-a-version
```

## Tips and Best Practices

1. **Always validate versions**: Use the `version-changed` output to check if action is needed
2. **Handle v-prefix consistently**: The action handles both formats, but be consistent in your workflow
3. **Use specific-version sparingly**: Prefer bump-type for predictable versioning
4. **Combine with commit analysis**: Use with `analyze-commits-for-bump` for automated versioning
5. **Test prerelease flows**: Ensure your release process handles prereleases correctly