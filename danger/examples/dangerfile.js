/**
 * Example Dangerfile.js for JavaScript projects
 * Place this in your repository root as 'dangerfile.js'
 */

const { checkPackVersion, checkMultiplePackVersions } = require('@temporalio/danger-pack-version-check');
// Or if using from the repo directly:
// const { checkPackVersion, checkMultiplePackVersions } = require('./node_modules/@temporalio/pack-dependency-actions/danger/pack-version-check');

// Example 1: Basic usage with single pack file
async function checkSinglePack() {
  await checkPackVersion({
    filePath: '.ui-sha',
    commentTitle: 'UI Pack Version Mismatch',
    allowPattern: '^(update|generate|release)-ui-.*',
    updateCommand: 'pnpm run update-ui'
  });
}

// Example 2: Multiple pack files
async function checkMultiplePacks() {
  const results = await checkMultiplePackVersions([
    {
      filePath: '.ui-sha',
      commentTitle: 'UI Pack Version Mismatch',
      allowPattern: '^(update|generate|release)-ui-.*',
      updateCommand: 'pnpm run update-ui'
    },
    {
      filePath: '.registry-sha',
      commentTitle: 'Registry Pack Version Mismatch',
      allowPattern: '^(update|generate|release)-registry-.*',
      updateCommand: 'pnpm run update-registry'
    }
  ]);
  
  if (results.hasFailures) {
    console.log('Some pack version checks failed:', results.results);
  }
}

// Example 3: Custom template
async function checkWithCustomTemplate() {
  await checkPackVersion({
    filePath: '.ui-sha',
    commentTitle: 'UI Version Check',
    allowPattern: '^release-.*',
    commentBodyTemplate: `
## ⚠️ {comment_title}

Your PR has a version mismatch in \`{file_path}\`.

| Branch | Version |
|--------|---------|
| main   | \`{main_version}\` |
| PR     | \`{pr_version}\` |

### How to fix:
\`\`\`bash
{update_command}
\`\`\`

_Reason: {reason}_
`,
    updateCommand: 'git fetch origin main && git merge origin/main'
  });
}

// Example 4: Conditional checks based on files changed
async function conditionalChecks() {
  const { modified_files, created_files } = danger.git;
  
  // Only check if relevant files were modified
  const hasUIChanges = [...modified_files, ...created_files].some(
    file => file.startsWith('packages/ui/')
  );
  
  if (hasUIChanges) {
    await checkPackVersion({
      filePath: '.ui-sha',
      commentTitle: 'UI Pack Version Mismatch'
    });
  }
}

// Run the checks
(async () => {
  try {
    // Choose which checks to run
    await checkSinglePack();
    // await checkMultiplePacks();
    // await checkWithCustomTemplate();
    // await conditionalChecks();
  } catch (error) {
    console.error('Error in Danger checks:', error);
    fail(`Danger checks failed: ${error.message}`);
  }
})();