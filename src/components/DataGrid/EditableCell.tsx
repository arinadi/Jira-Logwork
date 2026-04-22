import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface EditableCellProps {
  value: string;
  onSave: (newValue: string) => void;
  isInvalid?: boolean;
  errorMessage?: string;
  className?: string;
  type?: 'text' | 'date';
}

export const EditableCell: React.FC<EditableCellProps> = ({ 
  value, 
  onSave, 
  isInvalid, 
  errorMessage, 
  className,
  type = 'text'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (localValue !== value) {
      onSave(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
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
        <input
          ref={inputRef}
          type={type}
          className="w-full bg-transparent outline-none font-medium"
          style={{ color: 'var(--text-main)' }}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <span 
          className={clsx("w-full truncate")}
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
