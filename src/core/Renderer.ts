import { WidgetEntry } from "../iwf/types";
import { ProjectState, findLastWatchEntry, deviceProfileOf } from "./Scene";
import { renderCustomWidgetImage } from "./CustomWidgetRenderer";
import { buildHandSpecs, computeHandAngles, drawHand } from "./HandRenderer";

/**
 * Draws the full watch face preview into `ctx`, mirroring the composited
 * result of the original QGraphicsScene: background, then widgets in
 * list order (custom/generic placeholders), then the watch hands on top,
 * then the yellow selection highlight above everything.
 *
 * Canvas size is taken from the project's device profile (IDW13 240x284
 * or IDW20 320x385), not a fixed constant, so the same renderer serves
 * both devices.
 */
export function renderScene(
  ctx: CanvasRenderingContext2D,
  state: ProjectState,
  imageCache: Map<string, HTMLImageElement>,
  options: { showHighlight?: boolean } = {},
) {
  const profile = deviceProfileOf(state);
  const canvasW = profile.canvasW;
  const canvasH = profile.canvasH;

  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Background image.
  if (state.root.bkground) {
    const bg = imageCache.get(state.root.bkground);
    if (bg) ctx.drawImage(bg, 0, 0);
  }

  // Widgets (skip watch — hands are drawn separately, on top, like the
  // original which re-adds hand items to the scene after everything else).
  for (const entry of state.widgetList) {
    if (entry.widgetType === "watch") continue;
    drawWidgetEntry(ctx, entry, state);
  }

  // Watch hands (only the last watch widget, matching render_watch_hands).
  const watchEntry = findLastWatchEntry(state.widgetList);
  if (watchEntry) {
    const angles = computeHandAngles(state.previewTime);
    const wx = (watchEntry.json.x as number) ?? 0;
    const wy = (watchEntry.json.y as number) ?? 0;
    const hourImg = getHandImage(watchEntry.json.hour as string, imageCache);
    const minImg = getHandImage(watchEntry.json.minute as string, imageCache);
    const secImg = getHandImage(watchEntry.json.second as string, imageCache);
    const specs = buildHandSpecs(
      watchEntry.json,
      { hour: hourImg, minute: minImg, second: secImg },
      angles,
    );
    for (const spec of specs) {
      drawHand(
        ctx, spec.img, spec.centerX, spec.centerY,
        spec.anchorX, spec.anchorY, spec.angleDeg, wx, wy,
      );
    }
  }

  // Selection highlight.
  if (options.showHighlight !== false && state.currentWidgetIndex >= 0) {
    const entry = state.widgetList[state.currentWidgetIndex];
    if (entry) {
      const x = (entry.json.x as number) ?? 0;
      const y = (entry.json.y as number) ?? 0;
      const w = (entry.json.w as number) ?? canvasW;
      const h = (entry.json.h as number) ?? canvasH;
      ctx.save();
      ctx.strokeStyle = "rgb(255, 220, 0)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      ctx.restore();
    }
  }
}

function getHandImage(
  filename: string | undefined,
  imageCache: Map<string, HTMLImageElement>,
): HTMLImageElement | undefined {
  if (!filename) return undefined;
  return imageCache.get(filename);
}

function drawWidgetEntry(
  ctx: CanvasRenderingContext2D,
  entry: WidgetEntry,
  state: ProjectState,
) {
  const x = (entry.json.x as number) ?? 0;
  const y = (entry.json.y as number) ?? 0;

  if (entry.widgetType === "custom" && Object.keys(entry.imageStrip).length > 0) {
    const rendered = renderCustomWidgetImage(entry, state.previewValues);
    if (rendered) {
      ctx.drawImage(rendered.canvas, x, y);
      // Mirror the original: w/h get updated to the rendered size so the
      // properties panel and exported JSON reflect the real footprint.
      entry.json.w = rendered.width;
      entry.json.h = rendered.height;
      return;
    }
  }

  drawPlaceholder(ctx, entry, x, y);
}

/** Port of the dashed yellow placeholder box drawn for unresolved/generic widgets. */
function drawPlaceholder(ctx: CanvasRenderingContext2D, entry: WidgetEntry, x: number, y: number) {
  const w = Math.max((entry.json.w as number) ?? 50, 20);
  const h = Math.max((entry.json.h as number) ?? 20, 14);

  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(255, 255, 0, 0.7)";
  ctx.setLineDash([4, 3]);
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  ctx.setLineDash([]);
  ctx.fillStyle = "#ffff00";
  ctx.font = "10px sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`${entry.widgetType}/${entry.typeValue}`, 4, 13);
  ctx.restore();
}
