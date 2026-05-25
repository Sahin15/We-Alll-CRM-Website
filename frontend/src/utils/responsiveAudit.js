/**
 * Dev-only helper: logs elements that cause horizontal page overflow.
 * Call initResponsiveAudit() once in development if needed.
 */
export function findOverflowElements(root = document.body) {
  const offenders = [];
  const walk = (el) => {
    if (el.nodeType !== 1) return;
    if (el.scrollWidth > el.clientWidth + 2) {
      offenders.push({
        tag: el.tagName.toLowerCase(),
        className: el.className,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      });
    }
    Array.from(el.children).forEach(walk);
  };
  walk(root);
  return offenders;
}

export function initResponsiveAudit() {
  if (!import.meta.env.DEV) return () => {};

  const run = () => {
    const offenders = findOverflowElements();
    if (offenders.length > 0) {
      console.warn("[responsive-audit] Horizontal overflow detected:", offenders.slice(0, 10));
    }
  };

  window.addEventListener("resize", run);
  run();

  return () => window.removeEventListener("resize", run);
}
