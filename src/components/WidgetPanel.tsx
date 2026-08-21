import { useMemo, useState } from "react";
import { WidgetEntry, CUSTOM_TYPES, RING_PROGRESS_TYPES, COMING_SOON } from "../iwf/types";

interface Props {
  projectOpen: boolean;
  widgetList: WidgetEntry[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onDelete: (index: number) => void;
  onRequestAdd: (widgetKind: string, typeVal: string) => void;
}

const WIDGET_KINDS = ["custom", "watch", "ring", "progressbar"];

function typesFor(kind: string): string[] {
  if (kind === "custom") return CUSTOM_TYPES;
  if (kind === "watch") return ["time"];
  if (kind === "ring" || kind === "progressbar") return RING_PROGRESS_TYPES;
  return [];
}

export default function WidgetPanel({
  projectOpen, widgetList, currentIndex, onSelect, onDelete, onRequestAdd,
}: Props) {
  const [widgetKind, setWidgetKind] = useState("custom");
  const [typeVal, setTypeVal] = useState(typesFor("custom")[0]);

  const types = useMemo(() => typesFor(widgetKind), [widgetKind]);

  const handleKindChange = (kind: string) => {
    setWidgetKind(kind);
    const t = typesFor(kind);
    setTypeVal(t[0] ?? "");
  };

  const handleAdd = () => {
    if (widgetKind === "custom" && COMING_SOON.has(typeVal)) {
      alert(`This "${typeVal}" type is coming soon.`);
      return;
    }
    onRequestAdd(widgetKind, typeVal);
  };

  return (
    <div className="panel">
      <div className="section">
        <h3>Add Widget</h3>
        <div className="form-row">
          <label>Widget</label>
          <select disabled={!projectOpen} value={widgetKind} onChange={(e) => handleKindChange(e.target.value)}>
            {WIDGET_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Type</label>
          <select disabled={!projectOpen} value={typeVal} onChange={(e) => setTypeVal(e.target.value)}>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button className="primary" disabled={!projectOpen} onClick={handleAdd} style={{ width: "100%" }}>
          Add Widget
        </button>
      </div>

      <div className="section">
        <h3>Widgets ({widgetList.length})</h3>
        <ul className="widget-list">
          {widgetList.map((entry, i) => (
            <li
              key={i}
              className={i === currentIndex ? "selected" : ""}
              onClick={() => onSelect(i)}
            >
              <span>{entry.widgetType} / {entry.typeValue}</span>
              <button
                style={{ float: "right", padding: "1px 6px" }}
                title="Delete widget"
                onClick={(e) => { e.stopPropagation(); onDelete(i); }}
              >
                ✕
              </button>
            </li>
          ))}
          {widgetList.length === 0 && (
            <li style={{ color: "var(--text-1)", cursor: "default" }}>No widgets yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
