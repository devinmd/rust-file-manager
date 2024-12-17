// import { event } from "@tauri-apps/api";
// import { appDataDir, join } from "@tauri-apps/api/path";
// import { convertFileSrc } from "@tauri-apps/api/tauri";
// const { open } = window.__TAURI__.api;

// import helper functions
import { formatMs, formatBytes, formatDate, generate_item_preview, Item } from "./helper";

// 
const { invoke } = (window as any).__TAURI__.tauri;

// globals
var view = "grid";
var selectedItem = { index: -1, path: "" };
const page_size = 64;

// on load
window.addEventListener("DOMContentLoaded", () => {
  console.log("loaded");
  get_system_info();
  get_userdata();
});

async function get_userdata() {
  // get user data here, theme, last folder, etc.
  const data = await invoke("get_userdata");
  console.log("received userdata");
  console.log(data);

  change_theme(data.theme);

  if (data.view) {
    view = data.view;
  }

  if (data.last_folder) {
    console.log(data.last_folder);
    goto_folder(data.last_folder);
  }
}

async function get_system_info() {
  const data = await invoke("get_system_info");
  console.log("system info:");
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
    console.log("selected folder, going to it");
    console.log(selected_folder_path);
    goto_folder(selected_folder_path);
  } catch (error) {
    console.error("Error selecting folder:", error);
  }
});

// document.getElementById("chk-hide-text")?.addEventListener("click", async () => {
//   // refresh
//   try {
//     (document.querySelector("#btn-refresh") as HTMLButtonElement).click();
//   } catch {}
// });
// document.getElementById("chk-show-thumbnails")?.addEventListener("click", async () => {
//   // refresh
//   try {
//     (document.querySelector("#btn-refresh") as HTMLButtonElement).click();
//   } catch {}
// });

document.getElementById("sort")?.addEventListener("input", async () => {
  // user changed sort
  try {
    (document.querySelector("#btn-refresh") as HTMLButtonElement).click();
  } catch {}
});

document.getElementById("chk-walk")?.addEventListener("input", async () => {
  // user changed sort
  try {
    (document.querySelector("#btn-refresh") as HTMLButtonElement).click();
  } catch {}
});

document.getElementById("view-type-grid")?.addEventListener("click", async () => {
  try {
    view = "grid";
    (document.querySelector("#btn-refresh") as HTMLButtonElement).click();
  } catch {}
});

document.getElementById("view-type-list")?.addEventListener("click", async () => {
  try {
    view = "list";
    (document.querySelector("#btn-refresh") as HTMLButtonElement).click();
  } catch {}
});

document.getElementById("view-type-columns")?.addEventListener("click", async () => {
  try {
    view = "columns";
    (document.querySelector("#btn-refresh") as HTMLButtonElement).click();
  } catch {}
});

document.getElementById("view-type-masonry")?.addEventListener("click", async () => {
  try {
    view = "masonry";
    (document.querySelector("#btn-refresh") as HTMLButtonElement).click();
  } catch {}
});

document.getElementById("btn-home")?.addEventListener("click", async () => {
  // home butotn
  document.querySelector("#home").setAttribute("style", "display: flex;");
  document.querySelector("#items").setAttribute("style", "display: none;");
  document.querySelector("#selected-file").setAttribute("style", "display: none;");
});

async function goto_folder(selected_folder_path: string) {
  // get start time
  const startTime = Date.now();
  document.querySelector("#bottom-bar-loading").setAttribute("style", "display: flex;");
  document.querySelector("#bottom-bar-info").setAttribute("style", "display: none;");

  // get the selected sort
  const sort = (document.querySelector("#sort") as HTMLSelectElement).value.split("_");

  // recurisve or not
  const walk = (document.querySelector("#chk-walk") as HTMLInputElement).checked;

  console.log("going to folder:");
  console.log(selected_folder_path);

  console.log("with sort:");
  console.log(sort);

  let data = await invoke("get_items", {
    selectedFolder: selected_folder_path,
    sort: sort[0],
    ascending: /true/i.test(sort[1]),
    walk: walk,
    dotfiles: false,
  });

  (document.querySelector("#btn-refresh") as HTMLButtonElement).onclick = function () {
    goto_folder(selected_folder_path);
  };

  console.log("received data:");
  console.log(data);

  selectedItem.index = -1;

  console.log("displaying items...");
  display_items(data);

  // calculate and display elapsed time of getting items and then displaying them
  let elapsedTime = formatMs(Date.now() - startTime);
  document.querySelector("#bottom-bar-info").setAttribute("style", "display: flex;");
  document.querySelector("#bottom-bar-loading").setAttribute("style", "display: none;");

  console.log(`Retrieved data and displayed items in ${elapsedTime}`);
  document.querySelector("#elapsed-time").innerHTML = elapsedTime;
}


function generate_path_buttons(vec: string[]) {
  // const vec = data.path.split("/");
  console.log("path:");
  vec[0] = "/";
  // vec[1] = ""
  console.log(vec);
  if (document.querySelector("#path")) document.querySelector("#path").innerHTML = "";
  for (let i = 0; i < vec.length; i++) {
    if (vec[i] == "" || i == 0 || i == 1) continue;
    let btn = document.createElement("button");
    btn.className = "clear ";
    btn.onclick = function () {
      // go to path
      vec.length = i + 1;
      goto_folder(vec.join("/").replace("//", "/"));
    };
    btn.innerHTML = vec[i];
    let caret = document.createElement("img");
    caret.src = "ui/assets/caret.svg";

    if (i == 0 || vec[i - 1] == "" || i == 1 || i == 0 || i == 2) {
      document.querySelector("#path").append(btn);
    } else {
      document.querySelector("#path").append(caret, btn);
    }
  }
}

function display_items(data: Folder): void {
  // hide home and show files
  document.querySelector("#home").setAttribute("style", "display: none;");
  document.querySelector("#items").setAttribute("style", "display: default;");
  document.querySelector("#selected-file").setAttribute("style", "display: flex;");

  const itemsContainer = document.querySelector("#items");

  // clear
  itemsContainer.innerHTML = "";

  // make path buttons
  generate_path_buttons(data.path.split("/"));

  // show file count in bottom bar
  document.querySelector("#current-folder-info").innerHTML = data.items.length + " items";

  // if folder is empty
  if (data.items.length == 0) {
    let empty_folder_text = document.createElement("h5");
    empty_folder_text.innerHTML = `This Folder is Empty`;
    empty_folder_text.className = "empty-folder-text";
    document.querySelector("#items").append(empty_folder_text);
    console.log("displayed files (folder is empty)");
    return;
  }

  // get the view
  console.log("VIEW: " + view);
  itemsContainer.className = view;

  const load_more = document.createElement("button");
  load_more.innerHTML = "Load More";
  load_more.id = "btn-load-more";
  load_more.onclick = function () {
    current_page += 1;
    display_page(data.items, page_size, page_size * current_page);
  };

  // display files
  let current_page: number = 0;
  display_page(data.items, page_size, 0);

  function display_page(items: Item[], amount: number, offset: number) {
    // clone the items array
    let fullItemsList = items.slice(0);

    // splice the items array to get a list that is just the items that will be displayed in this page
    let itemsList = fullItemsList.splice(offset, amount);

    // remove load more button (will be re added at the bottom)
    load_more.remove();

    // for each item
    for (let i = 0; i < itemsList.length; i++) {
      const item = itemsList[i];

      const item_container = document.createElement("button") as HTMLButtonElement;

      // generate item thumbnail
      let thumbnail = document.createElement("div");
      thumbnail.className = "thumbnail";
      thumbnail.append(generate_item_preview(item));

      // item name
      const item_name = document.createElement("p");
      item_name.innerHTML = item.name;
      item_name.className = "name";

      // item size
      const item_size = document.createElement("p");
      item_size.innerHTML = formatBytes(item.size_bytes);
      item_size.className = "size";

      // append
      item_container.append(thumbnail, item_name, item_size);

      // set onclick for item container to select that item
      item_container.onclick = function () {
        select_item(item, item_container, current_page * page_size + i);
      };

      // open file on double click
      item_container.ondblclick = function () {
        if (item.item_type == "folder") {
          // if is folder, open the folder in finder
          goto_folder(item.path);
        } else {
          // else, open the file in default app
          invoke("open_file_in_default_app", { path: item.path });
        }
      };

      // add the item to grid
      itemsContainer.appendChild(item_container);
    }
    if (amount * (offset / amount + 1) < items.length) {
      // if there are still more, add the load more button back
      itemsContainer.appendChild(load_more);
    }
  }

  console.log("displayed files");
}

interface Folder {
  items: Item[];
  name: string;
  item_type: string;
  path: string;
}

function select_item(item: Item, item_container: HTMLButtonElement, index: number): void {
  // add active class
  document.querySelectorAll("button.active").forEach((btn) => btn.classList.remove("active"));
  item_container.classList.add("active");
  // remove active class from all other items

  selectedItem.index = index;
  selectedItem.path = item.path;
  console.log(index);

  const sidebar = document.querySelector("#selected-file");
  sidebar.innerHTML = "";

  let toAppend = [];

  // file name
  const item_name = document.createElement("p");
  item_name.id = "item-name";
  item_name.innerHTML = item.name;

  // text
  const info = document.createElement("div");
  info.id = "info";

  const type = document.createElement("p");
  type.innerHTML = `Type<span>${item.item_type}</span>`;
  toAppend.push(type);

  const size = document.createElement("p");
  size.innerHTML = `Size<span>${formatBytes(item.size_bytes)}</span>`;
  item.size_bytes ? toAppend.push(size) : null;

  const dimensions = document.createElement("p");
  dimensions.innerHTML = `Dimensions<span>${item.width} x ${item.height}</span>`;
  item.width ? toAppend.push(dimensions) : null;

  const created = document.createElement("p");
  created.innerHTML = `Created<span>${formatDate(item.created)}</span>`;
  toAppend.push(created);

  const accessed = document.createElement("p");
  accessed.innerHTML = `Accessed<span>${formatDate(item.accessed)}</span>`;
  toAppend.push(accessed);

  const modified = document.createElement("p");
  modified.innerHTML = `Modified<span>${formatDate(item.modified)}</span>`;
  toAppend.push(modified);

  const location = document.createElement("p");
  location.innerHTML = `Path<span>${item.path}</span>`;
  toAppend.push(location);

  info.append(...toAppend);

  // btns
  const btn_delete = document.createElement("button");
  btn_delete.className = "icon-center";
  btn_delete.innerHTML = "<img src='./ui/assets/trash.svg'>Delete";
  btn_delete.onclick = function () {
    deleteItem(item.path);
  };
  // const rename_input = document.createElement("input");
  // rename_input.type = "text";
  // rename_input.placeholder = "New Name";
  // rename_input.value = item.name;
  const btn_rename = document.createElement("button");
  btn_rename.className = "icon-center";
  btn_rename.innerHTML = "<img src='./ui/assets/rename.svg'>Rename";
  const btn_favorite = document.createElement("button");
  btn_favorite.className = "icon-center";
  btn_favorite.innerHTML = "<img src='./ui/assets/heart.svg'>Favorite";
  // btn_rename.onclick = function () {
  // const new_name = rename_input.value;
  // invoke("rename_item", { path: item.path, new: item.path + "test" });
  // };
  const btn_open = document.createElement("button");
  btn_open.className = "icon-center";
  btn_open.innerHTML = "<img src='./ui/assets/open.svg'>Open";
  btn_open.onclick = function () {
    invoke("open_file_in_default_app", { path: item.path });
  };

  const actions = document.createElement("div");
  actions.id = "actions";
  actions.append(btn_open, btn_rename, btn_delete, btn_favorite);

  const img_container = document.createElement("div");
  img_container.id = "selected-item-img-container";
  img_container.append(generate_item_preview(item, true));

  sidebar.append(img_container, item_name, info, actions);
}

function deleteItem(path: String) {
  invoke("send_file_to_trash", { path: path })
    .then(() => {
      console.log(`${path} deleted`);
      // delete the item from file list
      // small delay on the removing because it waits for the send file to trash
      console.log(selectedItem.index);
      console.log(document.querySelectorAll("#items button")[selectedItem.index]);
      document.querySelectorAll("#items button")[selectedItem.index].remove();
      selectedItem.index -= 1;
      nextItem();
    })
    .catch((err: Error) => {
      console.error(err);
      alert(`error deleting ${path}`);
    });
}

// navigate selected item with arrow keys
const keyPress = (event: KeyboardEvent) => {
  switch (event.key) {
    case "ArrowRight":
      nextItem();
      break;
    case "ArrowLeft":
      previousItem();
      break;
    case "Enter":
      // disable default functionality
      event.preventDefault();
      event.stopPropagation();
      openItem();
      break;
    case "Tab":
      // disable default functionality
      console.log("tab");
      event.preventDefault();
      event.stopPropagation();
      break;
    case "Backspace":
      if (event.ctrlKey || event.metaKey) {
        // ctrl + delete
        event.preventDefault();
        event.stopPropagation();
        deleteItem(selectedItem.path);
      }
      break;
    case "r":
      if (event.ctrlKey || event.metaKey) {
        // ctrl + r
        event.preventDefault();
        event.stopPropagation();
        // reload
        location.reload();
      }
      break;
    default:
      break;
  }
};

document.addEventListener("keydown", keyPress);

function openItem() {
  let itemList = document.querySelector("#items").children;
  let item = itemList[selectedItem.index] as HTMLButtonElement;
  item.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
}

function nextItem() {
  let itemList = document.querySelector("#items").children;
  let nextItemElem = itemList[selectedItem.index + 1] as HTMLButtonElement;
  if (nextItemElem) nextItemElem.click();
}

function previousItem() {
  let itemList = document.querySelector("#items").children;
  let previousItemElem = itemList[selectedItem.index - 1] as HTMLButtonElement;
  if (previousItemElem) previousItemElem.click();
}

function change_theme(t: string): void {
  const root = document.querySelector(":root");
  root.setAttribute("theme", t);
}
