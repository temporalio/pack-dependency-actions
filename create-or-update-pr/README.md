# Create or Update Pull Request Action

A local GitHub Action that creates a new pull request or updates an existing one without force-pushing over manual commits.

## Purpose

This action was created to replace `peter-evans/create-pull-request` in workflows where we need to preserve manual commits made to PR branches between automated runs. Instead of rewriting the branch history with `--force-with-lease`, this action:

1. Only creates a new PR if the branch didn't exist before
2. Updates the PR title/body if the PR already exists
3. Never touches the commit history (commits are added incrementally via separate git steps)

## Usage

```yaml
- name: Create or update pull request
  uses: ./.github/actions/create-or-update-pr
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    branch: my-feature-branch
    title: 'My Feature PR'
    body: |
      Description of changes

      - Change 1
      - Change 2
    labels: feature,automated
    reviewers: username1,username2
    base: main
    draft: true
    branch-exists: ${{ steps.check.outputs.exists }}
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `token` | Yes | - | GitHub token for API access |
| `branch` | Yes | - | The branch name for the PR |
| `title` | Yes | - | The PR title |
| `body` | Yes | - | The PR body/description (supports multiline) |
| `labels` | No | `''` | Comma-separated list of labels to add |
| `reviewers` | No | `''` | Comma-separated list of reviewers to request |
| `base` | No | `main` | The base branch for the PR |
| `draft` | No | `true` | Whether to create the PR as a draft |
| `branch-exists` | No | `false` | Whether the branch existed before this workflow run |

## Outputs

| Output | Description |
|--------|-------------|
| `pr-number` | The PR number (if PR exists or was created) |
| `pr-url` | The PR URL (if PR exists or was created) |
| `pr-created` | Whether a new PR was created (`true`/`false`) |

## Behavior

### When PR already exists
- Updates the PR title and body
- Does NOT modify labels or reviewers
- Does NOT touch commits (assumes commits were added via git push in previous step)

### When branch exists but no PR
- Does nothing (assumes manual branch that shouldn't have automated PR)
- Outputs `pr-created: false`

### When branch doesn't exist
- Creates a new draft PR
- Adds specified labels
- Requests specified reviewers
- Outputs `pr-created: true`

## Typical Workflow Pattern

```yaml
- name: Checkout or create branch
  run: |
    git fetch origin
    if git ls-remote --heads origin my-branch; then
      git checkout -b my-branch origin/my-branch
      echo "exists=true" >> $GITHUB_OUTPUT
    else
      git checkout -b my-branch
      echo "exists=false" >> $GITHUB_OUTPUT
    fi

- name: Make changes and commit
  run: |
    # Make changes
    git add .
    git commit -m "Update"

- name: Push changes (no force)
  run: git push origin my-branch

- name: Create or update PR
  uses: ./.github/actions/create-or-update-pr
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    branch: my-branch
    title: 'My PR'
    body: 'Changes...'
    branch-exists: ${{ steps.checkout.outputs.exists }}
```

## Why Not Use peter-evans/create-pull-request?

The `peter-evans/create-pull-request` action is excellent for many use cases, but it has one limitation for our workflow:

**It recreates the branch from scratch** on each run, comparing it to the existing branch and using `--force-with-lease` to update it. This means:

- ❌ Manual commits made between automated runs get overwritten
- ❌ The branch history is rewritten rather than appended to
- ❌ Concurrent modifications can be lost

Our action instead:

- ✅ Preserves all existing commits (manual or automated)
- ✅ Only adds new commits on top of existing ones
- ✅ Uses regular `git push` without force flags
- ✅ Works well with collaborative PR workflows

## Maintenance

This action uses `actions/github-script@v7` internally. If GitHub's API changes or new features are needed, update the script in `action.yml`.
