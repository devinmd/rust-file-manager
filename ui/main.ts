// import { event } from "@tauri-apps/api";

//
const { invoke, convertFileSrc } = (window as any).__TAURI__.tauri;

// import { appDataDir, join } from "@tauri-apps/api/path";
// import { convertFileSrc } from "@tauri-apps/api/tauri";
// const { open } = window.__TAURI__.api;

window.addEventListener("DOMContentLoaded", () => {
  // on load
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
    console.log("selected folder");
    console.log(selected_folder_path);
    goto_folder(selected_folder_path);
  } catch (error) {
    console.error("Error selecting folder:", error);
  }
});

document.getElementById("chk-hide-text")?.addEventListener("click", async () => {
  // refresh
  try {
    (document.querySelector("#btn-refresh") as HTMLButtonElement).click();
  } catch {}
});
document.getElementById("chk-show-thumbnails")?.addEventListener("click", async () => {
  // refresh
  try {
    (document.querySelector("#btn-refresh") as HTMLButtonElement).click();
  } catch {}
});

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

document.getElementById("btn-home")?.addEventListener("click", async () => {
  // home butotn
  document.querySelector("#home").setAttribute("style", "display: flex;");
  document.querySelector("#content").setAttribute("style", "display: none;");
});

async function goto_folder(selected_folder_path: string) {
  const startTime = new Date().getTime();
  const sort = (document.querySelector("#sort") as HTMLSelectElement).value.split("_");
  const walk = (document.querySelector("#chk-walk") as HTMLInputElement).checked;
  console.log("sort:");
  console.log(sort);
  console.log(selected_folder_path);
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

  console.log("data:");
  console.log(data);
  selectedItem.index = -1;
  display_items(data);
  console.log(`Retrieved data and displayed items in ${Date.now() - startTime}ms`);
}

const page_size = 64;

function display_items(data: Folder): void {
  // hide home and show files
  document.querySelector("#home").setAttribute("style", "display: none;");
  document.querySelector("#content").setAttribute("style", "display: flex;");

  // clear grid
  const grid = document.querySelector("#items");
  grid.innerHTML = "";

  // make path btns
  const vec = data.path.split("/");
  console.log("path:");
  vec[0] = "";
  console.log(vec);
  if (document.querySelector("#path")) document.querySelector("#path").innerHTML = "";
  for (let i = 0; i < vec.length; i++) {
    let btn = document.createElement("button");
    btn.onclick = function () {
      // go to path
      vec.length = i + 1;
      goto_folder(vec.join("/"));
    };
    btn.innerHTML = vec[i];
    let caret = document.createElement("img");
    caret.src = "ui/assets/caret.svg";
    if (i == 0) {
      document.querySelector("#path").append(btn);
      continue;
    }
    document.querySelector("#path").append(caret, btn);
  }

  // show file count
  document.querySelector("#current-folder-info").innerHTML = data.items.length + " items";

  // if folder is empty
  if (data.items.length == 0) {
    let empty_folder_text = document.createElement("h5");
    empty_folder_text.innerHTML = `This Folder is Empty`;
    empty_folder_text.className = "empty-folder-text";
    document.querySelector("#items").append(empty_folder_text);
    console.log("displayed files (folder is empty)");
  }

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
    let clone = items.slice(0);
    let spliced = clone.splice(offset, amount);
    load_more.remove();

    let thumbnails: boolean = (document.querySelector("#chk-show-thumbnails") as HTMLInputElement).checked;

    for (let i = 0; i < spliced.length; i++) {
      const item = spliced[i];
      const item_container = document.createElement("button") as HTMLButtonElement;
      const page_num = current_page;
      let thumbnail = document.createElement("div");
      thumbnail.className = "thumbnail";
      if (thumbnails) {
        thumbnail.append(generate_item_preview(item));
      } else {
        thumbnail.append();
      }
      item_container.append(thumbnail);
      if (
        (document.querySelector("#chk-hide-text") as HTMLInputElement).checked &&
        (item.item_type == "image" || item.item_type == "video")
      ) {
        // if checked and is an image or video
      } else {
        // if unchecked OR is NOT an image or video
        const item_name = document.createElement("p");
        item_name.innerHTML = item.name;
        item_name.className = "name";
        const item_size = document.createElement("p");
        item_size.innerHTML = formatBytes(item.size_bytes);
        item_size.className = "size";
        item_container.append(item_name, item_size);
      }

      item_container.onclick = function () {
        // TODO: FIX THIS
        select_item(item, item_container, page_num * page_size + i);
      };

      item_container.ondblclick = function () {
        if (item.item_type == "folder") {
          goto_folder(item.path);
        } else {
          invoke("open_file_in_default_app", { path: item.path });
        }
      };

      grid.appendChild(item_container);
    }
    if (amount * (offset / amount + 1) < items.length) {
      grid.appendChild(load_more);
    }
  }

  console.log("displayed files");
}

interface Item {
  item_type: string;
  index: number;
  path: string;
  name: string;
  size_bytes: number;
  extension: string;
  width: number;
  height: number;
  modified: number;
  accessed: number;
  created: number;
}

interface Folder {
  items: Item[];
  name: string;
  item_type: string;
  path: string;
}

var selectedItem = { index: -1, path: "" };

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
  toAppend.push(item_name);

  // text
  const info = document.createElement("div");
  info.id = "info";

  const type = document.createElement("p");
  type.innerHTML = `Type<span>${item.item_type}</span>`;
  toAppend.push(type);

  const size = document.createElement("p");
  size.innerHTML = `Size<span>${formatBytes(item.size_bytes)}</span>`;
  item.size_bytes ? toAppend.push(size) : null;

  const location = document.createElement("p");
  location.innerHTML = `Location<span>${item.path}</span>`;
  toAppend.push(location);

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

  info.append(...toAppend);

  // btns
  const btn_delete = document.createElement("button");
  btn_delete.innerHTML = "Delete";
  btn_delete.onclick = function () {
    deleteItem(item.path);
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
  // invoke("rename_item", { path: item.path, new: item.path + "test" });
  // };
  const btn_open = document.createElement("button");
  btn_open.innerHTML = "Open";
  btn_open.onclick = function () {
    invoke("open_file_in_default_app", { path: item.path });
  };

  const actions = document.createElement("div");
  actions.id = "actions";
  actions.append(btn_open, btn_rename, btn_delete, btn_favorite);

  sidebar.append(generate_item_preview(item, true), info, actions);
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
        case "sync":
          elem.src = "ui/assets/folders/sync.svg";
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
      elem.src = convertFileSrc(item.path);
      break;
    case "video":
      elem = document.createElement("video");
      elem.controls = video_controls;
      elem.src = convertFileSrc(item.path);
      break;
    case "audio":
      elem = document.createElement("audio");
      elem.controls = true;
      elem.src = convertFileSrc(item.path);
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

function formatDate(epoch: number): string {
  const date = new Date(epoch * 1000); // Convert epoch to milliseconds
  const days: string[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months: string[] = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const weekDay: string = days[date.getUTCDay()];
  const month: string = months[date.getUTCMonth()];
  const day: number = date.getUTCDate();
  const year: number = date.getUTCFullYear();
  let hours: string = String(date.getUTCHours()).padStart(2, "0");
  let minutes: string = String(date.getUTCMinutes()).padStart(2, "0");

  return `${weekDay}, ${month} ${day}, ${year}, ${hours}:${minutes}`;
}

function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";
  if (bytes == null) return "";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
