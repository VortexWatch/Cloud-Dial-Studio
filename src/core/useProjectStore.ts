import { useCallback, useRef, useState } from "react";
import { ProjectState, createEmptyProject } from "./Scene";

/**
 * The editor's widget list holds live HTMLImageElement/HTMLCanvasElement
 * references and gets mutated in place by render passes (matching the
 * original's mutable `self.widget_list` of dicts). Modeling that as
 * fully-immutable React state would mean deep-cloning image maps on
 * every keystroke, so instead we keep one mutable ProjectState in a ref
 * and use a "tick" counter to trigger re-renders after any change —
 * effectively the same imperative-update pattern PyQt's signal/slot
 * handlers used, adapted to React.
 */
export function useProjectStore() {
  const stateRef = useRef<ProjectState>(createEmptyProject());
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [tick, setTick] = useState(0);

  const notify = useCallback(() => setTick((t) => t + 1), []);

  return { state: stateRef.current, imageCache: imageCacheRef.current, notify, tick };
}
