const form = document.querySelector('#messageForm');
const messageInput = document.querySelector('#message');
const nameInput = document.querySelector('#name');
const submitButton = document.querySelector('#submitButton');
const result = document.querySelector('#result');
const count = document.querySelector('#count');

messageInput.addEventListener('input', () => {
  count.textContent = messageInput.value.length;
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  const name = nameInput.value.trim();
  if (!text || text.length > 120) return;

  const lastSentAt = Number(localStorage.getItem('lsmu-last-message') || 0);
  const waitSeconds = Math.ceil((10000 - (Date.now() - lastSentAt)) / 1000);
  if (waitSeconds > 0) {
    result.className = 'result error';
    result.textContent = `Další vzkaz můžete poslat za ${waitSeconds} s.`;
    return;
  }

  submitButton.disabled = true;
  result.className = 'result';
  result.textContent = 'Odesílám…';
  try {
    const response = await fetch(LSMU_CONFIG.messageEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ text, name })
    });
    if (!response.ok) throw new Error('Odeslání se nezdařilo');
    localStorage.setItem('lsmu-last-message', String(Date.now()));
    messageInput.value = '';
    count.textContent = '0';
    result.className = 'result success';
    result.textContent = 'Vzkaz je na cestě na plátno.';
  } catch (_) {
    result.className = 'result error';
    result.textContent = 'Vzkaz se nepodařilo odeslat. Zkontrolujte připojení a zkuste to znovu.';
  } finally {
    submitButton.disabled = false;
  }
});