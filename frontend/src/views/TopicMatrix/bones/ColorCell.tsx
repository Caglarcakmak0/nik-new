import React, { useRef, useState } from 'react';
import { Popover } from 'antd';

interface ColorCellProps {
  color?: string;
  onChange: (hex: string) => void;
  rowIndex: number;
  day: number;
  isSelected?: boolean;
  onSelect: (rowIndex: number, day: number, isShiftClick: boolean) => void;
  isReadOnly?: boolean;
  presetColors: string[];
}

export const ColorCell: React.FC<ColorCellProps> = ({
  color,
  onChange,
  rowIndex,
  day,
  isSelected,
  onSelect,
  isReadOnly,
  presetColors
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const suppressNextOpenRef = useRef(false);

  const content = (
    <div className="tmx-color-grid">
      {presetColors.map((c) => (
        <button
          key={c}
          className="tmx-color-swatch"
          style={{ backgroundColor: c }}
          onClick={() => {
            onChange(c);
            setIsPopoverOpen(false);
          }}
          aria-label={c}
        />
      ))}
    </div>
  );

  const handleClick = (e: React.MouseEvent) => {
    if (isReadOnly) return;
    if (e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      onSelect(rowIndex, day, true);
      setIsPopoverOpen(false);
    } else {
      onSelect(rowIndex, day, false);
    }
  };

  if (isReadOnly) {
    return (
      <div
        className={`tmx-cell ${isSelected ? 'tmx-cell-selected' : ''}`}
        style={{ backgroundColor: color, cursor: 'default' }}
      />
    );
  }

  return (
    <Popover
      trigger="click"
      content={content}
      overlayStyle={{ width: 220 }}
      open={isPopoverOpen}
      onOpenChange={(next) => {
        if (suppressNextOpenRef.current) {
          suppressNextOpenRef.current = false;
          return;
        }
        setIsPopoverOpen(next);
      }}
    >
      <div
        className={`tmx-cell ${isSelected ? 'tmx-cell-selected' : ''}`}
        style={{ backgroundColor: color }}
        onMouseDownCapture={(e) => {
          if (e.shiftKey) {
            suppressNextOpenRef.current = true;
          }
        }}
        onClick={handleClick}
      />
    </Popover>
  );
};

export default ColorCell;
