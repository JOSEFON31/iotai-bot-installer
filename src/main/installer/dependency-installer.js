const { runAsync } = require('./utils');

async function installDependencies(installPath, onProgress) {
  onProgress('Running pnpm install (this may take several minutes)...');

  await runAsync('pnpm install', {
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
  onProgress('Building project...');

  await runAsync('pnpm build', {
    timeout: 300000,
    cwd: installPath,
    onData: (d) => {
      const line = d.trim();
      if (line) onProgress(line);
    }
  });

  onProgress('Build completed successfully');
}

module.exports = { installDependencies, buildProject };
