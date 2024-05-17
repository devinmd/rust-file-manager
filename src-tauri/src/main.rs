// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command

fn main() {
    let app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            open_folder_dialog,
            open_file_in_default_app,
            send_file_to_trash,
            get_items,
            rename_item,
            get_system_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// use std::ffi::OsString;
// use std::os::windows::fs::MetadataExt;
use std::path::Path;
use std::path::PathBuf;

use sysinfo::Disk;
use trash;

use serde::Serialize;

#[tauri::command]
fn open_file_in_default_app(path: String) {
    open::that(path);
}

use sysinfo::{Disks, System};

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
    fs::rename(path, new);
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
}

#[derive(Serialize)]

struct FolderInfoStruct {
    name: String,
    created: Option<u64>,
    modified: Option<u64>,
    accessed: Option<u64>,
    created_formatted: String,
    modified_formatted: String,
    accessed_formatted: String,
    path_vec: Vec<String>,
    path_str: String,
    size_bytes: Option<u64>,
    size_formatted: Option<String>,
}

#[tauri::command]
async fn get_items(selected_folder: String) -> Result<Vec<FileInfoStruct>, String> {
    // Fetch all entries (files and folders) in the selected directory
    use std::fs;
    let entries: fs::ReadDir = match fs::read_dir(&selected_folder) {
        Ok(entries) => entries,
        Err(_) => return Err(String::from("Failed to read directory")),
    };

    // Collect paths of files and folders into a vector of strings
    let mut info: Vec<FileInfoStruct> = Vec::new();
    for entry in entries {
        if let Ok(entry) = entry {
            let file_name: std::ffi::OsString = entry.file_name();
            let extension: String = Path::new(&file_name)
                .extension()
                .map_or(String::new(), |ext: &std::ffi::OsStr| {
                    ext.to_string_lossy().to_string()
                });
            let metadata: fs::Metadata = entry.metadata().unwrap(); // Unwrap is fine here, proper error handling would be better in a real application
            // construct full path
            let path_str: String = format!(
                "{}{}{}",
                selected_folder.replace("\\", "/"),
                "/",
                file_name.clone().into_string().unwrap()
            );

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

            if metadata.is_dir() {
                // is folder/
                item_type = "folder".to_string();
                // let size_info = get_directory_size_info(&path_str);
                // size_bytes = size_info.1;
                // size_formatted = size_info.0;
            } else {
                // is file
                item_type = match extension.to_lowercase().as_str() {
                    "png" | "jpg" | "jpeg" | "gif" | "bmp" | "avif" | "webp" | "svg" | "apng"
                    | "jfif" | "tiff" | "ico" => String::from("image"), // heic is not supported by html
                    "mp4" | "mov" | "mkv" | "webm" => String::from("video"), // avi is not supported by html
                    "mp3" | "wav" | "ogg" | "flac" => String::from("audio"),
                    "3mf" | "stl" | "obj" | "step" | "stp" => String::from("3d"), // 3d model preview is not implemented
                    _ => String::from("file"),
                };
                size_bytes = Some(metadata.len());
                size_formatted = size_bytes.map(|size| format_size(size));
            }

            let name: String = file_name.to_string_lossy().to_string();
           

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

            // get path to item's container
            // let path_vec: Vec<String> = path_str_vec.clone();

            // full path vec is the same as container path vec BUT has the filename at the end
            // path_str_vec.push(file_name.clone().into_string().unwrap());

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
            });
        }
    }
    Ok(info)
}



extern crate fs_extra;

use fs_extra::dir::get_size;

fn get_directory_size_info(path_str: &str) -> (Option<String>, Option<u64>) {
    let mut size_formatted: Option<String> = None;
    let mut size_bytes: Option<u64> = None;

    match get_size(path_str) {
        Ok(size) => {
            size_bytes = Some(size);
            size_formatted = Some(format_size(size));
        }
        Err(e) => {
            eprintln!("Failed to get directory size: {}", e);
        }
    }

    (size_formatted, size_bytes)
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

            // let mut info: Vec<FolderInfoStruct> = Vec::new();

            /*let size_bytes = fs_extra::dir::get_size(path_str.clone()).unwrap();
            let size_formatted: Option<String> = if let Some(size_bytes) = size_bytes {
                Some(format_size(size_bytes))
            } else {
                None
            };*/

            // let mut size_formatted: String = String::new();
            // let mut size_bytes: u64 = 0;

            // match fs_extra::dir::get_size(&path_str) {
            //     Ok(size_bytes) => {
            //         size_formatted = format_size(size_bytes);
            //     }
            //     Err(e) => {
            //         eprintln!("Failed to get directory size: {}", e);
            //     }
            // }

            // println!("{}",size_formatted);

            // You can add more actions here
            // For example: Listing files in the folder, checking if certain files exist, etc.
            // Ensure that these actions are asynchronous if needed

            // Return the folder path

            // info.push(FolderInfoStruct {
            //     name,
            //     created,
            //     modified,
            //     accessed,
            //     created_formatted: format_timestamp(created),
            //     modified_formatted: format_timestamp(modified),
            //     accessed_formatted: format_timestamp(accessed),
            //     path_vec,
            //     path_str,
            //     size_bytes,
            //     size_formatted,
            //     item_type,
            //     extension,
            // });
            Ok(path_str)
        }
        None => {
            // Handle the case when the user cancels the dialog
            Err(String::from("Dialog was cancelled"))
        }
    }
}

extern crate chrono;

use chrono::{DateTime, NaiveDateTime, TimeZone, Utc};

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
