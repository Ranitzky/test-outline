import * as vscode from 'vscode';
import { TestNode, parseTestFile, applyModification } from './parser';

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
  private _onDidChangeTreeData: vscode.EventEmitter<TestItem | undefined | null | void> =
    new vscode.EventEmitter<TestItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TestItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private hasOnlyTests: boolean = false;

  constructor(private context: vscode.ExtensionContext) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TestItem): vscode.TreeItem {
    return element;
  }

  private parseTestFile(text: string): TestNode[] {
    const result = parseTestFile(text);
    this.hasOnlyTests = result.hasOnlyTests;
    return result.nodes;
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

    const lineObj = editor.document.lineAt(node.line - 1);
    const newText = applyModification(lineObj.text, node.keyword, action);

    if (newText !== lineObj.text) {
      await editor.edit((editBuilder) => {
        editBuilder.replace(lineObj.range, newText);
      });
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  const testOutlineProvider = new TestOutlineProvider(context);
  vscode.window.registerTreeDataProvider('testOutline', testOutlineProvider);

  // Register jump to line command
  context.subscriptions.push(
    vscode.commands.registerCommand('testOutline.jumpToLine', (node: TestNode) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && node.line > 0) {
        const position = new vscode.Position(node.line - 1, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(
          new vscode.Range(position, position),
          vscode.TextEditorRevealType.InCenter
        );
      }
    })
  );

  // Register commands with proper argument passing
  context.subscriptions.push(
    vscode.commands.registerCommand('testOutline.addSkip', (item: TestItem) => {
      if (item?.node) {
        testOutlineProvider.modifyTest(item.node, 'addSkip');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('testOutline.removeSkip', (item: TestItem) => {
      if (item?.node) {
        testOutlineProvider.modifyTest(item.node, 'removeSkip');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('testOutline.addOnly', (item: TestItem) => {
      if (item?.node) {
        testOutlineProvider.modifyTest(item.node, 'addOnly');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('testOutline.removeOnly', (item: TestItem) => {
      if (item?.node) {
        testOutlineProvider.modifyTest(item.node, 'removeOnly');
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
