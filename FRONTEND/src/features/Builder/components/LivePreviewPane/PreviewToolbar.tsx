import { Box, ButtonGroup, IconButton, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, DensityLoose, DensityTight, Maximize, Minimize, ZoomIn, ZoomOut } from '../../../../components/icons/MuiIcons';
import { COLORS } from '../../../../theme/tokens';
import { SECTION_GAP_MAX, SECTION_GAP_MIN } from '../../../../redux/store/slices/cvBuilderSlice';

const GAP_STEP = 0.1;

interface PreviewToolbarProps {
  pageCount: number;
  activePage: number;
  scale: number;
  zoomMode: 'width' | 'page' | 'custom';
  onPageChange: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleFit: () => void;
  sectionGap: number;
  onSectionGapChange: (gap: number) => void;
}

export const PreviewToolbar = ({
  pageCount,
  activePage,
  scale,
  zoomMode,
  onPageChange,
  onZoomIn,
  onZoomOut,
  onToggleFit,
  sectionGap,
  onSectionGapChange,
}: PreviewToolbarProps) => {
  const { t } = useTranslation();
  return (
    <Box sx={{
      position: 'absolute', bottom: 20, right: 20, zIndex: 10,
      backgroundColor: COLORS.bgWhite, backdropFilter: 'blur(8px)', borderRadius: '30px',
      border: `1px solid ${COLORS.borderLight}`, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      display: 'flex', alignItems: 'center', p: '4px',
    }}>
      <ButtonGroup variant="text" size="small">
        {pageCount > 1 && (
          <>
            <Tooltip title={t('Previous Page')}>
              <span>
                <IconButton
                  onClick={() => onPageChange(Math.max(1, activePage - 1))}
                  disabled={activePage === 1}
                  size="small"
                  sx={{ color: COLORS.textSecondary }}
                >
                  <ArrowLeft size={16} />
                </IconButton>
              </span>
            </Tooltip>
            <Box sx={{ px: 1, fontSize: '0.75rem', fontWeight: 'bold', color: COLORS.textPrimary, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
              {t('Page')} {activePage}/{pageCount}
            </Box>
            <Tooltip title={t('Next Page')}>
              <span>
                <IconButton
                  onClick={() => onPageChange(Math.min(pageCount, activePage + 1))}
                  disabled={activePage === pageCount}
                  size="small"
                  sx={{ color: COLORS.textSecondary, borderRight: `1px solid ${COLORS.borderLight}` }}
                >
                  <ArrowRight size={16} />
                </IconButton>
              </span>
            </Tooltip>
          </>
        )}
        <Tooltip title={t('Zoom Out')}>
          <IconButton onClick={onZoomOut} size="small" sx={{ color: COLORS.textSecondary }}><ZoomOut size={16} /></IconButton>
        </Tooltip>
        <Box sx={{ px: 1, fontSize: '0.75rem', fontWeight: 'bold', color: COLORS.textPrimary, minWidth: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {Math.round(scale * 100)}%
        </Box>
        <Tooltip title={t('Zoom In')}>
          <IconButton onClick={onZoomIn} size="small" sx={{ color: COLORS.textSecondary }}><ZoomIn size={16} /></IconButton>
        </Tooltip>
        <Tooltip title={t('Tighter section spacing')}>
          <span>
            <IconButton
              onClick={() => onSectionGapChange(sectionGap - GAP_STEP)}
              disabled={sectionGap <= SECTION_GAP_MIN}
              size="small"
              sx={{ color: COLORS.textSecondary, borderLeft: `1px solid ${COLORS.borderLight}` }}
            >
              <DensityTight size={16} />
            </IconButton>
          </span>
        </Tooltip>
        <Box sx={{ px: 1, fontSize: '0.75rem', fontWeight: 'bold', color: COLORS.textPrimary, minWidth: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {Math.round(sectionGap * 100)}%
        </Box>
        <Tooltip title={t('Looser section spacing')}>
          <span>
            <IconButton
              onClick={() => onSectionGapChange(sectionGap + GAP_STEP)}
              disabled={sectionGap >= SECTION_GAP_MAX}
              size="small"
              sx={{ color: COLORS.textSecondary }}
            >
              <DensityLoose size={16} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={zoomMode === 'width' ? t('Fit Entire Page') : t('Fit Width')}>
          <IconButton
            onClick={onToggleFit}
            size="small"
            sx={{ color: COLORS.textSecondary, borderLeft: `1px solid ${COLORS.borderLight}` }}
          >
            {zoomMode === 'width' ? <Minimize size={16} /> : <Maximize size={16} />}
          </IconButton>
        </Tooltip>
      </ButtonGroup>
    </Box>
  );
};
