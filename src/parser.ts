const MAX_LINES_TO_SEARCH = 5;

export interface TestNode {
  name: string;
  type: 'describe' | 'context' | 'it';
  keyword: string;
  line: number;
  modifier?: 'skip' | 'only';
  children: TestNode[];
  level: number;
  lineText: string;
}

export interface ParseResult {
  nodes: TestNode[];
  hasOnlyTests: boolean;
}

export function parseTestFile(text: string): ParseResult {
  const lines = text.split('\n');
  const rootNodes: TestNode[] = [];
  const stack: TestNode[] = [];
  let hasOnlyTests = false;

  const getCurrentParent = (level: number): TestNode | undefined => {
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].level < level) {
        return stack[i];
      }
    }
    return undefined;
  };

  const findTestName = (startIndex: number): string | null => {
    for (let i = startIndex; i < Math.min(startIndex + MAX_LINES_TO_SEARCH, lines.length); i++) {
      const match = lines[i].match(/['"`](.*?)['"`]/);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  lines.forEach((line, index) => {
    const indentation = line.search(/\S/);
    const level = Math.floor(indentation / 2);

    const createNode = (
      type: TestNode['type'],
      keyword: string,
      modifierMatch: string | undefined,
      name: string
    ): TestNode => {
      const modifier = modifierMatch?.slice(1) as 'skip' | 'only' | undefined;

      if (type === 'it' && modifier === 'only') {
        hasOnlyTests = true;
      }

      return { name, type, keyword, line: index + 1, modifier, children: [], level, lineText: line };
    };

    const describeMatch = line.match(/\b(describe|suite)(\.skip|\.only)?\s*\(\s*['"`](.*?)['"`]/);
    const xDescribeMatch = line.match(/\b(xdescribe)\s*\(\s*['"`](.*?)['"`]/);
    const contextMatch = line.match(/\b(context)(\.skip|\.only)?\s*\(\s*['"`](.*?)['"`]/);
    const itMatch = line.match(/(?<!cy\.)\b(it|test|specify)(\.skip|\.only)?\s*\(\s*['"`](.*?)['"`]/);
    const xItMatch = line.match(/(?<!cy\.)\b(xit|xtest)\s*\(\s*['"`](.*?)['"`]/);

    const describeNoLabel = line.match(/\b(describe|suite)(\.skip|\.only)?\s*\(/);
    const xDescribeNoLabel = line.match(/\b(xdescribe)\s*\(/);
    const contextNoLabel = line.match(/\b(context)(\.skip|\.only)?\s*\(/);
    const itNoLabel = line.match(/(?<!cy\.)\b(it|test|specify)(\.skip|\.only)?\s*\(/);
    const xItNoLabel = line.match(/(?<!cy\.)\b(xit|xtest)\s*\(/);

    let node: TestNode | undefined;

    if (describeMatch) {
      node = createNode('describe', describeMatch[1], describeMatch[2], describeMatch[3]);
    } else if (xDescribeMatch) {
      node = createNode('describe', xDescribeMatch[1], '.skip', xDescribeMatch[2]);
    } else if (contextMatch) {
      node = createNode('context', contextMatch[1], contextMatch[2], contextMatch[3]);
    } else if (itMatch) {
      node = createNode('it', itMatch[1], itMatch[2], itMatch[3]);
    } else if (xItMatch) {
      node = createNode('it', xItMatch[1], '.skip', xItMatch[2]);
    } else if (describeNoLabel && !line.match(/['"`]/)) {
      const name = findTestName(index + 1);
      if (name) {
        node = createNode('describe', describeNoLabel[1], describeNoLabel[2], name);
      }
    } else if (xDescribeNoLabel && !line.match(/['"`]/)) {
      const name = findTestName(index + 1);
      if (name) {
        node = createNode('describe', 'xdescribe', '.skip', name);
      }
    } else if (contextNoLabel && !line.match(/['"`]/)) {
      const name = findTestName(index + 1);
      if (name) {
        node = createNode('context', contextNoLabel[1], contextNoLabel[2], name);
      }
    } else if (itNoLabel && !line.match(/['"`]/)) {
      const name = findTestName(index + 1);
      if (name) {
        node = createNode('it', itNoLabel[1], itNoLabel[2], name);
      }
    } else if (xItNoLabel && !line.match(/['"`]/)) {
      const name = findTestName(index + 1);
      if (name) {
        node = createNode('it', xItNoLabel[1], '.skip', name);
      }
    }

    if (node) {
      while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
        stack.pop();
      }
      const parent = getCurrentParent(node.level);
      if (parent) {
        parent.children.push(node);
      } else {
        rootNodes.push(node);
      }
      if (node.type !== 'it') {
        stack.push(node);
      }
    }
  });

  return { nodes: rootNodes, hasOnlyTests };
}

export function applyModification(
  lineText: string,
  keyword: string,
  action: 'addSkip' | 'removeSkip' | 'addOnly' | 'removeOnly'
): string {
  let newText = lineText;
  const isXPrefix = keyword.startsWith('x') && keyword.length > 1;
  const baseKeyword = isXPrefix ? keyword.slice(1) : keyword;

  if (action === 'addSkip') {
    if (isXPrefix) return lineText;
    newText = newText.replace(new RegExp(`\\b(${keyword})\\.only\\b`), '$1');
    newText = newText.replace(new RegExp(`\\b(${keyword})\\b(?!\\.)`), `$1.skip`);
  } else if (action === 'removeSkip') {
    if (isXPrefix) {
      newText = newText.replace(new RegExp(`\\b${keyword}\\b`), baseKeyword);
    } else {
      newText = newText.replace(new RegExp(`\\b(${keyword})\\.skip\\b`), '$1');
    }
  } else if (action === 'addOnly') {
    if (isXPrefix) {
      newText = newText.replace(new RegExp(`\\b${keyword}\\b`), `${baseKeyword}.only`);
    } else {
      newText = newText.replace(new RegExp(`\\b(${keyword})\\.skip\\b`), '$1');
      newText = newText.replace(new RegExp(`\\b(${keyword})\\b(?!\\.)`), `$1.only`);
    }
  } else if (action === 'removeOnly') {
    newText = newText.replace(new RegExp(`\\b(${keyword})\\.only\\b`), '$1');
  }

  return newText;
}
