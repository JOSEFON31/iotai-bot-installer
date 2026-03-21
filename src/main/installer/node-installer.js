const path = require('path');
const os = require('os');
const fs = require('fs');
const { getPlatform, getArch, download, run, runAsync } = require('./utils');

const NODE_VERSION = '22.16.0';

function getNodeDownloadUrl() {
  const platform = getPlatform();
  const arch = getArch();

  if (platform === 'win32') {
    return `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-x64.msi`;
  } else if (platform === 'darwin') {
    const a = arch === 'arm64' ? 'arm64' : 'x64';
    return `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-${a}.pkg`;
  } else {
    const a = arch === 'arm64' ? 'arm64' : 'x64';
    return `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${a}.tar.xz`;
  }
}

async function installNode(onProgress) {
  const platform = getPlatform();
  const url = getNodeDownloadUrl();
  const tmpDir = os.tmpdir();
  const filename = path.basename(url);
  const destPath = path.join(tmpDir, filename);

  onProgress('Downloading Node.js ' + NODE_VERSION + '...');
  await download(url, destPath);
  onProgress('Download complete. Installing...');

  if (platform === 'win32') {
    // Silent MSI install
    await runAsync(`msiexec /i "${destPath}" /qn /norestart`, { timeout: 120000 });
  } else if (platform === 'darwin') {
    // macOS pkg install (requires sudo)
    const sudoPrompt = require('sudo-prompt');
    await new Promise((resolve, reject) => {
      sudoPrompt.exec(
        `installer -pkg "${destPath}" -target /`,
        { name: 'IOTAI Bot Installer' },
        (err) => err ? reject(err) : resolve()
      );
    });
  } else {
    // Linux: extract tarball to /usr/local
    const sudoPrompt = require('sudo-prompt');
    const extractDir = `/usr/local/lib/nodejs/node-v${NODE_VERSION}`;
    await new Promise((resolve, reject) => {
      sudoPrompt.exec(
        `mkdir -p /usr/local/lib/nodejs && tar -xJf "${destPath}" -C /usr/local/lib/nodejs && ln -sf ${extractDir}/bin/node /usr/local/bin/node && ln -sf ${extractDir}/bin/npm /usr/local/bin/npm && ln -sf ${extractDir}/bin/npx /usr/local/bin/npx`,
        { name: 'IOTAI Bot Installer' },
        (err) => err ? reject(err) : resolve()
      );
    });
  }

  // Cleanup
  try { fs.unlinkSync(destPath); } catch (e) {}

  // Verify
  const version = run('node --version');
  if (!version) throw new Error('Node.js installation failed — node not found in PATH');
  onProgress(`Node.js ${version} installed successfully`);
  return version;
}

async function installPnpm(onProgress) {
  onProgress('Installing pnpm...');
  await runAsync('npm install -g pnpm', { timeout: 60000 });
  const version = run('pnpm --version');
  if (!version) throw new Error('pnpm installation failed');
  onProgress(`pnpm v${version} installed successfully`);
  return version;
}

module.exports = { installNode, installPnpm };
