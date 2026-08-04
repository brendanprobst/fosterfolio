import type {
  EmailAdapter,
  EmailMessage,
} from '@api/infrastructure/adapters/email/EmailAdapter';

type SesModule = {
  SESClient: new (config?: { region?: string }) => {
    send: (command: unknown) => Promise<unknown>;
  };
  SendEmailCommand: new (input: Record<string, unknown>) => unknown;
};

/**
 * SES send via AWS SDK v3 (`@aws-sdk/client-ses`).
 * Requires `EMAIL_FROM` (verified identity) and standard AWS credentials.
 */
export class SesEmailAdapter implements EmailAdapter {
  async send(message: EmailMessage): Promise<void> {
    const from = process.env.EMAIL_FROM?.trim();
    if (!from) {
      throw new Error('EMAIL_FROM is required when EMAIL_PROVIDER=ses');
    }

    let ses: SesModule;
    try {
      // Optional dependency — install when enabling EMAIL_PROVIDER=ses.
      ses = require('@aws-sdk/client-ses') as SesModule;
    } catch {
      throw new Error(
        'EMAIL_PROVIDER=ses requires @aws-sdk/client-ses to be installed'
      );
    }

    const region = process.env.AWS_REGION?.trim() || 'us-west-2';
    const client = new ses.SESClient({ region });
    await client.send(
      new ses.SendEmailCommand({
        Source: from,
        Destination: { ToAddresses: [message.to] },
        ReplyToAddresses: message.replyTo ? [message.replyTo] : undefined,
        Message: {
          Subject: { Data: message.subject, Charset: 'UTF-8' },
          Body: {
            Text: { Data: message.text, Charset: 'UTF-8' },
          },
        },
      })
    );
  }
}
