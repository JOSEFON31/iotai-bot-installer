const fs = require('fs');
const path = require('path');
const { runAsync } = require('./utils');

const REPO_URL = 'https://github.com/JOSEFON31/iotai-bot.git';

async function cloneRepo(installPath, onProgress) {
  // Create parent directory if needed
  const parentDir = path.dirname(installPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  // Check if directory already exists with a git repo
  if (fs.existsSync(path.join(installPath, '.git'))) {
    onProgress('Repository already exists. Pulling latest changes...');
    await runAsync(`git -C "${installPath}" pull`, {
      timeout: 120000,
      onData: (d) => onProgress(d.trim())
    });
    return;
  }

  // Remove directory if it exists but isn't a git repo
  if (fs.existsSync(installPath)) {
    const contents = fs.readdirSync(installPath);
    if (contents.length > 0) {
      onProgress('Directory exists but is not a git repo. Cleaning...');
      fs.rmSync(installPath, { recursive: true, force: true });
    }
  }

  onProgress('Cloning iotai-bot repository (this may take a minute)...');
  await runAsync(`git clone --depth 1 "${REPO_URL}" "${installPath}"`, {
    timeout: 300000,
    onData: (d) => onProgress(d.trim())
  });

  onProgress('Repository cloned successfully');
}

module.exports = { cloneRepo };
