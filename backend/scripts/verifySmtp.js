const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

// .env dosyasını backend klasöründen yükle
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function main() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  const to = process.env.TEST_TO || user;

  if (!host || !user || !pass) {
    console.error('SMTP env eksik. Lütfen SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS ayarlayın.');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  console.log('SMTP bağlanılmaya çalışılıyor...', { host, port, secure: port === 465, user });

  try {
    await transporter.verify();
    console.log('SMTP doğrulaması BAŞARILI.');
  } catch (e) {
    console.error('SMTP doğrulaması BAŞARISIZ:', e && (e.stack || e.message || e));
    process.exit(2);
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: 'SMTP Test - Portal',
      text: 'Bu bir test e-postasıdır.',
    });
    console.log('Test e-postası gönderildi:', info && info.messageId);
  } catch (e) {
    console.error('Test e-postası gönderilemedi:', e && (e.stack || e.message || e));
    process.exit(3);
  }
}

main();


