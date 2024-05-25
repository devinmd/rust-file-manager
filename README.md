# File Manager

File manager made with Rust & Tauri

## Todo

- store user data (themes, etc.)
- get size of folders -- too slow
- add more info to bottom bar
- left sidebar with favorites

DATABASE
- store files in database for faster access
- when user requests files from folder, query database for them

FIXES
- arrow keys don't work on folders that require pagination

WALK MODE
- somehow should add pagination in backend because some might have tons of files

FEATURES
- search
- back & forward buttons
- rename folders & files
- tags and custom metadata
- favorite files & folders
- show or hide hidden files (dotfiles)
- store low resolution thumbnails 

FRONTEND
- right click context menu with actions
- column view
- change grid size
- list view (table)
- home menu
- media view mode, hide filename & size, display images & videos locked to square 

QOL
- loaders
- automaically keep loading files as user scrolls
- app icon

BACKBURNER
- proper audio player
- custom themes
- handle .app "folders"
- support for file servers
- make file dates local time, not gmt
- create files & folders
- preview text files
- find similar images with phash function
- find duplicate files
- moving files
  - cut, copy, paste files
  - selecting multiple files
    - ctrl, shift + click
    - dragging to select
- 3d model preview
- zip & unzip files
- more detailed info on preview info
  - video duration
  - audio file duration
  - camera info
- "open with" button
  - vscode, paint.net, photoshop, notepad, photos, web browser, etc.