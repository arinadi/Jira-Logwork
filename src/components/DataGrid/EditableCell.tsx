import React, { useState, useEffect, useRef } from 'react';
import { Pencil } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface EditableCellProps {
  value: string;
  onSave: (newValue: string) => void;
  /** Screen-reader name of the field, e.g. "Time spent for DESP-1 on 2026-10-06" */
  label: string;
  isInvalid?: boolean;
  errorMessage?: string;
  className?: string;
  type?: 'text' | 'date' | 'textarea';
  /** When set, the value is a link (e.g. to the Jira issue) and editing goes through a separate button. */
  href?: string;
  disabled?: boolean;
}

/**
 * Inline edit. The read view is a real button (or a link + edit button) so it can be reached and opened
 * by keyboard; a clickable div is invisible to Tab and screen readers.
 */
export const EditableCell: React.FC<EditableCellProps> = ({
  value,
  onSave,
  label,
  isInvalid,
  errorMessage,
  className,
  type = 'text',
  href,
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type !== 'textarea') (inputRef.current as HTMLInputElement).select();
    }
  }, [isEditing, type]);

  const startEditing = () => {
    if (disabled) return;
    setLocalValue(value);
    setIsEditing(true);
  };

  const commit = () => {
    setIsEditing(false);
    if (localValue !== value) onSave(localValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Escape') {
      // Stop here so Esc cancels the edit without also closing a surrounding dialog.
      e.stopPropagation();
      setIsEditing(false);
      setLocalValue(value);
    }
  };

  const invalidStyle = isInvalid ? 'text-[var(--danger)] font-semibold' : '';
  const empty = <span className="italic text-[var(--text-subtle)]">Empty</span>;

  if (isEditing) {
    return type === 'textarea' ? (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        aria-label={label}
        aria-invalid={isInvalid || undefined}
        className={twMerge('field h-auto min-h-16 py-1 resize-y', className)}
        value={localValue}
        // Worklog comments are sent as one ADF paragraph, so a pasted line break would be lost anyway.
        onChange={(e) => setLocalValue(e.target.value.replace(/[\r\n]+/g, ' '))}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
    ) : (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type}
        aria-label={label}
        aria-invalid={isInvalid || undefined}
        className={twMerge('field', className)}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
    );
  }

  const error = isInvalid && errorMessage ? <span className="block text-xs text-[var(--danger)]">{errorMessage}</span> : null;

  if (href) {
    return (
      <div className={twMerge('min-w-0', className)}>
        <div className="flex items-center gap-1 min-w-0">
          <a href={href} target="_blank" rel="noopener noreferrer" className={twMerge('truncate font-medium text-[var(--link)] hover:underline', invalidStyle)}>
            {value || empty}
          </a>
          {!disabled && (
            <button type="button" className="icon-btn w-6 h-6 shrink-0" onClick={startEditing} aria-label={`Edit ${label}`}>
              <Pencil className="w-3 h-3" aria-hidden="true" />
            </button>
          )}
        </div>
        {error}
      </div>
    );
  }

  return (
    <div className={twMerge('min-w-0', className)}>
      <button
        type="button"
        className={twMerge(
          'w-full text-left px-1 -mx-1 rounded-[3px] hover:bg-[var(--bg-hover)] disabled:hover:bg-transparent disabled:cursor-default',
          type === 'textarea' ? 'whitespace-normal break-words' : 'truncate',
          invalidStyle
        )}
        onClick={startEditing}
        disabled={disabled}
        aria-label={`${label}: ${value || 'empty'}${disabled ? '' : ', press Enter to edit'}`}
      >
        {value || empty}
      </button>
      {error}
    </div>
  );
};
