const fs = require('fs');
const path = require('path');
const os = require('os');
const { ensureDir } = require('./utils');

function writeConfig(config, onProgress) {
  onProgress('Writing configuration files...');

  // ── 1. Write .env in install directory ──
  const envLines = [];
  envLines.push(`IOTAI_NODE_URL=${config.nodeUrl}`);
  if (config.seed) envLines.push(`IOTAI_SEED=${config.seed}`);

  // AI provider key
  const keyMap = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GOOGLE_API_KEY'
  };
  if (config.apiKey && keyMap[config.provider]) {
    envLines.push(`${keyMap[config.provider]}=${config.apiKey}`);
  }

  // Channel tokens
  if (config.channels.telegram) {
    envLines.push(`TELEGRAM_BOT_TOKEN=${config.channels.telegram}`);
  }
  if (config.channels.discord) {
    envLines.push(`DISCORD_BOT_TOKEN=${config.channels.discord}`);
  }

  const envContent = envLines.join('\n') + '\n';
  const envPath = path.join(config.installPath, '.env');
  fs.writeFileSync(envPath, envContent, 'utf-8');
  onProgress(`Written: ${envPath}`);

  // ── 2. Write to ~/.openclaw/.env (so openclaw picks it up) ──
  const openclawDir = path.join(os.homedir(), '.openclaw');
  ensureDir(openclawDir);
  const openclawEnvPath = path.join(openclawDir, '.env');

  // Merge with existing .env if present
  let existing = '';
  if (fs.existsSync(openclawEnvPath)) {
    existing = fs.readFileSync(openclawEnvPath, 'utf-8');
  }

  // Parse existing into map
  const envMap = {};
  existing.split('\n').forEach(line => {
    const eq = line.indexOf('=');
    if (eq > 0) envMap[line.substring(0, eq).trim()] = line.substring(eq + 1).trim();
  });

  // Merge new values
  envLines.forEach(line => {
    const eq = line.indexOf('=');
    if (eq > 0) envMap[line.substring(0, eq).trim()] = line.substring(eq + 1).trim();
  });

  // Write merged
  const merged = Object.entries(envMap).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
  fs.writeFileSync(openclawEnvPath, merged, 'utf-8');
  onProgress(`Written: ${openclawEnvPath}`);

  onProgress('Configuration complete');
}

module.exports = { writeConfig };
