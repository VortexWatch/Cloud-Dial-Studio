import { useRef, useState } from "react";
import Modal from "./Modal";
import { HandConfigInput } from "../../core/actions";

interface Props {
  defaultAnchorX: number;
  defaultAnchorY: number;
  onConfirm: (hands: { hour: HandConfigInput; minute: HandConfigInput; second: HandConfigInput }) => void;
  onCancel: () => void;
}

function defaultHand(anchorX: number, anchorY: number): HandConfigInput {
  return { file: null, fileName: "", centerX: 0, centerY: 0, anchorX, anchorY };
}

function HandFields({
  label, hand, onChange,
}: {
  label: string;
  hand: HandConfigInput;
  onChange: (h: HandConfigInput) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const next = { ...hand, file, fileName: file.name };
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      onChange({ ...next, centerX: Math.floor(img.width / 2), centerY: Math.floor(img.height / 2) });
      URL.revokeObjectURL(url);
    };
    img.src = url;
    onChange(next);
  };

  return (
    <div className="hand-config">
      <h4>{label} hand</h4>
      <div className="grid">
        <label>Image file</label>
        <div style={{ display: "flex", gap: 6 }}>
          <input type="text" readOnly value={hand.fileName} style={{ flex: 1 }} />
          <button type="button" onClick={() => inputRef.current?.click()}>Browse…</button>
          <input ref={inputRef} type="file" accept=".png,.bmp" style={{ display: "none" }}
                 onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
        <label>centerX</label>
        <input type="number" value={hand.centerX} onChange={(e) => onChange({ ...hand, centerX: +e.target.value })} />
        <label>centerY</label>
        <input type="number" value={hand.centerY} onChange={(e) => onChange({ ...hand, centerY: +e.target.value })} />
        <label>anchorX</label>
        <input type="number" value={hand.anchorX} onChange={(e) => onChange({ ...hand, anchorX: +e.target.value })} />
        <label>anchorY</label>
        <input type="number" value={hand.anchorY} onChange={(e) => onChange({ ...hand, anchorY: +e.target.value })} />
      </div>
    </div>
  );
}

export default function ClockHandsDialog({ defaultAnchorX, defaultAnchorY, onConfirm, onCancel }: Props) {
  const [hour, setHour] = useState(defaultHand(defaultAnchorX, defaultAnchorY));
  const [minute, setMinute] = useState(defaultHand(defaultAnchorX, defaultAnchorY));
  const [second, setSecond] = useState(defaultHand(defaultAnchorX, defaultAnchorY));

  return (
    <Modal title="Configure watch hands" onClose={onCancel}>
      <HandFields label="Hour" hand={hour} onChange={setHour} />
      <HandFields label="Minute" hand={minute} onChange={setMinute} />
      <HandFields label="Second" hand={second} onChange={setSecond} />
      <div className="actions">
        <button className="primary" onClick={() => onConfirm({ hour, minute, second })}>OK</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </Modal>
  );
}
