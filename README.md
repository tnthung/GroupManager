# Group Manager

This is a simple group manager that allows you to manage multiple editor group with ease.

## How to use

### Create group

1. Open the editors you want to group in the same editor group.

![create group 1](/image/create/1.png)

2. Click the `+` button in the group manager panel.

![create group 2](/image/create/2.png)

3. Enter the group name.

![create group 3](/image/create/3.png)

4. You should see the group you just created in the group manager panel.

![create group 4](/image/create/4.png)

### Update group

Update group is basically a shortcut for delete the old group and create a new one with the same
name and the current opened editors.

1. Open the editors you want to group in the same editor group.

![update group 1](/image/update/1.png)

2. Right click the group you want to update in the group manager panel and select `Update Group`.

![update group 2](/image/update/2.png)

3. You should see the group you just updated in the group manager panel.

![update group 3](/image/update/3.png)

### Rename group

You can also rename the existing group.

1. Right click the group you want to rename in the group manager panel and select `Rename Group`.

![rename group 1](/image/rename/1.png)

2. Enter the new name.

![rename group 2](/image/rename/2.png)

3. You should see the group you just renamed in the group manager panel.

![rename group 3](/image/rename/3.png)

### Delete group

1. Right click the group you want to delete in the group manager panel and select `Delete Group`.

![delete group 1](/image/delete/1.png)

2. You should see the group you just deleted is gone from the group manager panel.

![delete group 2](/image/delete/2.png)

### Open "not opened" group

1. Click the eye icon of the group you want to open in the group manager panel.

![open group 1](/image/open/1.png)

2. If the `groupManager.openGroupInNewWindow` setting is true, a new window will be opened with
   the editors in the group. Otherwise, the group will be opened in the current window and maximized.
   An `eye` emoji will appear in front of the group name indicating that the group is opened.

![open group 2](/image/open/2.png)

Simultaneously, the group will be marked as `focused` in the group manager panel.

### Open "opened" group

1. Click the eye icon of the group you want to open in the group manager panel.

![open group 1](/image/open/1.png)

2. The opened group will be focused. And the current group will be marked as `focused`.

### Detach group

When you opened and focused a group, will see the `eye` icon become a `cross` icon. By clicking it,
the manager will detach the group, which means next time you click the open button, a new set of
group will be opened even if the group has been opened and has not been closed.

### Remove page from group

1. Clicking the `x` icon on the page item in the group
manager panel.

![remove page](/image/remove/1.png)

2. You should see the page is removed from the group.

![remove page](/image/remove/2.png)
