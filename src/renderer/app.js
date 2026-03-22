// ── State ──
let config = {
  nodeUrl: 'https://iotai.onrender.com',
  seed: '',
  installPath: '',
  provider: 'openai',
  apiKey: '',
  channels: {},
  prereqs: {}
};

// ── Navigation ──
function goTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');

  if (screenId === 'screen-prereq') checkPrereqs();
}

// ── Screen 2: Prerequisites ──
async function checkPrereqs() {
  const result = await window.electronAPI.checkPrerequisites();
  config.prereqs = result;

  updatePrereqItem('node', result.node);
  updatePrereqItem('pnpm', result.pnpm);
  updatePrereqItem('git', result.git);

  const errEl = document.getElementById('prereq-error');
  if (!result.git.found) {
    errEl.style.display = 'block';
    errEl.textContent = 'Git is required but not installed. Please install Git from https://git-scm.com and restart the installer.';
    document.getElementById('btn-prereq-next').disabled = true;
  } else {
    errEl.style.display = 'none';
    document.getElementById('btn-prereq-next').disabled = false;
  }
}

function updatePrereqItem(name, info) {
  const item = document.getElementById(`prereq-${name}`);
  const icon = item.querySelector('.prereq-icon');
  const detail = document.getElementById(`prereq-${name}-detail`);

  icon.innerHTML = '';
  icon.className = 'prereq-icon';

  if (info.found) {
    icon.classList.add('ok');
    icon.textContent = '\u2713';
    detail.textContent = `Found: ${info.version}`;
  } else if (name === 'git') {
    icon.classList.add('err');
    icon.textContent = '\u2717';
    detail.textContent = 'Not found — required';
  } else {
    icon.classList.add('warn');
    icon.textContent = '!';
    detail.textContent = 'Not found — will be installed automatically';
  }
}

// ── Screen 3: Configuration ──
async function initConfig() {
  const home = await window.electronAPI.getHomeDir();
  const platform = await window.electronAPI.getPlatform();
  const sep = platform === 'win32' ? '\\' : '/';
  document.getElementById('cfg-install-path').value = home + sep + 'iotai-bot';
  config.installPath = home + sep + 'iotai-bot';
}
initConfig();

function selectProvider(el) {
  document.querySelectorAll('.radio-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  config.provider = el.dataset.provider;

  const labels = { openai: 'OpenAI API Key', anthropic: 'Anthropic API Key', google: 'Google API Key' };
  const placeholders = { openai: 'sk-...', anthropic: 'sk-ant-...', google: 'AIza...' };
  document.getElementById('api-key-label').textContent = labels[config.provider];
  document.getElementById('cfg-api-key').placeholder = placeholders[config.provider];
}

function toggleChannel(el) {
  el.classList.toggle('on');
  const channel = el.dataset.channel;
  const configEl = document.getElementById(`channel-${channel}`);
  configEl.classList.toggle('visible');
}

async function selectInstallPath() {
  const dir = await window.electronAPI.selectDirectory();
  if (dir) {
    document.getElementById('cfg-install-path').value = dir;
    config.installPath = dir;
  }
}

function generateSeed() {
  // Simple BIP39-like word list (subset for demo — real install uses the bot's own generator)
  const words = [
    'abandon','ability','able','about','above','absent','absorb','abstract','absurd','abuse',
    'access','accident','account','accuse','achieve','acid','acoustic','acquire','across','act',
    'action','actor','actress','actual','adapt','add','addict','address','adjust','admit',
    'adult','advance','advice','aerobic','affair','afford','afraid','again','age','agent',
    'agree','ahead','aim','air','airport','aisle','alarm','album','alcohol','alert',
    'alien','all','alley','allow','almost','alone','alpha','already','also','alter',
    'always','amateur','amazing','among','amount','amused','analyst','anchor','ancient','anger',
    'angle','angry','animal','ankle','announce','annual','another','answer','antenna','antique',
    'anxiety','any','apart','apology','appear','apple','approve','april','arch','arctic',
    'area','arena','argue','arm','armed','armor','army','around','arrange','arrest',
    'arrive','arrow','art','artefact','artist','artwork','ask','aspect','assault','asset',
    'assist','assume','asthma','athlete','atom','attack','attend','attitude','attract','auction',
    'audit','august','aunt','author','auto','autumn','average','avocado','avoid','awake',
    'aware','awesome','awful','awkward','axis','baby','bachelor','bacon','badge','bag',
    'balance','balcony','ball','bamboo','banana','banner','bar','barely','bargain','barrel',
    'base','basic','basket','battle','beach','bean','beauty','because','become','beef',
    'before','begin','behave','behind','believe','below','belt','bench','benefit','best',
    'betray','better','between','beyond','bicycle','bid','bike','bind','biology','bird',
    'birth','bitter','black','blade','blame','blanket','blast','bleak','bless','blind',
    'blood','blossom','blow','blue','blur','blush','board','boat','body','boil',
    'bomb','bone','bonus','book','boost','border','boring','borrow','boss','bottom',
    'bounce','box','boy','bracket','brain','brand','brass','brave','bread','breeze',
    'brick','bridge','brief','bright','bring','brisk','broccoli','broken','bronze','broom',
    'brother','brown','brush','bubble','buddy','budget','buffalo','build','bulb','bulk',
    'bullet','bundle','bunny','burden','burger','burst','bus','business','busy','butter'
  ];
  const seed = [];
  for (let i = 0; i < 12; i++) {
    seed.push(words[Math.floor(Math.random() * words.length)]);
  }
  document.getElementById('cfg-seed').value = seed.join(' ');
}

// ── Screen 4: Install ──
async function startInstall() {
  // Gather config
  config.nodeUrl = document.getElementById('cfg-node-url').value.trim();
  config.seed = document.getElementById('cfg-seed').value.trim();
  config.installPath = document.getElementById('cfg-install-path').value.trim();
  config.apiKey = document.getElementById('cfg-api-key').value.trim();

  config.channels = {};
  document.querySelectorAll('.toggle-switch.on').forEach(t => {
    const ch = t.dataset.channel;
    const tokenEl = document.getElementById(`cfg-${ch}-token`);
    config.channels[ch] = tokenEl ? tokenEl.value.trim() : true;
  });

  goTo('screen-progress');

  // Listen for progress
  window.electronAPI.onInstallProgress(({ step, status, message }) => {
    updateStep(step, status, message);
    appendLog(message, status === 'error' ? 'err' : status === 'done' ? 'ok' : '');
  });

  try {
    const result = await window.electronAPI.runInstall(config);
    if (result.success) {
      showComplete();
    } else {
      // Installation had an error but may be partially usable
      appendLog(`Step "${result.failedStep}" failed: ${result.error}`, 'err');
      showCompleteWithWarning(result.failedStep, result.error);
    }
  } catch (err) {
    appendLog('Installation failed: ' + err.message, 'err');
    showCompleteWithWarning('unknown', err.message);
  }
}

function updateStep(stepName, status, message) {
  const stepEl = document.querySelector(`.progress-step[data-step="${stepName}"]`);
  if (!stepEl) return;
  const icon = stepEl.querySelector('.step-icon');
  const detail = document.getElementById(`step-detail-${stepName}`);

  icon.className = 'step-icon';
  if (status === 'running') {
    icon.classList.add('running');
    icon.innerHTML = '<span class="spinner"></span>';
  } else if (status === 'done') {
    icon.classList.add('done');
    icon.textContent = '\u2713';
  } else if (status === 'error') {
    icon.classList.add('error');
    icon.textContent = '\u2717';
  } else if (status === 'skip') {
    icon.classList.add('done');
    icon.textContent = '\u2014';
  }

  if (detail && message) detail.textContent = message;
}

function appendLog(msg, type) {
  if (!msg) return;
  const body = document.getElementById('log-body');
  const line = document.createElement('div');
  if (type === 'err') line.className = 'log-err';
  if (type === 'ok') line.className = 'log-ok';
  line.textContent = msg;
  body.appendChild(line);
  body.scrollTop = body.scrollHeight;
}

function toggleLog() {
  const body = document.getElementById('log-body');
  body.classList.toggle('open');
  document.getElementById('log-toggle-icon').textContent = body.classList.contains('open') ? '\u25B2' : '\u25BC';
}

// ── Screen 5: Complete ──
function showComplete() {
  document.getElementById('summary-path').textContent = config.installPath;
  document.getElementById('summary-node').textContent = config.nodeUrl;
  document.getElementById('summary-provider').textContent = config.provider.charAt(0).toUpperCase() + config.provider.slice(1);
  const channels = Object.keys(config.channels);
  document.getElementById('summary-channels').textContent = channels.length > 0 ? channels.join(', ') : 'None';
  const warn = document.getElementById('complete-warning');
  if (warn) warn.style.display = 'none';
  updateManualCmd();
  goTo('screen-complete');
}

function showCompleteWithWarning(failedStep, error) {
  document.getElementById('summary-path').textContent = config.installPath;
  document.getElementById('summary-node').textContent = config.nodeUrl;
  document.getElementById('summary-provider').textContent = config.provider.charAt(0).toUpperCase() + config.provider.slice(1);
  const channels = Object.keys(config.channels);
  document.getElementById('summary-channels').textContent = channels.length > 0 ? channels.join(', ') : 'None';
  const warn = document.getElementById('complete-warning');
  if (warn) {
    warn.style.display = 'block';
    warn.textContent = `Warning: step "${failedStep}" had an error (${error}). The bot may still work — try starting it.`;
  }
  updateManualCmd();
  goTo('screen-complete');
}

function updateManualCmd() {
  const el = document.getElementById('manual-cmd');
  if (el) {
    const p = config.installPath.replace(/\\/g, '\\');
    el.textContent = `cd "${p}" && node openclaw.mjs agent`;
  }
}

async function launchBot() {
  await window.electronAPI.startBot(config.installPath);
}

async function openInstallFolder() {
  await window.electronAPI.openFolder(config.installPath);
}
