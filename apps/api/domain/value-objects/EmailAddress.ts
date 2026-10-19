/**
 * Visitor-supplied address that ends up in a `mailto:` link and in SES `ReplyToAddresses`.
 * ASCII `dot-atom@domain` only. The local part allows the HTML `type="email"` characters
 * minus `%`, `&` and `?`, so the value can't smuggle `?bcc=` / `&body=` into a mailto
 * draft. No quoted strings, comments, display names, address lists or IP-literal domains.
 */
const MAX_LENGTH = 254;
const MAX_LOCAL_LENGTH = 64;
const LOCAL_ATOM = /^[A-Za-z0-9!#$'*+/=^_`{|}~-]+$/;
const DOMAIN_LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

export function isValidEmailAddress(value: string): boolean {
  if (value.length > MAX_LENGTH) return false;
  const at = value.indexOf('@');
  if (at < 0 || at !== value.lastIndexOf('@')) return false;
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);

  if (local.length > MAX_LOCAL_LENGTH) return false;
  if (!local.split('.').every((atom) => LOCAL_ATOM.test(atom))) return false;
  const labels = domain.split('.');
  return labels.length >= 2 && labels.every((label) => DOMAIN_LABEL.test(label));
}
