const fs = require('fs');
const path = require('path');
const os = require('os');
const { getPlatform, run, ensureDir } = require('./utils');

function setupDaemon(installPath, onProgress) {
  const platform = getPlatform();

  if (platform === 'linux') {
    setupSystemd(installPath, onProgress);
  } else if (platform === 'darwin') {
    setupLaunchd(installPath, onProgress);
  } else if (platform === 'win32') {
    setupWindowsStartup(installPath, onProgress);
  }
}

function setupSystemd(installPath, onProgress) {
  const serviceDir = path.join(os.homedir(), '.config', 'systemd', 'user');
  ensureDir(serviceDir);

  const servicePath = path.join(serviceDir, 'iotai-bot.service');
  const service = `[Unit]
Description=IOTAI Bot - AI Agent Assistant
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${installPath}
ExecStart=${run('which node') || '/usr/local/bin/node'} ${path.join(installPath, 'openclaw.mjs')} agent
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=default.target
`;

  fs.writeFileSync(servicePath, service, 'utf-8');
  onProgress(`Created systemd service: ${servicePath}`);

  run('systemctl --user daemon-reload');
  run('systemctl --user enable iotai-bot.service');
  onProgress('Service enabled. Start with: systemctl --user start iotai-bot');
}

function setupLaunchd(installPath, onProgress) {
  const plistDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
  ensureDir(plistDir);

  const plistPath = path.join(plistDir, 'com.iotai.bot.plist');
  const nodePath = run('which node') || '/usr/local/bin/node';
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.iotai.bot</string>
  <key>ProgramArguments</key>
  <array>
    <string>${nodePath}</string>
    <string>${path.join(installPath, 'openclaw.mjs')}</string>
    <string>agent</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${installPath}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${path.join(os.homedir(), '.openclaw', 'iotai-bot.log')}</string>
  <key>StandardErrorPath</key>
  <string>${path.join(os.homedir(), '.openclaw', 'iotai-bot-error.log')}</string>
</dict>
</plist>
`;

  fs.writeFileSync(plistPath, plist, 'utf-8');
  onProgress(`Created launchd plist: ${plistPath}`);
  onProgress('Service registered. Start with: launchctl load ' + plistPath);
}

function setupWindowsStartup(installPath, onProgress) {
  // Create a .bat launcher in the Startup folder
  const startupDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');

  if (!fs.existsSync(startupDir)) {
    onProgress('Windows Startup folder not found. Skipping auto-start setup.');
    return;
  }

  const batPath = path.join(startupDir, 'iotai-bot.bat');
  const batContent = `@echo off
cd /d "${installPath}"
start /min "" node openclaw.mjs agent
`;

  fs.writeFileSync(batPath, batContent, 'utf-8');
  onProgress(`Created startup script: ${batPath}`);

  // Also create a desktop shortcut .bat
  const desktopDir = path.join(os.homedir(), 'Desktop');
  if (fs.existsSync(desktopDir)) {
    const desktopBat = path.join(desktopDir, 'IOTAI Bot.bat');
    const desktopContent = `@echo off
cd /d "${installPath}"
node openclaw.mjs agent
pause
`;
    fs.writeFileSync(desktopBat, desktopContent, 'utf-8');
    onProgress(`Created desktop shortcut: ${desktopBat}`);
  }

  onProgress('Windows startup configured. Bot will start automatically on login.');
}

module.exports = { setupDaemon };
