# File Manager

File manager made with Rust & Tauri

## Todo

- get size of folders -- too slow
- add more info to bottom bar

BUGS
- deleting a file messes up the indexes because it shifts everything by skipping over one, this breaks the query selectors, only a visual bug though
  - deleting two files messes up frontend

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
- masonry grid view

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
- "open with" btn
  - vscode, paint.net, photoshop, notepad, photos, web browser, etc.