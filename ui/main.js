//
const { invoke, convertFileSrc } = window.__TAURI__.tauri;

// import { appDataDir, join } from "@tauri-apps/api/path";
// import { convertFileSrc } from "@tauri-apps/api/tauri";
// const { open } = window.__TAURI__.api;

window.addEventListener("DOMContentLoaded", () => {
  console.log("loaded");
});

document.getElementById("btn-openfolder").addEventListener("click", async () => {
  try {
    const selected_folder_path = await invoke("open_folder_dialog");
    console.log(selected_folder_path);
    goto_folder(selected_folder_path);
  } catch (error) {
    console.error("Error selecting folder:", error);
  }
});

async function goto_folder(selected_folder_path) {
  const data = await invoke("get_items", { selectedFolder: selected_folder_path });
  console.log(data);
  display_items(data);
  history.push(selected_folder_path);
}

document.querySelector("#btn-back").addEventListener("click", () => {
  goto_folder(history[history.length - 2]);
});
const history = [];

const page_size = 50;

function display_items(data) {
  // remove dotfiles
  data = data.filter((obj) => !obj.name.startsWith("."));
  // clear grid
  const grid = document.querySelector("#items");
  grid.innerHTML = "";
  // update folder name
  const vec = data[0].full_path_vec;
  document.querySelector("#path").innerHTML = "";
  for (let i = 0; i < vec.length - 1; i++) {
    let btn = document.createElement("button");
    btn.onclick = function () {
      // go to path
      vec.length = i + 1;
      goto_folder(vec.join("/"));
    };
    btn.innerHTML = vec[i];
    document.querySelector("#path").append(btn);
  }
  document.querySelector("#current-folder-info").innerHTML = data[0].full_path + " - " + data.length + " items";

  const load_more = document.createElement("button");
  load_more.innerHTML = "LOAD MORE";
  load_more.onclick = function () {
    display_page(data, page_size, page_size * (current_page + 1));
    current_page += 1;
  };

  // display files
  display_page(data, page_size, 0);
  let current_page = 0;

  function display_page(items, amount, offset) {
    let clone = items.slice(0);
    let spliced = clone.splice(offset, amount);
    load_more.remove();
    for (let i in spliced) {
      const item = spliced[i];
      const item_container = document.createElement("button");
      const item_name = document.createElement("p");
      item_name.innerHTML = item.name;
      item_container.onclick = function () {
        select_item(item);
      };
      item_container.ondblclick = function () {
        if (item.item_type == "folder") {
          goto_folder(item.full_path);
        } else {
          invoke("open_file_in_default_app", { path: item.full_path });
        }
      };
      item_container.append(generate_item_preview(item), item_name);
      grid.appendChild(item_container);
    }
    if (amount * (offset / amount + 1) < clone.length) {
      grid.appendChild(load_more);
    }
  }
}

function select_item(item) {
  const sidebar = document.querySelector("#selected-file");
  sidebar.innerHTML = "";

  // file name
  const item_name = document.createElement("p");
  item_name.id = "item-name";
  item_name.innerHTML = item.name;

  // text
  const info = document.createElement("div");
  info.id = "info";
  const type = document.createElement("p");
  type.innerHTML = `Type<span>${item.item_type}</span>`;
  const size = document.createElement("p");
  size.innerHTML = `Size<span>${item.size_formatted}</span>`;
  const created = document.createElement("p");
  created.innerHTML = `Created<span>${item.created_formatted}</span>`;
  const accessed = document.createElement("p");
  accessed.innerHTML = `Accessed<span>${item.accessed_formatted}</span>`;
  const modified = document.createElement("p");
  modified.innerHTML = `Modified<span>${item.modified_formatted}</span>`;
  info.append(item_name, type, size, created, accessed, modified);

  // buttons
  const btn_delete = document.createElement("button");
  btn_delete.innerHTML = "Delete";
  btn_delete.onclick = function () {
    invoke("send_file_to_trash", { path: item.full_path });
  };
  const btn_open = document.createElement("button");
  btn_open.innerHTML = "Open";
  btn_open.onclick = function () {
    invoke("open_file_in_default_app", { path: item.full_path });
  };

  sidebar.append(generate_item_preview(item, true), info, btn_open, btn_delete);
}

function generate_item_preview(item, video_controls = false) {
  let elem;
  switch (item.item_type) {
    case "folder":
      let icon;
      elem = document.createElement("img");
      switch (item.name.toLowerCase()) {
        case "downloads":
          elem.src = "/assets/folders/downloads.svg";
          break;
        case "images":
        case "photos":
        case "icons":
        case "pictures":
          elem.src = "/assets/folders/photos.svg";
          break;
        case "videos":
        case "movies":
          elem.src = "/assets/folders/videos.svg";
          break;
        case "src":
          elem.src = "/assets/folders/src.svg";
          break;
        case "documents":
          elem.src = "/assets/folders/documents.svg";
          break;
        case "3d models":
        case "3d objects":
          elem.src = "/assets/folders/3d.svg";
          break;
        default:
          elem.src = "/assets/folders/folder.svg";
          break;
      }
      break;
    case "image":
      elem = document.createElement("img");
      elem.src = convertFileSrc(item.full_path);
      break;
    case "video":
      elem = document.createElement("video");
      elem.controls = video_controls;
      elem.src = convertFileSrc(item.full_path);
      break;
    case "audio":
      elem = document.createElement("audio");
      elem.src = convertFileSrc(item.full_path);
      break;
    default: // all other things
      elem = document.createElement("img");
      elem.src = `/assets/files/${item.extension.toLowerCase()}.svg`;
      break;
  }
  elem.onerror = function () {
    this.src = "/assets/files/file.svg";
  };
  return elem;
}
