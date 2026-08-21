import { useEffect, useRef } from "react";
import { ProjectState, deviceProfileOf } from "../core/Scene";
import { renderScene } from "../core/Renderer";

interface Props {
  state: ProjectState;
  imageCache: Map<string, HTMLImageElement>;
  tick: number;
}

export default function WatchCanvas({ state, imageCache, tick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const profile = deviceProfileOf(state);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, profile.canvasW, profile.canvasH);

    // Create a clipping path with rounded corners
    ctx.save();
    const radius = profile.displayCornerRadius || 0;
    
    if (radius > 0) {
      // Create rounded rect path
      ctx.beginPath();
      const w = profile.canvasW;
      const h = profile.canvasH;
      const r = Math.min(radius, w / 2, h / 2); // Prevent overflow
      
      ctx.moveTo(r, 0);
      ctx.arcTo(w, 0, w, h, r);
      ctx.arcTo(w, h, 0, h, r);
      ctx.arcTo(0, h, 0, 0, r);
      ctx.arcTo(0, 0, w, 0, r);
      ctx.closePath();
      ctx.clip();
    }

    // Render the scene
    renderScene(ctx, state, imageCache);

    ctx.restore();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, profile.displayCornerRadius]);

  return (
    <canvas
      ref={canvasRef}
      width={profile.canvasW}
      height={profile.canvasH}
      className="watch-canvas-frame"
      style={{
        borderRadius: profile.displayCornerRadius || 0,
        overflow: 'hidden',
      }}
    />
  );
}
