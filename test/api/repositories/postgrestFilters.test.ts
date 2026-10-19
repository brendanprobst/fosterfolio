import {
  chunk,
  eqValue,
  inList,
} from '@api/infrastructure/adapters/dataAdapter/postgrestFilters';

describe('postgrest filter values', () => {
  it('leaves plain keys readable', () => {
    expect(eqValue('lawn_sign')).toBe('lawn_sign');
    expect(eqValue('2026-10-08')).toBe('2026-10-08');
  });

  it('quotes reserved characters and URL-encodes the result', () => {
    // `&` would otherwise end the filter and start a new query parameter.
    expect(eqValue('Austin&views=gt.0')).toBe(encodeURIComponent('"Austin&views=gt.0"'));
    expect(decodeURIComponent(eqValue('a,b)'))).toBe('"a,b)"');
    expect(decodeURIComponent(eqValue('say "hi" \\ bye'))).toBe('"say \\"hi\\" \\\\ bye"');
  });

  it('builds in-lists one quoted value at a time', () => {
    expect(inList(['a', 'b'])).toBe('(a,b)');
    expect(decodeURIComponent(inList(['x),or=(id.not.is.null']))).toBe(
      '("x),or=(id.not.is.null")'
    );
  });

  it('chunks long id lists', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([])).toEqual([]);
  });
});
