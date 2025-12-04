// Frontend interactions
const apiRoot = '/api';

async function fetchHelplines() {
  const res = await fetch(${apiRoot}/helplines);
  const json = await res.json();
  const list = json.helplines || [];
  const quick = document.getElementById('helplines-quick');
  const helplinesList = document.getElementById('helplinesList');
  quick.innerHTML = '';
  helplinesList.innerHTML = '';
  list.forEach(h=> {
    const itemQuick = document.createElement('div');
    itemQuick.className = 'hl';
    itemQuick.innerHTML = <div>${h.name}</div><div><a href="tel:${h.number}" style="color:inherit;text-decoration:none">${h.number}</a></div>;
    quick.appendChild(itemQuick);

    const card = document.createElement('div');
    card.className = 'helpline-card';
    card.innerHTML = <div><strong>${h.name}</strong><div style="color:var(--muted);font-size:0.95rem">${h.notes || ''}</div></div><div><a href="tel:${h.number}" class="btn" style="background:none;padding:8px 10px;border-radius:8px;color:var(--accent);border:1px solid rgba(255,255,255,0.06)">${h.number}</a></div>;
    helplinesList.appendChild(card);
  });
}

async function fetchTips() {
  const res = await fetch(${apiRoot}/tips);
  const json = await res.json();
  const tips = json.tips || [];
  const container = document.getElementById('tipsContainer');
  container.innerHTML = '';
  tips.forEach(t => {
    const card = document.createElement('div');
    card.className = 'tip-card';
    card.innerHTML = <h4>${escapeHtml(t.title)}</h4><p>${escapeHtml(t.body)}</p>;
    container.appendChild(card);
  });
}

function escapeHtml(s='') {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// SOS button behavior: short click triggers a request; long-press simulates confirmation
const sosBtn = document.getElementById('sosBtn');
let pressTimer = null;
let pressed = false;

function sendSos(payload = {}) {
  fetch(${apiRoot}/sos, {
    method: 'POST',
    headers: {'content-type':'application/json'},
    body: JSON.stringify(payload)
  }).then(r => r.json()).then(j => {
    alert('SOS sent. Stay safe — help is being notified.');
  }).catch(err => {
    console.error(err);
    alert('Failed to send SOS. Try calling a helpline.');
  });
}

sosBtn.addEventListener('mousedown', (e) => {
  pressed = false;
  pressTimer = setTimeout(() => {
    pressed = true;
    sosBtn.style.transform = 'scale(0.96)';
    // on long press, ask for confirmation details (minimal)
    const name = prompt('Your name (optional):') || null;
    const phone = prompt('Phone (optional):') || null;
    // try to get geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        sendSos({ name, phone, location: ${pos.coords.latitude},${pos.coords.longitude} });
      }, () => {
        sendSos({ name, phone });
      }, { timeout: 7000 });
    } else {
      sendSos({ name, phone });
    }
  }, 700);
});

sosBtn.addEventListener('mouseup', (e) => {
  clearTimeout(pressTimer);
  sosBtn.style.transform = '';
  if (!pressed) {
    // short click -> quick alert & call suggestion
    if (confirm('Send quick SOS? You will be advised to call emergency services.')) {
      sendSos();
      if (confirm('Would you like to call local emergency number 112?')) {
        window.location.href = 'tel:112';
      }
    }
  }
});

sosBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  pressed = false;
  pressTimer = setTimeout(() => {
    pressed = true; sosBtn.style.transform='scale(0.96)';
    const name = null, phone = null;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        sendSos({ name, phone, location: ${pos.coords.latitude},${pos.coords.longitude} });
      }, () => sendSos({ name, phone }));
    } else sendSos({ name, phone });
  }, 700);
});
sosBtn.addEventListener('touchend', (e) => {
  clearTimeout(pressTimer);
  sosBtn.style.transform='';
  if (!pressed) {
    if (confirm('Send quick SOS?')) {
      sendSos();
    }
  }
});

// Report form
const reportForm = document.getElementById('reportForm');
reportForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const data = Object.fromEntries(new FormData(reportForm).entries());
  const status = document.getElementById('reportStatus');
  status.textContent = 'Submitting...';
  try {
    const res = await fetch(${apiRoot}/report, {
      method: 'POST',
      headers: {'content-type':'application/json'},
      body: JSON.stringify({
        place: data.place,
        description: data.description,
        lat: data.lat || null,
        lng: data.lng || null
      })
    });
    const j = await res.json();
    if (j.ok) {
      status.textContent = 'Report submitted — thank you.';
      reportForm.reset();
      fetchReports();
    } else {
      status.textContent = 'Error: ' + (j.error || 'Failed to submit');
    }
  } catch(err) {
    console.error(err);
    status.textContent = 'Network error';
  }
});

// Fetch reports for "nearby reports" indicator
async function fetchReports() {
  try {
    const res = await fetch(${apiRoot}/reports);
    const j = await res.json();
    const nearby = document.getElementById('nearby-reports');
    nearby.textContent = ${j.reports.length} reports;
  } catch (e) {
    console.warn(e);
  }
}

async function init() {
  await fetchHelplines();
  await fetchTips();
  await fetchReports();
  // safety score is a simple function of reports
  const reportCount = (await (await fetch('/api/reports')).json()).reports.length;
  document.getElementById('safety-score').textContent = computeScore(reportCount);
}

function computeScore(reportCount) {
  if (reportCount <= 1) return 'Good';
  if (reportCount <= 4) return 'Caution';
  return 'High Risk';
}

init();