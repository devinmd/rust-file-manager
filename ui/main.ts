//
const { invoke, convertFileSrc } = (window as any).__TAURI__.tauri;

// import { appDataDir, join } from "@tauri-apps/api/path";
// import { convertFileSrc } from "@tauri-apps/api/tauri";
// const { open } = window.__TAURI__.api;

window.addEventListener("DOMContentLoaded", () => {
  console.log("loaded");
  change_theme(default_theme);
  get_system_info();
});

async function get_system_info() {
  const data = await invoke("get_system_info");
  console.log(data);
  let disks = data.disks;
  document.querySelector("#greeting").innerHTML = data.name;
  disks[0].name = data.name;
  for (let i in disks) {
    let d = disks[i];
    let container = document.createElement("div");
    let name = document.createElement("p");
    name.innerHTML = `${d.name} (${d.mount_point})`;
    let text = document.createElement("p");
    text.innerHTML = `${d.available_space_formatted} of ${d.total_space_formatted} free`;

    container.append(name, text);
    document.querySelector("#drives").append(container);
  }
}

document.getElementById("btn-openfolder")?.addEventListener("click", async () => {
  // open folder
  try {
    const selected_folder_path = await invoke("open_folder_dialog");
    console.log(selected_folder_path);
    goto_folder(selected_folder_path);
  } catch (error) {
    console.error("Error selecting folder:", error);
  }
});

document.getElementById("btn-home")?.addEventListener("click", async () => {
  // home butotn
  document.querySelector("#home").setAttribute("style", "display: flex;");
  document.querySelector("#content").setAttribute("style", "display: none;");
});

async function goto_folder(selected_folder_path: string) {
  let data = await invoke("get_items", { selectedFolder: selected_folder_path });
  data.sort((a, b) => b.size_bytes - a.size_bytes); // sort by size descending
  console.log(data);
  display_items(data);
}

const page_size = 50;
const default_theme = "dark";

function display_items(data: Item[]): void {
  // hide home and show files
  document.querySelector("#home").setAttribute("style", "display: none;");
  document.querySelector("#content").setAttribute("style", "display: flex;");

  // remove dotfiles from file list
  data = data.filter((obj) => !obj.name.startsWith("."));

  // clear grid
  const grid = document.querySelector("#items");
  grid.innerHTML = "";

  // make path buttons
  const vec = data[0].path_vec;
  vec[0] = "C:/";
  if (document.querySelector("#path")) document.querySelector("#path").innerHTML = "";
  for (let i = 0; i < vec.length; i++) {
    let btn = document.createElement("button");
    btn.onclick = function () {
      // go to path
      vec.length = i + 1;
      console.log(vec.join("/"));
      goto_folder(vec.join("/"));
    };
    btn.innerHTML = vec[i];
    let caret = document.createElement("img");
    caret.src = "ui/assets/caret.svg";
    if (i == 1) {
      document.querySelector("#path").append(btn);
      continue;
    }
    document.querySelector("#path").append(caret, btn);
  }

  // show file count
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
      item_name.className = "name";
      const item_size = document.createElement("p");
      item_size.innerHTML = item.size_formatted;
      item_size.className = "size";
      item_container.onclick = function () {
        select_item(item, item_container);
      };
      item_container.ondblclick = function () {
        if (item.item_type == "folder") {
          goto_folder(item.path_str);
        } else {
          invoke("open_file_in_default_app", { path: item.path_str });
        }
      };
      let thumbnail = document.createElement('div')
      thumbnail.className = 'thumbnail'
      thumbnail.append(generate_item_preview(item))
      item_container.append(thumbnail, item_name, item_size);
      grid.appendChild(item_container);
    }
    if (amount * (offset / amount + 1) < items.length) {
      grid.appendChild(load_more);
    }
  }
}

interface Item {
  item_type: string;
  path_str: string;
  name: string;
  size_formatted: string;
  created_formatted: string;
  extension: string;
  modified_formatted: string;
  path_vec: string[];
  accessed_formatted: string;
}

function select_item(item: Item, item_container: HTMLButtonElement): void {
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
    invoke("send_file_to_trash", { path: item.path_str })
      .then(() => {
        console.log("File deleted successfully");
        // delete the item from file list
        item_container.remove();
      })
      .catch((err: Error) => {
        console.error(err);
        alert("error deleting file");
      });
  };
  // const rename_input = document.createElement("input");
  // rename_input.type = "text";
  // rename_input.placeholder = "New Name";
  // rename_input.value = item.name;
  const btn_rename = document.createElement("button");
  btn_rename.innerHTML = "Rename";
  const btn_favorite = document.createElement("button");
  btn_favorite.innerHTML = "Favorite";
  // btn_rename.onclick = function () {
  // const new_name = rename_input.value;
  // item.path_vec.push(new_name);
  // console.log(item.path_vec.join("/"));
  // invoke("rename_item", { path: item.path_str, new: item.path_str + "test" });
  // };
  const btn_open = document.createElement("button");
  btn_open.innerHTML = "Open";
  btn_open.onclick = function () {
    invoke("open_file_in_default_app", { path: item.path_str });
  };

  const actions = document.createElement("div");
  actions.id = "actions";
  actions.append(btn_open, btn_rename, btn_delete, btn_favorite);

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
          elem.src = "ui/assets/folders/downloads.svg";
          break;
        case "images":
        case "photos":
        case "icons":
        case "assets":
        case "pictures":
          elem.src = "ui/assets/folders/photos.svg";
          break;
        case "videos":
          elem.src = "ui/assets/folders/videos.svg";
          break;
        case "movies":
        case "films":
          elem.src = "ui/assets/folders/movies.svg";
          break;
        case "users":
          elem.src = "ui/assets/folders/users.svg";
          break;
        case "music":
          elem.src = "ui/assets/folders/music.svg";
          break;
        case "audio":
          elem.src = "ui/assets/folders/audio.svg";
          break;
        case "src":
          elem.src = "ui/assets/folders/src.svg";
          break;
        case "documents":
          elem.src = "ui/assets/folders/documents.svg";
          break;
        case "desktop":
          elem.src = "ui/assets/folders/desktop.svg";
          break;
        case "3d models":
        case "3d objects":
          elem.src = "ui/assets/folders/3d.svg";
          break;
        default:
          elem.src = "ui/assets/folders/folder.svg";
          break;
      }
      break;
    case "image":
      elem = document.createElement("img") as HTMLImageElement;
      elem.src = convertFileSrc(item.path_str);
      break;
    case "video":
      elem = document.createElement("video");
      elem.controls = video_controls;
      elem.src = convertFileSrc(item.path_str);
      break;
    case "audio":
      elem = document.createElement("audio");
      elem.controls = true;
      elem.src = convertFileSrc(item.path_str);
      break;
    default: // all other things
      elem = document.createElement("img");
      elem.src = `ui/assets/files/${item.extension.toLowerCase()}.svg`;
      break;
  }
  elem.addEventListener(
    "error",
    function () {
      elem.src = "ui/assets/files/file.svg";
    },
    { once: true }
  );
  return elem;
}

function change_theme(t: string): void {
  const root = document.querySelector(":root");
  root.setAttribute("theme", t);
}
