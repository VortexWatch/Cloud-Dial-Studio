import { PropsWithChildren } from "react";

interface Props {
  title: string;
  onClose: () => void;
}

export default function Modal({ title, onClose, children }: PropsWithChildren<Props>) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}
