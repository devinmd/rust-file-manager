use serde::Serialize;
// store the information of a file or folder
#[derive(Serialize)]
pub struct ItemInfoStruct {
    pub name: String,
    pub created: Option<u64>,
    pub modified: Option<u64>,
    pub accessed: Option<u64>,
    pub path: String,
    pub container: String,
    pub size_bytes: Option<u64>,
    pub item_type: String,
    pub extension: String,
}
// container of items with additional information, this is what is returned to the frontend
#[derive(Serialize)]
pub struct ItemsInfoContainerStruct {
    pub path: String,               // path of the container of the list of items
    pub items: Vec<ItemInfoStruct>, // list of items
}

// specific app user information
#[derive(Serialize)]
pub struct UserDataStruct {
    pub last_folder: Option<String>,
    pub theme: Option<String>,
    pub view: Option<String>,
}

#[derive(Serialize)]
pub struct DiskInfoStruct {
    pub name: String,
    pub kind: String,
    pub file_system: String,
    pub total_space: u64,
    pub mount_point: String,
    pub available_space: u64,
    pub space_used: u64,
    pub is_removable: bool,
}

// system (computer) information
#[derive(Serialize)]
pub struct SystemInfoStruct {
    pub os: Option<String>,      // os
    pub version: Option<String>, // os version
    pub name: Option<String>,
    pub disks: Vec<DiskInfoStruct>, // list of disks
}
