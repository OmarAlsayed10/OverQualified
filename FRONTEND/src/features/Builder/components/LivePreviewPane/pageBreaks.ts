// The print page box is set to exactly these numbers, so the pushes computed here land on the
// same boundaries Chrome then breaks at and the download matches the preview page for page.
export const PAGE_HEIGHT = 1123;
export const PAGE_WIDTH = 794;
export const PAGE_PADDING = 48;

// Templates render one continuous flow that the page frame clips every PAGE_HEIGHT px, so an
// entry landing on the boundary gets sliced in half. Pushing it past the boundary with a top
// margin is what turns that slice into a real page break.
export const pageBreakPush = (top: number, bottom: number, pageHeight: number, padding: number): number => {
  const pageEnd = (Math.floor(top / pageHeight) + 1) * pageHeight;
  if (bottom <= pageEnd - padding) return 0;
  if (bottom - top > pageHeight - padding * 2) return 0;
  return pageEnd + padding - top;
};

// A section heading must never be the last thing on a page, so it travels with the entry
// that follows it.
export const breakUnits = (content: HTMLElement): HTMLElement[][] => {
  const units: HTMLElement[][] = [];
  content.querySelectorAll<HTMLElement>('[data-cv-section]').forEach((section) => {
    const children = Array.from(section.children).flatMap((child) =>
      child.matches('ul, ol') ? Array.from(child.children) : [child],
    ) as HTMLElement[];
    for (let index = 0; index < children.length; index += 1) {
      const child = children[index];
      const next = children[index + 1];
      if (child.hasAttribute('data-cv-drag-handle') && next) {
        units.push([child, next]);
        index += 1;
      } else {
        units.push([child]);
      }
    }
  });
  return units.sort((left, right) =>
    left[0].getBoundingClientRect().top - right[0].getBoundingClientRect().top,
  );
};

// `screenPerPageUnit` converts rendered pixels back to page pixels: the preview draws the sheet
// under a scale transform, the print page draws it 1:1.
export const applyPageBreaks = (
  content: HTMLElement,
  zoom: number,
  screenPerPageUnit = 1,
  pageHeight = PAGE_HEIGHT,
  padding = PAGE_PADDING,
) => {
  const units = breakUnits(content);
  units.forEach(([first]) => { first.style.marginTop = ''; });

  if (!screenPerPageUnit || !zoom) return;

  units.forEach((unit) => {
    const origin = content.getBoundingClientRect().top;
    const top = (unit[0].getBoundingClientRect().top - origin) / screenPerPageUnit;
    const bottom = (unit[unit.length - 1].getBoundingClientRect().bottom - origin) / screenPerPageUnit;
    const unitPadding = unit[0].hasAttribute('data-cv-compact-break') ? 0 : padding;
    const push = pageBreakPush(top, bottom, pageHeight, unitPadding);
    if (push > 0) unit[0].style.marginTop = `${push / zoom}px`;
  });
};
