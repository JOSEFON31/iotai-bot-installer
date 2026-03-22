const { installNode, installPnpm } = require('./node-installer');
const { cloneRepo } = require('./repo-cloner');
const { installDependencies, buildProject } = require('./dependency-installer');
const { writeConfig } = require('./config-writer');
const { setupDaemon } = require('./daemon-setup');

async function runInstallSteps(config, onProgress) {
  const steps = [
    {
      name: 'node',
      label: 'Install Node.js',
      run: async (p) => {
        if (config.prereqs && config.prereqs.node && config.prereqs.node.found) {
          p('node', 'skip', 'Already installed');
          return;
        }
        p('node', 'running', 'Installing Node.js...');
        await installNode((msg) => p('node', 'running', msg));
        p('node', 'done', 'Node.js installed');
      }
    },
    {
      name: 'pnpm',
      label: 'Check npm',
      run: async (p) => {
        // We use npm instead of pnpm for better Windows compatibility
        p('pnpm', 'skip', 'Using npm (bundled with Node.js)');
      }
    },
    {
      name: 'clone',
      label: 'Clone repository',
      run: async (p) => {
        p('clone', 'running', 'Cloning repository...');
        await cloneRepo(config.installPath, (msg) => p('clone', 'running', msg));
        p('clone', 'done', 'Repository cloned');
      }
    },
    {
      name: 'deps',
      label: 'Install dependencies',
      run: async (p) => {
        p('deps', 'running', 'Installing dependencies...');
        await installDependencies(config.installPath, (msg) => p('deps', 'running', msg));
        p('deps', 'done', 'Dependencies installed');
      }
    },
    {
      name: 'build',
      label: 'Build project',
      run: async (p) => {
        p('build', 'running', 'Building project...');
        await buildProject(config.installPath, (msg) => p('build', 'running', msg));
        p('build', 'done', 'Build complete');
      }
    },
    {
      name: 'config',
      label: 'Write configuration',
      run: async (p) => {
        p('config', 'running', 'Writing config...');
        writeConfig(config, (msg) => p('config', 'running', msg));
        p('config', 'done', 'Configuration written');
      }
    },
    {
      name: 'daemon',
      label: 'Set up service',
      run: async (p) => {
        p('daemon', 'running', 'Setting up service...');
        setupDaemon(config.installPath, (msg) => p('daemon', 'running', msg));
        p('daemon', 'done', 'Service configured');
      }
    }
  ];

  for (const step of steps) {
    try {
      await step.run(onProgress);
    } catch (err) {
      onProgress(step.name, 'error', `Error: ${err.message}`);
      return { success: false, failedStep: step.name, error: err.message };
    }
  }

  return { success: true };
}

module.exports = { runInstallSteps };
