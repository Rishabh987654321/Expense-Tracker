import sg from '@sendgrid/mail';
import env from './env.js';

let configured = false;

function ensure() {
  if (configured) return;
  if (env.SENDGRID_API_KEY) sg.setApiKey(String(env.SENDGRID_API_KEY).trim());
  configured = true;
}

export async function sendMail({ to, subject, html, text }) {
  ensure();
  const recipients = Array.isArray(to) ? to : [to];
  if (!recipients.length) return;

  if (env.EMAIL_DRY_RUN || !env.SENDGRID_API_KEY || !env.SENDGRID_FROM_EMAIL) {
    console.log('\n========== [email:dry-run] ==========');
    console.log('TO:     ', recipients.join(', '));
    console.log('SUBJECT:', subject);
    console.log('TEXT:\n' + (text || '<no text body>'));
    console.log('=====================================\n');
    return;
  }

  await sg.sendMultiple({
    to: recipients,
    from: { email: env.SENDGRID_FROM_EMAIL, name: env.SENDGRID_FROM_NAME },
    subject,
    text: text || '',
    html: html || (text || ''),
  });
}
