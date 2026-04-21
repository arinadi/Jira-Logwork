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
        "relative w-full h-full min-h-[40px] flex items-center px-4 transition-all duration-200", 
        isEditing ? "bg-white shadow-inner ring-1 ring-atlassian-blue z-10" : "hover:bg-slate-50/80 cursor-text",
        isInvalid && !isEditing ? "bg-red-50 ring-1 ring-red-200" : "",
        className
      )}
      onClick={() => setIsEditing(true)}
      title={isInvalid ? errorMessage : undefined}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type={type}
          className="w-full bg-transparent outline-none text-atlassian-text font-medium"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <span className={clsx(
          "w-full truncate",
          isInvalid ? "text-red-600 font-semibold" : "text-atlassian-text"
        )}>
          {value || <span className="text-gray-300 italic opacity-50">Empty</span>}
        </span>
      )}
      
      {isInvalid && !isEditing && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
      )}
    </div>
  );
};
