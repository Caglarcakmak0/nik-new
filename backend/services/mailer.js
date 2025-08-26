const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const juice = require('juice');
const dotenv = require('dotenv');
const os = require('os');

dotenv.config();

// Mailing geçici olarak devre dışı bırakılmak istenirse .env içine MAIL_DISABLED=true ekleyin.
// SMTP bilgileri eksikse artık throw etmiyoruz; gönderimler atlanacak.
const MAIL_DISABLED = String(process.env.MAIL_DISABLED || '').toLowerCase() === 'true';

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const heloName = process.env.SMTP_NAME || process.env.SMTP_HELO || undefined;
  const isProduction = String(process.env.NODE_ENV).toLowerCase() === 'production';
  const enableDebug = String(process.env.SMTP_DEBUG || (!isProduction)).toLowerCase() === 'true';
  const usePool = String(process.env.SMTP_POOL || 'false').toLowerCase() === 'true';
  const maxConnections = Number(process.env.SMTP_POOL_MAX_CONNECTIONS || 2);
  const maxMessages = Number(process.env.SMTP_POOL_MAX_MESSAGES || 100);
  const tlsRejectUnauthorized = String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED || 'true').toLowerCase() === 'true';
  if (MAIL_DISABLED) {
    console.warn('[mail] MAIL_DISABLED=true -> mailer devre dışı.');
    return null;
  }
  if (!host || !user || !pass) {
    console.warn('[mail] SMTP yapılandırması eksik, mailer devre dışı (geçici). host/user/pass gerekli.');
    return null;
  }
  const secure = port === 465;
  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    name: heloName,
    auth: { user, pass },
    logger: enableDebug,
    debug: enableDebug,
    pool: usePool,
    maxConnections,
    maxMessages,
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: tlsRejectUnauthorized }
  });
  if (!isProduction || enableDebug) {
    console.log('[mail] transporter created', { host, port, secure, user, heloName: heloName || '(default)', pool: usePool, maxConnections, maxMessages, enableDebug });
  }
  return transport;
}

const transporter = createTransporter();
const TRANSPORTER_ACTIVE = !!transporter;

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
  if (!TRANSPORTER_ACTIVE || MAIL_DISABLED) {
    if (MAIL_DISABLED) {
      console.log('[mail] SKIP (MAIL_DISABLED) ->', { to, subject, template });
    } else {
      console.log('[mail] SKIP (no transporter) ->', { to, subject, template });
    }
    return { skipped: true };
  }
  const useSimple = String(process.env.EMAIL_SIMPLE || 'true').toLowerCase() === 'true';
  const html = useSimple ? buildSimpleHtml(template, data) : renderTemplate(template, data);
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
  const fromName = process.env.SMTP_FROM_NAME;
  const replyTo = process.env.SMTP_REPLY_TO;
  const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
  console.log('[mail] send start', { to, subject, from, template, attachmentsCount: attachments?.length || 0 });
  try {
    const text = buildPlainText(template, data);
    const headers = {
      'Auto-Submitted': 'auto-generated',
      'X-Auto-Response-Suppress': 'All',
    };
    if (process.env.LIST_UNSUBSCRIBE) headers['List-Unsubscribe'] = process.env.LIST_UNSUBSCRIBE;
    const info = await transporter.sendMail({ from, to, subject, html, text, attachments, headers, replyTo });
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


