import { RootJson, WidgetJson, WidgetEntry, FontJsonItem } from "./types";

/**
 * Port of MainWindow.build_root_json(). Builds the root JSON object from
 * project metadata plus the current widget list, preserving any extra
 * top-level fields the user may have hand-edited in the JSON text area.
 */
export function buildRootJson(
  existing: Partial<RootJson> | null,
  widgetList: WidgetEntry[],
): RootJson {
  const e = existing ?? {};
  return {
    version: e.version ?? 1,
    clouddialversion: e.clouddialversion ?? 3,
    preview: e.preview ?? "preview.png",
    name: e.name ?? "",
    author: e.author ?? "",
    deviceId: e.deviceId ?? "IDW20",
    description: e.description ?? e.deviceId ?? "IDW20",
    bluetooth: e.bluetooth ?? false,
    disturb: e.disturb ?? false,
    battery: e.battery ?? false,
    compress: e.compress ?? "LZ4",
    item: widgetList.map((entry) => entry.json),
    bkground: e.bkground ?? "",
  };
}

const TOP_KEYS: (keyof RootJson)[] = [
  "version", "clouddialversion", "preview", "name", "author",
  "description", "deviceId", "bluetooth", "disturb", "battery",
  "compress", "item", "bkground",
];

const WATCH_KEYS = [
  "widget", "type", "x", "y", "w", "h", "fgcolor",
  "second", "seccenterx", "seccentery", "secanchorx", "secanchory",
  "minute", "mincenterx", "mincentery", "minanchorx", "minanchory",
  "hour", "hourcenterx", "hourcentery", "houranchorx", "houranchory",
];

const CUSTOM_KEYS = [
  "widget", "type", "x", "y", "w", "h",
  "fgcolor", "fgrender", "align", "metricinch", "style",
  "font", "fontnum",
];

const GENERIC_KEYS = ["widget", "type", "x", "y", "w", "h"];

function valStr(v: unknown): string {
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(Math.trunc(v));
  return "null";
}

function buildItemStr(obj: WidgetJson, indent: number): string {
  const wType = obj.widget ?? "";
  let ordered: string[];
  if (wType === "watch") ordered = [...WATCH_KEYS];
  else if (wType === "custom") ordered = [...CUSTOM_KEYS];
  else ordered = [...GENERIC_KEYS];

  for (const k of Object.keys(obj)) {
    if (!ordered.includes(k)) ordered.push(k);
  }

  const pad = " ".repeat(indent);
  let inner = "";
  let first = true;
  for (const k of ordered) {
    if (!(k in obj) || obj[k] === undefined) continue;
    if (!first) inner += ",\n";
    inner += `${pad}    "${k}": ${valStr(obj[k])}`;
    first = false;
  }
  return `${pad}{\n${inner}\n${pad}}`;
}

/**
 * Port of MainWindow.pretty_json(). Produces the exact same custom
 * key-ordering / indentation style as the original desktop app so that
 * exported iwf.json files remain byte-for-byte compatible with IDO
 * devices expecting this layout.
 */
export function prettyJson(root: RootJson): string {
  let out = "{\n";
  let firstTop = true;

  for (const k of TOP_KEYS) {
    if (!(k in root)) continue;
    if (!firstTop) out += ",\n";

    if (k === "item") {
      out += '    "item": ';
      const items = root.item ?? [];
      if (!items.length) {
        out += "[]";
      } else {
        out += "[\n";
        items.forEach((item, i) => {
          out += buildItemStr(item, 8);
          if (i < items.length - 1) out += ",";
          out += "\n";
        });
        out += "    ]";
      }
    } else {
      out += `    "${k}": ${valStr((root as any)[k])}`;
    }
    firstTop = false;
  }

  out += "\n}";
  return out;
}

/** Port of MainWindow.update_font_json_display() text formatting. */
export function fontJsonDisplayText(items: FontJsonItem[]): string {
  const itemsStr = items
    .map((it) => `{"name":"${it.name}","bpp":${it.bpp},"format":"${it.format}"}`)
    .join(",");
  return `{"item":[${itemsStr}]}`;
}

/** Port of the font.json file written by on_save_font_json (same shape). */
export function fontJsonFileText(items: FontJsonItem[]): string {
  return fontJsonDisplayText(items);
}

/** Attempts to parse the JSON text area content; returns null on failure (mirrors the try/except in build_root_json). */
export function tryParseRoot(text: string): Partial<RootJson> | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
