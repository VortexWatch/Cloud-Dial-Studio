import { WidgetJson, PreviewTime } from "../iwf/types";

export interface HandAngles {
  hourDeg: number;
  minDeg: number;
  secDeg: number;
}

/** Port of the angle math in MainWindow.render_watch_hands(). */
export function computeHandAngles(time: PreviewTime): HandAngles {
  const hourDeg = ((time.hour % 12) + time.minute / 60.0) * 30.0;
  const minDeg = (time.minute + time.second / 60.0) * 6.0;
  const secDeg = time.second * 6.0;
  return { hourDeg, minDeg, secDeg };
}

/**
 * Draws one hand image onto `ctx`, rotated by `angleDeg` around its pivot
 * point (centerX, centerY within the source image) so that the pivot
 * lands at (anchorX, anchorY) in canvas space, offset by the watch
 * widget's own (x, y).
 *
 * This is functionally equivalent to the original's "pad a symmetric
 * canvas, rotate, then re-center on the bounding box" trick — that
 * workaround exists only because QImage.transformed() needs an explicit
 * bounding canvas. HTML canvas's translate/rotate/drawImage achieves the
 * identical rotation-about-a-pivot directly.
 */
export function drawHand(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  centerX: number,
  centerY: number,
  anchorX: number,
  anchorY: number,
  angleDeg: number,
  widgetX: number,
  widgetY: number,
) {
  ctx.save();
  ctx.translate(anchorX + widgetX, anchorY + widgetY);
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.drawImage(img, -centerX, -centerY);
  ctx.restore();
}

export interface HandDrawSpec {
  img: HTMLImageElement;
  centerX: number;
  centerY: number;
  anchorX: number;
  anchorY: number;
  angleDeg: number;
}

/** Builds the three hand draw specs for a watch widget's JSON + images. */
export function buildHandSpecs(
  watchJson: WidgetJson,
  images: { hour?: HTMLImageElement; minute?: HTMLImageElement; second?: HTMLImageElement },
  angles: HandAngles,
): HandDrawSpec[] {
  const specs: HandDrawSpec[] = [];
  const push = (
    img: HTMLImageElement | undefined,
    cxKey: string,
    cyKey: string,
    axKey: string,
    ayKey: string,
    angleDeg: number,
  ) => {
    if (!img) return;
    specs.push({
      img,
      centerX: (watchJson[cxKey] as number) ?? 0,
      centerY: (watchJson[cyKey] as number) ?? 0,
      anchorX: (watchJson[axKey] as number) ?? 0,
      anchorY: (watchJson[ayKey] as number) ?? 0,
      angleDeg,
    });
  };

  push(images.hour, "hourcenterx", "hourcentery", "houranchorx", "houranchory", angles.hourDeg);
  push(images.minute, "mincenterx", "mincentery", "minanchorx", "minanchory", angles.minDeg);
  push(images.second, "seccenterx", "seccentery", "secanchorx", "secanchory", angles.secDeg);

  return specs;
}
