// Each template keeps its own designed spacing between sections; the user's control scales all of
// them by the same factor. The variable is set once on the preview and print roots, so the
// templates stay ignorant of where the number comes from.
export const sectionGap = (basePx: number): string =>
  `calc(${basePx}px * var(--cv-section-gap, 1))`;
