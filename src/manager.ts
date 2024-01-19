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

  public remove() {
    this.group.removePage(this.path);
  }
}


export class GroupItem extends vscode.TreeItem {
  readonly isGroup = true  as const;
  readonly isPage  = false as const;

  group = undefined as undefined | vscode.TabGroup;
  pages = []        as PageItem[];

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

  public clearPages() {
    this.pages = [];

    // update tree view
    this.manager.emitter.fire();
  }

  public async focus() {
    if (!this.pages.length) return;

    if (this.group !== undefined) {
      // focus the tab group
      const nth = [
        "First",
        "Second",
        "Third",
        "Fourth",
        "Fifth",
        "Sixth",
        "Seventh",
        "Eighth",
      ][this.group.viewColumn-1];

      await vscode.commands.executeCommand(`workbench.action.focus${nth}EditorGroup`);
    }

    else {
      // create a new tab group
      await vscode.commands.executeCommand("workbench.action.newGroupBelow");

      // open pages in the new tab group
      for (const page of this.pages)
        vscode.commands.executeCommand("vscode.open", vscode.Uri.file(page.path), {preview: false});

      // get the config of if open in new window
      if (vscode.workspace.getConfiguration("groupManager").get("openInNewWindow") === true)
        // move the new tab group to the new window
        await vscode.commands.executeCommand("workbench.action.moveEditorGroupToNewWindow");

      // set the new tab group to this group
      this.group = vscode.window.tabGroups.activeTabGroup;
    }

    // maximize the new tab group
    await vscode.commands.executeCommand("workbench.action.toggleMaximizeEditorGroup");

    // lock the new tab group
    await vscode.commands.executeCommand("workbench.action.lockEditorGroup");

    this.contextValue = "groupManager.focused";
    this.label        = `👁️ ${this.name}`;

    // update tree view
    this.manager.emitter.fire();
  }

  public blur() {
    this.contextValue = "groupManager.group";

    // update tree view
    this.manager.emitter.fire();
  }

  public detach() {
    this.group        = undefined;
    this.label        = this.name;
    this.contextValue = "groupManager.group";

    // update tree view
    this.manager.emitter.fire();
  }
}


type Config = Record<string, {
  name : string,
  pages: string[],
}>;


type TreeItem = GroupItem | PageItem;


export class GroupManagerProvider implements vscode.TreeDataProvider<TreeItem> {
  readonly config = vscode.workspace.getConfiguration("groupManager");
  groups = [] as GroupItem[];

  constructor(
    readonly context: vscode.ExtensionContext
  ) {
    this.context = context;
    this.loadFromConfig();
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

    // save to config
    this.saveToConfig();

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

    // save to config
    this.saveToConfig();

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

    // save to config
    this.saveToConfig();

    // update tree view
    this.emitter.fire();
  }

  blurAllGroups() {
    for (const group of this.groups)
      group.blur();
  }

  saveToConfig() {
    const config = {} as Config;

    for (const group of this.groups)
      config[group.name] = {
        name : group.name,
        pages: group.pages.map(f => f.path),
      };

    this.config.update("groups", config, vscode.ConfigurationTarget.Workspace);
  }

  loadFromConfig() {
    const config = this.config.get("groups") as Config | undefined;

    if (!config) return;

    this.groups = [];

    for (const name in config) {
      const group = this.createGroup(name)!;

      for (const path of config[name].pages)
        group.addPage(new PageItem(group, path.split("/").pop() as string, path));
    }
  }
}
