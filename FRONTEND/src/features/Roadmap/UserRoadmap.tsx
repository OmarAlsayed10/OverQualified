import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckIcon from '@mui/icons-material/Check';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExploreIcon from '@mui/icons-material/Explore';
import { Box, Button, Chip, CircularProgress, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { COLORS } from '../../theme/tokens';
import type { RoadmapFilter, UserProgressItem } from './roadmap.types';
import { categoryLabels, roadmapPalette } from './roadmapTheme';
import { normalizeSkillKey } from './skillKey';
import { SkillResources } from './SkillResources';

interface UserRoadmapProps {
  items: UserProgressItem[];
  totalCount: number;
  learnedCount: number;
  inProgressCount: number;
  loading: boolean;
  filter: RoadmapFilter;
  deletingSkill: string | null;
  onFilterChange: (filter: RoadmapFilter) => void;
  onToggleStatus: (item: UserProgressItem) => void;
  onDelete: (item: UserProgressItem) => void;
}

export const UserRoadmap = ({
  items,
  totalCount,
  learnedCount,
  inProgressCount,
  loading,
  filter,
  deletingSkill,
  onFilterChange,
  onToggleStatus,
  onDelete,
}: UserRoadmapProps) => {
  const { t } = useTranslation();
  return (
    <Paper elevation={0} sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 5, border: '1px solid rgba(24,34,29,.08)', boxShadow: '0 20px 60px rgba(25,59,44,.08)', bgcolor: COLORS.bgWhite }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2} mb={3}>
        <Tabs value={filter} onChange={(_, value) => onFilterChange(value)} sx={{ '& .Mui-selected': { fontWeight: 850, color: roadmapPalette.primary } }}>
          <Tab label={`${t('Your Matched Gaps')} (${totalCount})`} value="all" sx={{ textTransform: 'none' }} />
          <Tab label={`${t('In Progress')} (${inProgressCount})`} value="in_progress" sx={{ textTransform: 'none' }} />
          <Tab label={`${t('Learned & Ready')} (${learnedCount})`} value="learned" sx={{ textTransform: 'none' }} />
        </Tabs>
      </Stack>
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress sx={{ color: roadmapPalette.primary }} />
          <Typography sx={{ color: roadmapPalette.muted, mt: 2 }}>{t('Loading your saved skill roadmaps...')}</Typography>
        </Box>
      ) : items.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, borderRadius: 4, textAlign: 'center', border: '1.5px dashed #cde0d4', bgcolor: COLORS.surfaceSubtle }}>
          <ExploreIcon sx={{ fontSize: 44, color: roadmapPalette.primary }} />
          <Typography variant="h6" sx={{ fontWeight: 850, mt: 2, color: roadmapPalette.ink }}>
            {totalCount === 0 ? t('No Custom Skill Gaps Added Yet') : t('No skills match this filter')}
          </Typography>
          <Typography sx={{ color: roadmapPalette.muted, mt: 1, maxWidth: 500, mx: 'auto', fontSize: 14 }}>
            {totalCount === 0
              ? t('Run a Career Match on any job vacancy to automatically discover missing skill gaps, or explore the 2026 Market Trends above.')
              : t('Try switching tabs to view all saved skills.')}
          </Typography>
          {totalCount === 0 && (
            <Button component={RouterLink} to="/career-match" variant="contained" sx={{ mt: 3, bgcolor: roadmapPalette.primary, textTransform: 'none', fontWeight: 850, borderRadius: 2.5 }}>
              {t('Match a Job Vacancy Now')}
            </Button>
          )}
        </Paper>
      ) : (
        <Stack spacing={3}>
          {items.map((item) => (
            <Paper
              key={item.id}
              elevation={0}
              sx={{
                p: { xs: 2.5, md: 3.5 }, borderRadius: 4,
                border: `1.5px solid ${item.status === 'learned' ? COLORS.primary : COLORS.borderLight}`,
                bgcolor: item.status === 'learned' ? COLORS.bgIconTinted : COLORS.bgWhite,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
                <Box>
                  <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="h6" sx={{ fontWeight: 850, color: roadmapPalette.ink }}>{item.skill}</Typography>
                    <Chip size="small" label={t(categoryLabels[item.category] || item.category)} variant="outlined" sx={{ textTransform: 'capitalize' }} />
                    {item.status === 'learned' ? (
                      <Chip icon={<CheckIcon sx={{ fontSize: 14 }} />} size="small" label={t('Learned & Ready')} color="success" sx={{ fontWeight: 800 }} />
                    ) : (
                      <Chip size="small" label={t('In Progress')} color="warning" sx={{ fontWeight: 800 }} />
                    )}
                  </Stack>
                </Box>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  <Button
                    variant={item.status === 'learned' ? 'outlined' : 'contained'}
                    color={item.status === 'learned' ? 'inherit' : 'primary'}
                    onClick={() => onToggleStatus(item)}
                    startIcon={<CheckCircleIcon sx={{ fontSize: 18 }} />}
                    sx={{ textTransform: 'none', fontWeight: 850, borderRadius: 2.5, bgcolor: item.status === 'learned' ? 'transparent' : roadmapPalette.primary }}
                  >
                    {item.status === 'learned' ? t('Mark In Progress') : t('Mark as Learned / Added to CV')}
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => onDelete(item)}
                    disabled={deletingSkill === normalizeSkillKey(item.skillKey || item.skill || '')}
                    startIcon={<DeleteOutlineIcon sx={{ fontSize: 18 }} />}
                    sx={{ textTransform: 'none', fontWeight: 850, borderRadius: 2.5, borderColor: COLORS.danger, color: COLORS.danger, '&:hover': { bgcolor: COLORS.dangerSoft, borderColor: COLORS.danger } }}
                  >
                    {t('Remove from Roadmap')}
                  </Button>
                </Stack>
              </Stack>
              <SkillResources roadmap={item.roadmap} />
            </Paper>
          ))}
        </Stack>
      )}
    </Paper>
  );
};
