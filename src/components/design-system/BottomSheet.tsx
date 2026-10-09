import React, { useRef, useState } from 'react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  maxHeight = 'max-h-[82vh] h-[78vh]',
}) => {
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchDeltaY, setTouchDeltaY] = useState<number>(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
    setTouchDeltaY(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const currentY = e.touches[0].clientY;
    const delta = currentY - touchStartY;
    if (delta > 0) {
      setTouchDeltaY(delta);
    }
  };

  const handleTouchEnd = () => {
    if (touchDeltaY > 90) {
      onClose();
    }
    setTouchStartY(null);
    setTouchDeltaY(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-200"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        style={{
          transform: touchDeltaY > 0 ? `translateY(${touchDeltaY}px)` : undefined,
        }}
        className={`relative w-full ${maxHeight} bg-white rounded-t-3xl shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-bottom duration-200 motion-reduce:animate-none`}
      >
        {/* Grab Bar */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing shrink-0"
        >
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>
        {children}
      </div>
    </div>
  );
};

export default BottomSheet;
