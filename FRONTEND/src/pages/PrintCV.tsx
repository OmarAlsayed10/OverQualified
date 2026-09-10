import { useEffect } from 'react';
import { Box, GlobalStyles } from '@mui/material';
import ClassicCV from '../templates/classic-cv';
import LinkedInCV from '../templates/linkedin-cv';
import ModernCV from '../templates/modern-cv';
import JakeCV from '../templates/jake-cv';
import HarvardCV from '../templates/harvard-cv';
import PhotoCV from '../templates/photo-cv';
import { cvFormToPdfProps } from '../templates/pdf/cvFormToPdfProps';
import { applyPalette } from '../theme/palettes';
import { applyPageBreaks, PAGE_HEIGHT, PAGE_WIDTH } from '../features/Builder/components/LivePreviewPane/pageBreaks';

const templates: Record<string, any> = {
  'classic-cv': ClassicCV,
  'linkedin-cv': LinkedInCV,
  'modern-cv': ModernCV,
  'jake-cv': JakeCV,
  'harvard-cv': HarvardCV,
  'photo-cv': PhotoCV,
};

// The export browser injects this before navigating, so the page needs no auth and no fetch.
declare global {
  interface Window {
    __CV_DATA__?: { formData: any; sectionOrder?: string[]; template?: string; fontScale?: number; sectionGap?: number };
    __CV_PRINT_READY__?: boolean;
  }
}

// The sheet is declared in the same pixels the preview paginates against — asking for A4 instead
// gives 1122.52px, and that half-pixel drifts a page further out of step with every page.
// Margins stay at 0: the vertical inset on later pages comes from the page-break pushes, which is
// what the preview shows, and a @page margin here would inset the printed page a second time.
const printStyles = () => ({
  '@page': { size: `${PAGE_WIDTH}px ${PAGE_HEIGHT}px`, margin: 0 },
  // The html background propagates to the whole page canvas, margins included. In dark mode
  // palette.css paints body near-black plus gradients, which printed as black bands in the
  // @page margin strips. The print page is always a white sheet, whatever theme the user is in.
  'html, body, #root': {
    margin: 0,
    padding: 0,
    background: '#fff !important',
    backgroundColor: '#fff !important',
    backgroundImage: 'none !important',
    colorScheme: 'light',
  },
  // The padding below the last section is invisible on screen but still occupies the sheet, and a
  // few pixels of it past the final boundary printed as a whole blank page. The id beats emotion's
  // class specificity, so no !important is needed.
  '#cv-print-root > *': { paddingBottom: 0 },
  // A safety net only: the pushes are what decide where pages break, and after them nothing
  // should be straddling a boundary for the browser to split. The list wrapping a section's
  // entries is excluded — asked not to break, the browser moved the entire Experience list to the
  // next page rather than splitting it between entries, which is what left page one half empty.
  '[data-cv-section] > :not(ul):not(ol), [data-cv-section] li': { breakInside: 'avoid' },
  '[data-cv-drag-handle]': { breakAfter: 'avoid' },
});

const PrintCV = () => {
  const data = window.__CV_DATA__;

  useEffect(() => {
    if (!data) return;
    // Chrome paints the page box outside the content with the UA canvas colour, and
    // `color-scheme: dark` makes that rgb(18,18,18) — that, not the body background, is what
    // printed black bands down the @page margins. applyPalette owns color-scheme (it writes
    // it inline), so the print page forces light through the same function rather than
    // fighting it. It runs after mount effects have settled, so nothing overwrites it.
    void document.fonts?.ready.then(() => {
      applyPalette('light');
      // The same pushes the preview applies, so the printed pages break where the user saw them
      // break. Without this the browser paginated on its own and the download disagreed with the
      // screen. Measured 1:1 here — the print page has no preview scale transform.
      const root = document.getElementById('cv-print-root');
      if (root) applyPageBreaks(root, data.fontScale ?? 1);
      window.__CV_PRINT_READY__ = true;
    });
  }, [data]);

  if (!data) return null;

  const templateName = data.template || 'classic-cv';
  const Template = templates[templateName] || ClassicCV;
  const props = {
    ...cvFormToPdfProps(data.formData),
    sectionOrder: data.sectionOrder,
    printMode: true,
  };

  return (
    <>
      <GlobalStyles styles={printStyles()} />
      <Box sx={{ width: PAGE_WIDTH, mx: 'auto', background: '#fff' }}>
        <Box id="cv-print-root" sx={{ zoom: data.fontScale ?? 1, '--cv-section-gap': data.sectionGap ?? 1 }}>
          <Template {...props} />
        </Box>
      </Box>
    </>
  );
};

export default PrintCV;
