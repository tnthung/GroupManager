import * as vscode from "vscode";


export class PageItem extends vscode.TreeItem {
  readonly isGroup = false as const;
  readonly isPage  = true  as const;

  constructor(
    readonly group: GroupItem,
    public   name : string,
    readonly path : string,
  ) {
    super(path, vscode.TreeItemCollapsibleState.None);

    this.contextValue = "groupManager.page";
  }

  public intoJson(): string {
    return `"${this.label}": "${this.path}"`;
  }
}


export class GroupItem extends vscode.TreeItem {
  readonly isGroup = true as const;
  readonly isPage  = false as const;

  pages = [] as PageItem[];

  constructor(
    readonly manager: GroupManagerProvider,
    public   name   : string
  ) {
    super(name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "groupManager.group";
  }

  public addPage(path: string) {
    // check if page already exists
    if (this.pages.some(f => f.path === path))
      return;

    // extract the file name from path
    const label = path.split("/").pop() as string;

    // push new page
    this.pages.push(new PageItem(this, label, path));

    // update tree view
    this.manager.emitter.fire();
  }

  public removePage(path: string) {
    // extract the file name from path
    const label = path.split("/").pop() as string;

    // remove page if exists
    const index = this.pages.findIndex(f => f.path === path);
    if (index === -1) return;

    this.pages.splice(index, 1);

    // update tree view
    this.manager.emitter.fire();
  }

  public intoJson(): string {
    let str = `"${this.label}": {`;

    for (let i = 0; i < this.pages.length; i++) {
      if (i !== 0) str += ",";
      str += this.pages[i].intoJson();
    }

    str += "}";

    return str;
  }
}


type TreeItem = GroupItem | PageItem;


export class GroupManagerProvider implements vscode.TreeDataProvider<TreeItem> {
  context: vscode.ExtensionContext;
  groups = [] as GroupItem[];

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }


  emitter = new vscode.EventEmitter<void | TreeItem | TreeItem[] | null | undefined>();
  onDidChangeTreeData = this.emitter.event;

  getTreeItem(element: TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  getChildren(element?: TreeItem | undefined): vscode.ProviderResult<TreeItem[]> {
    return element?.isGroup ? element.pages : this.groups;
  }
}
