# File Manager

File manager made with Rust & Tauri

## Todo

- rename folders & files
- media view mode
  - walks all subfolders and displays all images & videos 
- store user data (themes, etc.)
- tags and custom metadata
- right click context menu with actions
- get size of folders
- add more info to bottom bar

- favorite files & folders
- show or hide hidden files (dotfiles)
- option to lock file thumbnails to square
- fetch only video thumbnails to speed up frontend
- instead of using full image on preview & icons, store a low res thumbnail version
- left sidebar with favorites
- home menu
  - favorited folders & files, clock, notes, suggested files/frequently used
- app icon


- store files in database for faster access
- when user requests files from folder, query database for them

- analyze file types and give % (eg: 25% images, 35% python, 35% javacsript, 5% other)

- arrow keys don't work on folders that require pagination

TODO
- should send folder information separate because if it's empty there is nowhere to grab it from
- speed up fetching files, less conversions and add optimizations
- index the files into the sqlite db for faster access

WALK MODE
- path vec is for the whole directory, so it won't be correct for all
- somehow should add pagination in backend because some might have tons of files

IN APP FEATURES
- search
- refresh button
- back & forward buttons
- sort by

UI
- column view
- change grid size
- list view (table)
- custom themes
- proper audio player


QOL
- loaders
- automaically keep loading files as user scrolls


BACKBURNER
- support for external drives & servers
- make file dates local time, not gmt
- create files & folders
- find similar images with phash function
- find duplicate files
- moving files
  - cut, copy, paste files
  - selecting multiple files
    - ctrl, shift + click
    - dragging to select
- 3d model preview
- zip files
- unzip files
- more detailed info on preview info
  - video duration
  - audio file duration
  - custom fields
  - camera info
- "open with" button
  - vscode, paint.net, photoshop, notepad, photos, web browser, etc.