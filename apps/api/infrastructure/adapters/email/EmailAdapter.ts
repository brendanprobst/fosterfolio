export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

export interface EmailAdapter {
  send(message: EmailMessage): Promise<void>;
}
