import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckIcon from '@mui/icons-material/Check';
import CodeIcon from '@mui/icons-material/Code';
import LaunchIcon from '@mui/icons-material/Launch';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { Box, Button, Chip, Link, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { SkillRoadmapDetails } from '../CareerMatch/CareerRoadmap/CareerRoadmap.types';
import { COLORS } from '../../theme/tokens';
import type { RoadmapStatusTarget, UserProgressItem } from './roadmap.types';
import { roadmapPalette } from './roadmapTheme';
import { normalizeSkillKey } from './skillKey';

interface MarketTrendsProps {
  trends: SkillRoadmapDetails[];
  progress: UserProgressItem[];
  onToggleStatus: (item: RoadmapStatusTarget) => void;
}

export const MarketTrends = ({ trends, progress, onToggleStatus }: MarketTrendsProps) => {
  const { t } = useTranslation();
  if (trends.length === 0) return null;
  return (
    <Paper elevation={0} sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 5, mb: 4, bgcolor: COLORS.bgDark, color: COLORS.onAccent, border: '1px solid rgba(255,255,255,.1)' }}>
      <Stack direction="row" gap={1} alignItems="center" mb={1}>
        <TrendingUpIcon sx={{ color: COLORS.success, fontSize: 24 }} />
        <Typography variant="h5" sx={{ fontWeight: 850, color: COLORS.onAccent }}>{t('2026 Recommended Market Growth Skills')}</Typography>
      </Stack>
      <Typography sx={{ color: 'rgba(255,255,255,.75)', fontSize: 14, mb: 3 }}>
        {t('Top high-demand technologies for 2026. Learning these ensures you stay ahead in the market, even beyond your current CV scope.')}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2.5 }}>
        {trends.map((trend) => {
          const learned = progress.some((item) => normalizeSkillKey(item.skillKey) === normalizeSkillKey(trend.skillKey) && item.status === 'learned');
          return (
            <Paper key={trend.skillKey} elevation={0} sx={{ p: 2.5, borderRadius: 4, bgcolor: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: COLORS.onAccent, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="start" gap={1} mb={1}>
                  <Chip size="small" icon={<PsychologyIcon sx={{ fontSize: 14, color: '#fff !important' }} />} label={t('2026 Trend')} sx={{ bgcolor: roadmapPalette.primary, color: COLORS.onAccent, fontWeight: 800 }} />
                  {learned && <Chip size="small" icon={<CheckIcon sx={{ fontSize: 14 }} />} label={t('Learned')} color="success" sx={{ fontWeight: 800 }} />}
                </Stack>
                <Typography sx={{ fontWeight: 850, fontSize: 16, mt: 1, color: COLORS.onAccent }}>{trend.skill}</Typography>
                {trend.officialDocs && (
                  <Link href={trend.officialDocs.url} target="_blank" rel="noreferrer" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: 13, color: COLORS.success, mt: 1.5, textDecoration: 'none', fontWeight: 700 }}>
                    <MenuBookIcon sx={{ fontSize: 15 }} /> {trend.officialDocs.title} <LaunchIcon sx={{ fontSize: 13 }} />
                  </Link>
                )}
                {trend.projectIdeas.length > 0 && (
                  <Box sx={{ mt: 2, p: 1.5, borderRadius: 2.5, bgcolor: COLORS.borderDark }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,.7)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CodeIcon sx={{ fontSize: 14, color: COLORS.success }} /> {t('Project Challenge:')}
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: COLORS.onAccent, mt: 0.5 }}>{trend.projectIdeas[0]}</Typography>
                  </Box>
                )}
              </Box>
              <Button
                size="small"
                variant={learned ? 'outlined' : 'contained'}
                onClick={() => onToggleStatus({ skill: trend.skill, skillKey: trend.skillKey, status: learned ? 'learned' : 'in_progress' })}
                startIcon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                sx={{ mt: 2.5, textTransform: 'none', fontWeight: 800, borderRadius: 2, bgcolor: learned ? 'transparent' : roadmapPalette.primary, color: COLORS.onAccent, borderColor: 'rgba(255,255,255,.4)' }}
              >
                {learned ? t('Mark In Progress') : t('Add to My Roadmap')}
              </Button>
            </Paper>
          );
        })}
      </Box>
    </Paper>
  );
};
