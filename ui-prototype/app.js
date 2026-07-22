const toast = document.querySelector('#toast');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
}

document.querySelectorAll('.quick-actions button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelector('#command-input').value = button.dataset.command;
    document.querySelector('#command-input').focus();
  });
});

document.querySelector('#command-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.querySelector('#command-input');
  const value = input.value.trim();
  if (!value) return input.focus();
  showToast(`Nexus queued: ${value}`);
  input.value = '';
});

document.querySelectorAll('.pipeline-step').forEach((step) => {
  step.addEventListener('click', () => {
    document.querySelectorAll('.pipeline-step').forEach((item) => item.classList.remove('active'));
    step.classList.add('active');
    document.querySelector('#pipeline-status').textContent = `${step.querySelector('strong').textContent} selected`;
  });
});

document.querySelector('#checkup-button').addEventListener('click', (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  button.innerHTML = 'Checking context <span>...</span>';
  showToast('Fresh checkup started');
  setTimeout(() => {
    button.disabled = false;
    button.innerHTML = 'Run a fresh checkup <span>→</span>';
    showToast('Checkup complete. No new blockers found.');
  }, 1500);
});

document.querySelector('#sync-button').addEventListener('click', (event) => {
  event.currentTarget.textContent = 'Syncing...';
  setTimeout(() => {
    event.currentTarget.textContent = 'Synced';
    showToast('Context stack is up to date');
    setTimeout(() => { event.currentTarget.textContent = 'Sync now'; }, 1800);
  }, 900);
});

document.querySelector('#new-session').addEventListener('click', () => showToast('New session ready to start'));

document.querySelectorAll('.state-row').forEach((row) => {
  row.addEventListener('click', () => {
    const detail = row.nextElementSibling;
    if (!detail || !detail.classList.contains('state-detail')) return;
    const open = detail.style.display !== 'none';
    detail.style.display = open ? 'none' : 'flex';
    row.classList.toggle('expanded', !open);
    row.querySelector('.chevron').textContent = open ? '⌄' : '⌃';
  });
});
