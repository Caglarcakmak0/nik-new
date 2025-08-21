// Basit e-posta gönderim scripti
// Kullanım (PowerShell):
//   node scripts/sendMail.js --to "alici@example.com" --subject "Konu" --text "Merhaba"
//   node scripts/sendMail.js --to "alici@example.com" --subject "HTML" --file "./sample.html"
//   $env:TEST_TO="alici@example.com"; node scripts/sendMail.js  (subject/body varsayilan)

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (name) => {
    const idx = args.indexOf(`--${name}`);
    if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
    return undefined;
  };
  return {
    to: get('to') || process.env.TEST_TO,
    subject: get('subject') || 'Portal Test E-postası',
    text: get('text'),
    html: get('html'),
    file: get('file'),
  };
}

async function main() {
  const { to, subject, text, html, file } = parseArgs();
  if (!to) {
    console.error('Hedef e-posta eksik. --to veya TEST_TO kullanın.');
    process.exit(1);
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    console.error('SMTP yapılandırması eksik. SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS gerekir.');
    process.exit(2);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  let htmlBody = html;
  if (!htmlBody && file) {
    const abs = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
    htmlBody = fs.readFileSync(abs, 'utf8');
  }

  const mailOptions = {
    from,
    to,
    subject,
    ...(htmlBody ? { html: htmlBody } : { text: text || 'Bu bir test e-postasıdır.' }),
  };

  console.log('E-posta gönderiliyor...', { to, subject, from });
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Gönderildi:', info && info.messageId);
  } catch (e) {
    console.error('Gönderim hatası:', e && (e.stack || e.message || e));
    process.exit(3);
  }
}

main();


