import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}

export default function Modal({ open, title, children, onClose, footer }: ModalProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h4>{title}</h4>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          {footer || (
            <button className="btn btn-primary" onClick={onClose}>
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
