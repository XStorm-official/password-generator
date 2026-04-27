const CHARSETS = {
  upper:   'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower:   'abcdefghijklmnopqrstuvwxyz',
  digits:  '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

const STRENGTH_LEVELS = [
  { label: 'Très faible', color: '#e53e3e' },
  { label: 'Faible',      color: '#dd6b20' },
  { label: 'Moyen',       color: '#d69e2e' },
  { label: 'Fort',        color: '#38a169' },
  { label: 'Très fort',   color: '#2b6cb0' },
];

function buildCharset() {
  return Object.entries(CHARSETS)
    .filter(([key]) => document.getElementById(`opt-${key}`).checked)
    .map(([, chars]) => chars)
    .join('');
}

// Guarantees at least one char from each selected category and uses
// crypto.getRandomValues for cryptographic quality randomness.
function generatePassword(length, charset) {
  const required = Object.entries(CHARSETS)
    .filter(([key]) => document.getElementById(`opt-${key}`).checked)
    .map(([, chars]) => chars);

  const pool = new Uint32Array(length + required.length);
  crypto.getRandomValues(pool);

  const chars = Array.from({ length }, (_, i) => charset[pool[i] % charset.length]);

  // Replace the first N positions with one guaranteed char from each category
  required.forEach((cat, i) => {
    chars[i] = cat[pool[length + i] % cat.length];
  });

  // Fisher-Yates shuffle using crypto randomness
  const shufflePool = new Uint32Array(length);
  crypto.getRandomValues(shufflePool);
  for (let i = length - 1; i > 0; i--) {
    const j = shufflePool[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

function scorePassword(password, charset) {
  const len = password.length;
  const entropy = Math.log2(Math.pow(charset.length, len));

  if (entropy < 28) return 0;
  if (entropy < 36) return 1;
  if (entropy < 60) return 2;
  if (entropy < 80) return 3;
  return 4;
}

function updateStrength(password, charset) {
  const score = scorePassword(password, charset);
  const level = STRENGTH_LEVELS[score];
  const fill = document.getElementById('strength-fill');
  const label = document.getElementById('strength-label');

  fill.style.width = `${(score + 1) * 20}%`;
  fill.style.backgroundColor = level.color;
  label.textContent = `Force : ${level.label}`;
  label.style.color = level.color;
}

function render() {
  const charset = buildCharset();
  if (!charset) {
    document.getElementById('password').textContent = 'Sélectionnez au moins un type de caractère.';
    document.getElementById('copy-btn').disabled = true;
    document.getElementById('strength-fill').style.width = '0';
    document.getElementById('strength-label').textContent = '';
    return;
  }

  const length = parseInt(document.getElementById('length').value, 10);
  const password = generatePassword(length, charset);

  document.getElementById('password').textContent = password;
  document.getElementById('copy-btn').disabled = false;
  updateStrength(password, charset);
}

async function copyToClipboard() {
  const text = document.getElementById('password').textContent;
  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById('copy-btn');
    btn.classList.add('copied');
    btn.setAttribute('title', 'Copié !');
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.setAttribute('title', 'Copier');
    }, 1500);
  } catch {
    // Fallback for browsers without clipboard API
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const lengthInput = document.getElementById('length');
  const lengthValue = document.getElementById('length-value');

  lengthInput.addEventListener('input', () => {
    lengthValue.textContent = lengthInput.value;
    render();
  });

  document.getElementById('generate-btn').addEventListener('click', render);
  document.getElementById('copy-btn').addEventListener('click', copyToClipboard);

  ['opt-upper', 'opt-lower', 'opt-digits', 'opt-symbols'].forEach(id => {
    document.getElementById(id).addEventListener('change', render);
  });

  render();
});
