/**
 * Example Dangerfile using shared Temporal configuration
 * This shows how to use the shared config across multiple repos
 */

const {
  runTemporalPackChecks,
  createPackConfig,
  smartPackChecks
} = require('@temporalio/danger-pack-version-check/shared-config');

// Example 1: Use default Temporal configuration
async function useDefaults() {
  await runTemporalPackChecks({
    checkUI: true,      // Check UI pack (default: true)
    checkRegistry: true // Check Registry pack (default: false)
  });
}

// Example 2: Override specific configurations
async function withOverrides() {
  await runTemporalPackChecks({
    checkUI: true,
    ui: {
      // Override just the update command
      updateCommand: 'npm run sync:ui'
    },
    checkRegistry: true,
    registry: {
      // Override the allow pattern
      allowPattern: '^release-.*'
    }
  });
}

// Example 3: Add custom pack configurations
async function withCustomPacks() {
  await runTemporalPackChecks({
    checkUI: true,
    customPacks: [
      createPackConfig('workers', {
        updateCommand: 'pnpm run update-workers'
      }),
      createPackConfig('sdk', {
        commentTitle: 'SDK Version Check',
        allowPattern: '^(sdk|release)-.*'
      })
    ]
  });
}

// Example 4: Smart checks - only check if relevant files changed
async function smartChecks() {
  const results = await smartPackChecks();
  
  if (results.hasFailures) {
    console.log('Pack checks failed:', results.results);
  } else {
    console.log('All pack checks passed');
  }
}

// Example 5: Repository-specific configuration
async function repoSpecificConfig() {
  const repoName = danger.github.pr.base.repo.name;
  
  switch (repoName) {
    case 'cloud-ui':
      await runTemporalPackChecks({
        checkUI: true,
        ui: {
          updateCommand: 'pnpm run update-ui'
        }
      });
      break;
      
    case 'frontend-shared-workflows':
      await runTemporalPackChecks({
        checkUI: true,
        checkRegistry: true,
        customPacks: [
          createPackConfig('workers')
        ]
      });
      break;
      
    default:
      // Default check for unknown repos
      await smartPackChecks();
  }
}

// Main execution
(async () => {
  try {
    // Choose your strategy:
    
    // Option 1: Simple defaults
    await useDefaults();
    
    // Option 2: Smart checks (recommended)
    // await smartPackChecks();
    
    // Option 3: Repository-specific
    // await repoSpecificConfig();
    
  } catch (error) {
    console.error('Pack version checks failed:', error);
    fail(`Pack version checks failed: ${error.message}`);
  }
})();