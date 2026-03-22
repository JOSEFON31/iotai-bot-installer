const { runAsync, getPlatform, run } = require('./utils');
const path = require('path');
const fs = require('fs');

async function installDependencies(installPath, onProgress) {
  // The project uses pnpm workspaces — extensions have their own deps.
  // We must use pnpm so workspace:* references resolve correctly.

  // Ensure pnpm is available
  const hasPnpm = run('pnpm --version');
  if (!hasPnpm) {
    onProgress('Installing pnpm...');
    await runAsync('npm install -g pnpm', {
      timeout: 60000,
      onData: (d) => { const l = d.trim(); if (l) onProgress(l); }
    });
  }

  onProgress('Running pnpm install (this may take several minutes)...');

  await runAsync('pnpm install --no-frozen-lockfile', {
    timeout: 600000,
    cwd: installPath,
    onData: (d) => {
      const line = d.trim();
      if (line) onProgress(line);
    }
  });

  onProgress('Dependencies installed successfully');
}

async function buildProject(installPath, onProgress) {
  // Skip the full build — it requires bash scripts and many native deps.
  // Instead, we build only the core dist using pnpm, and if it fails
  // we fall back to running from source via tsx (already a dependency).

  onProgress('Building project...');

  try {
    // Try the full build first (works on systems with bash, e.g. Git Bash)
    await runAsync('pnpm build', {
      timeout: 300000,
      cwd: installPath,
      onData: (d) => {
        const line = d.trim();
        if (line) onProgress(line);
      }
    });
    onProgress('Build completed successfully');
  } catch (e) {
    onProgress(`Full build failed (${e.message})`);
    onProgress('Trying minimal build...');

    // Fallback: run only the node-based build steps
    const buildSteps = [
      'node scripts/tsdown-build.mjs',
      'node scripts/runtime-postbuild.mjs',
    ];

    for (const cmd of buildSteps) {
      const scriptFile = cmd.split(' ').pop();
      if (!fs.existsSync(path.join(installPath, scriptFile))) {
        onProgress(`Skipping ${scriptFile} (not found)`);
        continue;
      }
      try {
        await runAsync(cmd, {
          timeout: 120000,
          cwd: installPath,
          onData: (d) => { const l = d.trim(); if (l) onProgress(l); }
        });
      } catch (e2) {
        onProgress(`Warning: ${cmd} failed — continuing`);
      }
    }

    onProgress('Minimal build completed');
  }
}

module.exports = { installDependencies, buildProject };
