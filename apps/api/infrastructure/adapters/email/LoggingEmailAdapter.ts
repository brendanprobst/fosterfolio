import type {
  EmailAdapter,
  EmailMessage,
} from '@api/infrastructure/adapters/email/EmailAdapter';
import { Logger } from '@api/utils/logger';

/** Beta default: log outbound mail instead of sending. */
export class LoggingEmailAdapter implements EmailAdapter {
  async send(message: EmailMessage): Promise<void> {
    Logger.info(
      `[email:log] to=${message.to} replyTo=${message.replyTo ?? '-'} subject=${message.subject}`
    );
    Logger.info(`[email:log] body=${message.text.slice(0, 500)}`);
  }
}
