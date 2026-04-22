import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface EditableCellProps {
  value: string;
  onSave: (newValue: string) => void;
  isInvalid?: boolean;
  errorMessage?: string;
  className?: string;
  type?: 'text' | 'date' | 'textarea';
  href?: string;
}

export const EditableCell: React.FC<EditableCellProps> = ({ 
  value, 
  onSave, 
  isInvalid, 
  errorMessage, 
  className,
  type = 'text',
  href
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type !== 'textarea') {
        (inputRef.current as HTMLInputElement).select();
      }
    }
  }, [isEditing, type]);

  const handleBlur = () => {
    setIsEditing(false);
    if (localValue !== value) {
      onSave(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setLocalValue(value);
    }
  };

  return (
    <div 
      className={twMerge(
        "relative w-full h-full min-h-[40px] flex items-center px-4 transition-all duration-200 cursor-text", 
        isEditing ? "z-10" : "",
        className
      )}
      style={{
        backgroundColor: isEditing 
          ? 'var(--bg-surface)' 
          : isInvalid && !isEditing 
            ? 'rgba(239, 68, 68, 0.05)' 
            : 'transparent',
        boxShadow: isEditing 
          ? 'inset 0 1px 2px rgba(0,0,0,0.06), 0 0 0 1px #0052cc' 
          : isInvalid && !isEditing 
            ? '0 0 0 1px rgba(239, 68, 68, 0.2)' 
            : 'none',
      }}
      onClick={() => setIsEditing(true)}
      title={isInvalid ? errorMessage : undefined}
    >
      {isEditing ? (
        type === 'textarea' ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            className="w-full bg-transparent outline-none font-medium resize-none min-h-[40px] py-2"
            style={{ color: 'var(--text-main)', wordWrap: 'break-word', overflow: 'hidden' }}
            value={localValue}
            onChange={(e) => {
              const val = e.target.value.replace(/[\r\n]+/g, ' ');
              setLocalValue(val);
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={type}
            className="w-full bg-transparent outline-none font-medium"
            style={{ color: 'var(--text-main)' }}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        )
      ) : href ? (
        <a 
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={clsx("w-full truncate hover:underline")}
          style={{ color: isInvalid ? '#dc2626' : 'var(--text-main)', fontWeight: isInvalid ? 600 : undefined }}
          onClick={(e) => e.stopPropagation()}
        >
          {value || <span style={{ color: 'var(--text-subtle)', opacity: 0.4, fontStyle: 'italic' }}>Empty</span>}
        </a>
      ) : (
        <span 
          className={clsx("w-full truncate", type === 'textarea' && "break-words whitespace-normal")}
          style={{ color: isInvalid ? '#dc2626' : 'var(--text-main)', fontWeight: isInvalid ? 600 : undefined }}
        >
          {value || <span style={{ color: 'var(--text-subtle)', opacity: 0.4, fontStyle: 'italic' }}>Empty</span>}
        </span>
      )}
      
      {isInvalid && !isEditing && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#dc2626', boxShadow: '0 0 8px rgba(239,68,68,0.5)' }}></div>
      )}
    </div>
  );
};
