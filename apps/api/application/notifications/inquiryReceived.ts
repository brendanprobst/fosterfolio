import { registerType } from '@lattice/notifications';

const SETTINGS_PATH = '/settings/notifications';

function textValue(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function renderInquiryReceivedEmail(payload: Record<string, unknown>): {
  subject: string;
  text: string;
  replyTo?: string;
} {
  const petName = textValue(payload, 'petName');
  const senderName = textValue(payload, 'senderName');
  const senderEmail = textValue(payload, 'senderEmail');
  const message = textValue(payload, 'message');
  const origin = process.env.WEB_ORIGIN?.trim().replace(/\/$/, '') ?? '';
  const settingsUrl = origin ? `${origin}${SETTINGS_PATH}` : SETTINGS_PATH;
  const subject = petName ? `Fosterfolio inquiry about ${petName}` : 'Fosterfolio inquiry';
  const text = [
    'You have a new inquiry on Fosterfolio.',
    petName ? `Pet: ${petName}` : null,
    senderName || senderEmail ? `From: ${senderName} <${senderEmail}>` : null,
    '',
    message,
    '',
    `Notification email settings: ${settingsUrl}`,
  ]
    .filter((line) => line !== null)
    .join('\n');
  const rendered: { subject: string; text: string; replyTo?: string } = { subject, text };
  if (senderEmail) rendered.replyTo = senderEmail;
  return rendered;
}

let registered = false;

export function ensureInquiryReceivedRegistered(): void {
  if (registered) return;
  registerType({
    type: 'inquiry_received',
    defaultEmailEnabled: true,
    emailTemplate: renderInquiryReceivedEmail,
  });
  registered = true;
}

export const INQUIRY_RECEIVED_TYPE = 'inquiry_received';
