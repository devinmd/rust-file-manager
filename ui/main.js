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
    const data = await invoke("open_folder_dialog");
    console.log(data);
    display_items(data);
  } catch (error) {
    console.error("Error selecting folder:", error);
  }
});

const page_size = 50;

function display_items(data) {
  // remove dotfiles
  data = data.filter((obj) => !obj.name.startsWith("."));
  // clear grid
  const grid = document.querySelector("#items");
  grid.innerHTML = "";
  // update folder name
  const vec = data[0].full_path_vec
  for(let i = 0; i < vec.length-1; i++){
    let btn = document.createElement('button')
    btn.innerHTML = vec[i]
    document.querySelector('#path').append(btn)
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
      const item_container = document.createElement("div");
      const item_name = document.createElement("p");
      item_name.innerHTML = item.name;
      item_container.onclick = function () {
        select_item(item);
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
  type.innerHTML = `Type<span>${item.preview_type}</span>`;
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
  switch (item.preview_type) {
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
    case "file":
      elem = document.createElement("img");
      elem.src = "/assets/file.svg";
      break;
    case "folder":
      elem = document.createElement("img");
      elem.src = "/assets/folder.svg";
      break;
  }
  elem.onerror = function () {
    this.src = "/assets/file.svg";
  };
  return elem;
}
