// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command

extern crate rusqlite;
use rusqlite::{params, Connection, Result};
use serde::Serialize;
use std::path::Path;
use std::path::PathBuf;
use sysinfo::{Disks, System};
use trash;

fn main() {
    prepare_db();

    let _app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            open_folder_dialog,
            open_file_in_default_app,
            send_file_to_trash,
            get_items,
            get_last_folder,
            rename_item,
            get_system_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn prepare_db() -> Result<()> {
    // Connect to the database. This will create the database file if it doesn't exist.
    let conn = Connection::open("appdata.db")?;

    // Create a table in appdata.db
    conn.execute(
        "CREATE TABLE IF NOT EXISTS userdata (
            last_folder TEXT
        );",
        [],
    )?;
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
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Serialize)]

// i32 and i64 are SIGNED INTEGERS meaning they can be negative
// u32 and u64 and UNSIGNED INTEGERS so they canno tbe negative
struct FileInfoStruct {
    name: String,
    created: Option<u64>,
    modified: Option<u64>,
    accessed: Option<u64>,
    created_formatted: String,
    modified_formatted: String,
    accessed_formatted: String,
    path_vec: Vec<String>,
    path_str: String,
    size_bytes: Option<u64>, // Use Option<u64> to represent size, as folders do not have a size
    size_formatted: Option<String>, // New field for formatted size
    item_type: String,       // image, video, text, 3d model, audio, folder
    extension: String,       // png, avif, mp3, wav, etc.
    height: usize,           // dimensions of file if image
    width: usize,
}

fn get_database() -> Result<Connection, rusqlite::Error> {
    // Connect to the database. This will create the database file if it doesn't exist.
    let conn = Connection::open("appdata.db")?;
    Ok(conn)
}

#[tauri::command]
async fn get_last_folder() -> Result<String, String> {
    match get_database() {
        Ok(conn) => {
            // Prepare an SQL query to retrieve the last folder
            let mut stmt = match conn
                .prepare("SELECT last_folder FROM userdata ORDER BY ROWID DESC LIMIT 1")
            {
                Ok(stmt) => stmt,
                Err(err) => {
                    eprintln!("Error preparing SQL query: {}", err);
                    return Err(format!("Error preparing SQL query: {}", err));
                }
            };

            // Execute the query and fetch the result
            let mut rows = match stmt.query([]) {
                Ok(rows) => rows,
                Err(err) => {
                    eprintln!("Error querying the database: {}", err);
                    return Err(format!("Error querying the database: {}", err));
                }
            };

            // Fetch the result and build the response
            if let Some(row) = rows.next().unwrap_or_else(|_| None) {
                let last_folder: String = row.get(0).unwrap_or_default();
                println!("{}", last_folder);
                Ok(last_folder)
            } else {
                Err("No last folder found in the database".into())
            }
        }
        Err(err) => {
            // Handle the error
            eprintln!("Error opening database: {}", err);
            Err(format!("Error opening database: {}", err))
        }
    }
}

use walkdir::WalkDir;

fn read_directory_to_vec(selected_folder: &Path, walk: bool) -> Result<Vec<PathBuf>, String> {
    if walk {
        // Use WalkDir to recursively collect all files and exclude directories
        let entries: Vec<PathBuf> = WalkDir::new(selected_folder)
            .into_iter()
            .filter_map(|entry| entry.ok()) // Ignore errors and only keep Ok entries
            .map(|entry| entry.into_path()) // Convert DirEntry to PathBuf
            .filter(|path| path.is_file()) // Only keep files
            .collect();
        Ok(entries)
    } else {
        // Use fs::read_dir for a non-recursive directory listing
        println!("{}", selected_folder.display());
        let entries: fs::ReadDir = match fs::read_dir(selected_folder) {
            Ok(entries) => entries,
            Err(_) => return Err(String::from("Failed to read directory")),
        };

        let vec: Vec<PathBuf> = entries
            .filter_map(|entry| entry.ok()) // Ignore errors and only keep Ok entries
            .map(|entry| entry.path()) // Convert DirEntry to PathBuf
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
) -> Result<Vec<FileInfoStruct>, String> {
    use std::fs;

    // add the folder to database
    match get_database() {
        Ok(conn) => {
            // Write last folder to the database
            println!("{}", selected_folder);
            match conn.execute(
                "INSERT OR REPLACE INTO userdata (last_folder) VALUES (?1)",
                [selected_folder.clone()],
            ) {
                Ok(_) => {
                    println!("inserted db");
                    // Insertion successful
                }
                Err(err) => {
                    // Handle the error
                    eprintln!("Error executing SQL query: {}", err);
                }
            }
        }
        Err(err) => {
            // Handle the error
            println!("Error opening database: {}", err);
        }
    }

    // Get all the files and get info
    let mut info: Vec<FileInfoStruct> = Vec::new();
    match read_directory_to_vec(Path::new(&selected_folder), walk) {
        Ok(entries) => {
            for entry in entries {
                println!("{:?}", entry);
                // if let Ok(entry) = entry {
                let name = entry.file_name().unwrap().to_string_lossy().into_owned();
                //

                let metadata: fs::Metadata = entry.metadata().unwrap(); // Unwrap is fine here, proper error handling would be better in a real application

                let path_str = entry
                    .to_str()
                    .unwrap_or("Invalid path")
                    .to_string()
                    .replace("\\", "/"); // should implement proper error handling later

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

                let mut size_formatted: Option<String> = None;
                let mut size_bytes: Option<u64> = None;

                // Initialize height and width
                let mut height: usize = 0;
                let mut width: usize = 0;

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
                        "png" | "jpg" | "jpeg" | "gif" | "bmp" | "avif" | "webp" | "svg"
                        | "apng" | "jfif" | "tiff" | "ico" => String::from("image"), // heic is not supported by html
                        "mp4" | "mov" | "mkv" | "webm" => String::from("video"), // avi is not supported by html
                        "mp3" | "wav" | "ogg" | "flac" => String::from("audio"),
                        "3mf" | "stl" | "obj" | "step" | "stp" => String::from("3d"), // 3d model preview is not implemented
                        _ => String::from("file"),
                    };
                    size_bytes = Some(metadata.len());
                    size_formatted = size_bytes.map(|size| format_size(size));

                    if item_type == "image" {
                        match imagesize::size(path_str.clone()) {
                            Ok(size) => {
                                width = size.width;
                                height = size.height;
                            }
                            Err(why) => println!("Error getting dimensions: {:?}", why),
                        }
                    }
                }

                // get path to item's container as a vector
                let path_vec: Vec<String> = PathBuf::from(selected_folder.clone())
                    .components()
                    .enumerate()
                    .filter_map(|(index, c)| {
                        if index != 1 {
                            Some(c.as_os_str().to_string_lossy().to_string())
                        } else {
                            None
                        }
                    })
                    .collect();

                info.push(FileInfoStruct {
                    name,
                    created,
                    modified,
                    accessed,
                    created_formatted: format_timestamp(created),
                    modified_formatted: format_timestamp(modified),
                    accessed_formatted: format_timestamp(accessed),
                    path_vec,
                    path_str,
                    size_bytes,
                    size_formatted,
                    item_type,
                    extension,
                    height,
                    width,
                });
                // }
            }
        }
        Err(err) => println!("Error: {}", err),
    }

    sort_items(&mut info, &sort, ascending);

    // sort
    Ok(info)
}

fn sort_items(folders: &mut Vec<FileInfoStruct>, sort_by: &str, ascending: bool) {
    match sort_by {
        "name" => {
            folders.sort_by(|a, b| {
                if ascending {
                    a.name.cmp(&b.name)
                } else {
                    b.name.cmp(&a.name)
                }
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
            let path_str = selected_folder
                .to_string_lossy()
                .to_string()
                .replace("\\", "/");
            Ok(path_str)
        }
        None => {
            // Handle the case when the user cancels the dialog
            Err(String::from("Dialog was cancelled"))
        }
    }
}

extern crate chrono;

use chrono::{DateTime, NaiveDateTime, Utc};

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
    if size < KB as u64 {
        format!("{} Bytes", size)
    } else if size < MB as u64 {
        format!("{:.1} KB", size as f64 / KB)
    } else if size < GB as u64 {
        format!("{:.1} MB", size as f64 / MB)
    } else if size < TB as u64 {
        format!("{:.1} GB", size as f64 / GB)
    } else {
        format!("{:.1} TB", size as f64 / TB)
    }
}
