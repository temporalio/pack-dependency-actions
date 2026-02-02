/**
 * Example Dangerfile.ts for TypeScript projects
 * Place this in your repository root as 'dangerfile.ts'
 */

import { danger, fail, warn, message } from 'danger';
import { 
  checkPackVersion, 
  checkMultiplePackVersions,
  PackVersionOptions,
  CheckResult 
} from '@temporalio/danger-pack-version-check';

// Example 1: Basic usage with type safety
async function checkSinglePack(): Promise<void> {
  const result: CheckResult = await checkPackVersion({
    filePath: '.ui-sha',
    commentTitle: 'UI Pack Version Mismatch',
    allowPattern: '^(update|generate|release)-ui-.*',
    updateCommand: 'pnpm run update-ui'
  });
  
  console.log(`Check result: ${result.reason}`);
}

// Example 2: Multiple pack files with configuration
async function checkMultiplePacks(): Promise<void> {
  const configs: PackVersionOptions[] = [
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
  ];
  
  const results = await checkMultiplePackVersions(configs);
  
  if (results.hasFailures) {
    const failedChecks = results.results.filter(r => r.shouldBlock);
    failedChecks.forEach(check => {
      console.error(`Failed: ${check.filePath} - ${check.reason}`);
    });
  }
}

// Example 3: Advanced usage with custom logic
async function advancedCheck(): Promise<void> {
  const pr = danger.github.pr;
  const isDraft = pr.draft;
  const isFromBot = pr.user.type === 'Bot';
  
  // Skip checks for draft PRs or bot PRs
  if (isDraft) {
    message('Skipping pack version checks for draft PR');
    return;
  }
  
  if (isFromBot) {
    console.log('Skipping checks for bot PR');
    return;
  }
  
  // Check with custom template
  const result = await checkPackVersion({
    filePath: '.ui-sha',
    commentTitle: 'UI Version Status',
    allowPattern: '^release-.*',
    commentBodyTemplate: `
## {comment_title} 📦

The UI pack version check has detected an issue:

**Issue:** {reason}

### Version Comparison
- **Production (main):** \`{main_version}\`
- **Your PR:** \`{pr_version}\`

### Resolution
Run the following command to sync with main:
\`\`\`bash
{update_command}
\`\`\`

<details>
<summary>Why is this important?</summary>

Pack versions ensure that all developers are using the same dependency versions.
Mismatched versions can lead to:
- Different behavior between development and production
- Failed CI builds
- Dependency conflicts

</details>
`,
    updateCommand: 'pnpm run sync-dependencies'
  });
  
  // Additional custom logic based on result
  if (result.shouldBlock && result.reason.includes('test')) {
    warn('It looks like you may have committed a test version. Please update before merging.');
  }
}

// Example 4: Integration with other Danger checks
async function fullDangerSuite(): Promise<void> {
  // Standard Danger checks
  const hasChangelog = danger.git.modified_files.includes('CHANGELOG.md');
  if (!hasChangelog && danger.github.pr.additions > 100) {
    warn('Large PR without CHANGELOG update');
  }
  
  // Pack version checks
  await checkPackVersion({
    filePath: '.ui-sha',
    commentTitle: 'UI Pack Version Check'
  });
  
  // Check for package.json changes
  const hasPackageChanges = danger.git.modified_files.includes('package.json');
  if (hasPackageChanges) {
    message('Package.json was modified - ensure pack versions are updated if needed');
  }
}

// Example 5: Environment-specific checks
async function environmentSpecificChecks(): Promise<void> {
  const targetBranch = danger.github.pr.base.ref;
  
  // Different rules for different target branches
  if (targetBranch === 'main') {
    // Strict checking for main branch
    await checkPackVersion({
      filePath: '.ui-sha',
      commentTitle: 'Production Version Check',
      allowPattern: '^release-.*', // Only release branches can modify
      updateCommand: 'pnpm run update-ui'
    });
  } else if (targetBranch === 'develop') {
    // More lenient for develop branch
    await checkPackVersion({
      filePath: '.ui-sha',
      commentTitle: 'Development Version Check',
      allowPattern: '^(update|generate|test|release)-.*',
      updateCommand: 'git merge origin/develop'
    });
  }
}

// Main execution
(async (): Promise<void> => {
  try {
    // Run your desired checks
    await checkSinglePack();
    // await checkMultiplePacks();
    // await advancedCheck();
    // await fullDangerSuite();
    // await environmentSpecificChecks();
  } catch (error) {
    console.error('Error in Danger checks:', error);
    fail(`Danger checks failed: ${error instanceof Error ? error.message : String(error)}`);
  }
})();