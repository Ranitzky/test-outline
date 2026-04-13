# Copilot Instructions – test-outline

## Commands

```bash
npm run compile          # TypeScript-Kompilierung (tsc)
npm test                 # kompilieren + alle Unit-Tests ausführen
npm run watch            # tsc im Watch-Modus
npm run build            # .vsix-Paket erstellen (vsce package)
```

Einen einzelnen Test ausführen:
```bash
npm run compile && mocha out/test/parser.test.js        # nur Parser-Tests
npm run compile && mocha out/test/modification.test.js  # nur Modifikations-Tests
```

Es gibt keinen konfigurierten Linter-Script in `package.json`. ESLint ist über `eslint.config.mjs` konfiguriert (TypeScript-ESLint), kann aber manuell aufgerufen werden:
```bash
npx eslint src/**/*.ts
```

## Architecture

The extension is split into two layers:

### `src/parser.ts` – VS Code-independent core logic
Contains all pure functions with no VS Code dependency. Exports:
- `TestNode` – the core data type representing a single test block in the tree
- `ParseResult` – `{ nodes: TestNode[], hasOnlyTests: boolean }`
- `parseTestFile(text: string): ParseResult` – regex-based parser that turns raw file text into a `TestNode` tree
- `applyModification(lineText, keyword, action): string` – pure string transformation for skip/only edits

### `src/extension.ts` – VS Code glue layer
Thin layer on top of `parser.ts`. Key classes:
- `TestItem extends vscode.TreeItem` – wraps a `TestNode` and derives VS Code display properties (icon, tooltip, contextValue) from it
- `TestOutlineProvider implements vscode.TreeDataProvider<TestItem>` – calls `parseTestFile`, manages the `hasOnlyTests` flag, and delegates text edits to `applyModification` via `modifyTest()`

The outline only activates for files matching `/\.(test|spec|cy)\.(js|ts)$/`.

### `src/test/` – Unit tests (Mocha, standalone)
Tests target `parser.ts` only and have **no VS Code dependency**. They run directly with Node via `mocha out/test/*.js`.

The file `src/test/extension.test.ts` (legacy) and `src/test/sample.test.ts` require the VS Code extension host and are **not** part of `npm test`.

## Key Conventions

### TestNode keyword vs. type
`TestNode` has two separate fields for the test keyword:
- `type`: visual/structural category — always one of `'describe' | 'context' | 'it'`
- `keyword`: the original source keyword — e.g. `'suite'`, `'test'`, `'xdescribe'`, `'xit'`

**Always use `keyword` when modifying source text** (e.g. in `applyModification`). Use `type` for UI decisions (icons, nesting rules).

### x-prefix keywords
`xdescribe`, `xit`, `xtest` are parsed with `modifier: 'skip'` set automatically. In `applyModification`, they are handled as a special case:
- `addSkip` on an x-prefix keyword → no-op (already skipped)
- `removeSkip` on an x-prefix keyword → strips the `x` prefix (e.g. `xdescribe` → `describe`)
- `addOnly` on an x-prefix keyword → converts to `baseKeyword.only`

### contextValue for tree item menus
`TestItem.contextValue` is a space-separated string of tokens such as `"describe canSkip canOnly"`. Context menu visibility in `package.json` uses regex matching (`viewItem =~ /canSkip/`). When adding new menu actions, add a corresponding token to `contextValues` in the `TestItem` constructor and a `when` clause in `package.json`.

### Nesting via indentation
`parseTestFile` infers nesting from indentation level (`Math.floor(spaces / 2)`), not from brace-matching. `it`/`test`/`specify` nodes are **never pushed onto the stack** and therefore cannot be parents.

### Prettier
Single quotes, 100-char print width, trailing commas (`es5` style). All source files must conform.

### Adding new keywords
To support a new test keyword (e.g. `bench`):
1. Add it to the relevant regex in `parseTestFile` in `parser.ts`
2. Map it to a `type` (`'describe'` or `'it'`) in the `createNode` call
3. Add test cases in `src/test/parser.test.ts` and `src/test/modification.test.ts`
4. No changes to `extension.ts` are needed unless a new icon or context menu item is required
