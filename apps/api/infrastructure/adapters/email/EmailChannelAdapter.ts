import type { EmailChannel, OutboundEmail } from '@lattice/notifications';
import type { EmailAdapter } from '@api/infrastructure/adapters/email/EmailAdapter';
import { Logger } from '@api/utils/logger';

const EMAIL_ADDRESS = /[^\s@,;:<>()"']+@[^\s@,;:<>()"']+/g;

/** Adapts the existing mailer. Does not open a second SES client. */
export class EmailChannelAdapter implements EmailChannel {
  constructor(private readonly email: EmailAdapter) {}

  async send(message: OutboundEmail): Promise<void> {
    try {
      await this.email.send({
        to: message.to,
        subject: message.subject,
        text: message.text,
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      });
    } catch (error) {
      // dispatch() swallows this error, so log it here. SES messages can quote the addresses.
      const name = error instanceof Error ? error.name : 'unknown';
      const detail = error instanceof Error ? error.message.replace(EMAIL_ADDRESS, '[email]') : '';
      Logger.warning(`[email] send failed: ${name}${detail ? ` (${detail})` : ''}`);
      throw error;
    }
  }
}
