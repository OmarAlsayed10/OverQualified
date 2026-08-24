import ExploreIcon from '@mui/icons-material/Explore';
import RadarIcon from '@mui/icons-material/Radar';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import { Box, Button, Chip, Container, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { COLORS } from '../../theme/tokens';
import { roadmapPalette } from './roadmapTheme';

export const RoadmapHero = () => {
  const { t } = useTranslation();
  return (
    <Box sx={{ bgcolor: roadmapPalette.dark, color: COLORS.onAccent, pt: { xs: 6, md: 9 }, pb: { xs: 10, md: 14 } }}>
      <Container maxWidth="lg">
        <Chip icon={<TrackChangesIcon sx={{ color: 'white !important', fontSize: 16 }} />} label={t('Skill Readiness & Career Copilot')} sx={{ color: COLORS.onAccent, bgcolor: 'rgba(255,255,255,.12)', fontWeight: 800, mb: 2.5 }} />
        <Typography component="h1" sx={{ fontSize: { xs: 36, md: 54 }, lineHeight: 1.05, fontWeight: 850 }}>
          {t('Your Automated Skill Roadmap')}
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,.75)', fontSize: { xs: 16, md: 19 }, mt: 2, maxWidth: 720 }}>
          {t('Master missing job requirements step-by-step with verified official documentation, interactive browser sandboxes, and hands-on portfolio projects.')}
        </Typography>
        <Stack direction="row" gap={2} mt={3}>
          <Button component={RouterLink} to="/career-match" variant="contained" startIcon={<ExploreIcon />} sx={{ bgcolor: roadmapPalette.primary, textTransform: 'none', fontWeight: 850, borderRadius: 2.5, px: 3 }}>
            {t('Career Match')}
          </Button>
          <Button component={RouterLink} to="/job-radar" variant="outlined" startIcon={<RadarIcon />} sx={{ color: COLORS.onAccent, borderColor: 'rgba(255,255,255,.4)', textTransform: 'none', fontWeight: 850, borderRadius: 2.5, px: 3 }}>
            {t('Job Radar')}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
};
