// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command

extern crate rusqlite;
use lazy_static::lazy_static;
use rusqlite::{ params, Connection, OptionalExtension, Result };
use serde::Serialize;
use std::fs::File;
use std::path::Path;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Instant;
use sysinfo::{ Disks, System };
use trash;

lazy_static! {
    static ref DB_CONNECTION: Mutex<Connection> = Mutex::new(
        Connection::open("appdata.db").unwrap()
    );
}

fn main() {
    let mut now = Instant::now();
    if let Err(err) = prepare_db() {
        eprintln!("Failed to prepare the database: {}", err);
    }

    println!("Established database connection in {:.2?}", now.elapsed());
    now = Instant::now();

    let _app = tauri::Builder
        ::default()
        .invoke_handler(
            tauri::generate_handler![
                open_folder_dialog,
                open_file_in_default_app,
                send_file_to_trash,
                get_items,
                get_userdata,
                rename_item,
                get_system_info
            ]
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn set_userdata(
    conn: &Connection,
    key: &str,
    value: &str
) -> Result<(), Box<dyn std::error::Error>> {
    match
        conn.execute(
            "INSERT INTO userdata (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value]
        )
    {
        Ok(_) => Ok(()),
        Err(err) => {
            // Handle the error here
            Err(Box::new(err))
        }
    }
}

fn prepare_db() -> Result<()> {
    let conn = DB_CONNECTION.lock().unwrap();

    conn.execute(
        "CREATE TABLE IF NOT EXISTS userdata (
                  key TEXT PRIMARY KEY,
                  value TEXT
                  )",
        []
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS files (
            path TEXT UNIQUE,
            container TEXT,
            name TEXT,
            extension TEXT,
            created NUMBER,
            modified NUMBER,
            accessed NUMBER,
            item_type TEXT,
            size_bytes NUMBER
        );",
        []
    )?;

    // temp
    set_userdata(&*conn, "theme", "dark");

    Ok(())
}

// use std::ffi::OsString;
// use std::os::windows::fs::MetadataExt;

#[tauri::command]
fn open_file_in_default_app(path: String) {
    match open::that(path) {
        Ok(_) => println!("File opened successfully"),
        Err(e) => eprintln!("Failed to open file: {}", e),
    }
}

#[derive(Serialize)]
struct DiskInfo {
    name: String,
    kind: String,
    file_system: String,
    total_space: u64,
    mount_point: String,
    available_space: u64,
    available_space_formatted: String,
    total_space_formatted: String,
    space_used: u64,
    space_used_formatted: String,
    is_removable: bool,
}

#[derive(Serialize)]
struct SystemInfoStruct {
    os: Option<String>,
    version: Option<String>,
    name: Option<String>,
    disks: Vec<DiskInfo>,
}

#[tauri::command]
fn get_system_info() -> Result<SystemInfoStruct, String> {
    let mut sys: System = System::new_all();

    sys.refresh_all();

    let os: Option<String> = System::name().map(|s| s.to_string());
    let version: Option<String> = System::os_version().map(|s| s.to_string());
    let name: Option<String> = System::host_name().map(|s| s.to_string());

    let disks_list: Disks = Disks::new_with_refreshed_list();
    let mut disks: Vec<DiskInfo> = Vec::new(); // Initialize disk_info vector

    for disk in disks_list.list() {
        disks.push(DiskInfo {
            name: disk.name().to_string_lossy().to_string(),
            kind: disk.kind().to_string(),
            file_system: disk.file_system().to_string_lossy().to_string(),
            total_space: disk.total_space(),
            mount_point: disk.mount_point().to_string_lossy().to_string(),
            available_space: disk.available_space(),
            available_space_formatted: format_size(disk.available_space()),
            total_space_formatted: format_size(disk.total_space()),
            space_used: disk.total_space() - disk.available_space(),
            space_used_formatted: format_size(disk.total_space() - disk.available_space()),
            is_removable: disk.is_removable(),
        });
    }

    let info = SystemInfoStruct {
        os,
        version,
        name,
        disks,
    };

    Ok(info)
}

#[tauri::command]
fn send_file_to_trash(path: String) -> Result<(), String> {
    match trash::delete(path) {
        Ok(_) => Ok(()),
        Err(err) => Err(format!("Failed to delete file: {}", err)),
    }
}

#[tauri::command]
fn rename_item(path: String, new: String) {
    print!("{}", new);
    match fs::rename(&path, &new) {
        Ok(_) => println!("Item renamed successfully"),
        Err(e) => eprintln!("Failed to rename item: {}", e),
    }
}

use std::fs;
use std::time::{ SystemTime, UNIX_EPOCH };

#[derive(Serialize)]
struct FileInfoStruct {
    name: String,
    created: Option<u64>,
    modified: Option<u64>,
    accessed: Option<u64>,
    path: String,
    container: String,
    size_bytes: Option<u64>,
    item_type: String,
    extension: String,
}

#[derive(Serialize)]
struct ContainerDataStruct {
    name: String,
    path: String,
    item_type: String,
    items: Vec<FileInfoStruct>,
}
#[derive(Serialize)]
struct UserDataStruct {
    last_folder: Option<String>,
    theme: Option<String>,
}

fn get_userdata_item(conn: &Connection, key: &str) -> Result<Option<String>> {
    let mut stmt = conn.prepare("SELECT value FROM userdata WHERE key = ?1")?;
    let mut rows = stmt.query_map(&[key], |row| row.get(0))?;

    // Check if there's exactly one result (since key is unique)
    if let Some(result) = rows.next() {
        // Convert rusqlite::Result<String> to Result<Option<String>, rusqlite::Error>
        Ok(result.map(Some)?)
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn get_userdata() -> Result<UserDataStruct, String> {
    let conn = DB_CONNECTION.lock().map_err(|_| "Failed to acquire DB connection".to_string())?;

    let last_folder = match get_userdata_item(&conn, "last_folder") {
        Ok(value) => value,
        Err(err) => {
            return Err(format!("Error fetching last_folder: {}", err));
        }
    };

    let theme = match get_userdata_item(&conn, "theme") {
        Ok(value) => value,
        Err(err) => {
            return Err(format!("Error fetching theme: {}", err));
        }
    };

    let data = UserDataStruct { last_folder, theme };
    Ok(data)
}

use walkdir::WalkDir;

// Helper function to strip the "\\?\" prefix if it exists (Windows specific)
fn strip_prefix(path: &Path) -> PathBuf {
    let path_str = path.to_str().unwrap_or_default();
    if cfg!(windows) && path_str.starts_with(r"\\?\") {
        PathBuf::from(&path_str[4..])
    } else {
        path.to_path_buf()
    }
}

fn read_directory_to_vec(selected_folder: &Path, walk: bool, dotfiles: bool) -> Result<Vec<PathBuf>, String> {
    if walk {
        // Use WalkDir to recursively collect all files and exclude directories
        let entries: Vec<PathBuf> = WalkDir::new(selected_folder)
            .into_iter()
            .filter_map(|entry| entry.ok()) // Ignore errors and only keep Ok entries
            .filter_map(|entry| entry.path().canonicalize().ok()) // Convert DirEntry to absolute PathBuf and ignore errors
            .map(|path| strip_prefix(&path)) // Strip the "\\?\" prefix if on Windows
            .filter(|path| path.is_file()) // Only keep files
            .filter(|path| dotfiles || !path.file_name().and_then(|name| name.to_str()).map_or(false, |name| name.starts_with('.'))) // Exclude dotfiles if dotfiles is false
            .collect();
        Ok(entries)
    } else {
        // Use fs::read_dir for a non-recursive directory listing
        println!("{}", selected_folder.display());
        let entries: fs::ReadDir = match fs::read_dir(selected_folder) {
            Ok(entries) => entries,
            Err(_) => {
                return Err(String::from("Failed to read directory"));
            }
        };

        let vec: Vec<PathBuf> = entries
            .filter_map(|entry| entry.ok()) // Ignore errors and only keep Ok entries
            .filter_map(|entry| entry.path().canonicalize().ok()) // Convert DirEntry to absolute PathBuf and ignore errors
            .map(|path| strip_prefix(&path)) // Strip the "\\?\" prefix if on Windows
            .filter(|path| dotfiles || !path.file_name().and_then(|name| name.to_str()).map_or(false, |name| name.starts_with('.'))) // Exclude dotfiles if dotfiles is false
            .collect();

        Ok(vec)
    }
}

#[tauri::command]
async fn get_items(
    selected_folder: String,
    sort: String,
    ascending: bool,
    walk: bool,
    dotfiles: bool
) -> Result<ContainerDataStruct, String> {
    use std::fs;

    let conn = DB_CONNECTION.lock().unwrap();

    // update database with userdata
    set_userdata(&*conn, "last_folder", &selected_folder.clone());

    // final struct
    let mut info = ContainerDataStruct {
        name: "name".to_string(),
        items: Vec::new(),
        path: selected_folder.clone(),
        item_type: "folder".to_string(),
    };

    let mut now = Instant::now();

    // list of files/folders
    let items = read_directory_to_vec(Path::new(&selected_folder), walk, dotfiles);

    println!("Received list of items in {:.2?}", now.elapsed());
    now = Instant::now();

    // loop through each item
    if let Ok(entries) = items {
        // for every entry
        for (index, entry) in entries.iter().enumerate() {
            // get path
            let path = entry.to_str().unwrap_or("Invalid path").to_string().replace("\\", "/"); // should implement proper error handling later
            println!("{}", path);
            // Prepare the SQL statement
            let mut stmt = match
                conn.prepare(
                    "SELECT path, container, name, extension, created, modified, accessed, item_type, size_bytes FROM files WHERE path = ?1"
                )
            {
                Ok(statement) => statement,
                Err(err) => {
                    eprintln!("Failed to prepare the statement: {}", err);
                    continue; // Skip the failed preparation and continue execution
                }
            };

            // Query the row
            match
                stmt.query_row(params![path], |row| {
                    let path: String = row.get(0)?;
                    let container: String = row.get(1)?;
                    let name: String = row.get(2)?;
                    let extension: String = row.get(3)?;
                    let created: Option<u64> = row.get(4)?;
                    let modified: Option<u64> = row.get(5)?;
                    let accessed: Option<u64> = row.get(6)?;
                    let item_type: String = row.get(7)?;
                    let size_bytes: Option<u64> = row.get(8)?;

                    // println!("IN DATABASE: {}", path);

                    // compile the row from the database into a struct
                    info.items.push(FileInfoStruct {
                        name,
                        created,
                        modified,
                        accessed,
                        path,
                        container,
                        size_bytes,
                        item_type,
                        extension,
                    });
                    Ok(())
                })
            {
                Ok(_) => {
                    continue;
                }
                // Skip to the next item in the loop if a row is found in the database
                Err(rusqlite::Error::QueryReturnedNoRows) => {
                    println!("NOT IN DATABASE: {}", path);
                }
                Err(err) => {
                    eprintln!("Failed to execute the statement: {}", err);
                }
            }

            // if the file is not in the database, retrieve metadata

            let name = entry.file_name().unwrap().to_string_lossy().into_owned();

            let metadata: fs::Metadata = entry.metadata().unwrap(); // Unwrap is fine here, proper error handling would be better in a real application

            let container = entry
                .parent()
                .unwrap()
                .to_string_lossy()
                .into_owned()
                .replace("\\", "/");

            let created: Option<u64> = metadata
                .created()
                .ok()
                .map(|time: SystemTime| time.duration_since(UNIX_EPOCH).unwrap().as_secs());
            let modified: Option<u64> = metadata
                .modified()
                .ok()
                .map(|time: SystemTime| time.duration_since(UNIX_EPOCH).unwrap().as_secs());
            let accessed: Option<u64> = metadata
                .accessed()
                .ok()
                .map(|time: SystemTime| time.duration_since(UNIX_EPOCH).unwrap().as_secs());

            let item_type: String;

            let mut size_bytes: Option<u64> = None;

            // Initialize height and width
            // let mut height: usize = 0;
            // let mut width: usize = 0;

            // Get the extension if it exists, convert to a String, and make it lowercase
            let extension: Option<String> = entry
                .extension()
                .and_then(|ext| ext.to_str()) // Convert OsStr to &str
                .map(|ext| ext.to_lowercase()); // Convert &str to lowercase String

            // Provide a default value if the extension is None
            let extension = extension.unwrap_or_default();

            if metadata.is_dir() {
                // is folder/
                item_type = "folder".to_string();
            } else {
                // is file
                item_type = match extension.to_lowercase().as_str() {
                    | "png"
                    | "jpg"
                    | "jpeg"
                    | "gif"
                    | "bmp"
                    | "avif"
                    | "webp"
                    | "svg"
                    | "apng"
                    | "jfif"
                    | "tiff"
                    | "ico" => String::from("image"), // heic is not supported by html
                    "mp4" | "mov" | "mkv" | "webm" => String::from("video"), // avi is not supported by html
                    "mp3" | "wav" | "ogg" | "flac" => String::from("audio"),
                    "3mf" | "stl" | "obj" | "step" | "stp" => String::from("3d"), // 3d model preview is not implemented
                    _ => String::from("file"),
                };
                size_bytes = Some(metadata.len());

                // push to db
                if
                    let Err(err) = conn.execute(
                        "INSERT INTO files (path, container, name, extension, created, modified,accessed,item_type,size_bytes) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                        [
                            &path,
                            &container,
                            &name,
                            &extension,
                            &created.map_or_else(
                                || String::from("None"),
                                |value| value.to_string()
                            ),
                            &modified.map_or_else(
                                || String::from("None"),
                                |value| value.to_string()
                            ),
                            &accessed.map_or_else(
                                || String::from("None"),
                                |value| value.to_string()
                            ),
                            &item_type,
                            &size_bytes.map_or("None".to_string(), |num| num.to_string()),
                        ]
                    )
                {
                    eprintln!("Error executing SQL: {}", err);
                } else {
                    // success
                    // println!("inserted db");
                }

                // get image dimensions
                /* if item_type == "image" {
                    match imagesize::size(path.clone()) {
                        Ok(size) => {
                            width = size.width;
                            height = size.height;
                        }
                        Err(why) => println!("Error getting dimensions: {:?}", why),
                    }
                }*/
            }

            info.items.push(FileInfoStruct {
                name,
                created,
                modified,
                accessed,
                path,
                container,
                size_bytes,
                item_type,
                extension,
                // height,
                // width,
            });
        }
    } else if let Err(e) = items {
        // error
        println!("Error: {}", e);
    }

    // sort
    sort_items(&mut info.items, &sort, ascending);

    println!("Compiled metadata & sorted items {:.2?}", now.elapsed());

    Ok(info)
}

fn sort_items(folders: &mut Vec<FileInfoStruct>, sort_by: &str, ascending: bool) {
    match sort_by {
        "name" => {
            folders.sort_by(|a, b| {
                if ascending { a.name.cmp(&b.name) } else { b.name.cmp(&a.name) }
            });
        }
        "size" => {
            folders.sort_by(|a, b| {
                let a_size = a.size_bytes.unwrap_or(0);
                let b_size = b.size_bytes.unwrap_or(0);
                if ascending {
                    a_size.cmp(&b_size)
                } else {
                    b_size.cmp(&a_size)
                }
            });
        }
        "created" => {
            folders.sort_by(|a, b| {
                let a_created = a.created.unwrap_or(0);
                let b_created = b.created.unwrap_or(0);
                if ascending {
                    a_created.cmp(&b_created)
                } else {
                    b_created.cmp(&a_created)
                }
            });
        }
        _ => {
            println!("Invalid sort field");
        }
    }
}

#[tauri::command]
async fn open_folder_dialog() -> Result<String, String> {
    use std::path::PathBuf;
    use tauri::api::dialog::blocking::FileDialogBuilder;

    // Show the folder dialog
    let dialog_result: Option<PathBuf> = FileDialogBuilder::new().pick_folder();

    match dialog_result {
        Some(selected_folder) => {
            // Convert the selected folder path to a string
            let path: String = selected_folder.to_string_lossy().to_string().replace("\\", "/");
            println!("{}", path);
            Ok(path)
        }
        None => {
            // Handle the case when the user cancels the dialog
            Err(String::from("Dialog was cancelled"))
        }
    }
}

extern crate chrono;

use chrono::{ DateTime, NaiveDateTime, Utc };

fn format_timestamp(ms_since_epoch: Option<u64>) -> String {
    match ms_since_epoch {
        Some(ms) => {
            let dt = DateTime::<Utc>::from_utc(NaiveDateTime::from_timestamp(ms as i64, 0), Utc);
            dt.format("%a, %-d %b %Y %H:%M").to_string()
        }
        None => String::from("Invalid timestamp"), // Handle the case where ms_since_epoch is None
    }
}

// Helper function to format size
fn format_size(size: u64) -> String {
    const AMT: f64 = 1000.0;
    const KB: f64 = AMT;
    const MB: f64 = KB * AMT;
    const GB: f64 = MB * AMT;
    const TB: f64 = GB * AMT;
    if size < (KB as u64) {
        format!("{} Bytes", size)
    } else if size < (MB as u64) {
        format!("{:.1} KB", (size as f64) / KB)
    } else if size < (GB as u64) {
        format!("{:.1} MB", (size as f64) / MB)
    } else if size < (TB as u64) {
        format!("{:.1} GB", (size as f64) / GB)
    } else {
        format!("{:.1} TB", (size as f64) / TB)
    }
}
