const core = require('@actions/core');
const github = require('@actions/github');
const exec = require('@actions/exec');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

async function run() {
  try {
    // Get inputs
    const repository = core.getInput('repository', { required: true });
    const targetSha = core.getInput('target-sha') || '';
    const packageName = core.getInput('package-name');
    const packDestination = core.getInput('pack-destination') || './packs';
    const packageCommand = core.getInput('package-command');
    const packCommand = core.getInput('pack-command');
    const filePath = core.getInput('file-path') || '.ui-sha';
    const token = core.getInput('token', { required: true });

    core.info(`Repository: ${repository}`);
    core.info(`Target SHA: ${targetSha || 'default branch'}`);
    core.info(`Package name: ${packageName}`);
    core.info(`Pack destination: ${packDestination}`);
    core.info(`File path: ${filePath}`);

    // Read last SHA from file
    let lastSha = '';
    try {
      const content = await fs.readFile(filePath, 'utf8');
      // Extract SHA from file (handle both plain SHA and comment formats)
      const match = content.match(/^[a-f0-9]{40}$/m);
      if (match) {
        lastSha = match[0];
        core.info(`Last SHA from ${filePath}: ${lastSha}`);
      }
    } catch (error) {
      core.info(`No existing ${filePath} found`);
    }

    core.setOutput('last-sha', lastSha);

    // Create temp directory
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pack-'));
    core.info(`Using temp directory: ${tempDir}`);

    try {
      // Clone the repository
      core.info(`Cloning ${repository}...`);
      await exec.exec('git', [
        'clone',
        `https://x-access-token:${token}@github.com/${repository}.git`,
        path.join(tempDir, 'repo')
      ]);

      const repoDir = path.join(tempDir, 'repo');
      process.chdir(repoDir);

      // Get default branch if not specified
      let checkoutTarget = targetSha;
      if (!checkoutTarget) {
        core.info('No target SHA specified, fetching default branch...');
        const octokit = github.getOctokit(token);
        const [owner, repo] = repository.split('/');
        const { data } = await octokit.rest.repos.get({ owner, repo });
        checkoutTarget = data.default_branch;
        core.info(`Using default branch: ${checkoutTarget}`);
      }

      // Checkout target
      core.info(`Checking out ${checkoutTarget}...`);
      await exec.exec('git', ['checkout', checkoutTarget]);

      // Get the actual SHA
      let fullSha = '';
      let shortSha = '';
      
      await exec.exec('git', ['rev-parse', 'HEAD'], {
        listeners: {
          stdout: (data) => {
            fullSha = data.toString().trim();
          }
        }
      });

      await exec.exec('git', ['rev-parse', '--short', 'HEAD'], {
        listeners: {
          stdout: (data) => {
            shortSha = data.toString().trim();
          }
        }
      });

      core.info(`Checked out SHA: ${fullSha} (short: ${shortSha})`);
      core.setOutput('full-sha', fullSha);
      core.setOutput('short-sha', shortSha);

      // Generate changelog if we have a previous SHA
      let changelog = '';
      if (lastSha) {
        core.info(`Generating changelog from ${lastSha} to ${fullSha}...`);
        try {
          await exec.exec('git', ['log', '--oneline', `${lastSha}..${fullSha}`], {
            listeners: {
              stdout: (data) => {
                changelog += data.toString();
              }
            }
          });
          if (changelog) {
            core.info('Changelog:');
            core.info(changelog);
          }
        } catch (error) {
          core.warning('Could not generate changelog');
        }
      }
      core.setOutput('changelog', changelog);

      // Install dependencies
      core.info('Installing dependencies...');
      await exec.exec('pnpm', ['install', '--frozen-lockfile']);

      // Run build/package command if specified
      if (packageCommand) {
        core.info(`Running package command: ${packageCommand}`);
        await exec.exec('sh', ['-c', packageCommand]);
      }

      // Create pack destination directory
      const originalDir = process.env.GITHUB_WORKSPACE;
      const fullPackDest = path.join(originalDir, packDestination);
      await fs.mkdir(fullPackDest, { recursive: true });

      // Run pack command
      if (packCommand) {
        core.info(`Running custom pack command: ${packCommand}`);
        await exec.exec('sh', ['-c', packCommand]);
      } else {
        core.info('Running default pack command...');
        await exec.exec('pnpm', ['pack', '--pack-destination', fullPackDest]);
      }

      // Find the packed file
      const files = await fs.readdir(fullPackDest);
      const tgzFiles = files.filter(f => f.endsWith('.tgz')).sort();
      
      if (tgzFiles.length === 0) {
        throw new Error('No packed file found');
      }

      const packedFile = tgzFiles[tgzFiles.length - 1];
      core.info(`Packed file: ${packedFile}`);

      // Rename with short SHA if package name is provided
      let finalPackage = path.join(packDestination, packedFile);
      
      if (packageName) {
        // Extract version from filename
        const versionMatch = packedFile.match(/([0-9]+\.[0-9]+\.[0-9]+)\.tgz$/);
        const version = versionMatch ? versionMatch[1] : '0.0.0';
        
        // Clean package name for filename
        const cleanName = packageName.replace(/[@\/]/g, '-').replace(/^-/, '');
        const newName = `${cleanName}-${version}-${shortSha}.tgz`;
        
        const oldPath = path.join(fullPackDest, packedFile);
        const newPath = path.join(fullPackDest, newName);
        
        await fs.rename(oldPath, newPath);
        core.info(`Renamed to: ${newName}`);
        
        finalPackage = path.join(packDestination, newName);
      }
      
      core.setOutput('package-file', finalPackage);

      // Return to original directory
      process.chdir(originalDir);

      // Update version file
      core.info(`Updating ${filePath} with SHA: ${fullSha}`);
      const fileContent = `# SHA of the last packed version of ${packageName || 'package'}\n${fullSha}\n`;
      await fs.writeFile(filePath, fileContent);

      // Update package.json if package name is specified
      if (packageName && finalPackage) {
        core.info(`Updating package.json to reference ${finalPackage}`);
        const packageJsonPath = path.join(originalDir, 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        
        if (!packageJson.dependencies) {
          packageJson.dependencies = {};
        }
        
        packageJson.dependencies[packageName] = `file:${finalPackage}`;
        
        await fs.writeFile(
          packageJsonPath,
          JSON.stringify(packageJson, null, 2) + '\n'
        );
      }

      core.info('Pack complete!');

    } finally {
      // Clean up temp directory
      await fs.rm(tempDir, { recursive: true, force: true });
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();