import * as vscode from 'vscode';

import {
  PageItem,
  GroupItem,
  GroupManagerProvider,
} from './manager';


export function activate(context: vscode.ExtensionContext) {
  const groupManager = new GroupManagerProvider(context);

  context.subscriptions.push(vscode.commands.registerCommand("groupManager.createGroup", async _ => {
    // get the active tab group
    const activeTabGroup = vscode.window.tabGroups.activeTabGroup;

    // check if group is already active
    const alreadyActive = groupManager.groups.some(
      f => f.viewColumn === activeTabGroup.viewColumn);

    if (alreadyActive)
      return vscode.commands.executeCommand("groupManager.updateGroup");

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
    for (const editor of activeTabGroup.tabs) {
      if (editor.isPreview || !editor.input) continue;

      const uri = (editor.input as any).uri as vscode.Uri;
      group?.addPage(new PageItem(group, uri.path));
    }

    // set the group as active & focus if more than one group is opened
    if (vscode.window.tabGroups.all.length > 1) {
      group.group = vscode.window.tabGroups.activeTabGroup;
      group.focus();
    }

    // save the config
    groupManager.saveToConfig();
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
    // clear pages
    group.clearPages();

    // add pages to group
    for (const tabGroup of vscode.window.tabGroups.all) {
      if (!tabGroup.isActive) continue;

      for (const editor of tabGroup.tabs) {
        if (editor.isPreview || !editor.input) continue;

        const uri  = (editor.input as any).uri as vscode.Uri;
        group?.addPage(new PageItem(group, uri.path));
      }

      break;
    }

    // save the config
    groupManager.saveToConfig();
  }));


  context.subscriptions.push(vscode.commands.registerCommand("groupManager.openGroup", async (group: GroupItem) => {
    groupManager.blurAllGroups(group);
    group.focus();
  }));


  context.subscriptions.push(vscode.commands.registerCommand("groupManager.detachGroup", async (group: GroupItem) => {
    group.detach();
  }));


  context.subscriptions.push(vscode.commands.registerCommand("groupManager.deleteGroup", async (group: GroupItem) => {
    groupManager.deleteGroup(group.name);

    // save the config
    groupManager.saveToConfig();
  }));


  context.subscriptions.push(vscode.commands.registerCommand("groupManager.refresh", async (group: GroupItem) => {
    groupManager.emitter.fire(group);
  }));


  context.subscriptions.push(vscode.commands.registerCommand("groupManager.removePage", async (page: PageItem) => {
    page.remove();

    // save the config
    groupManager.saveToConfig();
  }));


  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(async (editor: vscode.TextEditor | undefined) => {
    if (!editor) {
      // try detaching the group
      for (const group of groupManager.groups)
        group.tryDetach();
      return;
    }

    if (!editor.viewColumn) {
      groupManager.blurAllGroups();
      return;
    }

    // get view column of the active editor
    const viewColumn = editor.viewColumn;

    // iterate over all groups
    for (const group of groupManager.groups) {
      // check if group is opened
      if (!group.viewColumn) continue;

      // check if the current editor is in the group
      if (group.viewColumn !== viewColumn) {
        group.blur();
        continue;
      }

      // if the current editor is in the group, focus the group
      group.focus();
      return;
    }
  }));


  vscode.window.registerTreeDataProvider("groupManager", groupManager);
}


export function deactivate() {}
