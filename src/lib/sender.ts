import { getActiveAccounts, getPendingRecipients, updateRecipientStatus, incrementAccountSent, updateAccountStatus, updateCampaignCounts, addLog, getCampaignById } from './db';
import { sendEmail } from './gmail';

interface Account {
  id: string;
  email: string;
  access_token: string;
  daily_sent: number;
  daily_limit: number;
  status: string;
}

interface Recipient {
  id: string;
  campaign_id: string;
  email: string;
  name: string;
  retry_count: number;
}

interface Campaign {
  id: string;
  subject: string;
  body: string;
  status: string;
}

function personalize(template: string, recipient: Recipient): string {
  return template
    .replace(/\{\{name\}\}/gi, recipient.name || '')
    .replace(/\{\{email\}\}/gi, recipient.email || '');
}

export async function processBatch(
  campaignId: string,
  batchSize: number = 10,
  userId: string
): Promise<{ sent: number; failed: number; remaining: number; stopped: boolean }> {
  const campaign = getCampaignById(campaignId, userId) as Campaign | undefined;
  if (!campaign || (campaign.status !== 'running' && campaign.status !== 'draft')) {
    return { sent: 0, failed: 0, remaining: 0, stopped: true };
  }

  const accounts = getActiveAccounts(userId) as Account[];
  if (accounts.length === 0) {
    addLog({ user_id: userId, campaign_id: campaignId, message: 'No available accounts to send from. All accounts are paused or rate-limited.', level: 'warning' });
    return { sent: 0, failed: 0, remaining: 0, stopped: true };
  }

  const pending = getPendingRecipients(campaignId, batchSize) as Recipient[];
  if (pending.length === 0) {
    return { sent: 0, failed: 0, remaining: 0, stopped: false };
  }

  let sent = 0;
  let failed = 0;
  let accountIndex = 0;

  for (const recipient of pending) {
    // Re-check campaign status
    const current = getCampaignById(campaignId, userId) as Campaign | undefined;
    if (!current || current.status === 'stopped' || current.status === 'paused') {
      break;
    }

    // Find available account
    let account: Account | null = null;
    let tries = 0;
    while (tries < accounts.length) {
      const candidate = accounts[accountIndex % accounts.length];
      if (candidate.daily_sent < candidate.daily_limit && candidate.status === 'active') {
        account = candidate;
        break;
      }
      accountIndex++;
      tries++;
    }

    if (!account) {
      addLog({ user_id: userId, campaign_id: campaignId, message: 'All accounts exhausted daily limits.', level: 'warning' });
      break;
    }

    // Mark as sending
    updateRecipientStatus(recipient.id, 'sending', { assigned_account: account.email });

    // Personalize
    const subject = personalize(campaign.subject, recipient);
    const body = personalize(campaign.body, recipient);

    // Send
    const result = await sendEmail(
      account.access_token,
      recipient.email,
      subject,
      body,
      account.email,
      campaign.name || undefined
    );

    if (result.success) {
      updateRecipientStatus(recipient.id, 'sent', {
        sent_at: new Date().toISOString(),
        assigned_account: account.email,
      });
      incrementAccountSent(account.email, userId);
      account.daily_sent++;
      sent++;

      addLog({
        user_id: userId,
        campaign_id: campaignId,
        account_email: account.email,
        recipient_email: recipient.email,
        message: `Email sent successfully`,
        level: 'success',
      });
    } else {
      if (result.error === 'RATE_LIMITED') {
        updateAccountStatus(account.email, 'rate-limited', userId);
        account.status = 'rate-limited';
        addLog({
          user_id: userId,
          campaign_id: campaignId,
          account_email: account.email,
          message: `Account rate-limited by Google`,
          level: 'warning',
        });
        // Put recipient back to pending
        updateRecipientStatus(recipient.id, 'pending');
      } else {
        updateRecipientStatus(recipient.id, 'failed', {
          last_error: result.error || 'Unknown error',
          assigned_account: account.email,
          retry_count: (recipient.retry_count || 0) + 1,
        });
        failed++;
        addLog({
          user_id: userId,
          campaign_id: campaignId,
          account_email: account.email,
          recipient_email: recipient.email,
          message: `Send failed: ${result.error}`,
          level: 'error',
        });
      }
    }

    // Rotate account
    accountIndex++;

    // Check if account hit limit
    if (account.daily_sent >= account.daily_limit) {
      updateAccountStatus(account.email, 'paused', userId);
      account.status = 'paused';
      addLog({
        user_id: userId,
        campaign_id: campaignId,
        account_email: account.email,
        message: `Account reached daily limit of ${account.daily_limit}`,
        level: 'warning',
      });
    }
  }

  // Update campaign counts
  updateCampaignCounts(campaignId);

  // Check remaining
  const remainingRecipients = getPendingRecipients(campaignId, 1) as Recipient[];

  return { sent, failed, remaining: remainingRecipients.length > 0 ? 1 : 0, stopped: false };
}

export async function retryFailed(campaignId: string, userId: string): Promise<{ retried: number }> {
  const { getDb } = await import('./db');
  // Reset failed recipients to pending
  // We can join with campaigns to prevent unauthorized retry of other users' campaigns
  const campaign = getCampaignById(campaignId, userId);
  if (!campaign) return { retried: 0 };

  const result = getDb().prepare(
    `UPDATE recipients SET status = 'pending', last_error = NULL WHERE campaign_id = ? AND status = 'failed'`
  ).run(campaignId);

  addLog({
    user_id: userId,
    campaign_id: campaignId,
    message: `${result.changes} failed recipients queued for retry`,
    level: 'info',
  });

  return { retried: result.changes };
}
