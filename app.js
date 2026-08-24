const form = document.getElementById('registrationForm');
const choicesElement = document.getElementById('clubChoices');
const messageElement = document.getElementById('formMessage');
const successPanel = document.getElementById('successPanel');
const submitButton = document.getElementById('submitButton');
const systemNotice = document.getElementById('systemNotice');
let clubs = [];
let classByGrade = { '1年級': '一年忠班', '2年級': '二年忠班', '3年級': '三年忠班', '4年級': '四年忠班', '5年級': '五年忠班', '6年級': '六年忠班' };

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function isValidTaiwanId(raw) {
  const id = raw.trim().toUpperCase();
  if (!/^[A-Z][12]\d{8}$/.test(id)) return false;
  const letters = 'ABCDEFGHJKLMNPQRSTUVXYWZIO';
  const code = letters.indexOf(id[0]) + 10;
  const nums = [Math.floor(code / 10), code % 10, ...id.slice(1).split('').map(Number)];
  return (nums[0] + nums[1] * 9 + nums[2] * 8 + nums[3] * 7 + nums[4] * 6 + nums[5] * 5 + nums[6] * 4 + nums[7] * 3 + nums[8] * 2 + nums[9] + nums[10]) % 10 === 0;
}

function showMessage(text, type = '') {
  messageElement.className = `form-message ${type}`;
  messageElement.textContent = text;
}

function capacityText(capacity) {
  return capacity === null ? '不限額' : `上限 ${capacity} 人`;
}

function renderChoices() {
  const grade = document.getElementById('grade').value;
  const byDay = { 三: clubs.filter((club) => club.day === '三'), 五: clubs.filter((club) => club.day === '五') };
  choicesElement.innerHTML = Object.entries(byDay).map(([day, dayClubs]) => `
    <fieldset class="choice-group"><legend>星期${day}<span>最多選 1 個</span></legend>
      <label class="club-option"><input type="radio" name="club-${day}" value=""><span class="club-copy"><strong>本日不報名</strong><small>保留空白</small></span></label>
      ${dayClubs.map((club) => {
        const eligible = !grade || club.grades.includes(grade);
        return `<label class="club-option ${eligible ? '' : 'disabled'}">
          <input type="radio" name="club-${day}" value="${escapeHtml(club.id)}" ${eligible ? '' : 'disabled'}>
          <span class="club-copy"><strong>${escapeHtml(club.name)}</strong><small>${escapeHtml(club.content)}</small><small>${escapeHtml(club.time)} · ${escapeHtml(club.period)} · ${capacityText(club.capacity)}</small>${eligible ? '' : '<em>此年級不符</em>'}</span>
        </label>`;
      }).join('')}
    </fieldset>`).join('');
}

async function loadClubs() {
  if (location.protocol === 'file:') {
    systemNotice.className = 'notice warning';
    systemNotice.innerHTML = '<strong>請從正式網站網址開啟：</strong>此版本需要後端 API，直接雙擊 HTML 檔無法報名。開發測試請執行 <code>pnpm dev</code>。';
    choicesElement.innerHTML = '<p class="form-message error">尚未連接後端，無法載入社團。</p>';
    return;
  }
  try {
    const response = await fetch('/api/clubs', { headers: { accept: 'application/json' } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '無法載入社團資料。');
    clubs = data.clubs;
    classByGrade = { ...classByGrade, ...(data.classByGrade || {}) };
    syncGradeAndClass();
    renderChoices();
    submitButton.disabled = false;
  } catch (error) {
    choicesElement.innerHTML = `<p class="form-message error">${escapeHtml(error.message)}</p>`;
  }
}

function syncGradeAndClass() {
  const grade = document.getElementById('grade').value;
  document.getElementById('className').value = classByGrade[grade] || '';
}

document.getElementById('grade').addEventListener('change', () => {
  syncGradeAndClass();
  renderChoices();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage('');
  const studentName = document.getElementById('studentName').value.trim();
  const grade = document.getElementById('grade').value;
  const className = document.getElementById('className').value.trim();
  const studentId = document.getElementById('studentId').value.trim().toUpperCase();
  const guardianPhone = document.getElementById('guardianPhone').value.trim();
  const guardianEmail = document.getElementById('guardianEmail').value.trim().toLowerCase();
  const selected = [...document.querySelectorAll('input[name^="club-"]:checked')].map((input) => input.value).filter(Boolean);

  if (!studentName || !grade || !className || !guardianPhone || !guardianEmail || !document.getElementById('consent').checked) return showMessage('請完整填寫資料並勾選同意事項。', 'error');
  if (!isValidTaiwanId(studentId)) return showMessage('身分證字號格式或檢核碼不正確，請再確認。', 'error');
  if (!document.getElementById('guardianEmail').checkValidity()) return showMessage('家長電子郵件格式不正確。', 'error');
  if (selected.length < 1) return showMessage('請至少選擇一個社團。', 'error');

  submitButton.disabled = true;
  submitButton.textContent = '送出中…';
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ studentName, grade, className, studentId, guardianPhone, guardianEmail, clubs: selected }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '報名失敗，請稍後再試。');
    form.reset();
    renderChoices();
    successPanel.classList.remove('hidden');
    successPanel.innerHTML = `<p class="eyebrow dark">報名已送出</p><h2>報名編號：<span class="accent">${escapeHtml(data.registrationNo)}</span></h2><p>${data.emailSent ? '報名收件通知已寄到家長信箱。' : '報名已保存，但寄信服務尚未完成設定；請先保存報名編號。'}人工審核完成後，系統會寄發錄取或候補結果。</p>`;
    successPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = '送出報名';
  }
});

loadClubs();
