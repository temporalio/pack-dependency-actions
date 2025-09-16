/**
 * DangerJS TypeScript plugin for checking pack version files
 * This provides feature parity with the check-version GitHub Action
 */

import { DangerDSLType } from 'danger/distribution/dsl/DangerDSL';
import { execSync } from 'child_process';
import * as fs from 'fs';

declare const danger: DangerDSLType;
declare function warn(message: string): void;
declare function fail(message: string): void;
declare function message(message: string): void;
declare function markdown(message: string): void;

export interface PackVersionOptions {
  /** Path to version file (default: '.ui-sha') */
  filePath?: string;
  /** Title for PR comment */
  commentTitle?: string;
  /** Regex pattern for branches allowed to modify versions */
  allowPattern?: string;
  /** Command to update the version */
  updateCommand?: string;
  /** Template for comment body with placeholders */
  commentBodyTemplate?: string;
}

export interface CheckResult {
  shouldBlock: boolean;
  reason: string;
  mainVersion?: string | null;
  prVersion?: string | null;
  baseVersion?: string | null;
}

interface Versions {
  main: string | null;
  pr: string | null;
  base: string | null;
}

/**
 * Check pack version and comment on PR if needed
 */
export async function checkPackVersion(options: PackVersionOptions = {}): Promise<CheckResult> {
  const {
    filePath = '.ui-sha',
    commentTitle = 'Version Mismatch Detected',
    allowPattern = '^(update|generate|auto)-.*',
    updateCommand = 'git fetch origin main && git merge origin/main',
    commentBodyTemplate = null
  } = options;

  const pr = danger.github.pr;
  const modifiedFiles = danger.git.modified_files;
  const createdFiles = danger.git.created_files;
  const deletedFiles = danger.git.deleted_files;
  
  // Get branch name
  const branchName = pr.head.ref;
  
  // Check if branch is allowed to modify versions
  if (allowPattern && new RegExp(allowPattern).test(branchName)) {
    console.log(`Branch '${branchName}' matches allow pattern '${allowPattern}'`);
    return {
      shouldBlock: false,
      reason: 'Branch is allowed to modify versions'
    };
  }

  // Check if the version file was modified
  const isModified = modifiedFiles.includes(filePath);
  const isCreated = createdFiles.includes(filePath);
  const isDeleted = deletedFiles.includes(filePath);
  
  if (!isModified && !isCreated && !isDeleted) {
    console.log(`PR hasn't modified ${filePath}`);
    return {
      shouldBlock: false,
      reason: "PR hasn't modified the version file"
    };
  }

  // Get versions from different points
  const versions = await getVersions(filePath);
  
  // Evaluate blocking conditions
  const evaluation = evaluateBlockingConditions(versions, { isCreated, isDeleted });
  
  // Add versions to result
  const result: CheckResult = {
    ...evaluation,
    mainVersion: versions.main,
    prVersion: versions.pr,
    baseVersion: versions.base
  };
  
  // If should block, create comment
  if (evaluation.shouldBlock) {
    const commentBody = formatComment({
      template: commentBodyTemplate,
      title: commentTitle,
      filePath,
      mainVersion: versions.main,
      prVersion: versions.pr,
      updateCommand,
      reason: evaluation.reason
    });
    
    // Use markdown to post the comment
    markdown(commentBody);
    
    // Fail the check
    fail(`Version check failed in ${filePath}: ${evaluation.reason}`);
  }
  
  return result;
}

/**
 * Get versions from main, PR, and base
 */
async function getVersions(filePath: string): Promise<Versions> {
  const versions: Versions = {
    main: null,
    pr: null,
    base: null
  };
  
  try {
    // Get main branch version
    try {
      versions.main = execSync(`git show origin/main:${filePath} 2>/dev/null | head -n 1`, {
        encoding: 'utf8'
      }).trim();
    } catch (e) {
      // File doesn't exist on main
    }
    
    // Get PR version (current working tree)
    try {
      if (fs.existsSync(filePath)) {
        versions.pr = fs.readFileSync(filePath, 'utf8').split('\n')[0].trim();
      }
    } catch (e) {
      // File doesn't exist in PR
    }
    
    // Get base version (merge base)
    try {
      const mergeBase = execSync('git merge-base HEAD origin/main', {
        encoding: 'utf8'
      }).trim();
      
      if (mergeBase) {
        try {
          versions.base = execSync(`git show ${mergeBase}:${filePath} 2>/dev/null | head -n 1`, {
            encoding: 'utf8'
          }).trim();
        } catch (e) {
          // File doesn't exist at merge base
        }
      }
    } catch (e) {
      // Could not determine merge base
    }
  } catch (error) {
    console.error('Error getting versions:', error);
  }
  
  return versions;
}

/**
 * Evaluate blocking conditions based on versions
 */
function evaluateBlockingConditions(
  versions: Versions,
  { isCreated, isDeleted }: { isCreated: boolean; isDeleted: boolean }
): { shouldBlock: boolean; reason: string } {
  const { main, pr, base } = versions;
  
  // If versions match, don't block
  if (main === pr) {
    return {
      shouldBlock: false,
      reason: 'Versions match'
    };
  }
  
  // If both don't exist, don't block
  if (!main && !pr) {
    return {
      shouldBlock: false,
      reason: "Version file doesn't exist in either branch"
    };
  }
  
  // If file doesn't exist on main but exists in PR (new file), don't block
  if (!main && pr && isCreated) {
    return {
      shouldBlock: false,
      reason: "New version file added (doesn't exist on main)"
    };
  }
  
  // If file is deleted
  if (isDeleted) {
    return {
      shouldBlock: true,
      reason: 'Version file was deleted'
    };
  }
  
  // Now check blocking conditions - PR has modified the file
  let reason = '';
  
  if (!base) {
    reason = "PR introduced version file that doesn't exist at merge base";
  } else if (base === main) {
    reason = "PR modified version while main hasn't changed (invalid version or test)";
  } else {
    reason = "Both PR and main have modified the version file differently (divergent versions)";
  }
  
  return {
    shouldBlock: true,
    reason
  };
}

interface FormatCommentOptions {
  template: string | null;
  title: string;
  filePath: string;
  mainVersion: string | null;
  prVersion: string | null;
  updateCommand: string;
  reason: string;
}

/**
 * Format the comment body
 */
function formatComment(options: FormatCommentOptions): string {
  const { template, title, filePath, mainVersion, prVersion, updateCommand, reason } = options;
  
  if (template) {
    return template
      .replace(/{comment_title}/g, title)
      .replace(/{file_path}/g, filePath)
      .replace(/{main_version}/g, mainVersion || 'missing')
      .replace(/{pr_version}/g, prVersion || 'missing')
      .replace(/{update_command}/g, updateCommand)
      .replace(/{reason}/g, reason);
  }
  
  // Default template
  return `## ${title} 🔄

The pack version in \`${filePath}\` differs from the main branch.

**Main branch:** \`${mainVersion || 'missing'}\`
**This PR:** \`${prVersion || 'missing'}\`

To update this PR with the latest version from main, run:
\`\`\`bash
${updateCommand}
\`\`\`

**Reason:** ${reason}`;
}

export interface MultiCheckResult {
  results: Array<CheckResult & { filePath: string }>;
  hasFailures: boolean;
}

/**
 * Check multiple pack files
 */
export async function checkMultiplePackVersions(
  configs: PackVersionOptions[]
): Promise<MultiCheckResult> {
  const results: Array<CheckResult & { filePath: string }> = [];
  let hasFailures = false;
  
  for (const config of configs) {
    const result = await checkPackVersion(config);
    results.push({
      filePath: config.filePath || '.ui-sha',
      ...result
    });
    
    if (result.shouldBlock) {
      hasFailures = true;
    }
  }
  
  return {
    results,
    hasFailures
  };
}