import * as vscode from 'vscode';

import {
  PageItem,
  GroupItem,
  GroupManagerProvider,
} from './manager';


export function activate(context: vscode.ExtensionContext) {
  const groupManager = new GroupManagerProvider(context);

  context.subscriptions.push(vscode.commands.registerCommand("groupManager.createGroup", async _ => {
    // get root path of the workspace
    const workspaceFolders = vscode.workspace.workspaceFolders!;
    const workspaceCount   = workspaceFolders.length;

    // get the name of the group
    const groupName = await vscode.window.showInputBox({
      title: "Group Name",
      value: "New Group",
      placeHolder: "Enter the name of the group"});

    if (!groupName) return;

    // create a group
    const group = groupManager.createGroup(groupName);

    // check if group was created
    if (!group) {
      vscode.window.showErrorMessage(`Group '${groupName}' already exists`);
      return;
    }

    // add pages to group
    for (const tabGroup of vscode.window.tabGroups.all) {
      if (!tabGroup.isActive) continue;

      for (const editor of tabGroup.tabs) {
        if (editor.isPreview || !editor.input) continue;

        let   name = "";
        const uri  = (editor.input as any).uri as vscode.Uri;
        const path = uri.path;

        for (const workspace of workspaceFolders) {
          const workspacePath = workspace.uri.path;
          if (!path.startsWith(workspacePath)) continue;

          if (workspaceCount > 1)
            name += `[${workspace.name}] `;
          name += path.slice(workspacePath.length + 1);

          break;
        }

        group?.addPage(new PageItem(group, name, path));
      }

      break;
    }
  }));


  context.subscriptions.push(vscode.commands.registerCommand("groupManager.renameGroup", async (group: GroupItem) => {
    // get the name of the group
    const groupName = await vscode.window.showInputBox({
      title: "Group Name",
      value: group.name,
      placeHolder: "Enter the name of the group"});

    if (!groupName) return;

    // rename group
    groupManager.renameGroup(group.name, groupName);
  }));


  context.subscriptions.push(vscode.commands.registerCommand("groupManager.updateGroup", async (group: GroupItem) => {
    // get root path of the workspace
    const workspaceFolders = vscode.workspace.workspaceFolders!;
    const workspaceCount   = workspaceFolders.length;

    // clear pages
    group.clearPages();

    // add pages to group
    for (const tabGroup of vscode.window.tabGroups.all) {
      if (!tabGroup.isActive) continue;

      for (const editor of tabGroup.tabs) {
        if (editor.isPreview || !editor.input) continue;

        let   name = "";
        const uri  = (editor.input as any).uri as vscode.Uri;
        const path = uri.path;

        for (const workspace of workspaceFolders) {
          const workspacePath = workspace.uri.path;
          if (!path.startsWith(workspacePath)) continue;

          if (workspaceCount > 1)
            name += `[${workspace.name}] `;
          name += path.slice(workspacePath.length + 1);

          break;
        }

        group?.addPage(new PageItem(group, name, path));
      }

      break;
    }
  }));


  context.subscriptions.push(vscode.commands.registerCommand("groupManager.openGroup", async (group: GroupItem) => {
    groupManager.blurAllGroups();
    group.focus();
  }));


  context.subscriptions.push(vscode.commands.registerCommand("groupManager.detachGroup", async (group: GroupItem) => {
    group.detach();
  }));


  context.subscriptions.push(vscode.commands.registerCommand("groupManager.deleteGroup", async (group: GroupItem) => {
    groupManager.deleteGroup(group.name);
  }));


  context.subscriptions.push(vscode.commands.registerCommand("groupManager.refresh", async (group: GroupItem) => {
    groupManager.emitter.fire(group);
  }));


  context.subscriptions.push(vscode.commands.registerCommand("groupManager.removePage", async (page: PageItem) => {
    page.remove();
  }));

  vscode.window.registerTreeDataProvider("groupManager", groupManager);
}


export function deactivate() {}
