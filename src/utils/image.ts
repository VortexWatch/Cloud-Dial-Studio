/** Loads a Blob into a decoded HTMLImageElement, ready for canvas drawing. */
export function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve(img);
      // Keep the URL alive; caller owns lifecycle via ProjectFiles.objectUrl
      // if it also registered this blob there. Otherwise revoke shortly
      // after decode to avoid leaking blob URLs for one-off loads.
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

export function fileExt(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx + 1).toLowerCase();
}

export function baseName(name: string): string {
  const slash = Math.max(name.lastIndexOf("/"), name.lastIndexOf("\\"));
  const withoutDir = slash === -1 ? name : name.slice(slash + 1);
  const dot = withoutDir.lastIndexOf(".");
  return dot === -1 ? withoutDir : withoutDir.slice(0, dot);
}

export const IMAGE_EXTS = new Set(["png", "bmp"]);

export function isImageFile(name: string): boolean {
  return IMAGE_EXTS.has(fileExt(name));
}

/**
 * Draws `img` into an offscreen canvas scaled to targetW x targetH,
 * mirroring QImage.scaled(..., KeepAspectRatio | IgnoreAspectRatio, Smooth).
 */
export function scaleImage(
  img: HTMLImageElement,
  targetW: number,
  targetH: number,
  keepAspect: boolean,
): HTMLCanvasElement {
  let dw = targetW;
  let dh = targetH;
  if (keepAspect) {
    const scale = Math.min(targetW / img.width, targetH / img.height);
    dw = Math.round(img.width * scale);
    dh = Math.round(img.height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, dw, dh);
  return canvas;
}
