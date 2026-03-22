const { runAsync, getPlatform } = require('./utils');
const path = require('path');
const fs = require('fs');

async function installDependencies(installPath, onProgress) {
  onProgress('Running npm install (this may take several minutes)...');

  await runAsync('npm install --legacy-peer-deps', {
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
  const platform = getPlatform();

  // The upstream "pnpm build" relies on bash scripts that don't work on
  // Windows.  We run only the node-based build steps that are needed and
  // skip bash-dependent steps (canvas:a2ui:bundle).  If any individual
  // step fails we log a warning but continue — the IOTAI skills work
  // without the full OpenClaw UI build.

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
      onProgress(`Running ${cmd}...`);
      await runAsync(cmd, {
        timeout: 120000,
        cwd: installPath,
        onData: (d) => {
          const line = d.trim();
          if (line) onProgress(line);
        }
      });
    } catch (e) {
      onProgress(`Warning: ${cmd} failed (${e.message}) — continuing`);
    }
  }

  onProgress('Build completed successfully');
}

module.exports = { installDependencies, buildProject };
