import { isValidEmailAddress } from '@api/domain/value-objects/EmailAddress';

describe('isValidEmailAddress', () => {
  it.each([
    'jamie@example.com',
    'jamie.lee+fosters@mail.example.co.uk',
    "o'brien@example.com",
    'a_b-c@sub-domain.example.io',
    'user@xn--bcher-kva.example',
  ])('accepts %s', (email) => {
    expect(isValidEmailAddress(email)).toBe(true);
  });

  it.each([
    // mailto: header injection (S5)
    'a@b.co?bcc=evil%40x.com&body=hi',
    'a?cc=evil@x.com',
    'a%40x.com@b.co',
    'a&b@example.com',
    // address lists
    'a@b.co,evil@x.com',
    'a@b.co;evil@x.com',
    // display names, quoting, comments
    'Jamie <jamie@example.com>',
    '"jamie"@example.com',
    'jamie(comment)@example.com',
    // structure
    'jamie',
    'jamie@localhost',
    '@example.com',
    'jamie@',
    'ja mie@example.com',
    'jamie@exa mple.com',
    '.jamie@example.com',
    'jamie.@example.com',
    'ja..mie@example.com',
    'jamie@-example.com',
    'jamie@example-.com',
    'jamie@example..com',
    'jamie@example.com.',
    'jamie@[127.0.0.1]',
    'jamie@example.com\r\nBcc: evil@x.com',
    'josé@example.com',
    // lengths
    `${'a'.repeat(65)}@example.com`,
    `jamie@${'a'.repeat(64)}.com`,
    `jamie@${'abcdefghi.'.repeat(25)}com`,
  ])('rejects %s', (email) => {
    expect(isValidEmailAddress(email)).toBe(false);
  });

  it('accepts the longest local part and the longest label', () => {
    expect(isValidEmailAddress(`${'a'.repeat(64)}@example.com`)).toBe(true);
    expect(isValidEmailAddress(`jamie@${'a'.repeat(63)}.com`)).toBe(true);
  });
});
