import https from 'https';
import querystring from 'querystring';

/**
 * Dispatches an SMS message to a phone number.
 * Connects to Twilio if environment variables are set; otherwise, simulates by writing to console logs.
 * @param to Recipient phone number (E.164 format, e.g., +1234567890).
 * @param body Message body.
 */
export const sendSMS = async (to: string, body: string): Promise<boolean> => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  console.log(`\n==================================================`);
  console.log(`[SMS Dispatcher] Sending message to: ${to}`);
  console.log(`[SMS Dispatcher] Body: "${body}"`);
  console.log(`==================================================\n`);

  if (!accountSid || !authToken || !fromNumber) {
    console.log(`[SMS Dispatcher] [MOCK MODE] Twilio environment variables not configured. Simulated OK.`);
    return true;
  }

  return new Promise((resolve) => {
    const postData = querystring.stringify({
      To: to,
      From: fromNumber,
      Body: body,
    });

    const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const options = {
      hostname: 'api.twilio.com',
      port: 443,
      path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[SMS Dispatcher] Twilio SMS successfully dispatched to ${to}`);
          resolve(true);
        } else {
          console.error(`[SMS Dispatcher] Twilio API responded with error status ${res.statusCode}:`, responseBody);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.error(`[SMS Dispatcher] Network/Connection error contacting Twilio:`, err);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
};
export default sendSMS;
