import { Box, IconButton, InputAdornment, Popover, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ZoomIn, ZoomOut } from '../../../../components/icons/MuiIcons';
import { FONT_SCALE_MAX, FONT_SCALE_MIN } from '../../../../redux/store/slices/cvBuilderSlice';
import { COLORS } from '../../../../theme/tokens';

interface FontProbe {
  anchor: HTMLElement;
  family: string;
  size: number;
}

interface FontProbePopoverProps {
  fontProbe: FontProbe | null;
  fontScale: number;
  pageCount: number;
  probeSize: number;
  sizeDraft: string;
  onClose: () => void;
  onSizeDraftChange: (size: string) => void;
  onCommitSize: () => void;
  onApplySize: (size: number) => void;
}

const FONT_SIZE_STEP = 0.5;

export const FontProbePopover = ({
  fontProbe,
  fontScale,
  pageCount,
  probeSize,
  sizeDraft,
  onClose,
  onSizeDraftChange,
  onCommitSize,
  onApplySize,
}: FontProbePopoverProps) => {
  const { t } = useTranslation();
  return (
    <Popover
      open={Boolean(fontProbe)}
      anchorEl={fontProbe?.anchor ?? null}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      slotProps={{ paper: { sx: { p: 1.5, borderRadius: 2, border: `1px solid ${COLORS.borderLight}` } } }}
    >
      {fontProbe && (
        <Box sx={{ minWidth: 230 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            {fontProbe.family}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={() => onApplySize(probeSize - FONT_SIZE_STEP)}
              disabled={fontScale <= FONT_SCALE_MIN}
              aria-label={t('Smaller text')}
            >
              <ZoomOut size={16} />
            </IconButton>
            <TextField
              size="small"
              value={sizeDraft}
              onChange={(event) => onSizeDraftChange(event.target.value)}
              onBlur={onCommitSize}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onCommitSize();
              }}
              inputProps={{
                inputMode: 'decimal',
                'aria-label': t('Font size'),
                style: { textAlign: 'center', fontWeight: 700, padding: '6px 4px' },
              }}
              InputProps={{ endAdornment: <InputAdornment position="end" sx={{ ml: 0 }}>px</InputAdornment> }}
              sx={{ flex: 1 }}
            />
            <IconButton
              size="small"
              onClick={() => onApplySize(probeSize + FONT_SIZE_STEP)}
              disabled={fontScale >= FONT_SCALE_MAX}
              aria-label={t('Larger text')}
            >
              <ZoomIn size={16} />
            </IconButton>
          </Box>
          <Typography sx={{ fontSize: 11, color: COLORS.textSecondary, mt: 1 }}>
            {(fontProbe.size * FONT_SCALE_MIN).toFixed(1)}–{(fontProbe.size * FONT_SCALE_MAX).toFixed(1)} px · {t('Pages')}: {pageCount}
          </Typography>
          <Typography sx={{ fontSize: 11, color: COLORS.textSecondary }}>
            {t('Applies to the whole CV')} — {Math.round(fontScale * 100)}%
          </Typography>
        </Box>
      )}
    </Popover>
  );
};
