import { Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../../theme/tokens';

interface DragHintsProps {
  pageCount: number;
  dragging: boolean;
  activePage: number;
  pageTurnHint: -1 | 0 | 1;
}

export const DragHints = ({ pageCount, dragging, activePage, pageTurnHint }: DragHintsProps) => {
  const { t } = useTranslation();
  return (
    <>
      <Paper elevation={0} sx={{ position: 'absolute', left: 16, bottom: 20, zIndex: 10, px: 1.25, py: 0.75, borderRadius: 2, bgcolor: COLORS.bgWhite, border: `1px solid ${COLORS.borderLight}` }}>
        <Typography sx={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: 600 }}>
          {pageCount > 1 && dragging
            ? t('Hold at the top or bottom edge to change page.')
            : t('Drag section headings to reorder.')}
        </Typography>
      </Paper>
      {pageTurnHint !== 0 && (
        <Paper
          elevation={0}
          sx={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            ...(pageTurnHint === -1 ? { top: 12 } : { bottom: 70 }),
            zIndex: 12, px: 1.5, py: 0.5, borderRadius: 20,
            bgcolor: COLORS.primarySurface, color: COLORS.onAccent, pointerEvents: 'none',
          }}
        >
          <Typography sx={{ fontSize: 11, fontWeight: 700 }}>
            {t('Page')} {activePage + pageTurnHint}…
          </Typography>
        </Paper>
      )}
    </>
  );
};
