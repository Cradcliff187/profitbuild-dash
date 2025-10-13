import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";

interface TimesheetGridCellProps {
  value: number | null;
  onChange: (value: number | null) => void;
  workerId: string;
  date: Date;
  hourlyRate: number;
  disabled?: boolean;
}

export function TimesheetGridCell({
  value,
  onChange,
  hourlyRate,
  disabled = false
}: TimesheetGridCellProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState(value?.toString() || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value?.toString() || "");
  }, [value]);

  const handleFocus = () => {
    setIsFocused(true);
    inputRef.current?.select();
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed) && parsed > 0) {
      onChange(parsed);
    } else if (inputValue === "") {
      onChange(null);
      setInputValue("");
    } else {
      setInputValue(value?.toString() || "");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const calculatedCost = (value || 0) * hourlyRate;
  const hasValue = value !== null && value > 0;

  return (
    <div className="relative group">
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={inputValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          w-full h-7 px-1.5 text-center text-xs font-mono
          border rounded transition-colors
          focus:outline-none focus:ring-2 focus:ring-primary/20
          disabled:opacity-50 disabled:cursor-not-allowed
          ${hasValue 
            ? 'border-primary/30 bg-primary/5' 
            : 'border-border bg-background'
          }
          ${isFocused ? 'ring-2 ring-primary/20' : ''}
          hover:border-primary/50
        `}
        placeholder={isFocused ? "0" : ""}
      />
      {hasValue && !isFocused && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border">
          {value}hrs × ${hourlyRate}/hr = ${calculatedCost.toFixed(2)}
        </div>
      )}
    </div>
  );
}
