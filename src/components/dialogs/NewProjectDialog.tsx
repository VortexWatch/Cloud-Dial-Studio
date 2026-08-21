import { useState } from "react";
import Modal from "./Modal";
import { DeviceId, DEVICE_IDS, DEVICE_PROFILES, DEFAULT_DEVICE } from "../../iwf/types";

interface Props {
  onCreate: (name: string, deviceId: DeviceId) => void;
  onCancel: () => void;
}

export default function NewProjectDialog({ onCreate, onCancel }: Props) {
  const [name, setName] = useState("");
  const [deviceId, setDeviceId] = useState<DeviceId>(DEFAULT_DEVICE);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      alert("Project name cannot be empty.");
      return;
    }
    onCreate(trimmed, deviceId);
  };

  return (
    <Modal title="New Project" onClose={onCancel}>
      <div className="form-row">
        <label>Please enter a name:</label>
        <input
          type="text" autoFocus value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        />
      </div>
      <div className="form-row">
        <label>Device:</label>
        <select value={deviceId} onChange={(e) => setDeviceId(e.target.value as DeviceId)}>
          {DEVICE_IDS.map((id) => (
            <option key={id} value={id}>{DEVICE_PROFILES[id].label}</option>
          ))}
        </select>
      </div>
      <div className="actions">
        <button className="primary" onClick={submit}>Create</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </Modal>
  );
}
