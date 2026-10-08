import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface DialogProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Tailwind max-width class */
  width?: string;
  /** While true, Esc and the backdrop do not close (e.g. a scan is running and must be stopped first). */
  busy?: boolean;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog: labelled for screen readers, Esc closes, focus moves into it and back to the opener on close,
 * and Tab stays inside so keyboard users do not land on the page behind it.
 */
export const Dialog: React.FC<DialogProps> = ({ title, description, onClose, children, footer, width = 'max-w-lg', busy = false }) => {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);

  useEffect(() => {
    onCloseRef.current = onClose;
    busyRef.current = busy;
  });

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    // Focus the first field rather than the close button: that is where the user starts typing.
    const focusables = panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
    const first = focusables.find(el => !el.dataset.dialogClose) || focusables[0];
    first?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busyRef.current) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus();
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[10vh] bg-[#091e4240] dark:bg-[#0308107a]"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`card w-full ${width} shadow-[0_8px_12px_#091e4226,0_0_1px_#091e424f]`}
      >
        <div className="flex items-start justify-between gap-4 px-4 pt-4 pb-2">
          <div>
            <h2 id={titleId} className="text-base font-semibold">{title}</h2>
            {description && <p id={descriptionId} className="mt-0.5 text-sm text-[var(--text-subtle)]">{description}</p>}
          </div>
          <button type="button" className="icon-btn shrink-0" onClick={onClose} disabled={busy} aria-label="Close dialog" data-dialog-close="true">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div className="px-4 pb-4">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 border-t">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};
