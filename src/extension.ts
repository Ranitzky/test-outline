import * as vscode from 'vscode';

interface TestNode {
  name: string;
  type: 'describe' | 'context' | 'it';
  line: number;
  modifier?: 'skip' | 'only';
  children: TestNode[];
  level: number;
  lineText: string;
}

class TestItem extends vscode.TreeItem {
  constructor(
    public readonly node: TestNode,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    private readonly hasOnlyTests: boolean
  ) {
    super(node.name, collapsibleState);

    // Set icons based on type
    switch (node.type) {
      case 'describe':
        this.iconPath = new vscode.ThemeIcon('repo');
        break;
      case 'context':
        this.iconPath = new vscode.ThemeIcon('symbol-folder');
        break;
      case 'it':
        this.iconPath = new vscode.ThemeIcon('test-view-icon');
        break;
    }

    // Set the context value for menu items
    let contextValues = [];

    // Add base context value for the type
    contextValues.push(node.type);

    // Handle skip and only modifiers
    if (node.modifier === 'skip') {
      this.iconPath = new vscode.ThemeIcon('testing-skipped-icon');
      this.tooltip = `${node.name} (skipped)`;
      this.resourceUri = vscode.Uri.parse('skipped-test://');
      contextValues.push('canRemoveSkip');
    } else {
      contextValues.push('canSkip');
    }

    if (node.modifier === 'only') {
      this.iconPath = new vscode.ThemeIcon('star-full');
      this.tooltip = `${node.name} (only)`;
      contextValues.push('canRemoveOnly');
    } else {
      contextValues.push('canOnly');
    }

    if (hasOnlyTests && !node.modifier && node.type === 'it') {
      this.tooltip = `${node.name} (inactive)`;
      this.resourceUri = vscode.Uri.parse('skipped-test://');
    }

    this.contextValue = contextValues.join(' ');
    this.description = `${node.line}`;
    this.command = {
      command: 'testOutline.jumpToLine',
      title: 'Jump to Line',
      arguments: [this.node],
    };
  }
}

class TestOutlineProvider implements vscode.TreeDataProvider<TestItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    TestItem | undefined | null | void
  > = new vscode.EventEmitter<TestItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    TestItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private hasOnlyTests: boolean = false;

  constructor(private context: vscode.ExtensionContext) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TestItem): vscode.TreeItem {
    return element;
  }

  private parseTestFile(text: string): TestNode[] {
    const lines = text.split('\n');
    const rootNodes: TestNode[] = [];
    const stack: TestNode[] = [];
    this.hasOnlyTests = false;

    const getCurrentParent = (level: number): TestNode | undefined => {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].level < level) {
          return stack[i];
        }
      }
      return undefined;
    };

    lines.forEach((line, index) => {
      const indentation = line.search(/\S/);
      const level = Math.floor(indentation / 2);

      // Updated regex patterns to capture modifiers for all block types
      const describeMatch = line.match(
        /\b(describe)(\.skip|\.only)?\s*\(\s*['"`](.*?)['"`]/
      );
      const contextMatch = line.match(
        /\b(context)(\.skip|\.only)?\s*\(\s*['"`](.*?)['"`]/
      );
      const itMatch = line.match(
        /(?<!cy\.)\b(it)(\.skip|\.only)?\s*\(\s*['"`](.*?)['"`]/
      );

      let node: TestNode | undefined;

      if (describeMatch) {
        node = {
          name: describeMatch[3],
          type: 'describe',
          line: index + 1,
          modifier: describeMatch[2]?.slice(1) as 'skip' | 'only' | undefined,
          children: [],
          level: level,
          lineText: line,
        };
      } else if (contextMatch) {
        node = {
          name: contextMatch[3],
          type: 'context',
          line: index + 1,
          modifier: contextMatch[2]?.slice(1) as 'skip' | 'only' | undefined,
          children: [],
          level: level,
          lineText: line,
        };
      } else if (itMatch) {
        node = {
          name: itMatch[3],
          type: 'it',
          line: index + 1,
          modifier: itMatch[2]?.slice(1) as 'skip' | 'only' | undefined,
          children: [],
          level: level,
          lineText: line,
        };

        if (itMatch[2] === '.only') {
          this.hasOnlyTests = true;
        }
      }

      if (node) {
        // Remove items from stack that are at same or higher level
        while (
          stack.length > 0 &&
          stack[stack.length - 1].level >= node.level
        ) {
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

    return rootNodes;
  }

  async getChildren(element?: TestItem): Promise<TestItem[]> {
    if (!vscode.window.activeTextEditor) {
      return [];
    }

    const document = vscode.window.activeTextEditor.document;

    if (!document.fileName.match(/\.(test|spec|cy)\.(js|ts)$/)) {
      return [];
    }

    if (!element) {
      const text = document.getText();
      const nodes = this.parseTestFile(text);

      return nodes.map(
        (node) =>
          new TestItem(
            node,
            node.children.length > 0
              ? vscode.TreeItemCollapsibleState.Expanded
              : vscode.TreeItemCollapsibleState.None,
            this.hasOnlyTests
          )
      );
    } else {
      return element.node.children.map(
        (node) =>
          new TestItem(
            node,
            node.children.length > 0
              ? vscode.TreeItemCollapsibleState.Expanded
              : vscode.TreeItemCollapsibleState.None,
            this.hasOnlyTests
          )
      );
    }
  }

  async modifyTest(
    node: TestNode,
    action: 'addSkip' | 'removeSkip' | 'addOnly' | 'removeOnly'
  ): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const line = editor.document.lineAt(node.line - 1);
    let newText = line.text;

    if (action === 'addSkip') {
      newText = line.text.replace(/\bit\b/, 'it.skip');
    } else if (action === 'removeSkip') {
      newText = line.text.replace(/\bit\.skip\b/, 'it');
    } else if (action === 'addOnly') {
      newText = line.text.replace(/\bit\b/, 'it.only');
    } else if (action === 'removeOnly') {
      newText = line.text.replace(/\bit\.only\b/, 'it');
    }

    if (newText !== line.text) {
      await editor.edit((editBuilder) => {
        editBuilder.replace(line.range, newText);
      });
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  const testOutlineProvider = new TestOutlineProvider(context);
  vscode.window.registerTreeDataProvider('testOutline', testOutlineProvider);

  // Helper function to modify test
  async function modifyTest(modifier: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      console.log('No active editor');
      return;
    }

    const selection = editor.selection;
    if (!selection) {
      console.log('No selection');
      return;
    }

    try {
      const line = editor.document.lineAt(selection.start.line);
      let newText = line.text;
      console.log('Original text:', line.text);

      // Match any of the test block types and their current modifiers
      const regex = /\b(describe|context|it)(\.skip|\.only)?\b/;
      const match = line.text.match(regex);

      if (!match) {
        console.log('No test block found in line');
        return;
      }

      const testType = match[1];
      const currentModifier = match[2];

      // Remove any existing modifier first
      newText = line.text.replace(
        /\b(describe|context|it)(\.skip|\.only)\b/,
        '$1'
      );

      // Then add the new modifier if we're not removing one
      if (modifier.startsWith('add')) {
        const newModifier = modifier === 'addSkip' ? '.skip' : '.only';
        // Only add if it's different from the current modifier
        if (currentModifier !== newModifier) {
          newText = newText.replace(
            new RegExp(`\\b(${testType})\\b`),
            `${testType}${newModifier}`
          );
        }
      }

      console.log('Modified text:', newText);

      if (newText !== line.text) {
        await editor.edit((editBuilder) => {
          editBuilder.replace(line.range, newText);
        });
        console.log('Modification applied successfully');
      } else {
        console.log('No modification needed or pattern not matched');
      }
    } catch (error) {
      console.error('Error modifying test:', error);
    }
  }

  // Register jump to line command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'testOutline.jumpToLine',
      (node: TestNode) => {
        const editor = vscode.window.activeTextEditor;
        if (editor && node.line > 0) {
          const position = new vscode.Position(node.line - 1, 0);
          editor.selection = new vscode.Selection(position, position);
          editor.revealRange(
            new vscode.Range(position, position),
            vscode.TextEditorRevealType.InCenter
          );
        }
      }
    )
  );

  // Register commands with proper argument passing
  context.subscriptions.push(
    vscode.commands.registerCommand('testOutline.addSkip', (...args) => {
      console.log('Add skip command triggered', args[0]);
      if (args[0] && args[0].command) {
        // First jump to the line
        vscode.commands.executeCommand('testOutline.jumpToLine', args[0].node);
        // Then modify the test
        modifyTest('addSkip');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('testOutline.removeSkip', (...args) => {
      console.log('Remove skip command triggered', args[0]);
      if (args[0] && args[0].command) {
        vscode.commands.executeCommand('testOutline.jumpToLine', args[0].node);
        modifyTest('removeSkip');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('testOutline.addOnly', (...args) => {
      console.log('Add only command triggered', args[0]);
      if (args[0] && args[0].command) {
        vscode.commands.executeCommand('testOutline.jumpToLine', args[0].node);
        modifyTest('addOnly');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('testOutline.removeOnly', (...args) => {
      console.log('Remove only command triggered', args[0]);
      if (args[0] && args[0].command) {
        vscode.commands.executeCommand('testOutline.jumpToLine', args[0].node);
        modifyTest('removeOnly');
      }
    })
  );

  // Watch for changes
  vscode.window.onDidChangeActiveTextEditor(() => {
    testOutlineProvider.refresh();
  });

  vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document === vscode.window.activeTextEditor?.document) {
      testOutlineProvider.refresh();
    }
  });
}

export function deactivate() {}
