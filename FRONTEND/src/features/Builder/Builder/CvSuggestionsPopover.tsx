import { Box, CircularProgress, List, ListItemButton, ListItemText, Popover, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ShieldAlert } from '../../../components/icons/MuiIcons';
import type { CvCheck } from '../cvChecks';

interface CvSuggestionsPopoverProps {
  anchor: HTMLElement | null;
  checks: CvCheck[];
  applyingCheckId: string | null;
  onClose: () => void;
  onApply: (check: CvCheck) => void;
}

export const CvSuggestionsPopover = ({ anchor, checks, applyingCheckId, onClose, onApply }: CvSuggestionsPopoverProps) => {
  const { t } = useTranslation();
  return (
    <Popover
      open={Boolean(anchor)}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      slotProps={{ paper: { sx: { maxWidth: 340, borderRadius: 2 } } }}
    >
      {checks.length === 0 ? (
        <Typography sx={{ p: 2, fontSize: 13 }}>{t('No issues found. Your CV covers the basics.')}</Typography>
      ) : (
        <List dense disablePadding>
          {checks.map((check) => (
            <ListItemButton
              key={check.id}
              onClick={() => onApply(check)}
              disabled={applyingCheckId !== null}
              sx={{ alignItems: 'flex-start', gap: 1 }}
            >
              <Box sx={{ mt: '2px', color: check.severity === 'warning' ? 'error.main' : 'text.secondary' }}>
                {applyingCheckId === check.id ? <CircularProgress size={16} /> : <ShieldAlert size={16} />}
              </Box>
              <ListItemText
                primary={t(check.message, check.values)}
                primaryTypographyProps={{ fontSize: 12.5, lineHeight: 1.45 }}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </Popover>
  );
};
