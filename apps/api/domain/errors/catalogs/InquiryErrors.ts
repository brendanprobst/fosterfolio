import { ResultError } from '@api/domain/errors/ResultError';

export class InquiryErrors {
  static readonly INVALID_INPUT = ResultError.create(
    'INQUIRY_INVALID_INPUT',
    'Please provide a name, email, and message.',
    400
  );

  static readonly TARGET_NOT_FOUND = ResultError.create(
    'INQUIRY_TARGET_NOT_FOUND',
    "We couldn't find that foster profile.",
    404
  );

  static readonly EMAIL_FAILED = ResultError.create(
    'INQUIRY_EMAIL_FAILED',
    'Your inquiry was saved, but we could not send the email.',
    502
  );
}
