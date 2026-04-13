import * as assert from 'assert';
import { applyModification } from '../parser';

describe('applyModification', () => {
  // ── addSkip ──────────────────────────────────────────────────────────────────

  describe('addSkip', () => {
    it('adds .skip to it', () => {
      assert.strictEqual(
        applyModification("  it('my test', () => {});", 'it', 'addSkip'),
        "  it.skip('my test', () => {});"
      );
    });

    it('adds .skip to test', () => {
      assert.strictEqual(
        applyModification("  test('my test', () => {});", 'test', 'addSkip'),
        "  test.skip('my test', () => {});"
      );
    });

    it('adds .skip to specify', () => {
      assert.strictEqual(
        applyModification("  specify('my test', () => {});", 'specify', 'addSkip'),
        "  specify.skip('my test', () => {});"
      );
    });

    it('adds .skip to describe', () => {
      assert.strictEqual(
        applyModification("describe('suite', () => {});", 'describe', 'addSkip'),
        "describe.skip('suite', () => {});"
      );
    });

    it('adds .skip to suite', () => {
      assert.strictEqual(
        applyModification("suite('suite', () => {});", 'suite', 'addSkip'),
        "suite.skip('suite', () => {});"
      );
    });

    it('replaces existing .only with .skip', () => {
      assert.strictEqual(
        applyModification("it.only('my test', () => {});", 'it', 'addSkip'),
        "it.skip('my test', () => {});"
      );
    });

    it('returns original line unchanged for xdescribe (already skipped)', () => {
      const line = "xdescribe('suite', () => {});";
      assert.strictEqual(applyModification(line, 'xdescribe', 'addSkip'), line);
    });

    it('returns original line unchanged for xit (already skipped)', () => {
      const line = "xit('test', () => {});";
      assert.strictEqual(applyModification(line, 'xit', 'addSkip'), line);
    });

    it('returns original line unchanged for xtest (already skipped)', () => {
      const line = "xtest('test', () => {});";
      assert.strictEqual(applyModification(line, 'xtest', 'addSkip'), line);
    });
  });

  // ── removeSkip ───────────────────────────────────────────────────────────────

  describe('removeSkip', () => {
    it('removes .skip from it', () => {
      assert.strictEqual(
        applyModification("  it.skip('my test', () => {});", 'it', 'removeSkip'),
        "  it('my test', () => {});"
      );
    });

    it('removes .skip from test', () => {
      assert.strictEqual(
        applyModification("  test.skip('my test', () => {});", 'test', 'removeSkip'),
        "  test('my test', () => {});"
      );
    });

    it('removes .skip from describe', () => {
      assert.strictEqual(
        applyModification("describe.skip('suite', () => {});", 'describe', 'removeSkip'),
        "describe('suite', () => {});"
      );
    });

    it('converts xdescribe to describe', () => {
      assert.strictEqual(
        applyModification("xdescribe('suite', () => {});", 'xdescribe', 'removeSkip'),
        "describe('suite', () => {});"
      );
    });

    it('converts xit to it', () => {
      assert.strictEqual(
        applyModification("  xit('test', () => {});", 'xit', 'removeSkip'),
        "  it('test', () => {});"
      );
    });

    it('converts xtest to test', () => {
      assert.strictEqual(
        applyModification("  xtest('test', () => {});", 'xtest', 'removeSkip'),
        "  test('test', () => {});"
      );
    });

    it('leaves a plain it unchanged', () => {
      const line = "it('plain', () => {});";
      assert.strictEqual(applyModification(line, 'it', 'removeSkip'), line);
    });
  });

  // ── addOnly ──────────────────────────────────────────────────────────────────

  describe('addOnly', () => {
    it('adds .only to it', () => {
      assert.strictEqual(
        applyModification("  it('my test', () => {});", 'it', 'addOnly'),
        "  it.only('my test', () => {});"
      );
    });

    it('adds .only to test', () => {
      assert.strictEqual(
        applyModification("  test('my test', () => {});", 'test', 'addOnly'),
        "  test.only('my test', () => {});"
      );
    });

    it('adds .only to specify', () => {
      assert.strictEqual(
        applyModification("  specify('my test', () => {});", 'specify', 'addOnly'),
        "  specify.only('my test', () => {});"
      );
    });

    it('adds .only to describe', () => {
      assert.strictEqual(
        applyModification("describe('suite', () => {});", 'describe', 'addOnly'),
        "describe.only('suite', () => {});"
      );
    });

    it('adds .only to suite', () => {
      assert.strictEqual(
        applyModification("suite('suite', () => {});", 'suite', 'addOnly'),
        "suite.only('suite', () => {});"
      );
    });

    it('replaces existing .skip with .only', () => {
      assert.strictEqual(
        applyModification("it.skip('my test', () => {});", 'it', 'addOnly'),
        "it.only('my test', () => {});"
      );
    });

    it('converts xdescribe to describe.only', () => {
      assert.strictEqual(
        applyModification("xdescribe('suite', () => {});", 'xdescribe', 'addOnly'),
        "describe.only('suite', () => {});"
      );
    });

    it('converts xit to it.only', () => {
      assert.strictEqual(
        applyModification("  xit('test', () => {});", 'xit', 'addOnly'),
        "  it.only('test', () => {});"
      );
    });

    it('converts xtest to test.only', () => {
      assert.strictEqual(
        applyModification("  xtest('test', () => {});", 'xtest', 'addOnly'),
        "  test.only('test', () => {});"
      );
    });
  });

  // ── removeOnly ───────────────────────────────────────────────────────────────

  describe('removeOnly', () => {
    it('removes .only from it', () => {
      assert.strictEqual(
        applyModification("  it.only('my test', () => {});", 'it', 'removeOnly'),
        "  it('my test', () => {});"
      );
    });

    it('removes .only from test', () => {
      assert.strictEqual(
        applyModification("  test.only('my test', () => {});", 'test', 'removeOnly'),
        "  test('my test', () => {});"
      );
    });

    it('removes .only from describe', () => {
      assert.strictEqual(
        applyModification("describe.only('suite', () => {});", 'describe', 'removeOnly'),
        "describe('suite', () => {});"
      );
    });

    it('leaves a plain it unchanged', () => {
      const line = "it('plain', () => {});";
      assert.strictEqual(applyModification(line, 'it', 'removeOnly'), line);
    });
  });

  // ── Indentation preserved ────────────────────────────────────────────────────

  describe('preserves indentation and surrounding code', () => {
    it('keeps leading whitespace', () => {
      const result = applyModification("    it('test', () => {});", 'it', 'addSkip');
      assert.ok(result.startsWith('    '));
    });

    it('keeps trailing content after the call', () => {
      const result = applyModification("it('test', () => {}); // important", 'it', 'addSkip');
      assert.ok(result.endsWith('// important'));
    });
  });
});
