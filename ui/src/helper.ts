const { convertFileSrc } = (window as any).__TAURI__.tauri;

export interface Item {
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

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";
  if (bytes == null) return "";

  const k = 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GG", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatMs(ms: number): string {
  if (ms < 1000) {
    // Less than 1000ms, show as milliseconds
    return `${ms.toFixed(0)}ms`;
  } else {
    // 1000ms or more, convert to seconds with 3 decimal places
    const seconds = ms / 1000;
    return `${seconds.toFixed(3)}s`;
  }
}

export function formatDate(epoch: number): string {
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

export function generateItemPreview(
  item: Item,
  video_controls: boolean = false
): HTMLImageElement | HTMLAudioElement | HTMLVideoElement {
  let elem: HTMLImageElement | HTMLAudioElement | HTMLVideoElement | null;
  switch (item.item_type) {
    case "folder":
      // folder icons
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
        case "apps":
        case "applications":
        case "games":
          elem.src = "ui/assets/folders/apps.svg";
          break;
        case "videos":
          elem.src = "ui/assets/folders/videos.svg";
          break;
        case "sync":
          elem.src = "ui/assets/folders/sync.svg";
          break;
        case "movies":
        case "films":
        case "film":
          elem.src = "ui/assets/folders/movies.svg";
          break;
        case "screenshots":
          elem.src = "ui/assets/folders/screenshots.svg";
          break;
        case "users":
          elem.src = "ui/assets/folders/users.svg";
          break;
        case "music":
        case "songs":
        case "audio":
          elem.src = "ui/assets/folders/music.svg";
          break;
        case "books":
          elem.src = "ui/assets/folders/books.svg";
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
          // default folder icon
          elem.src = "ui/assets/folders/folder.svg";
          break;
      }
      break;
    case "image":
      // image file
      elem = document.createElement("img") as HTMLImageElement;
      elem.src = convertFileSrc(item.path);
      break;
    case "video":
      // video file
      elem = document.createElement("video");
      elem.controls = video_controls;
      elem.src = convertFileSrc(item.path);
      break;
    case "audio":
      // audio file
      elem = document.createElement("audio");
      elem.controls = true;
      elem.src = convertFileSrc(item.path);
      break;
    default:
      // any other file (text file or something else)
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
  elem.classList.add("noselect");
  return elem;
}

export function formatItemType(type: string): string {
  if (type == "3d") {
    return "3D";
  } else {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

export function changePage(page: string): void {
  console.log(page);
  document.querySelector("#settings").setAttribute("style", "display: none;");
  document.querySelector("#home").setAttribute("style", "display: none;");
  document.querySelector("#content").setAttribute("style", "display: none;");

  switch (page) {
    case "home":
      document.querySelector("#home").setAttribute("style", "display: default;");
      break;
    case "settings":
      document.querySelector("#settings").setAttribute("style", "display: default;");
      break;
    case "content":
      document.querySelector("#content").setAttribute("style", "display: default;");
      break;
  }
}

export function changeView(v: string): void {
  console.log(v);

  // remove active from all buttons
  document.querySelectorAll("#view-type-btns button").forEach((btn) => btn.classList.remove("active"));
  // set one to active
  document.querySelector(`#view-type-btns button#view-type-${v}`).classList.add("active");

  // remove active class from all items list containers and hide
  document.querySelectorAll(".items-container").forEach((c) => c.classList.remove("active"));
  document.querySelectorAll(".items-container").forEach((c) => c.setAttribute("style", "display: none;"));

  // set one to active
  document.querySelector(`#items-${v}`).classList.add("active");
  document.querySelector(`#items-${v}`).setAttribute("style", "display: default;");

  // refresh
  (document.querySelector("#btn-refresh") as HTMLButtonElement)?.click();
}
