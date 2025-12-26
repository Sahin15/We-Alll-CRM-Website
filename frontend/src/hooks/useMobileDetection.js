import { useState, useEffect, useCallback } from 'react';

/**
 * Mobile Detection and Touch Gesture Hook
 * Provides device detection and touch gesture handling for mobile responsiveness
 * 
 * Features:
 * - Device type detection (mobile, tablet, desktop)
 * - Screen size monitoring
 * - Touch gesture detection (swipe, tap, long press)
 * - Orientation change handling
 * - Touch-friendly interaction helpers
 */
export const useMobileDetection = () => {
  // Device state
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [screenSize, setScreenSize] = useState('lg');
  const [orientation, setOrientation] = useState('portrait');
  const [touchDevice, setTouchDevice] = useState(false);

  // Touch gesture state
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);

  // Device detection
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Screen size classification
      if (width <= 576) {
        setScreenSize('xs');
        setIsMobile(true);
        setIsTablet(false);
        setIsDesktop(false);
      } else if (width <= 768) {
        setScreenSize('sm');
        setIsMobile(true);
        setIsTablet(false);
        setIsDesktop(false);
      } else if (width <= 992) {
        setScreenSize('md');
        setIsMobile(false);
        setIsTablet(true);
        setIsDesktop(false);
      } else if (width <= 1200) {
        setScreenSize('lg');
        setIsMobile(false);
        setIsTablet(false);
        setIsDesktop(true);
      } else {
        setScreenSize('xl');
        setIsMobile(false);
        setIsTablet(false);
        setIsDesktop(true);
      }

      // Orientation detection
      setOrientation(width > height ? 'landscape' : 'portrait');

      // Touch device detection
      setTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  // Touch gesture handlers
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });
    setTouchEnd(null);
    setIsLongPress(false);

    // Start long press timer
    const timer = setTimeout(() => {
      setIsLongPress(true);
    }, 500); // 500ms for long press
    setLongPressTimer(timer);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!touchStart) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStart.x);
    const deltaY = Math.abs(touch.clientY - touchStart.y);

    // Cancel long press if moved too much
    if (deltaX > 10 || deltaY > 10) {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
      setIsLongPress(false);
    }
  }, [touchStart, longPressTimer]);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    setTouchEnd({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });

    // Clear long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [touchStart, longPressTimer]);

  // Gesture detection
  const detectSwipe = useCallback(() => {
    if (!touchStart || !touchEnd) return null;

    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;
    const deltaTime = touchEnd.time - touchStart.time;

    // Minimum swipe distance and maximum time
    const minSwipeDistance = 50;
    const maxSwipeTime = 300;

    if (deltaTime > maxSwipeTime) return null;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > minSwipeDistance) {
        return deltaX > 0 ? 'swipeLeft' : 'swipeRight';
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > minSwipeDistance) {
        return deltaY > 0 ? 'swipeUp' : 'swipeDown';
      }
    }

    return null;
  }, [touchStart, touchEnd]);

  const detectTap = useCallback(() => {
    if (!touchStart || !touchEnd) return null;

    const deltaX = Math.abs(touchStart.x - touchEnd.x);
    const deltaY = Math.abs(touchStart.y - touchEnd.y);
    const deltaTime = touchEnd.time - touchStart.time;

    // Tap thresholds
    const maxTapDistance = 10;
    const maxTapTime = 200;

    if (deltaX <= maxTapDistance && deltaY <= maxTapDistance && deltaTime <= maxTapTime) {
      return 'tap';
    }

    return null;
  }, [touchStart, touchEnd]);

  // Helper functions
  const getBreakpoint = useCallback(() => {
    return screenSize;
  }, [screenSize]);

  const isBreakpoint = useCallback((breakpoint) => {
    const breakpoints = ['xs', 'sm', 'md', 'lg', 'xl'];
    const currentIndex = breakpoints.indexOf(screenSize);
    const targetIndex = breakpoints.indexOf(breakpoint);
    return currentIndex <= targetIndex;
  }, [screenSize]);

  const getOptimalColumnCount = useCallback((maxColumns = 4) => {
    switch (screenSize) {
      case 'xs': return 1;
      case 'sm': return Math.min(2, maxColumns);
      case 'md': return Math.min(3, maxColumns);
      case 'lg': return Math.min(4, maxColumns);
      case 'xl': return maxColumns;
      default: return maxColumns;
    }
  }, [screenSize]);

  const shouldHideColumn = useCallback((column) => {
    if (!column.responsive) return false;

    const hideOn = column.responsive.hideOn || [];
    return hideOn.includes(screenSize);
  }, [screenSize]);

  const getTouchFriendlyProps = useCallback(() => {
    if (!touchDevice) return {};

    return {
      style: {
        minHeight: '44px',
        minWidth: '44px'
      },
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    };
  }, [touchDevice, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  return {
    // Device detection
    isMobile,
    isTablet,
    isDesktop,
    screenSize,
    orientation,
    touchDevice,

    // Touch gestures
    touchStart,
    touchEnd,
    isLongPress,
    detectSwipe,
    detectTap,

    // Touch handlers
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,

    // Helper functions
    getBreakpoint,
    isBreakpoint,
    getOptimalColumnCount,
    shouldHideColumn,
    getTouchFriendlyProps,

    // Utility
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape'
  };
};

export default useMobileDetection;