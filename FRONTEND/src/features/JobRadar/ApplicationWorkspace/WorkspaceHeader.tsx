import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Button, Chip, Container, IconButton, MenuItem, Paper, Select, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';
import { COLORS } from '../../../theme/tokens';
import type { ApplicationMatch } from './applicationWorkspace.types';

interface WorkspaceHeaderProps {
  match: ApplicationMatch;
  status: string;
  onBack: () => void;
  onPractice: () => void;
  onStatusChange: (status: string) => void;
}

export const WorkspaceHeader = ({ match, status, onBack, onPractice, onStatusChange }: WorkspaceHeaderProps) => {
  const { t } = useTranslation();
  const openApplication = () => {
    const url = match.url;
    if (url && url !== 'https://linkedin.com' && url.startsWith('http')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.open('https://www.linkedin.com/jobs/', '_blank', 'noopener,noreferrer');
    }
  };
  return (
    <Paper elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: COLORS.bgWhite, py: 2.5 }}>
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton aria-label={t('Back to Job Radar')} onClick={onBack} size="small">
              {i18n.language === 'ar' ? <ArrowForwardIcon /> : <ArrowBackIcon />}
            </IconButton>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="h5" fontWeight={700}>{match.title}</Typography>
                <Chip
                  label={match.analysisStatus === 'pending' ? t('Analysis required') : `${match.fitScore}% ${t('Fit')}`}
                  color={match.analysisStatus === 'pending' ? 'info' : (match.fitScore ?? 0) >= 80 ? 'success' : 'warning'}
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              </Box>
              <Typography color="text.secondary" variant="body2">
                {match.company} {match.location ? `أ¢â‚¬آ¢ ${match.location}` : ''}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button variant="outlined" startIcon={<OpenInNewIcon />} onClick={openApplication} sx={{ borderRadius: 2 }}>
              {t('Open Application')}
            </Button>
            <Button variant="contained" startIcon={<ForumRoundedIcon />} onClick={onPractice} sx={{ borderRadius: 2 }}>
              {t('Practice interview for this job')}
            </Button>
            <Select size="small" value={status} onChange={(event) => onStatusChange(event.target.value)} sx={{ borderRadius: 2, minWidth: 140, fontWeight: 600 }}>
              <MenuItem value="matched">{t('Matched')}</MenuItem>
              <MenuItem value="applied">{t('Applied')}</MenuItem>
              <MenuItem value="interview">{t('Interview')}</MenuItem>
              <MenuItem value="offer">{t('Offer')}</MenuItem>
              <MenuItem value="rejected">{t('Rejected')}</MenuItem>
            </Select>
          </Box>
        </Box>
      </Container>
    </Paper>
  );
};
