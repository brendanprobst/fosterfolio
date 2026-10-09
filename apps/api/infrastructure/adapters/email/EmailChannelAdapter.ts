import type { EmailChannel, OutboundEmail } from '@lattice/notifications';
import type { EmailAdapter } from '@api/infrastructure/adapters/email/EmailAdapter';

/** Adapts the existing mailer. Does not open a second SES client. */
export class EmailChannelAdapter implements EmailChannel {
  constructor(private readonly email: EmailAdapter) {}

  async send(message: OutboundEmail): Promise<void> {
    await this.email.send({
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    });
  }
}
