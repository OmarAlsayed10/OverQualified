import ChecklistIcon from '@mui/icons-material/Checklist';
import { Box, Checkbox, Divider, FormControlLabel, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ChecklistItem } from './applicationWorkspace.types';

interface ChecklistPanelProps {
  checklist: ChecklistItem[];
  onToggle: (id: string) => void;
}

export const ChecklistPanel = ({ checklist, onToggle }: ChecklistPanelProps) => {
  const { t } = useTranslation();
  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <ChecklistIcon color="primary" fontSize="small" />
        <Typography variant="h6" fontWeight={700}>{t('Application Checklist')}</Typography>
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {checklist.map((item) => (
          <FormControlLabel
            key={item.id}
            control={<Checkbox checked={item.done} onChange={() => onToggle(item.id)} color="success" />}
            label={(
              <Typography variant="body2" sx={{ textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'text.secondary' : 'text.primary' }}>
                {t(item.label)}
              </Typography>
            )}
          />
        ))}
      </Box>
    </Paper>
  );
};
