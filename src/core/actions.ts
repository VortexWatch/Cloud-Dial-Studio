import { ProjectState, derivePreviewValues, createEmptyProject, deviceProfileOf } from "./Scene";
import {
  WidgetEntry, WidgetJson, FontJsonItem, PreviewTime, COMING_SOON,
  DeviceId, DEFAULT_DEVICE,
} from "../iwf/types";
import { loadImageFromBlob, baseName, fileExt, isImageFile } from "../utils/image";
import { buildRootJson, prettyJson, tryParseRoot } from "../iwf/IWFParser";
import { exportProjectZip, downloadBlob } from "../iwf/IWFExporter";
import { renderPreviewPng } from "./PreviewRenderer";
import { renderCustomWidgetImage } from "./CustomWidgetRenderer";

async function putImageFile(
  state: ProjectState,
  imageCache: Map<string, HTMLImageElement>,
  path: string,
  blob: Blob,
): Promise<HTMLImageElement | null> {
  state.files.set(path, blob);
  try {
    const img = await loadImageFromBlob(blob);
    imageCache.set(path, img);
    return img;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------
// Project lifecycle
// ---------------------------------------------------------------------

/** Port of on_new_project(). */
export function newProject(
  state: ProjectState,
  notify: () => void,
  name: string,
  deviceId: DeviceId = DEFAULT_DEVICE,
) {
  Object.assign(state, createEmptyProject());
  state.projectOpen = true;
  state.projectName = name;
  state.root = {
    version: 1,
    clouddialversion: 3,
    preview: "preview.png",
    name,
    author: "admin",
    description: deviceId,
    deviceId,
    bluetooth: false,
    disturb: false,
    battery: false,
    compress: "LZ4",
    item: [],
    bkground: "",
  };
  notify();
}

/**
 * Switches the current project's device profile (IDW13/IDW20). Existing
 * widget x/y/w/h values are left as-is (not rescaled) — this mirrors
 * simply changing the `deviceId` metadata field, which is what drives
 * canvas size, default hand anchor, and preview export dimensions.
 *
 * `description` is kept in sync with `deviceId` too (matching how new
 * projects are created), unless the user has already customized it to
 * something other than the previous device's id — in that case their
 * text is left alone.
 */
export function setDevice(state: ProjectState, notify: () => void, deviceId: DeviceId) {
  if (state.root.description === state.root.deviceId) {
    state.root.description = deviceId;
  }
  state.root.deviceId = deviceId;
  notify();
}

interface OpenedProjectFiles {
  iwfJsonText: string;
  fontJsonText: string | null;
  /** relPath -> File, everything else found alongside iwf.json */
  assets: Map<string, File>;
}

/**
 * Port of on_open_iwf_json() + load_image_strip(), adapted for a
 * browser directory picker (<input webkitdirectory>) since there is no
 * filesystem to read project_dir from directly.
 */
export async function openProjectFromFileList(
  state: ProjectState,
  imageCache: Map<string, HTMLImageElement>,
  notify: () => void,
  fileList: FileList,
): Promise<{ loaded: number; skipped: number } | null> {
  const files = Array.from(fileList);
  const relPath = (f: File) => (f as any).webkitRelativePath || f.name;

  // Find the directory root (the folder that directly contains iwf.json).
  const iwfFile = files.find((f) => relPath(f).toLowerCase().endsWith("/iwf.json") || f.name.toLowerCase() === "iwf.json");
  if (!iwfFile) return null;

  const rootPrefix = relPath(iwfFile).slice(0, relPath(iwfFile).length - "iwf.json".length);
  const strip = (p: string) => (p.startsWith(rootPrefix) ? p.slice(rootPrefix.length) : p);

  const opened: OpenedProjectFiles = { iwfJsonText: await iwfFile.text(), fontJsonText: null, assets: new Map() };
  for (const f of files) {
    const rel = strip(relPath(f));
    if (rel === "iwf.json") continue;
    if (rel === "font.json") { opened.fontJsonText = await f.text(); continue; }
    opened.assets.set(rel, f);
  }

  let root;
  try {
    root = JSON.parse(opened.iwfJsonText);
  } catch (e) {
    throw new Error(`Could not parse iwf.json: ${(e as Error).message}`);
  }

  // Reset state.
  const fresh = createEmptyProject();
  Object.assign(state, fresh);
  state.projectOpen = true;
  state.projectName = root.name ?? "";
  state.root = {
    version: root.version ?? 1,
    clouddialversion: root.clouddialversion ?? 3,
    preview: root.preview ?? "preview.png",
    name: root.name ?? "",
    author: root.author ?? "",
    description: root.description ?? "IDW20",
    deviceId: root.deviceId ?? "IDW20",
    bluetooth: root.bluetooth ?? false,
    disturb: root.disturb ?? false,
    battery: root.battery ?? false,
    compress: root.compress ?? "LZ4",
    item: [],
    bkground: root.bkground ?? "",
  };
  imageCache.clear();
  state.files.clear();

  // Register all discovered assets by their relative path.
  for (const [rel, file] of opened.assets) {
    state.files.set(rel, file);
  }

  // Load background.
  if (state.root.bkground && opened.assets.has(state.root.bkground)) {
    await putImageFile(state, imageCache, state.root.bkground, opened.assets.get(state.root.bkground)!);
  }

  // Load font.json entries (if present) so fontJsonItems reflects the
  // saved metadata rather than being re-derived.
  if (opened.fontJsonText) {
    try {
      const parsed = JSON.parse(opened.fontJsonText);
      const rawItems: FontJsonItem[] = parsed.item ?? parsed.font ?? [];
      state.fontJsonItems = rawItems;
    } catch {
      /* ignore malformed font.json, will be rebuilt from items below */
    }
  }

  let skipped = 0;
  const items: WidgetJson[] = root.item ?? [];

  for (const item of items) {
    const widgetKind = item.widget ?? "";
    const typeVal = item.type ?? "";

    if (widgetKind === "watch" && typeVal === "time") {
      const entry: WidgetEntry = {
        widgetType: "watch", typeValue: "time", json: item, imageStrip: {}, fontFolder: "",
      };
      state.widgetList.push(entry);
      for (const key of ["hour", "minute", "second"] as const) {
        const fname = item[key] as string | undefined;
        if (fname && opened.assets.has(fname)) {
          await putImageFile(state, imageCache, fname, opened.assets.get(fname)!);
        }
      }
      continue;
    }

    if (widgetKind === "custom" && !COMING_SOON.has(typeVal)) {
      const fontFolder = (item.font as string) ?? "";
      const imageStrip: Record<string, HTMLImageElement> = {};

      for (const [rel, file] of opened.assets) {
        if (fontFolder && rel.startsWith(`${fontFolder}/`) && isImageFile(rel)) {
          const img = await putImageFile(state, imageCache, rel, file);
          if (img) imageStrip[baseName(rel)] = img;
        }
      }

      const entry: WidgetEntry = {
        widgetType: "custom", typeValue: typeVal, json: item, imageStrip, fontFolder,
      };
      state.widgetList.push(entry);

      if (fontFolder && !state.fontJsonItems.some((f) => f.name === fontFolder)) {
        state.fontJsonItems.push({ name: fontFolder, bpp: 16, format: "png" });
      }
      continue;
    }

    skipped += 1;
  }

  state.currentWidgetIndex = -1;
  notify();
  return { loaded: state.widgetList.length, skipped };
}

// ---------------------------------------------------------------------
// Adding widgets
// ---------------------------------------------------------------------

export interface HandConfigInput {
  file: File | null;
  fileName: string;
  centerX: number;
  centerY: number;
  anchorX: number;
  anchorY: number;
}

/** Port of the watch branch of on_add_widget(). */
export async function addWatchWidget(
  state: ProjectState,
  imageCache: Map<string, HTMLImageElement>,
  notify: () => void,
  hands: { hour: HandConfigInput; minute: HandConfigInput; second: HandConfigInput },
) {
  const hourFile = hands.hour.fileName || "hour.png";
  const minFile = hands.minute.fileName || "min.png";
  const secFile = hands.second.fileName || "second.png";

  if (hands.hour.file) await putImageFile(state, imageCache, hourFile, hands.hour.file);
  if (hands.minute.file) await putImageFile(state, imageCache, minFile, hands.minute.file);
  if (hands.second.file) await putImageFile(state, imageCache, secFile, hands.second.file);

  const profile = deviceProfileOf(state);
  const json: WidgetJson = {
    widget: "watch",
    type: "time",
    x: 0, y: 0, w: profile.canvasW, h: profile.canvasH,
    fgcolor: "0xFFFFFFFF",
    second: secFile,
    seccenterx: hands.second.centerX, seccentery: hands.second.centerY,
    secanchorx: hands.second.anchorX, secanchory: hands.second.anchorY,
    minute: minFile,
    mincenterx: hands.minute.centerX, mincentery: hands.minute.centerY,
    minanchorx: hands.minute.anchorX, minanchory: hands.minute.anchorY,
    hour: hourFile,
    hourcenterx: hands.hour.centerX, hourcentery: hands.hour.centerY,
    houranchorx: hands.hour.anchorX, houranchory: hands.hour.anchorY,
  };

  const entry: WidgetEntry = { widgetType: "watch", typeValue: "time", json, imageStrip: {}, fontFolder: "" };
  state.widgetList.push(entry);
  state.currentWidgetIndex = state.widgetList.length - 1;
  notify();
}

/** Port of add_custom_widget(). */
export async function addCustomWidget(
  state: ProjectState,
  imageCache: Map<string, HTMLImageElement>,
  notify: () => void,
  typeVal: string,
  folderName: string,
  files: File[],
) {
  const imageStrip: Record<string, HTMLImageElement> = {};
  let ext = "";

  for (const file of files) {
    const rel = `${folderName}/${file.name}`;
    const suffix = fileExt(file.name);
    if (!ext) ext = suffix;
    const img = await putImageFile(state, imageCache, rel, file);
    if (img) imageStrip[baseName(file.name)] = img;
  }

  const json: WidgetJson = {
    widget: "custom",
    type: typeVal,
    x: 100, y: 100,
    fgcolor: "0xFFFFFFFF",
    fgrender: "0x0",
    align: "left",
    font: folderName,
    fontnum: Object.keys(imageStrip).length,
  };
  if (typeVal === "week") json.style = 0;
  if (typeVal === "date") json.style = 1;
  if (typeVal === "distance") json.metricinch = 1;
  if (typeVal === "weather") json.style = 2;
  if (typeVal === "month") json.style = 0;

  const entry: WidgetEntry = { widgetType: "custom", typeValue: typeVal, json, imageStrip, fontFolder: folderName };

  // Measure auto width/height by rendering once (mirrors render_custom_widget_image call in add_custom_widget).
  const rendered = renderCustomWidgetImage(entry, state.previewValues);
  json.w = rendered ? rendered.width : 50;
  json.h = rendered ? rendered.height : 20;

  if (!state.fontJsonItems.some((f) => f.name === folderName)) {
    state.fontJsonItems.push({ name: folderName, bpp: 16, format: ext || "png" });
  }

  state.widgetList.push(entry);
  state.currentWidgetIndex = state.widgetList.length - 1;
  notify();
}

/** Port of the generic (ring/progressbar) branch of on_add_widget(). */
export function addGenericWidget(
  state: ProjectState,
  notify: () => void,
  widgetKind: string,
  typeVal: string,
) {
  const profile = deviceProfileOf(state);
  const json: WidgetJson = { widget: widgetKind, type: typeVal, x: 0, y: 0, w: profile.canvasW, h: profile.canvasH };
  const entry: WidgetEntry = { widgetType: widgetKind, typeValue: typeVal, json, imageStrip: {}, fontFolder: "" };
  state.widgetList.push(entry);
  state.currentWidgetIndex = state.widgetList.length - 1;
  notify();
}

// ---------------------------------------------------------------------
// Editing widgets
// ---------------------------------------------------------------------

export function selectWidget(state: ProjectState, notify: () => void, index: number) {
  state.currentWidgetIndex = index;
  notify();
}

/** Not present as a wired-up feature in the original (the delete button
 * existed in the UI but had no connected handler); added here since a
 * production-quality editor needs it. */
export function deleteWidget(state: ProjectState, notify: () => void, index: number) {
  if (index < 0 || index >= state.widgetList.length) return;
  state.widgetList.splice(index, 1);
  if (state.currentWidgetIndex === index) state.currentWidgetIndex = -1;
  else if (state.currentWidgetIndex > index) state.currentWidgetIndex -= 1;
  notify();
}

/** Port of on_x_spin_changed / on_y_spin_changed (live, no Apply needed). */
export function setWidgetPosition(state: ProjectState, notify: () => void, x: number, y: number) {
  if (state.currentWidgetIndex < 0) return;
  const entry = state.widgetList[state.currentWidgetIndex];
  entry.json.x = x;
  entry.json.y = y;
  notify();
}

/** Port of on_update_changes(): commits x/y/w/h + scroll-area fields. */
export function applyWidgetChanges(
  state: ProjectState,
  notify: () => void,
  xywh: { x: number; y: number; w: number; h: number },
  scrollValues: Record<string, { checked: boolean; value: string }>,
  intKeys: Set<string>,
) {
  if (state.currentWidgetIndex < 0) return;
  const entry = state.widgetList[state.currentWidgetIndex];
  entry.json.x = xywh.x;
  entry.json.y = xywh.y;
  entry.json.w = xywh.w;
  entry.json.h = xywh.h;

  for (const [key, { checked, value }] of Object.entries(scrollValues)) {
    if (checked) {
      if (intKeys.has(key)) {
        const n = parseInt(value, 10);
        entry.json[key] = Number.isNaN(n) ? value : n;
      } else {
        entry.json[key] = value;
      }
    } else {
      delete entry.json[key];
    }
  }

  notify();
}

// ---------------------------------------------------------------------
// Background / preview time
// ---------------------------------------------------------------------

/** Port of on_upload_bkground_img(). */
export async function uploadBackground(
  state: ProjectState,
  imageCache: Map<string, HTMLImageElement>,
  notify: () => void,
  file: File,
  fileCounter: { current: number },
): Promise<string | null> {
  const suffix = fileExt(file.name);
  if (suffix !== "png" && suffix !== "bmp") return "Only PNG and BMP files are supported.";

  const img = await loadImageFromBlob(file).catch(() => null);
  if (!img) return "Failed to load the image file.";
  const profile = deviceProfileOf(state);
  if (img.width > profile.canvasW || img.height > profile.canvasH) return "Image Too Large: Bad File";

  const destName = `files${fileCounter.current}.${suffix}`;
  fileCounter.current += 1;

  await putImageFile(state, imageCache, destName, file);
  state.root.bkground = destName;
  notify();
  return null;
}

/** Port of on_preview_time_changed()'s state update (rendering handled by caller). */
export function setPreviewTime(state: ProjectState, notify: () => void, time: PreviewTime) {
  state.previewTime = time;
  state.previewValues = derivePreviewValues(state.previewValues, time);
  notify();
}

// ---------------------------------------------------------------------
// Save / export
// ---------------------------------------------------------------------

export function currentRootJson(state: ProjectState) {
  return buildRootJson(state.root, state.widgetList);
}

/** Port of on_save_iwf_json() — downloads instead of writing to project_dir. */
export function saveIwfJsonDownload(state: ProjectState) {
  const root = currentRootJson(state);
  downloadBlob(new Blob([prettyJson(root)], { type: "application/json" }), "iwf.json");
}

/** Port of on_save_font_json(). */
export function saveFontJsonDownload(state: ProjectState) {
  const text = `{"item":[${state.fontJsonItems.map((it) => `{"name":"${it.name}","bpp":${it.bpp},"format":"${it.format}"}`).join(",")}]}`;
  downloadBlob(new Blob([text], { type: "application/json" }), "font.json");
}

/** Port of on_create_zip_file(). */
export async function createZipDownload(state: ProjectState) {
  const root = currentRootJson(state);
  const zipBlob = await exportProjectZip(root, state.widgetList, state.fontJsonItems, state.files);
  downloadBlob(zipBlob, "dial.zip");
}

/** Port of on_save_preview(). */
export async function savePreviewDownload(
  state: ProjectState,
  imageCache: Map<string, HTMLImageElement>,
  notify: () => void,
) {
  const blob = await renderPreviewPng(state, imageCache);
  state.files.set("preview.png", blob);
  state.root.preview = "preview.png";
  notify();
  downloadBlob(blob, "preview.png");
}

export function reparseJsonText(state: ProjectState, notify: () => void, text: string) {
  const parsed = tryParseRoot(text);
  if (parsed) {
    state.root = { ...state.root, ...parsed } as any;
    notify();
  }
}
