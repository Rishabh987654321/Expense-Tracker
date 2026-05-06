import { Worker } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { sendMail } from '../config/sendgrid.js';
import { EMAIL_QUEUE_NAME } from '../queues/email.queue.js';
import { prisma } from '../config/prisma.js';

function formatMoney(cents, currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format((cents || 0) / 100);
}

function emailNotificationDetails(jobName, data) {
  if (jobName === 'expense-submitted') {
    const amount = formatMoney(data?.amountCents, data?.currency);
    return {
      title: `Email sent: New expense from ${data?.submitterName || 'someone'}`,
      body: `${amount} · ${data?.category || '—'} · ${data?.description || ''}`.trim(),
      extra: { expenseId: data?.expenseId, submitterName: data?.submitterName, amountCents: data?.amountCents, currency: data?.currency, category: data?.category, description: data?.description },
    };
  }
  if (jobName === 'expense-decision') {
    const amount = formatMoney(data?.amountCents, data?.currency);
    const verb = data?.decision === 'APPROVED' ? 'approved' : 'rejected';
    return {
      title: `Email sent: Expense ${verb}`,
      body: `${amount} · ${data?.description || ''}${data?.note ? ` — Note: ${data.note}` : ''}`.trim(),
      extra: { expenseId: data?.expenseId, decision: data?.decision, note: data?.note || null, amountCents: data?.amountCents, currency: data?.currency, description: data?.description },
    };
  }
  if (jobName === 'invite') {
    return {
      title: 'Email sent: Invite',
      body: `Invited ${data?.to} as ${data?.role || 'member'}${data?.orgName ? ` to ${data.orgName}` : ''}`,
      extra: { to: data?.to, role: data?.role, orgName: data?.orgName },
    };
  }
  return {
    title: 'Email delivered',
    body: `Email job "${jobName}" completed successfully.`,
    extra: { jobName },
  };
}

const handlers = {
  invite: async (data) => {
    const { to, orgName, invitedByName, acceptUrl, role } = data;
    const subject = `${invitedByName} invited you to ${orgName}`;
    const text = [
      `${invitedByName} has invited you to join ${orgName} on Expense Tracker as ${role}.`,
      '',
      `Accept the invite: ${acceptUrl}`,
      '',
      'This link expires in a few days.',
    ].join('\n');
    await sendMail({ to, subject, text });
  },

  'expense-submitted': async (data) => {
    const { to, orgName, submitterName, amountCents, currency, category, description } = data;
    const subject = `[${orgName}] New expense from ${submitterName} for ${formatMoney(amountCents, currency)}`;
    const text = [
      `${submitterName} just submitted an expense for review.`,
      '',
      `Amount:      ${formatMoney(amountCents, currency)}`,
      `Category:    ${category}`,
      `Description: ${description}`,
      '',
      'Open the Approvals page to approve or reject it.',
    ].join('\n');
    await sendMail({ to, subject, text });
  },

  'expense-decision': async (data) => {
    const {
      to, submitterName, orgName, decision, note,
      amountCents, currency, description,
    } = data;
    const verb = decision === 'APPROVED' ? 'approved' : 'rejected';
    const subject = `[${orgName}] Your expense was ${verb}`;
    const text = [
      `Hi ${submitterName},`,
      '',
      `Your expense for ${formatMoney(amountCents, currency)} (${description}) has been ${verb}.`,
      note ? `\nNote from approver: ${note}` : '',
      '',
      'You can review the full history in the Expenses page.',
    ].filter(Boolean).join('\n');
    await sendMail({ to, subject, text });
  },
};

export function startEmailWorker() {
  const worker = new Worker(
    EMAIL_QUEUE_NAME,
    async (job) => {
      const handler = handlers[job.name];
      if (!handler) throw new Error(`Unknown email job type: ${job.name}`);
      await handler(job.data);
    },
    { connection: getRedisConnection() }
  );

  worker.on('completed', async (job) => {
    console.log(`[email-worker] completed ${job.name} -> ${Array.isArray(job.data?.to) ? job.data.to.join(',') : job.data?.to}`);
    const orgId = job.data?.orgId;
    const notifyUserIds = job.data?.notifyUserIds;
    if (orgId && Array.isArray(notifyUserIds) && notifyUserIds.length) {
      try {
        const details = emailNotificationDetails(job.name, job.data);
        await prisma.notification.createMany({
          data: Array.from(new Set(notifyUserIds)).map((userId) => ({
            orgId,
            userId,
            type: 'EMAIL_SENT',
            title: details.title,
            body: details.body,
            data: { jobName: job.name, ...details.extra },
          })),
        });
      } catch (err) {
        console.warn('[email-worker] failed to write EMAIL_SENT notification:', err?.message);
      }
    }
  });
  worker.on('failed', async (job, err) => {
    const status = err?.code || err?.response?.statusCode || err?.response?.status;
    const details = err?.response?.body || err?.response?.data || err?.response;
    console.error(`[email-worker] failed ${job?.name}:`, err?.message, status ? `(status ${status})` : '');
    if (details) {
      try {
        console.error('[email-worker] details:', JSON.stringify(details, null, 2));
      } catch {
        console.error('[email-worker] details:', details);
      }
    }

    const orgId = job?.data?.orgId;
    const notifyUserIds = job?.data?.notifyUserIds;
    if (orgId && Array.isArray(notifyUserIds) && notifyUserIds.length) {
      try {
        const details = emailNotificationDetails(job.name, job.data);
        await prisma.notification.createMany({
          data: Array.from(new Set(notifyUserIds)).map((userId) => ({
            orgId,
            userId,
            type: 'EMAIL_FAILED',
            title: `Email failed: ${details.title.replace(/^Email sent:\s*/i, '')}`,
            body: `${details.body}${details.body ? ' — ' : ''}${err?.message || 'Unknown error'}`,
            data: { jobName: job.name, status, ...details.extra },
          })),
        });
      } catch (e2) {
        console.warn('[email-worker] failed to write EMAIL_FAILED notification:', e2?.message);
      }
    }
  });

  return worker;
}
