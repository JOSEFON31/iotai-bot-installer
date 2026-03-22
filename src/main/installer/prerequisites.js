const { run } = require('./utils');

async function checkPrerequisites() {
  const result = {
    node: { found: false, version: null },
    pnpm: { found: false, version: null },
    git: { found: false, version: null }
  };

  // Check Node.js
  const nodeVersion = run('node --version');
  if (nodeVersion) {
    const match = nodeVersion.match(/v(\d+)\.(\d+)/);
    if (match) {
      const major = parseInt(match[1]);
      const minor = parseInt(match[2]);
      if (major > 22 || (major === 22 && minor >= 16)) {
        result.node = { found: true, version: nodeVersion };
      } else {
        result.node = { found: false, version: `${nodeVersion} (too old, need >=22.16)` };
      }
    }
  }

  // npm comes bundled with Node.js — always available if Node is installed
  if (result.node.found) {
    const npmVersion = run('npm --version');
    result.pnpm = { found: true, version: `npm v${npmVersion || 'bundled'}` };
  }

  // Check Git
  const gitVersion = run('git --version');
  if (gitVersion) {
    result.git = { found: true, version: gitVersion.replace('git version ', 'v') };
  }

  return result;
}

module.exports = { checkPrerequisites };
