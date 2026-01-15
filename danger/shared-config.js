/**
 * Shared Danger configuration for Temporal repositories
 * This can be imported and customized per repository
 */

const { checkPackVersion, checkMultiplePackVersions } = require('./pack-version-check');

/**
 * Default configuration for Temporal projects
 */
const defaultConfig = {
  ui: {
    filePath: '.ui-sha',
    commentTitle: 'UI Pack Version Mismatch',
    allowPattern: '^(update|generate|release)-ui-.*',
    updateCommand: 'pnpm run update-ui',
    commentBodyTemplate: `
## {comment_title} 🔄

The UI pack version in \`{file_path}\` differs from the main branch.

**Main branch:** \`{main_version}\`
**This PR:** \`{pr_version}\`

To update this PR with the latest version from main, run:
\`\`\`bash
{update_command}
\`\`\`

Or merge the latest main:
\`\`\`bash
git fetch origin main && git merge origin/main
\`\`\`

**Reason:** {reason}
`
  },
  registry: {
    filePath: '.registry-sha',
    commentTitle: 'Registry Pack Version Mismatch',
    allowPattern: '^(update|generate|release)-registry-.*',
    updateCommand: 'pnpm run update-registry',
    commentBodyTemplate: `
## {comment_title} 📦

The Registry pack version in \`{file_path}\` differs from the main branch.

**Main branch:** \`{main_version}\`
**This PR:** \`{pr_version}\`

To update this PR with the latest version from main, run:
\`\`\`bash
{update_command}
\`\`\`

**Reason:** {reason}
`
  }
};

/**
 * Run standard Temporal pack checks
 * @param {Object} options - Override default configurations
 */
async function runTemporalPackChecks(options = {}) {
  const configs = [];
  
  // Check if UI pack exists and should be checked
  if (options.checkUI !== false) {
    const uiConfig = {
      ...defaultConfig.ui,
      ...(options.ui || {})
    };
    configs.push(uiConfig);
  }
  
  // Check if Registry pack exists and should be checked
  if (options.checkRegistry) {
    const registryConfig = {
      ...defaultConfig.registry,
      ...(options.registry || {})
    };
    configs.push(registryConfig);
  }
  
  // Add any custom pack checks
  if (options.customPacks) {
    configs.push(...options.customPacks);
  }
  
  // Run all checks
  if (configs.length > 0) {
    return await checkMultiplePackVersions(configs);
  }
  
  return { results: [], hasFailures: false };
}

/**
 * Create a custom pack check configuration
 * @param {string} name - Name of the pack (e.g., 'workers')
 * @param {Object} overrides - Configuration overrides
 */
function createPackConfig(name, overrides = {}) {
  const defaults = {
    filePath: `.${name}-sha`,
    commentTitle: `${name.charAt(0).toUpperCase() + name.slice(1)} Pack Version Mismatch`,
    allowPattern: `^(update|generate|release)-${name}-.*`,
    updateCommand: `pnpm run update-${name}`,
    commentBodyTemplate: `
## {comment_title} 📦

The ${name} pack version in \`{file_path}\` differs from the main branch.

**Main branch:** \`{main_version}\`
**This PR:** \`{pr_version}\`

To fix this:
\`\`\`bash
{update_command}
\`\`\`

**Reason:** {reason}
`
  };
  
  return { ...defaults, ...overrides };
}

/**
 * Check pack versions based on modified files
 * Only checks packs if related files were modified
 */
async function smartPackChecks() {
  const { modified_files, created_files } = danger.git;
  const allChangedFiles = [...modified_files, ...created_files];
  const configs = [];
  
  // Check UI pack if UI files were modified
  if (allChangedFiles.some(f => 
    f.startsWith('packages/ui/') || 
    f.startsWith('src/components/') ||
    f === '.ui-sha'
  )) {
    configs.push(defaultConfig.ui);
  }
  
  // Check Registry pack if registry files were modified
  if (allChangedFiles.some(f => 
    f.startsWith('packages/registry/') || 
    f.startsWith('src/registry/') ||
    f === '.registry-sha'
  )) {
    configs.push(defaultConfig.registry);
  }
  
  if (configs.length > 0) {
    return await checkMultiplePackVersions(configs);
  }
  
  console.log('No pack-related files were modified, skipping pack checks');
  return { results: [], hasFailures: false };
}

module.exports = {
  defaultConfig,
  runTemporalPackChecks,
  createPackConfig,
  smartPackChecks,
  // Re-export the core functions
  checkPackVersion,
  checkMultiplePackVersions
};