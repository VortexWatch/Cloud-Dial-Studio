import { useRef, useState } from "react";
import Modal from "./Modal";

interface Props {
  typeVal: string;
  onConfirm: (folderName: string, files: File[]) => void;
  onCancel: () => void;
}

export default function AddCustomWidgetDialog({ typeVal, onConfirm, onCancel }: Props) {
  const [folderName, setFolderName] = useState(typeVal);
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const name = folderName.trim();
    if (!name) {
      alert("Enter a folder name for the widget images.");
      return;
    }
    if (files.length === 0) {
      alert("Select at least one image for this widget.");
      return;
    }
    onConfirm(name, files);
  };

  return (
    <Modal title={`Add custom / ${typeVal}`} onClose={onCancel}>
      <div className="form-row">
        <label>Folder name for the widget images (inside the project):</label>
        <input type="text" value={folderName} onChange={(e) => setFolderName(e.target.value)} autoFocus />
      </div>
      <div className="form-row">
        <label>Images (PNG/BMP glyph strip — filenames become the lookup keys, e.g. 0.png, 1.png, 10.png for ":")</label>
        <button type="button" onClick={() => inputRef.current?.click()}>Select images…</button>
        <input
          ref={inputRef} type="file" accept=".png,.bmp" multiple style={{ display: "none" }}
          onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
        />
        {files.length > 0 && (
          <div style={{ fontSize: 11, color: "var(--text-1)" }}>{files.length} file(s) selected</div>
        )}
      </div>
      <div className="actions">
        <button className="primary" onClick={submit}>Add</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </Modal>
  );
}
