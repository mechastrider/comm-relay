import { useEffect, useRef, type ReactNode } from "react";

export function Modal({
  open,
  onClose,
  children,
  id,
  className,
  labelledBy,
  describedBy,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  id: string;
  className: string;
  labelledBy: string;
  describedBy?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const previous = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      id={id}
      className={className}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onCancel={(event) => {
        event.preventDefault();
        close.current();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            close.current();
        }
      }}
    >
      {children}
    </dialog>
  );
}
export function Dialog({
  open,
  onClose,
  title,
  children,
  actions,
  id,
  className = "settings-dialog",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  id: string;
  className?: string;
}) {
  const prompt = className.includes("prompt-dialog");
  return (
    <Modal
      open={open}
      onClose={onClose}
      id={id}
      className={className}
      labelledBy={`${id}-title`}
    >
      <div className={prompt ? "prompt-dialog__frame" : "dialog-frame"}>
        {prompt ? (
          <h3 id={`${id}-title`}>{title}</h3>
        ) : (
          <header className="dialog-header">
            <h2 id={`${id}-title`}>{title}</h2>
          </header>
        )}
        <div className={prompt ? "prompt-dialog__message" : "dialog-body"}>
          {children}
        </div>
        {actions && (
          <footer
            className={prompt ? "prompt-dialog__actions" : "dialog-footer"}
          >
            {actions}
          </footer>
        )}
      </div>
    </Modal>
  );
}
