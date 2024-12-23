// import helper functions
import {
  formatMs,
  formatBytes,
  formatDate,
  generateItemPreview,
  Item,
  formatItemType,
  changePage,
  UserData,
  changeView,
  SystemInfo,
  ItemsList,
} from "./helper";

//
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

// globals
var view = "grid";
var selectedItem = { index: -1, path: "" };
const page_size = 64; // increasing page size does not have an effect on loading time
var recursive = false;
var history = [];
var historyIndex = -1;
var defaultItemIndex = 0;

// on load
window.addEventListener("DOMContentLoaded", () => {
  console.log("LOADED FRONTEND");
  console.log("REQUESTED SYSTEM INFO");
  get_system_info();
  console.log("REQUESTED USER DATA");
  get_userdata();

  // set view to grid REMOVE LATER
  (document.querySelector("#view-type-grid") as HTMLButtonElement).click();
  // set recurisve to false
  (document.querySelector("#btn-nowalk") as HTMLButtonElement)?.click();
});

async function get_userdata() {
  // get user data here, theme, last folder, etc.
  const data: UserData = await invoke("get_userdata");
  console.log("RECEIVED USER DATA:");
  console.log(data);

  changeTheme(data.theme);

  if (data.view) {
    view = data.view;
  }

  if (data.last_folder) {
    goToFolder(data.last_folder);
  }
}

async function get_system_info() {
  const data: SystemInfo = await invoke("get_system_info");
  console.log("RECEIVED SYSTEM INFO:");
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
    text.innerHTML = `${formatBytes(d.available_space)} of ${formatBytes(d.total_space)} free`;

    container.append(name, text);
    document.querySelector("#drives").append(container);
  }
}

// disable and enable recurisve buttons
document.getElementById("btn-walk")?.addEventListener("click", async function () {
  recursive = true;
  document.querySelector("#btn-nowalk")?.classList.remove("active");
  this.classList.add("active");
  (document.querySelector("#btn-refresh") as HTMLButtonElement)?.click();
});

document.getElementById("btn-nowalk")?.addEventListener("click", async function () {
  recursive = false;
  document.querySelector("#btn-walk")?.classList.remove("active");
  this.classList.add("active");
  (document.querySelector("#btn-refresh") as HTMLButtonElement)?.click();
});

// TODO FIX DISABLED CLASS TOGGLE ITS "DELAYED"

document.getElementById("btn-back")?.addEventListener("click", async function () {
  if (historyIndex > 0) {
    historyIndex--;
    goToFolder(history[historyIndex]);
  }
});

document.getElementById("btn-forward")?.addEventListener("click", async function () {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    goToFolder(history[historyIndex]);
  }
});

document.getElementById("btn-openfolder")?.addEventListener("click", async () => {
  // open folder
  try {
    // const selected_folder_path = await invoke("open_folder_dialog");

    // Open a dialog
    const selected_folder_path = await open({
      multiple: false,
      directory: true,
    });
    console.log(selected_folder_path);
    // Prints file path or URI
    console.log("selected folder, going to it");
    console.log(selected_folder_path);
    goToFolder(selected_folder_path);
  } catch (error) {
    console.error("Error selecting folder:", error);
  }
});

document.getElementById("sort")?.addEventListener("input", async () => {
  // user changed sort, refresh
  (document.querySelector("#btn-refresh") as HTMLButtonElement).click();
});

document.getElementById("view-type-grid")?.addEventListener("click", async function () {
  changeView("grid");
  view = "grid";
});

document.getElementById("view-type-table")?.addEventListener("click", async function () {
  changeView("table");
  view = "table";
});
document.getElementById("view-type-columns")?.addEventListener("click", async function () {
  changeView("columns");
  view = "columns";
});

document.getElementById("view-type-gallery")?.addEventListener("click", async function () {
  changeView("gallery");
  view = "gallery";
});

document.getElementById("view-type-masonry")?.addEventListener("click", async function () {
  changeView("masonry");
  view = "masonry";
});

document.getElementById("btn-home")?.addEventListener("click", async () => {
  // home button
  changePage("home");
});

document.getElementById("btn-settings")?.addEventListener("click", async () => {
  // settings button
  changePage("settings");
});
// 5.5 seconds for 35000 files or 0.15 milliseconds per file

async function goToFolder(selected_folder_path: string) {
  // get start time
  const startTime = Date.now();
  // show content page
  changePage("content");

  // set bottom bar
  document.querySelector("#bottom-bar-info").setAttribute("style", "display: none;");
  document.querySelector("#bottom-bar-loading").setAttribute("style", "display: flex;");

  // get sort
  const sort = (document.querySelector("#sort") as HTMLSelectElement).value.split("_");
  // print
  console.log("GOING TO FOLDER");
  console.log(" - Path: " + selected_folder_path);
  console.log(" - Sort: " + sort);
  console.log(" - View: " + view);
  console.log(" - Recursive: " + recursive);

  // push to history
  // if is at last index in history
  if (history[historyIndex] == selected_folder_path) {
    // already at the current history spot, do nothing
  } else if (historyIndex == history.length - 1) {
    // if the user is at the last item in history currently
    history.push(selected_folder_path);
    historyIndex = history.length - 1;
  } else {
    // delete everything after current index
    history.length = historyIndex + 1;
    // push
    history.push(selected_folder_path);
    // add 1 to history index
    historyIndex += 1;
  }

  if (historyIndex == 0) {
    // no more previous items
    document.querySelector("#btn-back").classList.add("disabled");
  } else {
    // there are previous items
    document.querySelector("#btn-back").classList.remove("disabled");
  }
  if (historyIndex < history.length - 1) {
    // there are items ahead
    document.querySelector("#btn-forward").classList.remove("disabled");
  } else {
    // no more items ahead
    document.querySelector("#btn-forward").classList.add("disabled");
  }

  console.log(" - History index: " + historyIndex);

  console.log(" - Requested Data...");

  let data: ItemsList = await invoke("get_items_from_path", {
    selectedFolder: selected_folder_path,
    sort: sort[0],
    ascending: /true/i.test(sort[1]),
    walk: recursive,
    dotfiles: false,
  });

  (document.querySelector("#btn-refresh") as HTMLButtonElement).onclick = function () {
    goToFolder(selected_folder_path);
  };

  selectedItem.index = -1;

  console.log(" - Received Data:");
  console.log(data);
  console.log(" - Displaying Items...");
  displayItems(data);

  // calculate and display elapsed time of getting items and then displaying them
  let elapsedTime = formatMs(Date.now() - startTime);
  document.querySelector("#bottom-bar-info").setAttribute("style", "display: flex;");
  document.querySelector("#bottom-bar-loading").setAttribute("style", "display: none;");

  console.log(`Retrieved data and displayed items in ${elapsedTime}`);
  document.querySelector("#elapsed-time").innerHTML = elapsedTime;
}

function generatePathButtons(vec: string[]) {
  // const vec = data.path.split("/");
  vec[0] = "/";
  // vec[1] = ""
  if (document.querySelector("#path")) document.querySelector("#path").innerHTML = "";
  for (let i = 0; i < vec.length; i++) {
    if (vec[i] == "" || i == 0 || i == 1) continue;
    let btn = document.createElement("button");
    btn.className = "clear ";
    btn.onclick = function () {
      // go to path
      vec.length = i + 1;
      goToFolder(vec.join("/").replace("//", "/"));
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

function displayItems(data: ItemsList): void {
  // hide home and show files
  changePage("content");

  const itemsContainer = document.querySelector(".items-container.active");
  // clear
  document.querySelectorAll(".items-container").forEach((c) => (c.innerHTML = ""));

  // make path buttons
  generatePathButtons(data.path.split("/"));

  // show file count in bottom bar
  document.querySelector("#current-folder-info").innerHTML = data.items.length + " items";

  // if folder is empty
  if (data.items.length == 0) {
    let empty_folder_text = document.createElement("h5");
    empty_folder_text.innerHTML = `This Folder is Empty`;
    empty_folder_text.className = "empty-folder-text";
    document.querySelector("#content").append(empty_folder_text);
    console.log("displayed files (folder is empty)");
    return;
  }

  const load_more = document.createElement("button");
  load_more.innerHTML = "Load More";
  load_more.id = "btn-load-more";
  load_more.onclick = function () {
    current_page += 1;
    displayPage(data.items, page_size, page_size * current_page);
  };

  // display files
  let current_page: number = 0;
  displayPage(data.items, page_size, 0);

  function displayPage(items: Item[], amount: number, offset: number) {
    // clone the items array
    let fullItemsList = items.slice(0);

    // splice the items array to get a list that is just the items that will be displayed in this page
    let itemsList = fullItemsList.splice(offset, amount);

    // remove load more button (will be re added at the bottom)
    load_more.remove();

    // for each item
    for (let i = 0; i < itemsList.length; i++) {
      const item = itemsList[i];

      const thispage = current_page;

      let itemContainer;
      let toAppend = [];

      if (view == "grid") {
        itemContainer = document.createElement("button") as HTMLButtonElement;

        // generate item thumbnail
        let thumbnail = document.createElement("div");
        thumbnail.className = "thumbnail";
        thumbnail.append(generateItemPreview(item));

        // item name
        const itemName = document.createElement("p");
        itemName.innerHTML = item.name;
        itemName.className = "name";

        // item size
        const item_size = document.createElement("p");
        item_size.innerHTML = formatBytes(item.size_bytes);
        item_size.className = "size";

        toAppend.push(...[thumbnail, itemName, item_size]);
      } else if (view == "table") {
        itemContainer = document.createElement("tr") as HTMLTableRowElement;
        // generate item thumbnail
        let thumbnailWrapper = document.createElement("td");
        thumbnailWrapper.className = "thumbnail";
        thumbnailWrapper.append(generateItemPreview(item));

        // item name
        const itemNameWrapper = document.createElement("td");
        const itemName = document.createElement("div");
        itemName.innerHTML = item.name;
        itemName.className = "name";
        itemNameWrapper.append(itemName);
        // item size
        const itemSizeWrapper = document.createElement("td");
        const itemSize = document.createElement("div");
        itemSize.innerHTML = formatBytes(item.size_bytes);
        itemSize.className = "size";
        itemSizeWrapper.append(itemSize);

        //
        toAppend.push(...[thumbnailWrapper, itemNameWrapper, itemSizeWrapper]);
      }

      itemContainer.append(...toAppend);

      // set onclick for item container to select that item
      itemContainer.onclick = function () {
        selectItem(item, itemContainer, thispage * page_size + i);
      };

      // if first item on first page, select it
      if (i == defaultItemIndex && current_page == 0) itemContainer.click();

      // handle double click
      itemContainer.ondblclick = function () {
        if (item.item_type == "folder") {
          // if is folder, open the folder in app
          goToFolder(item.path);
        } else {
          // else, open the file in default app
          invoke("open_file_in_default_app", { path: item.path });
        }
      };

      // add the item to grid
      itemsContainer.appendChild(itemContainer);
    }
    if (amount * (offset / amount + 1) < items.length) {
      // if there are still more, add the load more button back
      itemsContainer.appendChild(load_more);
    }
  }
  defaultItemIndex = 0;
}

function selectItem(item: Item, itemContainer: HTMLButtonElement, index: number): void {
  if (!item) return;

  // add active class
  document.querySelectorAll(".items-container.active .active").forEach((btn) => btn.classList.remove("active"));
  itemContainer.classList.add("active");

  document.querySelector("#selected-item-index").innerHTML = index.toString();
  document.querySelector("#selected-item-path").innerHTML = item.path;
  if (item.size_bytes) document.querySelector("#selected-item-size").innerHTML = formatBytes(item.size_bytes);
  if (!item.size_bytes) document.querySelector("#selected-item-size").innerHTML = "";

  selectedItem.index = index;
  selectedItem.path = item.path;
  console.log("SELECTED ITEM:");
  console.log(selectedItem);

  const sidebar = document.querySelector("#selected-file");
  sidebar.innerHTML = "";

  let toAppend = [];

  // file name
  const itemNameContainer = document.createElement("div");
  itemNameContainer.id = "item-name-container";

  const item_name = document.createElement("h3");
  item_name.id = "item-name";
  item_name.innerHTML = item.name;

  const renameInput = document.createElement("input");
  renameInput.type = "text";
  renameInput.id = "input-rename";
  if (item.extension) {
    renameInput.value = item.name.replace("." + item.extension, "");
  } else {
    renameInput.value = item.name;
  }
  renameInput.style.display = "none";

  itemNameContainer.append(renameInput, item_name);
  // text
  const info = document.createElement("div");
  info.id = "info";

  const type = document.createElement("p");
  type.innerHTML = `Type<span>${formatItemType(item.item_type)}</span>`;
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
  accessed.innerHTML = `Last Accessed<span>${formatDate(item.accessed)}</span>`;
  toAppend.push(accessed);

  const modified = document.createElement("p");
  modified.innerHTML = `Last Modified<span>${formatDate(item.modified)}</span>`;
  toAppend.push(modified);

  const location = document.createElement("p");
  location.innerHTML = `Path<span>${item.path}</span>`;
  toAppend.push(location);

  info.append(...toAppend);

  // action buttons

  // helper
  function createButton(className: string, imgSrc: string, text: string): HTMLButtonElement {
    return Object.assign(document.createElement("button"), {
      className,
      innerHTML: `<img src='${imgSrc}'>${text}`,
    });
  }

  const BtnDelete: HTMLButtonElement = createButton("icon-center", "./ui/assets/trash.svg", "Delete");
  const BtnFavorite: HTMLButtonElement = createButton("icon-center", "./ui/assets/heart.svg", "Favorite");
  const BtnDuplicate: HTMLButtonElement = createButton("icon-center", "./ui/assets/duplicate.svg", "Duplicate");
  const BtnRename: HTMLButtonElement = createButton("icon-center", "./ui/assets/rename.svg", "Rename");
  const BtnOpen: HTMLButtonElement = createButton("icon-center", "./ui/assets/open.svg", "Open");

  BtnOpen.onclick = function () {
    console.log(`OPEN IN DEFAULT APP: ` + item.name);
    invoke("open_file_in_default_app", { path: item.path });
  };

  BtnRename.onclick = function () {
    if (renameInput.style.display == "none") {
      item_name.innerHTML = item.extension ? "." + item.extension : "";
      renameInput.style.display = "block";
      BtnRename.style.backgroundColor = "var(--bg-2)";
      renameInput.focus();
      renameInput.select();
    } else {
      confirmRename();
    }
  };

  function confirmRename() {
    const itemContainer1 = item.path.replace(item.name, "");
    BtnRename.style.backgroundColor = "var(--bg-1)";
    renameInput.value = renameInput.value.replaceAll(".", "").replaceAll("/", "").replaceAll("\\", "");
    const newPath = itemContainer1 + renameInput.value + (item.extension ? "." + item.extension : "");
    if (renameInput.value.replaceAll(" ", "") == "" || newPath == item.path) {
      // if empty name or name is same, do nothing
    } else {
      console.log("RENAME: " + newPath);
      invoke("rename_item", {
        path: item.path,
        new: newPath,
      });
    }
    // hide button
    renameInput.style.display = "none";
    // refresh
    defaultItemIndex = index;
    (document.querySelector("#btn-refresh") as HTMLButtonElement)?.click();
  }

  renameInput.addEventListener("keydown", ({ key }) => {
    if (key === "Enter") {
      // confirm rename
      confirmRename();
    }
  });

  BtnDelete.onclick = function () {
    console.log(`DELETE ITEM: ` + item.name);
    deleteItem(item.path);
  };

  const actions = document.createElement("div");
  actions.id = "actions";
  actions.append(BtnOpen, BtnRename, BtnDelete, BtnFavorite, BtnDuplicate);

  const imgContainer = document.createElement("div");
  imgContainer.id = "selected-item-img-container";
  imgContainer.append(generateItemPreview(item, true));

  sidebar.append(imgContainer, itemNameContainer, info, actions);
}

function deleteItem(path: String) {
  invoke("send_file_to_trash", { path: path })
    .then(() => {
      console.log(`${path} deleted`);
      // delete the item from file list
      // small delay on the removing because it waits for the send file to trash
      console.log(selectedItem.index);
      console.log(document.querySelectorAll(".items-container button")[selectedItem.index]);
      document.querySelectorAll(".items-container button")[selectedItem.index].remove();
      selectedItem.index -= 1;
      nextItem();
    })
    .catch((err: Error) => {
      console.error(err);
      alert(`error deleting ${path}`);
    });
}

// disable context menu
// document.addEventListener("contextmenu", (event) => event.preventDefault());

// navigate selected item with arrow keys
const keyPress = (event: KeyboardEvent) => {
  switch (event.key) {
    // case "ArrowRight":
    // event.preventDefault();
    // event.stopPropagation();
    // console.log("ARROW RIGHT");
    // nextItem();
    // break;
    // case "ArrowLeft":
    // event.preventDefault();
    // event.stopPropagation();
    // console.log("ARROW LEFT");
    // previousItem();
    // break;
    // case "ArrowDown":
    // event.preventDefault();
    // event.stopPropagation();
    // console.log("ARROW DOWN");
    // if (view == "table") nextItem();
    // if (view == "grid") navigateGrid("down");
    // break;
    // case "ArrowUp":
    // event.preventDefault();
    // event.stopPropagation();
    // console.log("ARROW UP");
    // if (view == "table") previousItem();
    // if (view == "grid") navigateGrid("up");
    // break;
    case "Enter":
      // disable default functionality
      event.preventDefault();
      event.stopPropagation();
      // openItem();
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
    case "c":
      if (event.ctrlKey || event.metaKey) {
        // ctrl + c copy
        event.preventDefault();
        event.stopPropagation();
      }
      break;
    case "v":
      if (event.ctrlKey || event.metaKey) {
        // ctrl + v paste
        event.preventDefault();
        event.stopPropagation();
      }
      break;
    case "space":
      event.preventDefault();
      event.stopPropagation();
      break;
    default:
      break;
  }
};

document.addEventListener("keydown", keyPress);

// handle up and down arrow navigation in grid view
function navigateGrid(direction: string) {
  // list of grid items (html buttons)
  const itemList = document.querySelector(".items-container.active")?.children as HTMLCollectionOf<HTMLButtonElement>;
  // get list of columns
  const columnCount = getComputedStyle(document.querySelector(".items-container.active")).gridTemplateColumns.split(
    " "
  ).length;
  if (direction == "up") {
    // if there are no items above
    if (selectedItem.index < columnCount) return;
    // get item above
    const itemAbove = itemList[selectedItem.index - columnCount] as HTMLButtonElement;
    if (itemAbove) {
      itemAbove.click();
      itemAbove.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  } else if (direction == "down") {
    console.log(selectedItem.index);
    console.log(columnCount);

    // if no items below
    if (selectedItem.index > itemList.length - columnCount) return;
    // get item below
    const itemBelow = itemList[selectedItem.index + columnCount] as HTMLButtonElement;
    console.log(itemList);
    console.log(itemBelow);
    if (itemBelow) {
      itemBelow.click();
      itemBelow.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }
}

function openItem() {
  console.log("OPEN");
  const itemList = document.querySelector(".items-container.active")?.children as HTMLCollectionOf<HTMLButtonElement>;
  const item = itemList[selectedItem.index] as HTMLButtonElement;
  item.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
}

function nextItem() {
  console.log("NEXT");
  const itemList = document.querySelector(".items-container.active")?.children as HTMLCollectionOf<HTMLButtonElement>;
  const nextItemElem = itemList[selectedItem.index + 1] as HTMLButtonElement;
  if (nextItemElem) {
    nextItemElem.click();
    nextItemElem.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function previousItem() {
  console.log("PREVIOUS");
  const itemList = document.querySelector(".items-container.active")?.children as HTMLCollectionOf<HTMLButtonElement>;
  console.log(itemList); // for some reason printing here fixes the bug
  console.log(selectedItem.index);
  const previousItemElem = itemList[selectedItem.index - 1] as HTMLButtonElement;
  if (previousItemElem) {
    previousItemElem.click();
    previousItemElem.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function changeTheme(t: string): void {
  const root = document.querySelector(":root");
  root.setAttribute("theme", t);
}
