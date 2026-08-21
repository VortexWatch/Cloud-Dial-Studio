import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";

interface Props {
  maxW: number;
  maxH: number;
  onClose: () => void;
}

const MARGIN = 20;

/**
 * Port of BkgroundHelper (bkground_helper.py): a scratch canvas with a
 * rounded green guide border, used to visually check that a background
 * image's corners match the watch face's rounded-corner cutout before
 * committing it as the real background. This tool never writes to the
 * project — it's purely a visual aid, matching the original. Sized to
 * the current project's device (IDW13 240x284 or IDW20 320x385) rather
 * than a fixed size, since the two devices have different max
 * background dimensions.
 */
export default function BackgroundHelperDialog({ maxW, maxH, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const viewW = maxW + MARGIN;
  const viewH = maxH + MARGIN;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, viewW, viewH);

    if (image) {
      const x = Math.floor((viewW - maxW) / 2);
      const y = Math.floor((viewH - maxH) / 2);
      ctx.save();
      ctx.globalCompositeOperation = "destination-over";
      ctx.drawImage(image, x, y, maxW, maxH);
      ctx.restore();
    }

    const penWidth = 4;
    const smallerDim = Math.min(viewW, viewH);
    const radius = Math.floor((smallerDim * 0.5) / 2);
    const offset = penWidth / 2;

    ctx.strokeStyle = "rgb(0, 255, 0)";
    ctx.lineWidth = penWidth;
    ctx.lineJoin = "miter";
    ctx.lineCap = "square";
    roundedRectPath(ctx, offset, offset, viewW - 2 * offset, viewH - 2 * offset, radius);
    ctx.stroke();
  }, [image, viewW, viewH, maxW, maxH]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.(png|bmp)$/i.test(file.name)) {
      alert("Select a valid image that's at least PNG or BMP");
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("load failed"));
      img.src = url;
    }).catch(() => alert("Failed to load the image file."));

    if (img.width > maxW || img.height > maxH) {
      alert("Image Too Large: Bad File");
      URL.revokeObjectURL(url);
      return;
    }
    setImage(img);
  };

  return (
    <Modal title="Bkground Corner Matcher" onClose={onClose}>
      <canvas
        ref={canvasRef}
        width={viewW}
        height={viewH}
        style={{ background: "#000", boxShadow: "0 0 0 1px var(--border)" }}
      />
      <div className="actions" style={{ justifyContent: "space-between" }}>
        <div>
          <button onClick={() => inputRef.current?.click()}>Upload Image</button>
          <input ref={inputRef} type="file" accept=".png,.bmp" style={{ display: "none" }}
                 onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
        <button onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
