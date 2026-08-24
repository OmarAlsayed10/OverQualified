import type { DragEventHandler, MouseEventHandler } from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import Preview from '../../Preview';
import type { CvSection } from '../../../../redux/store/slices/cvBuilderSlice';
import { COLORS } from '../../../../theme/tokens';
import { PAGE_HEIGHT, PAGE_WIDTH } from './pageBreaks';

interface PreviewCanvasProps {
  activePage: number;
  scale: number;
  fontScale: number;
  draggedSection: CvSection | null;
  dropTarget: CvSection | null;
  onDragStart: DragEventHandler<HTMLDivElement>;
  onDragOver: DragEventHandler<HTMLDivElement>;
  onDrop: DragEventHandler<HTMLDivElement>;
  onDragEnd: DragEventHandler<HTMLDivElement>;
  onClick: MouseEventHandler<HTMLDivElement>;
}

export const PreviewCanvas = ({
  activePage,
  scale,
  fontScale,
  draggedSection,
  dropTarget,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onClick,
}: PreviewCanvasProps) => {
  const { t } = useTranslation();
  return (
    <Box sx={{
      width: '100%', height: '100%', overflow: 'auto', display: 'flex',
      justifyContent: 'center', alignItems: 'flex-start', py: 4, boxSizing: 'border-box',
    }}>
      <Box
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        onClick={onClick}
        sx={{
          '& [data-cv-page] > * > *': { zoom: fontScale },
          '& [data-cv-section] p, & [data-cv-section] li': { cursor: 'text' },
          '& [data-cv-drag-handle]': { cursor: 'grab', userSelect: 'none' },
          '& [data-cv-drag-handle]:active': { cursor: 'grabbing' },
          '& [data-cv-section]': {
            position: 'relative',
            transition: 'opacity 160ms ease, transform 160ms ease, box-shadow 160ms ease',
          },
          ...(draggedSection ? {
            [`& [data-cv-section="${draggedSection}"]`]: { opacity: 0.35, transform: 'scale(.985)' },
          } : {}),
          ...(dropTarget ? {
            [`& [data-cv-section="${dropTarget}"]`]: {
              boxShadow: '0 -4px 0 #2a5c45',
              '&::before': {
                content: `"${t('Drop section here')}"`,
                position: 'absolute', top: '-24px', left: 0, zIndex: 4,
                px: 1, py: '2px', borderRadius: '5px', bgcolor: COLORS.primarySurface,
                color: COLORS.onAccent, fontSize: '10px', fontWeight: 700,
                letterSpacing: '.02em', pointerEvents: 'none',
              },
            },
          } : {}),
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          mb: `${(scale - 1) * PAGE_HEIGHT}px`,
        }}
      >
        <Preview activePage={activePage} />
      </Box>
    </Box>
  );
};
