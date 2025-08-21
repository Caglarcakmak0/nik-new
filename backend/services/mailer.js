const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const juice = require('juice');
const dotenv = require('dotenv');

dotenv.config();

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error('SMTP yapılandırması eksik. Lütfen .env dosyasını kontrol edin.');
  }
  const secure = port === 465;
  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    logger: true,
    debug: true,
  });
  console.log('[mail] transporter created', { host, port, secure, user });
  return transport;
}

const transporter = createTransporter();

function readFileSafe(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function renderTemplate(templateName, data = {}) {
  const templatesDir = path.join(__dirname, '..', 'emails', 'templates');
  const stylesDir = path.join(__dirname, '..', 'emails', 'styles');
  const templatePath = path.join(templatesDir, `${templateName}.hbs`);
  const cssPath = path.join(stylesDir, 'email.css');

  const templateSource = readFileSafe(templatePath);
  const styleSource = fs.existsSync(cssPath) ? readFileSafe(cssPath) : '';
  const compile = handlebars.compile(templateSource);
  const html = compile(data);

  // Stil dosyasını head içine ekleyip inline et
  const withStyle = `<!DOCTYPE html><html><head><meta charset=\"utf-8\">${styleSource ? `<style>${styleSource}</style>` : ''}</head><body>${html}</body></html>`;
  const inlined = juice(withStyle);
  console.log('[mail] template rendered', { template: templateName, htmlLength: inlined?.length || 0 });
  return inlined;
}

function buildPlainText(templateName, data = {}) {
  try {
    if (templateName === 'passwordReset' && data.resetUrl) {
      const name = data.displayName || 'Kullanıcı';
      return `Merhaba ${name},\n\nŞifrenizi sıfırlamak için bu bağlantıyı açın (1 saat geçerli):\n${data.resetUrl}\n\nEğer bu talebi siz oluşturmadıysanız bu e-postayı yok sayabilirsiniz.`;
    }
    if (templateName === 'verifyEmail' && data.verifyUrl) {
      const name = data.displayName || 'Kullanıcı';
      return `Merhaba ${name},\n\nHesabınızı doğrulamak için bu bağlantıyı açın (24 saat geçerli):\n${data.verifyUrl}`;
    }
  } catch (_) {
    // fallthrough
  }
  return 'Bilgilendirme mesajı.';
}

function buildSimpleHtml(templateName, data = {}) {
  const title = templateName === 'passwordReset' ? 'Şifre Sıfırlama' : (templateName === 'verifyEmail' ? 'E‑posta Doğrulama' : 'Bilgilendirme');
  const actionUrl = data.resetUrl || data.verifyUrl || '#';
  const name = data.displayName || 'Kullanıcı';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
  <h3>${title}</h3>
  <p>Merhaba ${name},</p>
  <p>Aşağıdaki bağlantıyı açın:</p>
  <p><a href="${actionUrl}" target="_blank">${actionUrl}</a></p>
  </body></html>`;
}

async function sendTemplatedMail({ to, subject, template, data = {}, attachments = [] }) {
  const useSimple = String(process.env.EMAIL_SIMPLE || 'true').toLowerCase() === 'true';
  const html = useSimple ? buildSimpleHtml(template, data) : renderTemplate(template, data);
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  console.log('[mail] send start', { to, subject, from, template, attachmentsCount: attachments?.length || 0 });
  try {
    const text = buildPlainText(template, data);
    const headers = {};
    if (process.env.LIST_UNSUBSCRIBE) headers['List-Unsubscribe'] = process.env.LIST_UNSUBSCRIBE;
    const info = await transporter.sendMail({ from, to, subject, html, text, attachments, headers });
    console.log('[mail] send ok', {
      messageId: info?.messageId,
      envelope: info?.envelope,
      accepted: info?.accepted,
      rejected: info?.rejected,
      response: info?.response,
    });
    return info;
  } catch (err) {
    console.error('[mail] send error', err);
    throw err;
  }
}

module.exports = { sendTemplatedMail, renderTemplate };


