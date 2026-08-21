import { ProjectState, deviceProfileOf } from "./Scene";
import { renderScene } from "./Renderer";

function strokeRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.stroke();
}

/**
 * Port of MainWindow.on_save_preview(), generalized to work for any
 * device profile: renders the full-size scene (without the yellow
 * selection box), scales it down to fit within the device's preview
 * output box with a small margin, and draws a rounded border on top
 * using that device's own corner radius, stroke color, and stroke
 * width (see DEVICE_PROFILES — IDW13 and IDW20 do not share the same
 * border weight/opacity).
 *
 *   IDW20: 320x385 canvas -> 272x324 preview, corner radius 67, solid
 *          rgb(128,128,128) stroke, width 3 (as already defined by
 *          the original app).
 *   IDW13: 240x284 canvas -> 174x196 preview, corner radius ~31,
 *          rgb(128,128,128) at ~40% opacity, width 2 (fitted from the
 *          supplied reference border image).
 */
export async function renderPreviewPng(
  state: ProjectState,
  imageCache: Map<string, HTMLImageElement>,
): Promise<Blob> {
  const profile = deviceProfileOf(state);
  const {
    canvasW, canvasH, previewW: outW, previewH: outH,
    previewCornerRadius: cornerRadius, previewBorderColor, previewBorderWidth,
    previewScale,
  } = profile;

  // Get custom border dimensions or use defaults
  const borderRectW = profile.previewBorderRectWidth ?? (outW - 4);
  const borderRectH = profile.previewBorderRectHeight ?? (outH - 4);
  
  // Calculate centering offsets
  const offsetX = (outW - borderRectW) / 2;
  const offsetY = (outH - borderRectH) / 2;

  const sceneCanvas = document.createElement("canvas");
  sceneCanvas.width = canvasW;
  sceneCanvas.height = canvasH;
  const sceneCtx = sceneCanvas.getContext("2d")!;
  renderScene(sceneCtx, state, imageCache, { showHighlight: false });

  const fitScale = Math.min(outW / canvasW, outH / canvasH) * previewScale;
  const scaledW = Math.round(canvasW * fitScale);
  const scaledH = Math.round(canvasH * fitScale);

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, outW, outH);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const offX = Math.floor((outW - scaledW) / 2);
  const offY = Math.floor((outH - scaledH) / 2);
  ctx.drawImage(sceneCanvas, 0, 0, canvasW, canvasH, offX, offY, scaledW, scaledH);

  // Draw border with custom width and height
  ctx.strokeStyle = previewBorderColor;
  ctx.lineWidth = previewBorderWidth;
  strokeRoundedRect(ctx, offsetX, offsetY, borderRectW, borderRectH, cornerRadius);

  return new Promise((resolve, reject) => {
    out.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to encode preview.png"));
    }, "image/png");
  });
}