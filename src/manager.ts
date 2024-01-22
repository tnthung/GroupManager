import * as vscode from "vscode";


export class TabGroupProxy {
  private readonly _group: vscode.TabGroup
  private          _viewColumn: number;

  private onFocusCB = [] as (() => void)[];
  private onBlurCB  = [] as (() => void)[];

  constructor(group?: vscode.TabGroup) {
    this._group      = group ?? vscode.window.tabGroups.activeTabGroup!;
    this._viewColumn = this._group.viewColumn;

    vscode.window.tabGroups.onDidChangeTabGroups(e => {
      for (const opened of e.opened)
        if (opened.viewColumn <= this.viewColumn)
          this._viewColumn++;

      for (const closed of e.closed)
        if (closed.viewColumn <= this.viewColumn)
          this._viewColumn--;

      for (const changed of e.changed) {
        if (changed.viewColumn !== this.viewColumn)
          continue;

        (changed.isActive
          ? this.onFocusCB
          : this.onBlurCB
        ).forEach(f => f());
      }
    });
  }

  private get newInfo() {
    return vscode.window.tabGroups.all
      .find(f => f.viewColumn === this._group.viewColumn);
  }

  get tabs      () { return this.newInfo?.tabs     ?? [];    }
  get isActive  () { return this.newInfo?.isActive ?? false; }
  get viewColumn() { return this._viewColumn;                }

  public onFocus(cb: () => void) {
    this.onFocusCB.push(cb);
  }

  public onBlur(cb: () => void) {
    this.onBlurCB.push(cb);
  }
}


export class PageItem extends vscode.TreeItem {
  readonly isGroup = false as const;
  readonly isPage  = true  as const;

  name: string;

  constructor(
    readonly group: GroupItem,
    readonly path : string,
  ) {
    super((() => {
      const workspaceFolders = vscode.workspace.workspaceFolders!;
      const workspaceCount   = workspaceFolders.length;

      let name = "";

      for (const workspace of workspaceFolders) {
        const workspacePath = workspace.uri.path;
        if (!path.startsWith(workspacePath)) continue;

        if (workspaceCount > 1)
          name += `[${workspace.name}] `;
        name += path.slice(workspacePath.length + 1);
        break;
      }

      return name;
    })(), vscode.TreeItemCollapsibleState.None);

    this.name = this.label! as string;
    this.contextValue = "groupManager.page";
  }

  public remove() {
    this.group.removePage(this.path);
  }
}


export class GroupItem extends vscode.TreeItem {
  readonly isGroup = true  as const;
  readonly isPage  = false as const;

  group = undefined as undefined | TabGroupProxy;
  pages = []        as PageItem[];

  constructor(
    readonly manager: GroupManagerProvider,
    public   name   : string
  ) {
    super(name, vscode.TreeItemCollapsibleState.Collapsed);

    this.contextValue = "groupManager.group";
  }

  public get viewColumn() { return this.group?.viewColumn; }

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

  private async focusGroup() {
    if (this.viewColumn === undefined) return;

    const nth = [
      "First",
      "Second",
      "Third",
      "Fourth",
      "Fifth",
      "Sixth",
      "Seventh",
      "Eighth",
    ][this.viewColumn-1];

    await vscode.commands.executeCommand(`workbench.action.focus${nth}EditorGroup`);
  }

  public async focus() {
    if (!this.pages.length) return;

    if (this.contextValue === "groupManager.focused")
      return;

    this.contextValue = "groupManager.focused";
    this.label        = `👁️ ${this.name}`;

    const newWindow = vscode.workspace.getConfiguration("groupManager").get("openInNewWindow");

    if (this.viewColumn !== undefined)
      await this.focusGroup();

    else {
      // create a new tab group
      if (newWindow)
        await vscode.commands.executeCommand("workbench.action.newEmptyEditorWindow");

      else
        await vscode.commands.executeCommand("workbench.action.newGroupBelow");

      // open pages in the new tab group
      for (const page of this.pages)
        vscode.commands.executeCommand("vscode.open", vscode.Uri.file(page.path), {preview: false});

      // set the new tab group to this group
      this.group = new TabGroupProxy();
    }

    // maximize the new tab group
    vscode.commands.executeCommand("workbench.action.toggleMaximizeEditorGroup");

    // lock the new tab group
    vscode.commands.executeCommand("workbench.action.lockEditorGroup");

    // set this group as latest
    this.manager.setLatestGroup(this);

    // update tree view
    this.manager.emitter.fire();
  }

  public blur() {
    if (this.contextValue !== "groupManager.focused")
      return;

    this.contextValue = "groupManager.group";

    // update tree view
    this.manager.emitter.fire();
  }

  public async close() {
    await vscode.commands.executeCommand("workbench.action.closeEditorsInGroup");
    await vscode.commands.executeCommand("workbench.action.closeGroup");
  }

  public detach() {
    this.group        = undefined;
    this.label        = this.name;
    this.contextValue = "groupManager.group";

    // update tree view
    this.manager.emitter.fire();
  }

  public tryDetach() {
    if (!this.group) return;

    // get new group state
    const needDetach = this.group.tabs.length === 0;

    // check if all pages are closed
    if (needDetach)
      this.detach();

    return needDetach;
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
  latest = [] as GroupItem[];

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

  async openGroup(group: GroupItem) {
    this.blurAllGroups(group);
    await group.focus();
  }

  async closeGroup(group: GroupItem) {
    group.close();
    this.latest.pop();
    this.tryFocusLatestGroup();
  }

  blurAllGroups(except?: GroupItem) {
    for (const group of this.groups)
      if (!except || group.viewColumn !== except.viewColumn)
        group.blur();
  }

  setLatestGroup(group: GroupItem) {
    const index = this.latest.findIndex(
      f => f.name === group.name);

    if (index !== -1)
      this.latest.splice(index, 1);
    this.latest.push(group);
  }

  tryFocusLatestGroup() {
    this.latest[0]?.focus();
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
        group.addPage(new PageItem(group, path));
    }
  }
}
