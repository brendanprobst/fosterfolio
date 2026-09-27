import { isHandleUniqueViolation } from '@api/application/isHandleUniqueViolation';

describe('isHandleUniqueViolation', () => {
  it('matches the Supabase/PostgREST unique-index throw for users_handle_unique', () => {
    const error = new Error(
      'Supabase request failed (409): {"code":"23505","message":"duplicate key value violates unique constraint \\"users_handle_unique\\""}'
    );
    expect(isHandleUniqueViolation(error)).toBe(true);
  });

  it('matches a 23505 that names the handle column', () => {
    const error = new Error(
      'Supabase request failed (409): {"code":"23505","details":"Key (handle)=(brendan) already exists."}'
    );
    expect(isHandleUniqueViolation(error)).toBe(true);
  });

  it('does not treat an email unique violation as a taken handle', () => {
    const error = new Error(
      'Supabase request failed (409): {"code":"23505","message":"duplicate key value violates unique constraint \\"users_email_key\\""}'
    );
    expect(isHandleUniqueViolation(error)).toBe(false);
  });

  it('does not treat unrelated failures as a taken handle', () => {
    expect(isHandleUniqueViolation(new Error('Supabase request failed (500): boom'))).toBe(
      false
    );
    expect(isHandleUniqueViolation(new Error('network down'))).toBe(false);
    expect(isHandleUniqueViolation('not-an-error')).toBe(false);
  });
});
