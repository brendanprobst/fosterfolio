/** Turn `actively_fostering` into `actively fostering`. */
export function humanizeToken(value: string): string {
  return value.replaceAll("_", " ");
}
