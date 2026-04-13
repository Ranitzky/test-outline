import * as assert from 'assert';
import { parseTestFile, TestNode } from '../parser';

// Helper to get the first root node
const first = (text: string): TestNode => parseTestFile(text).nodes[0];
const parse = (text: string) => parseTestFile(text);

describe('parseTestFile', () => {
  describe('returns empty result for empty input', () => {
    it('handles empty string', () => {
      const result = parse('');
      assert.deepStrictEqual(result.nodes, []);
      assert.strictEqual(result.hasOnlyTests, false);
    });

    it('handles whitespace-only input', () => {
      const result = parse('   \n  \n');
      assert.deepStrictEqual(result.nodes, []);
    });
  });

  // ── Basic keywords ──────────────────────────────────────────────────────────

  describe('basic keywords', () => {
    it('recognizes describe blocks', () => {
      const node = first("describe('my suite', () => {});");
      assert.strictEqual(node.type, 'describe');
      assert.strictEqual(node.keyword, 'describe');
      assert.strictEqual(node.name, 'my suite');
      assert.strictEqual(node.line, 1);
    });

    it('recognizes it blocks', () => {
      const node = first("it('does something', () => {});");
      assert.strictEqual(node.type, 'it');
      assert.strictEqual(node.keyword, 'it');
      assert.strictEqual(node.name, 'does something');
    });

    it('recognizes context blocks', () => {
      const node = first("context('when logged in', () => {});");
      assert.strictEqual(node.type, 'context');
      assert.strictEqual(node.keyword, 'context');
      assert.strictEqual(node.name, 'when logged in');
    });
  });

  // ── Jest keywords ────────────────────────────────────────────────────────────

  describe('Jest keywords', () => {
    it('recognizes test() as type it', () => {
      const node = first("test('runs correctly', () => {});");
      assert.strictEqual(node.type, 'it');
      assert.strictEqual(node.keyword, 'test');
      assert.strictEqual(node.name, 'runs correctly');
    });

    it('recognizes specify() as type it', () => {
      const node = first("specify('behaves like this', () => {});");
      assert.strictEqual(node.type, 'it');
      assert.strictEqual(node.keyword, 'specify');
      assert.strictEqual(node.name, 'behaves like this');
    });
  });

  // ── Mocha suite keyword ──────────────────────────────────────────────────────

  describe('Mocha suite keyword', () => {
    it('recognizes suite() as type describe', () => {
      const node = first("suite('my suite', () => {});");
      assert.strictEqual(node.type, 'describe');
      assert.strictEqual(node.keyword, 'suite');
      assert.strictEqual(node.name, 'my suite');
    });
  });

  // ── x-prefix skip variants ───────────────────────────────────────────────────

  describe('x-prefix skip variants', () => {
    it('recognizes xdescribe() with modifier=skip', () => {
      const node = first("xdescribe('skipped suite', () => {});");
      assert.strictEqual(node.type, 'describe');
      assert.strictEqual(node.keyword, 'xdescribe');
      assert.strictEqual(node.modifier, 'skip');
    });

    it('recognizes xit() with modifier=skip', () => {
      const node = first("xit('skipped test', () => {});");
      assert.strictEqual(node.type, 'it');
      assert.strictEqual(node.keyword, 'xit');
      assert.strictEqual(node.modifier, 'skip');
    });

    it('recognizes xtest() with modifier=skip', () => {
      const node = first("xtest('skipped jest test', () => {});");
      assert.strictEqual(node.type, 'it');
      assert.strictEqual(node.keyword, 'xtest');
      assert.strictEqual(node.modifier, 'skip');
    });
  });

  // ── .skip and .only modifiers ────────────────────────────────────────────────

  describe('modifiers', () => {
    it('detects .skip on describe', () => {
      const node = first("describe.skip('skipped', () => {});");
      assert.strictEqual(node.modifier, 'skip');
      assert.strictEqual(node.keyword, 'describe');
    });

    it('detects .only on describe', () => {
      const node = first("describe.only('focused', () => {});");
      assert.strictEqual(node.modifier, 'only');
    });

    it('detects .skip on it', () => {
      const node = first("it.skip('skipped test', () => {});");
      assert.strictEqual(node.modifier, 'skip');
      assert.strictEqual(node.keyword, 'it');
    });

    it('detects .only on it', () => {
      const node = first("it.only('focused test', () => {});");
      assert.strictEqual(node.modifier, 'only');
    });

    it('detects .skip on test', () => {
      const node = first("test.skip('skipped', () => {});");
      assert.strictEqual(node.modifier, 'skip');
      assert.strictEqual(node.keyword, 'test');
    });

    it('detects .only on test', () => {
      const node = first("test.only('focused', () => {});");
      assert.strictEqual(node.modifier, 'only');
      assert.strictEqual(node.keyword, 'test');
    });

    it('detects .skip on suite', () => {
      const node = first("suite.skip('skipped suite', () => {});");
      assert.strictEqual(node.modifier, 'skip');
      assert.strictEqual(node.keyword, 'suite');
    });

    it('has no modifier for plain nodes', () => {
      const node = first("it('plain test', () => {});");
      assert.strictEqual(node.modifier, undefined);
    });
  });

  // ── hasOnlyTests flag ─────────────────────────────────────────────────────────

  describe('hasOnlyTests flag', () => {
    it('is false when no .only tests exist', () => {
      const result = parse("describe('a', () => {}); it('b', () => {});");
      assert.strictEqual(result.hasOnlyTests, false);
    });

    it('is true when it.only exists', () => {
      const result = parse("it.only('focused', () => {});");
      assert.strictEqual(result.hasOnlyTests, true);
    });

    it('is true when test.only exists', () => {
      const result = parse("test.only('focused jest test', () => {});");
      assert.strictEqual(result.hasOnlyTests, true);
    });

    it('is false when only describe.only exists (no it.only)', () => {
      const result = parse("describe.only('focused suite', () => { it('plain', () => {}); });");
      assert.strictEqual(result.hasOnlyTests, false);
    });
  });

  // ── Nesting ───────────────────────────────────────────────────────────────────

  describe('nesting', () => {
    it('nests it inside describe', () => {
      const text = [
        "describe('outer', () => {",
        "  it('inner', () => {});",
        '});',
      ].join('\n');
      const result = parse(text);
      assert.strictEqual(result.nodes.length, 1);
      assert.strictEqual(result.nodes[0].name, 'outer');
      assert.strictEqual(result.nodes[0].children.length, 1);
      assert.strictEqual(result.nodes[0].children[0].name, 'inner');
    });

    it('nests context inside describe', () => {
      const text = [
        "describe('outer', () => {",
        "  context('middle', () => {",
        "    it('inner', () => {});",
        '  });',
        '});',
      ].join('\n');
      const root = parse(text).nodes[0];
      assert.strictEqual(root.children[0].type, 'context');
      assert.strictEqual(root.children[0].children[0].type, 'it');
    });

    it('handles multiple root-level describes', () => {
      const text = "describe('a', () => {});\ndescribe('b', () => {});";
      const result = parse(text);
      assert.strictEqual(result.nodes.length, 2);
      assert.strictEqual(result.nodes[0].name, 'a');
      assert.strictEqual(result.nodes[1].name, 'b');
    });

    it('handles multiple siblings at the same level', () => {
      const text = [
        "describe('outer', () => {",
        "  it('first', () => {});",
        "  it('second', () => {});",
        "  it('third', () => {});",
        '});',
      ].join('\n');
      const root = parse(text).nodes[0];
      assert.strictEqual(root.children.length, 3);
    });
  });

  // ── Quote styles ──────────────────────────────────────────────────────────────

  describe('quote styles', () => {
    it('handles single quotes', () => {
      assert.strictEqual(first("it('single', () => {});").name, 'single');
    });

    it('handles double quotes', () => {
      assert.strictEqual(first('it("double", () => {});').name, 'double');
    });

    it('handles backtick template literals', () => {
      assert.strictEqual(first('it(`backtick`, () => {});').name, 'backtick');
    });
  });

  // ── Multi-line labels ─────────────────────────────────────────────────────────

  describe('multi-line labels', () => {
    it('finds describe name on the next line', () => {
      const text = "describe(\n  'deferred name',\n  () => {}\n);";
      const node = first(text);
      assert.strictEqual(node.type, 'describe');
      assert.strictEqual(node.name, 'deferred name');
    });

    it('finds it name on the next line', () => {
      const text = "it(\n  // comment\n  'deferred it',\n  () => {}\n);";
      const node = first(text);
      assert.strictEqual(node.type, 'it');
      assert.strictEqual(node.name, 'deferred it');
    });
  });

  // ── Cypress guard ─────────────────────────────────────────────────────────────

  describe('Cypress guard', () => {
    it('does not match cy.it()', () => {
      const result = parse("cy.it('should not match', () => {});");
      assert.strictEqual(result.nodes.length, 0);
    });

    it('does match plain it() on the same line as cy usage', () => {
      // a line with a plain it() that also references cy elsewhere in the file
      const text = "it('real test', () => { cy.visit('/'); });";
      const node = first(text);
      assert.strictEqual(node.type, 'it');
    });
  });

  // ── Line numbers ──────────────────────────────────────────────────────────────

  describe('line numbers', () => {
    it('reports correct line number (1-based)', () => {
      const text = "\ndescribe('second line', () => {});";
      const node = first(text);
      assert.strictEqual(node.line, 2);
    });

    it('reports correct line for nested nodes', () => {
      const text = [
        "describe('outer', () => {",  // line 1
        "  it('inner', () => {});",   // line 2
        '});',
      ].join('\n');
      const inner = parse(text).nodes[0].children[0];
      assert.strictEqual(inner.line, 2);
    });
  });
});
