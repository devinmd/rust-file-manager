# File Manager

File manager made with Rust & Tauri

## Todo

- do masonry view
  - skip anything that isnt an image and dont add text either
  - use the grid mode dense

- gallery view

- other functions
  - copy paste
  - moving files
  - edit file metadata (exif)
  - open with
  - text file preview
  - 3d model preview
  - share button

- last used view in database

BUGS
- deleting a file messes up the indexes because it shifts everything by skipping over one, this breaks the query selectors, only a visual bug though
  - deleting two files messes up frontend

FEATURES
- search
- tags and custom metadata
- favorite files & folders
- show or hide hidden files (dotfiles)
- store low resolution thumbnails especially for videos
- fullscreen preview on spacebar click
- set custom file icons to match folder names in settings and change the defaults

FRONTEND
- right click context menu with actions
- column view
- change grid size
- home menu
- masonry grid view

OTHER
- automaically keep loading files as user scrolls
- app icon

BACKBURNER
- proper audio player
- option to cancel extremely large recursive functions otherwise the user must force quit the app
  - cancel button where it currently says Loading on the bottom bar
- custom themes
- support for file servers
- make file dates local time, not gmt
- create files & folders
- preview text files
- find similar images with phash
- find duplicate files
- moving files
  - cut, copy, paste files
  - selecting multiple files with shift and ctrl
  - dragging
- 3d model preview
- zip & unzip files
- more detailed info on preview info
  - video duration
  - audio file duration
  - camera info
- "open with" button
