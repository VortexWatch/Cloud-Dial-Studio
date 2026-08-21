import { useEffect, useState } from "react";
import { WidgetEntry, SCROLL_FIELDS } from "../iwf/types";

interface ScrollValue { checked: boolean; value: string }

interface Props {
  entry: WidgetEntry | null;
  currentIndex: number;
  canvasW: number;
  canvasH: number;
  onLivePosition: (x: number, y: number) => void;
  onApply: (xywh: { x: number; y: number; w: number; h: number }, scrollValues: Record<string, ScrollValue>) => void;
  jsonText: string;
  fontJsonText: string;
}

function emptyScrollValues(): Record<string, ScrollValue> {
  const out: Record<string, ScrollValue> = {};
  for (const key of SCROLL_FIELDS) out[key] = { checked: false, value: "" };
  return out;
}

export default function PropertiesPanel({
  entry, currentIndex, canvasW, canvasH, onLivePosition, onApply, jsonText, fontJsonText,
}: Props) {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [w, setW] = useState(canvasW);
  const [h, setH] = useState(canvasH);
  const [scrollValues, setScrollValues] = useState<Record<string, ScrollValue>>(emptyScrollValues());

  // Reload the form whenever the selected widget changes.
  useEffect(() => {
    if (!entry) {
      setX(0); setY(0); setW(canvasW); setH(canvasH);
      setScrollValues(emptyScrollValues());
      return;
    }
    setX((entry.json.x as number) ?? 0);
    setY((entry.json.y as number) ?? 0);
    setW((entry.json.w as number) ?? canvasW);
    setH((entry.json.h as number) ?? canvasH);

    const sv = emptyScrollValues();
    for (const key of SCROLL_FIELDS) {
      if (key in entry.json && entry.json[key] !== undefined) {
        const v = entry.json[key];
        sv[key] = { checked: true, value: typeof v === "boolean" ? (v ? "true" : "false") : String(v) };
      }
    }
    setScrollValues(sv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const disabled = !entry;

  const updateX = (v: number) => { setX(v); if (entry) onLivePosition(v, y); };
  const updateY = (v: number) => { setY(v); if (entry) onLivePosition(x, v); };

  return (
    <div className="panel">
      <div className="section">
        <h3>Geometry</h3>
        <div className="xywh-grid">
          <div>
            <label>X</label>
            <input type="number" disabled={disabled} value={x} onChange={(e) => updateX(+e.target.value)} />
          </div>
          <div>
            <label>Y</label>
            <input type="number" disabled={disabled} value={y} onChange={(e) => updateY(+e.target.value)} />
          </div>
          <div>
            <label>W</label>
            <input type="number" disabled={disabled} value={w} onChange={(e) => setW(+e.target.value)} />
          </div>
          <div>
            <label>H</label>
            <input type="number" disabled={disabled} value={h} onChange={(e) => setH(+e.target.value)} />
          </div>
        </div>

        <h3>Fields</h3>
        <div style={{ maxHeight: 260, overflowY: "auto", marginBottom: 10 }}>
          {SCROLL_FIELDS.map((key) => (
            <div key={key} className="field-input-row" style={{ marginBottom: 4 }}>
              <input
                type="checkbox"
                disabled={disabled}
                checked={scrollValues[key].checked}
                onChange={(e) => setScrollValues((s) => ({ ...s, [key]: { ...s[key], checked: e.target.checked } }))}
              />
              <input
                type="text"
                placeholder={key}
                disabled={disabled || !scrollValues[key].checked}
                value={scrollValues[key].value}
                onChange={(e) => setScrollValues((s) => ({ ...s, [key]: { ...s[key], value: e.target.value } }))}
              />
            </div>
          ))}
        </div>

        <button
          className="primary"
          style={{ width: "100%" }}
          disabled={disabled}
          onClick={() => onApply({ x, y, w, h }, scrollValues)}
        >
          Apply Changes
        </button>
      </div>

      <div className="section">
        <h3>iwf.json (live)</h3>
        <textarea className="json-preview mono" readOnly value={jsonText} />
      </div>

      <div className="section">
        <h3>font.json (live)</h3>
        <textarea className="json-preview mono" readOnly style={{ minHeight: 70 }} value={fontJsonText} />
      </div>
    </div>
  );
}
