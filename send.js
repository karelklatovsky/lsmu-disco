const form = document.querySelector('#messageForm');
const messageInput = document.querySelector('#message');
const nameInput = document.querySelector('#name');
const submitButton = document.querySelector('#submitButton');
const result = document.querySelector('#result');
const count = document.querySelector('#count');
const senderClient = mqtt.connect(LSMU_CONFIG.brokerUrl, {
  clean: true,
  connectTimeout: 10000,
  reconnectPeriod: 3000,
  clientId: `lsmu_guest_${Math.random().toString(16).slice(2)}`
});

function publishMessage(message) {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('Připojení vypršelo')), 12000);
    const publish = () => {
      senderClient.publish(LSMU_CONFIG.messageTopic, JSON.stringify(message), { qos: 1 }, (error) => {
        window.clearTimeout(timeout);
        error ? reject(error) : resolve();
      });
    };
    senderClient.connected ? publish() : senderClient.once('connect', publish);
  });
}

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
    await publishMessage({ id: crypto.randomUUID(), text, name, sentAt: Date.now() });
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