const { execSync, exec } = require('child_process');
const os = require('os');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');

function getPlatform() {
  return process.platform; // 'win32', 'darwin', 'linux'
}

function getArch() {
  return process.arch; // 'x64', 'arm64'
}

function getHomedir() {
  return os.homedir();
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      timeout: opts.timeout || 30000,
      stdio: 'pipe',
      ...opts
    }).trim();
  } catch (e) {
    return null;
  }
}

function runAsync(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = exec(cmd, {
      encoding: 'utf-8',
      timeout: opts.timeout || 600000,
      maxBuffer: 50 * 1024 * 1024,
      ...opts
    }, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
    });
    if (opts.onData) {
      if (child.stdout) child.stdout.on('data', d => opts.onData(d.toString()));
      if (child.stderr) child.stderr.on('data', d => opts.onData(d.toString()));
    }
  });
}

function download(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlinkSync(destPath);
        return download(response.headers.location, destPath).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        return reject(new Error(`Download failed: HTTP ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(destPath); });
    });
    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports = { getPlatform, getArch, getHomedir, run, runAsync, download, ensureDir };
