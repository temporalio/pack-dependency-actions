# Contributing to Pack Dependency Actions

Thank you for your interest in contributing to Pack Dependency Actions! This document provides guidelines and instructions for contributing.

## 🎯 Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/pack-dependency-actions.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes locally
6. Commit using conventional commits
7. Push to your fork and submit a pull request

## 📝 Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/) for clear and automated versioning.

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature (triggers minor version bump)
- `fix`: Bug fix (triggers patch version bump)
- `docs`: Documentation changes
- `chore`: Maintenance tasks
- `test`: Test additions or changes
- `refactor`: Code refactoring
- `style`: Code style changes
- `perf`: Performance improvements

### Examples
```bash
feat(generate-pr): add support for custom pack commands
fix(check-version): handle missing files gracefully
docs: update README with new examples
chore: update dependencies
```

### Breaking Changes
For breaking changes, add `BREAKING CHANGE:` in the commit body or use `!` after the type:
```bash
feat!: rename input parameters for consistency

BREAKING CHANGE: Renamed 'ui-sha-file' to 'file-path' across all actions
```

## 🏷️ Pull Request Labels

The following labels will be automatically applied based on your PR title:

- `feat` / `feature` / `enhancement` - New features (minor version)
- `fix` / `bug` / `bugfix` - Bug fixes (patch version)
- `docs` / `documentation` - Documentation updates
- `chore` / `maintenance` - Maintenance tasks
- `dependencies` / `deps` - Dependency updates
- `major` / `breaking-change` - Breaking changes (major version)

## 🧪 Testing

Before submitting a PR:

1. **Test your action locally:**
   ```bash
   # Create a test workflow in another repo
   uses: ./path/to/pack-dependency-actions/action-name
   ```

2. **Validate YAML:**
   ```bash
   # Check all workflow files
   for file in .github/workflows/*.yml *.yml; do
     echo "Validating $file..."
     python3 -c "import yaml; yaml.safe_load(open('$file'))"
   done
   ```

3. **Run the test workflow:**
   ```bash
   # The test workflow will run automatically on your PR
   # Or trigger manually with:
   gh workflow run test.yml
   ```

## 📦 Release Process

Releases are automated using Release Drafter:

1. **During Development:**
   - PRs merged to `main` update the draft release
   - Version is automatically determined from PR labels
   - Changelog is generated from PR titles

2. **Publishing a Release:**
   - Review the draft release on GitHub
   - Edit if needed, then publish
   - The release workflow will:
     - Create version tags
     - Update major version tags
     - Update README examples

## 🏗️ Project Structure

```
pack-dependency-actions/
├── check-version/        # Version comparison action
│   └── action.yml
├── version-sweep/        # Batch PR checking action
│   └── action.yml
├── generate-pr/          # PR generation action
│   └── action.yml
├── auto-delete/          # Stale PR cleanup action
│   └── action.yml
├── .github/
│   ├── workflows/        # CI/CD workflows
│   └── release-drafter.yml
└── *.yml                 # Example workflow files
```

## 💡 Development Tips

### Adding a New Action

1. Create a new directory with the action name
2. Add `action.yml` with inputs, outputs, and steps
3. Add an example workflow file
4. Update README with usage examples
5. Add tests to `.github/workflows/test.yml`

### Testing Changes

Test your changes in a real repository:
```yaml
# In your test repo's workflow
- uses: your-fork/pack-dependency-actions/action-name@your-branch
  with:
    # your inputs
```

### Debugging

Enable debug logging in your test repository:
1. Go to Settings → Secrets and variables → Actions
2. Add secret: `ACTIONS_STEP_DEBUG` = `true`

## 📖 Documentation

- Update README.md for user-facing changes
- Update action.yml descriptions for input/output changes
- Add inline comments for complex logic
- Include examples for new features

## 🤝 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Respect differing viewpoints and experiences

## 📮 Getting Help

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Tag maintainers for urgent issues

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.