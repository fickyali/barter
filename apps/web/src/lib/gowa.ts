const base = process.env.GOWA_BASE_URL;
const path = process.env.GOWA_SEND_MESSAGE_PATH || '/send/message';
const username = process.env.GOWA_BASIC_AUTH_USERNAME;
const password = process.env.GOWA_BASIC_AUTH_PASSWORD;
const deviceId = process.env.GOWA_DEVICE_ID || 'pt-medika-digital-nu-1';

export async function sendWhatsappMessage(phone: string, message: string) {
  if (!base || !username || !password) throw new Error('GOWA is not configured');
  const res = await fetch(`${base.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Id': deviceId,
      Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
    },
    body: JSON.stringify({ phone, message }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GOWA ${res.status}: ${body}`);
  }
}
