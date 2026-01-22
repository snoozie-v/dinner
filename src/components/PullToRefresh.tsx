// src/components/PullToRefresh.tsx
import { useState, useRef, useCallback, type ReactNode, type TouchEvent } from 'react';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => void | Promise<void>;
  refreshingText?: string;
  pullText?: string;
  releaseText?: string;
  disabled?: boolean;
}

const PULL_THRESHOLD = 80; // pixels to trigger refresh
const MAX_PULL = 120; // max visual pull distance
const RESISTANCE = 2.5; // resistance factor for overscroll

const PullToRefresh = ({
  children,
  onRefresh,
  refreshingText = 'Refreshing...',
  pullText = 'Pull to refresh',
  releaseText = 'Release to refresh',
  disabled = false,
}: PullToRefreshProps) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);

  const canPull = useCallback(() => {
    if (disabled || isRefreshing) return false;
    // Only allow pull when scrolled to top
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    return scrollTop <= 0;
  }, [disabled, isRefreshing]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!canPull()) return;

    startYRef.current = e.touches[0].clientY;
    currentYRef.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [canPull]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || !canPull()) return;

    currentYRef.current = e.touches[0].clientY;
    const diff = currentYRef.current - startYRef.current;

    if (diff > 0) {
      // Apply resistance for a more natural feel
      const resistedDiff = diff / RESISTANCE;
      const cappedDiff = Math.min(resistedDiff, MAX_PULL);
      setPullDistance(cappedDiff);

      // Prevent default scroll when pulling
      if (cappedDiff > 10) {
        e.preventDefault();
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, canPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    setIsPulling(false);

    const rawDiff = currentYRef.current - startYRef.current;
    const resistedDiff = rawDiff / RESISTANCE;

    if (resistedDiff >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(60); // Keep indicator visible during refresh

      try {
        await onRefresh();
      } finally {
        // Small delay for visual feedback
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 500);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const shouldRelease = pullDistance >= PULL_THRESHOLD * (1 / RESISTANCE) * RESISTANCE;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      <div
        className={`absolute left-0 right-0 flex flex-col items-center justify-end overflow-hidden transition-opacity duration-200 ${
          pullDistance > 0 || isRefreshing ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          height: `${Math.max(pullDistance, isRefreshing ? 60 : 0)}px`,
          top: 0,
          transform: 'translateY(-100%)',
        }}
      >
        <div className="pb-3 flex flex-col items-center">
          {/* Spinner/Arrow */}
          <div
            className={`mb-2 transition-transform duration-200 ${isRefreshing ? 'animate-spin' : ''}`}
            style={{
              transform: isRefreshing ? undefined : `rotate(${progress * 180}deg)`,
            }}
          >
            {isRefreshing ? (
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg
                className={`w-6 h-6 transition-colors ${
                  shouldRelease ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
          </div>

          {/* Text */}
          <span className={`text-xs font-medium ${
            shouldRelease || isRefreshing
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            {isRefreshing ? refreshingText : shouldRelease ? releaseText : pullText}
          </span>
        </div>
      </div>

      {/* Content with transform */}
      <div
        className={`transition-transform ${isPulling ? 'duration-0' : 'duration-200'}`}
        style={{
          transform: `translateY(${pullDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
