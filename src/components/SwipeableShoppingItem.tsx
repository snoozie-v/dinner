// src/components/SwipeableShoppingItem.tsx
import { useState, useRef, useCallback } from 'react';
import type { ReactNode, TouchEvent, MouseEvent } from 'react';

interface SwipeableShoppingItemProps {
  children: ReactNode;
  onSwipeComplete: () => void;
  isCompleted: boolean;
}

const SWIPE_THRESHOLD = 80; // pixels to trigger action
const MAX_SWIPE = 120; // max visual swipe distance

const SwipeableShoppingItem = ({
  children,
  onSwipeComplete,
  isCompleted,
}: SwipeableShoppingItemProps) => {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleStart = useCallback((clientX: number) => {
    startXRef.current = clientX;
    currentXRef.current = clientX;
    setIsSwiping(true);
  }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!isSwiping) return;

    currentXRef.current = clientX;
    const diff = clientX - startXRef.current;

    // Only allow right swipe, with diminishing returns past threshold
    if (diff > 0) {
      const cappedDiff = Math.min(diff, MAX_SWIPE);
      setTranslateX(cappedDiff);
    } else {
      setTranslateX(0);
    }
  }, [isSwiping]);

  const handleEnd = useCallback(() => {
    if (!isSwiping) return;

    const diff = currentXRef.current - startXRef.current;

    // If swiped past threshold, trigger action
    if (diff >= SWIPE_THRESHOLD) {
      onSwipeComplete();
    }

    // Reset position
    setTranslateX(0);
    setIsSwiping(false);
  }, [isSwiping, onSwipeComplete]);

  // Touch event handlers
  const handleTouchStart = (e: TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Mouse event handlers (for desktop testing)
  const handleMouseDown = (e: MouseEvent) => {
    handleStart(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isSwiping) {
      handleMove(e.clientX);
    }
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  const handleMouseLeave = () => {
    if (isSwiping) {
      handleEnd();
    }
  };

  // Calculate background opacity based on swipe progress
  const progress = Math.min(translateX / SWIPE_THRESHOLD, 1);
  const showCheckmark = progress > 0.5;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background reveal layer */}
      <div
        className={`absolute inset-0 flex items-center pl-4 transition-colors ${
          isCompleted
            ? 'bg-amber-500'
            : 'bg-green-500'
        }`}
        style={{ opacity: progress * 0.9 + 0.1 }}
      >
        <div
          className="text-white transition-transform"
          style={{
            transform: `scale(${0.5 + progress * 0.5})`,
            opacity: showCheckmark ? 1 : 0.5,
          }}
        >
          {isCompleted ? (
            // Undo icon when already completed
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          ) : (
            // Checkmark when not completed
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>

      {/* Content layer */}
      <div
        className={`relative bg-white dark:bg-gray-800 ${
          isSwiping ? '' : 'transition-transform duration-200'
        }`}
        style={{
          transform: `translateX(${translateX}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableShoppingItem;
