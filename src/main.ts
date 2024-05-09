//
const { invoke, convertFileSrc } = (window as any).__TAURI__.tauri;

// import { appDataDir, join } from "@tauri-apps/api/path";
// import { convertFileSrc } from "@tauri-apps/api/tauri";
// const { open } = window.__TAURI__.api;

window.addEventListener("DOMContentLoaded", () => {
  console.log("loaded");
  change_theme(default_theme);
});

document.getElementById("btn-openfolder")?.addEventListener("click", async () => {
  // Your event listener code here
  try {
    const selected_folder_path = await invoke("open_folder_dialog");
    console.log(selected_folder_path);
    goto_folder(selected_folder_path);
  } catch (error) {
    console.error("Error selecting folder:", error);
  }
});

document.getElementById("btn-home")?.addEventListener("click", async () => {
  // home button
});

async function goto_folder(selected_folder_path: string) {
  const data = await invoke("get_items", { selectedFolder: selected_folder_path });
  console.log(data);
  display_items(data);
}

const page_size = 50;
const default_theme = "dark";

function display_items(data: Item[]): void {
  // remove dotfiles
  data = data.filter((obj) => !obj.name.startsWith("."));
  // clear grid
  const grid = document.querySelector("#items");
  grid.innerHTML = "";
  // update folder name
  const vec = data[0].container_path_vec;
  if (document.querySelector("#path")) document.querySelector("#path").innerHTML = "";
  for (let i = 1; i < vec.length; i++) {
    let btn = document.createElement("button");
    btn.onclick = function () {
      // go to path
      vec.length = i + 1;
      console.log(vec.join("/"));
      goto_folder(vec.join("/"));
    };
    btn.innerHTML = vec[i];
    let caret = document.createElement("img");
    caret.src = "src/assets/caret.svg";
    if (i == 1) {
      document.querySelector("#path").append(btn);
      continue;
    }
    document.querySelector("#path").append(caret, btn);
  }
  document.querySelector("#current-folder-info").innerHTML = data.length + " items";

  const load_more = document.createElement("button");
  load_more.innerHTML = "Load More";
  load_more.id = "btn-load-more";
  load_more.onclick = function () {
    display_page(data, page_size, page_size * (current_page + 1));
    current_page += 1;
  };

  // display files
  display_page(data, page_size, 0);
  let current_page = 0;

  function display_page(items: Item[], amount: number, offset: number) {
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
    if (amount * (offset / amount + 1) < items.length) {
      grid.appendChild(load_more);
    }
  }
}

interface Item {
  item_type: string;
  full_path: string;
  name: string;
  size_formatted: string;
  created_formatted: string;
  extension: string;
  modified_formatted: string;
  container_path_vec: string[];
  accessed_formatted: string;
}

function select_item(item: Item): void {
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
  // const rename_input = document.createElement("input");
  // rename_input.type = "text";
  // rename_input.placeholder = "New Name";
  // rename_input.value = item.name;
  const btn_rename = document.createElement("button");
  btn_rename.innerHTML = "Rename";
  // btn_rename.onclick = function () {
  // const new_name = rename_input.value;
  // item.container_path_vec.push(new_name);
  // console.log(item.container_path_vec.join("/"));
  // invoke("rename_item", { path: item.full_path, new: item.full_path + "test" });
  // };
  const btn_open = document.createElement("button");
  btn_open.innerHTML = "Open";
  btn_open.onclick = function () {
    invoke("open_file_in_default_app", { path: item.full_path });
  };

  const actions = document.createElement("div");
  actions.id = "actions";
  actions.append(btn_open, btn_rename, btn_delete);

  sidebar.append(generate_item_preview(item, true), info, actions);
}

function generate_item_preview(
  item: Item,
  video_controls: boolean = false
): HTMLImageElement | HTMLAudioElement | HTMLVideoElement {
  let elem: HTMLImageElement | HTMLAudioElement | HTMLVideoElement | null;
  switch (item.item_type) {
    case "folder":
      elem = document.createElement("img");
      switch (item.name.toLowerCase()) {
        case "downloads":
          elem.src = "src/assets/folders/downloads.svg";
          break;
        case "images":
        case "photos":
        case "icons":
        case "assets":
        case "pictures":
          elem.src = "src/assets/folders/photos.svg";
          break;
        case "videos":
          elem.src = "src/assets/folders/videos.svg";
          break;
        case "movies":
          elem.src = "src/assets/folders/movies.svg";
          break;
        case "src":
          elem.src = "src/assets/folders/src.svg";
          break;
        case "documents":
          elem.src = "src/assets/folders/documents.svg";
          break;
        case "desktop":
          elem.src = "src/assets/folders/desktop.svg";
          break;
        case "3d models":
        case "3d objects":
          elem.src = "src/assets/folders/3d.svg";
          break;
        default:
          elem.src = "src/assets/folders/folder.svg";
          break;
      }
      break;
    case "image":
      elem = document.createElement("img") as HTMLImageElement;
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
      elem.src = `src/assets/files/${item.extension.toLowerCase()}.svg`;
      break;
  }
  elem.onerror = function (): void {
    // this.src = "src/assets/files/file.svg";
  };
  return elem;
}

function change_theme(t: string): void {
  const root = document.querySelector(":root");
  root.setAttribute("theme", t);
}
