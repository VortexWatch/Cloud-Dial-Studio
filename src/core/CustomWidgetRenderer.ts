import { WidgetEntry } from "../iwf/types";

const SPECIAL_MAP: Record<string, string> = {
  ":": "10",
  "/": "10",
  "%": "10",
  ".": "10",
  "-": "10",
  "\u00B0": "10",
};

const WEATHER_MAP: Record<string, string> = {
  "\uE001": "11",
  "\uE002": "12",
};

const LETTER_PREVIEW_MAP: Record<string, string> = {
  week: "en_wed",
  month: "en_sept",
  apm: "en_am",
};

export interface RenderedGlyphImage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

/**
 * Port of MainWindow.render_custom_widget_image().
 *
 * Renders one custom widget (image-based font digits, a static icon, or
 * a single "letter" glyph such as a weekday) to an offscreen canvas.
 * `previewValues` mirrors self.PREVIEW_VALUES, already updated for the
 * current preview clock time.
 */
export function renderCustomWidgetImage(
  entry: WidgetEntry,
  previewValues: Record<string, string>,
): RenderedGlyphImage | null {
  const { typeValue: type, imageStrip: strip, json } = entry;

  // ICON: display the first strip image directly, optionally scaled.
  if (type === "icon") {
    const firstKey = Object.keys(strip)[0];
    if (firstKey) {
      const img = strip[firstKey];
      const targetW = (json.w as number) ?? img.width;
      const targetH = (json.h as number) ?? img.height;
      const canvas = document.createElement("canvas");
      if (targetW !== img.width || targetH !== img.height) {
        const scale = Math.min(targetW / img.width, targetH / img.height);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return { canvas, width: canvas.width, height: canvas.height };
    }
    return null;
  }

  // Letter widgets: week / month / apm show a single fixed preview glyph.
  if (type === "week" || type === "month" || type === "apm") {
    const key = LETTER_PREVIEW_MAP[type];
    const img = strip[key] ?? strip[Object.keys(strip)[0]];
    if (!img) return null;
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    return { canvas, width: img.width, height: img.height };
  }

  // Digit-strip widgets.
  const value = previewValues[type] ?? "0";
  let renderValue = value;
  if (type === "weather") {
    const style = (json.style as number) ?? 2;
    renderValue += style === 2 ? "\uE001" : "\uE002";
  }

  const glyphs: { img: HTMLImageElement; w: number; h: number }[] = [];
  let totalW = 0;
  let maxH = 0;

  for (const ch of renderValue) {
    let key: string | null = null;
    if (/[0-9]/.test(ch)) key = ch;
    else if (ch in WEATHER_MAP) key = WEATHER_MAP[ch];
    else if (ch in SPECIAL_MAP) key = SPECIAL_MAP[ch];

    if (key && strip[key]) {
      const img = strip[key];
      glyphs.push({ img, w: img.width, h: img.height });
      totalW += img.width;
      maxH = Math.max(maxH, img.height);
    }
  }

  if (glyphs.length === 0) return null;

  const align = (json.align as string) ?? "left";
  let canvasW = Math.max(totalW, (json.w as number) ?? 0);
  if (canvasW <= 0) canvasW = totalW;

  let xpos: number;
  if (align === "center") xpos = Math.floor((canvasW - totalW) / 2);
  else if (align === "right") xpos = canvasW - totalW;
  else xpos = 0;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = maxH;
  const ctx = canvas.getContext("2d")!;
  let x = xpos;
  for (const g of glyphs) {
    ctx.drawImage(g.img, x, 0);
    x += g.w;
  }

  return { canvas, width: canvasW, height: maxH };
}
