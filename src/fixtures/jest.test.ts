import { add, subtract, multiply } from './math';

describe('math utils', () => {
  describe('add', () => {
    it('adds two positive numbers', () => {
      expect(add(1, 2)).toBe(3);
    });

    it('handles negative numbers', () => {
      expect(add(-1, 1)).toBe(0);
    });

    test.skip('handles floating point', () => {
      expect(add(0.1, 0.2)).toBeCloseTo(0.3);
    });
  });

  describe('subtract', () => {
    test('subtracts correctly', () => {
      expect(subtract(5, 3)).toBe(2);
    });

    test.only('returns negative when b > a', () => {
      expect(subtract(1, 3)).toBe(-2);
    });
  });

  xdescribe('multiply (not implemented)', () => {
    it('multiplies two numbers', () => {
      expect(multiply(2, 3)).toBe(6);
    });

    xit('handles zero', () => {
      expect(multiply(0, 5)).toBe(0);
    });
  });

  describe(
    // display name split across lines
    'edge cases',
    () => {
      xtest('handles very large numbers', () => {
        expect(add(Number.MAX_SAFE_INTEGER, 1)).toBeDefined();
      });

      it.skip(
        // long label
        'handles values that exceed the safe integer boundary without throwing',
        () => {}
      );
    }
  );
});
