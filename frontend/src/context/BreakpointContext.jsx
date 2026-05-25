import { createContext, useContext, useEffect, useMemo, useState } from "react";

export const BREAKPOINT_VALUES = {
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
};

/** Sidebar / bottom nav shell — matches Sidebar.css @991.98px */
export const APP_SHELL_MAX = 991.98;

/** Card-based table layout — matches table-mobile.css */
export const CARD_LAYOUT_MAX = 575.98;

export function getBreakpointState(width = typeof window !== "undefined" ? window.innerWidth : 1200) {
  let screenSize = "xxl";
  if (width < BREAKPOINT_VALUES.sm) screenSize = "xs";
  else if (width < BREAKPOINT_VALUES.md) screenSize = "sm";
  else if (width < BREAKPOINT_VALUES.lg) screenSize = "md";
  else if (width < BREAKPOINT_VALUES.xl) screenSize = "lg";
  else if (width < BREAKPOINT_VALUES.xxl) screenSize = "xl";

  const isAppMobile = width <= APP_SHELL_MAX;
  const isCompact = width <= CARD_LAYOUT_MAX;

  return {
    width,
    screenSize,
    isAppMobile,
    isCompact,
    isTablet: !isCompact && isAppMobile,
    isDesktop: width > APP_SHELL_MAX,
    /** Layout shell (sidebar, bottom nav) */
    isMobile: isAppMobile,
    isTouchDevice:
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0),
    orientation:
      typeof window !== "undefined" && window.innerWidth > window.innerHeight
        ? "landscape"
        : "portrait",
  };
}

const BreakpointContext = createContext(getBreakpointState());

export function BreakpointProvider({ children }) {
  const [state, setState] = useState(() => getBreakpointState());

  useEffect(() => {
    const update = () => setState(getBreakpointState(window.innerWidth));

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  const value = useMemo(() => state, [state]);

  return (
    <BreakpointContext.Provider value={value}>{children}</BreakpointContext.Provider>
  );
}

export function useBreakpoint() {
  return useContext(BreakpointContext);
}

export default BreakpointContext;
