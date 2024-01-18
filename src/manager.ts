import * as vscode from "vscode";


export class PageItem extends vscode.TreeItem {
  readonly isGroup = false as const;
  readonly isPage  = true  as const;

  constructor(
    readonly group: GroupItem,
    public   name : string,
    readonly path : string,
  ) {
    super(name, vscode.TreeItemCollapsibleState.None);

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

  public addPage(page: PageItem) {
    // check if page already exists
    if (this.pages.some(f => f.path === page.path))
      return;

    // push page
    this.pages.push(page);

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


  createGroup(name: string): GroupItem | undefined {
    // check if group already exists
    if (this.groups.some(f => f.name === name))
      return;

    // create new group
    const group = new GroupItem(this, name);

    // push new group
    this.groups.push(group);

    // update tree view
    this.emitter.fire();

    // return new group
    return group;
  }

  deleteGroup(name: string) {
    // remove group if exists
    const index = this.groups.findIndex(f => f.name === name);
    if (index === -1) return;

    this.groups.splice(index, 1);

    // update tree view
    this.emitter.fire();
  }

  renameGroup(oldName: string, newName: string) {
    // check if group already exists
    if (this.groups.some(f => f.name === newName)) {
      vscode.window.showErrorMessage(`Group '${newName}' already exists`);
      return;
    }

    // rename group if exists
    const group = this.groups.find(f => f.name === oldName);
    if (!group) {
      vscode.window.showErrorMessage(`Group '${oldName}' does not exist`);
      return;
    }

    group.name  = newName;
    group.label = newName;

    // update tree view
    this.emitter.fire();
  }
}
