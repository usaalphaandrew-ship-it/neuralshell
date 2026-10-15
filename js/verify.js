const API = window.location.origin;

const lockCard = document.getElementById('lock-card');
const unlockedSection = document.getElementById('verify-unlocked');
const keyInput = document.getElementById('key-input');
const keyForm = document.getElementById('key-form');
const keyError = document.getElementById('key-error');
const submitBtn = document.getElementById('submit-btn');
const sessionDot = document.getElementById('session-dot');
const sessionStatus = document.getElementById('session-status');
const sessionId = document.getElementById('session-id');
const resultsBoxTitle = document.getElementById('results-box-title');
const resultsPollLabel = document.getElementById('results-poll-label');
const resultsBody = document.getElementById('results-body');

let applicantId = null;
let userId = null;
let pollTimer = null;
let pollCount = 0;

// ─── UNLOCK ──────────────────────────────────

keyForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const key = keyInput.value.trim();
  if (!key) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Verifying key...';
  keyInput.classList.remove('shake');
  keyError.textContent = '';

  try {
    const res = await fetch(`${API}/api/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    });

    const data = await res.json();

    if (!res.ok) {
      keyInput.classList.add('shake');
      keyError.textContent = 'Access denied. Invalid key.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Unlock';
      setTimeout(() => keyInput.classList.remove('shake'), 400);
      return;
    }

    applicantId = data.applicantId;
    userId = data.userId;
    sessionStorage.setItem('ns_applicantId', applicantId);
    sessionStorage.setItem('ns_userId', userId);

    lockCard.style.display = 'none';
    unlockedSection.style.display = 'block';
    sessionId.textContent = applicantId.slice(0, 16) + '...';

    setSessionState('active', 'Session active');
    launchSdk(data.token);
    startPolling();
  } catch {
    keyError.textContent = 'Connection failed. Make sure the server is running.';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Unlock';
  }
});

// ─── SUMSUB SDK ──────────────────────────────

function launchSdk(token) {
  const container = document.getElementById('sumsub-websdk-container');
  const loadingEl = container.querySelector('.sdk-loading');

  const getNewToken = async () => {
    try {
      const res = await fetch(`${API}/api/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      return data.token;
    } catch {
      return null;
    }
  };

  try {
    const sdk = snsWebSdk
      .init(token, getNewToken)
      .withConf({ lang: 'en', theme: 'dark' })
      .withOptions({ adaptIframeHeight: true, addViewportTag: false })
      .on('idCheck.onStepCompleted', (payload) => {
        console.log('[sumsub] step completed:', payload);
        setSessionState('pending', 'Under review');
        if (loadingEl) loadingEl.style.display = 'none';
      })
      .on('idCheck.onError', (err) => {
        console.error('[sumsub] error:', err);
      })
      .on('idCheck.onApplicantLoaded', (payload) => {
        console.log('[sumsub] applicant loaded:', payload);
        if (loadingEl) loadingEl.style.display = 'none';
      })
      .onMessage((type, payload) => {
        console.log('[sumsub msg]', type, payload);
        if (
          type === 'idCheck.onApplicantStatusChanged' ||
          type === 'idCheck.onReady'
        ) {
          checkStatus();
        }
        if (loadingEl && type !== 'idCheck.onInitialized') {
          loadingEl.style.display = 'none';
        }
      })
      .build();

    sdk.launch('#sumsub-websdk-container');
  } catch (err) {
    console.error('[sumsub] launch failed:', err);
    if (loadingEl) {
      loadingEl.innerHTML = `<span style="color:var(--red)">SDK failed to load. Check console.</span>`;
    }
  }
}

// ─── STATUS POLLING ──────────────────────────

function startPolling() {
  resultsBoxTitle.classList.add('live');
  resultsPollLabel.textContent = 'polling...';
  checkStatus();
  pollTimer = setInterval(() => {
    pollCount++;
    resultsPollLabel.textContent = `poll #${pollCount}`;
    checkStatus();
  }, 4000);
}

async function checkStatus() {
  if (!applicantId) return;
  try {
    const res = await fetch(`${API}/api/status/${applicantId}`);
    const data = await res.json();
    renderResults(data);

    if (data.reviewStatus === 'completed') {
      clearInterval(pollTimer);
      resultsPollLabel.textContent = 'completed';
      resultsBoxTitle.classList.remove('live');

      const ans = data.reviewAnswer;
      if (ans === 'GREEN') {
        setSessionState('approved', 'Approved ✓');
      } else if (ans === 'RED') {
        setSessionState('rejected', 'Rejected ✗');
      }
    }
  } catch (err) {
    console.error('[status poll error]', err);
  }
}

// ─── RENDER RESULTS ──────────────────────────

function renderResults(data) {
  if (!data || !data.reviewStatus) return;

  const ans = data.reviewAnswer;
  const ansClass = ans === 'GREEN' ? 'green' : ans === 'RED' ? 'red' : 'yellow';
  const labels = (data.rejectLabels || []).join(', ') || '—';
  const comment = data.moderationComment || '—';
  const rejectType = data.reviewRejectType || '—';

  resultsBody.innerHTML = `
    <div class="r-row">
      <span class="r-key">reviewStatus</span>
      <span class="r-val">${data.reviewStatus}</span>
    </div>
    <div class="r-row">
      <span class="r-key">reviewAnswer</span>
      <span class="r-val ${ans ? ansClass : 'dim'}">${ans || 'pending'}</span>
    </div>
    <div class="r-row">
      <span class="r-key">reviewRejectType</span>
      <span class="r-val dim">${rejectType}</span>
    </div>
    <div class="r-row">
      <span class="r-key">rejectLabels</span>
      <span class="r-val dim">${labels}</span>
    </div>
    <div class="r-row">
      <span class="r-key">moderationComment</span>
      <span class="r-val dim">${comment}</span>
    </div>
  `;
}

// ─── SESSION STATE ───────────────────────────

function setSessionState(state, text) {
  sessionDot.className = 'session-dot ' + state;
  sessionStatus.textContent = text;
}
