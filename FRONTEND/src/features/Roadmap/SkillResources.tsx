import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LaunchIcon from '@mui/icons-material/Launch';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SchoolIcon from '@mui/icons-material/School';
import TerminalIcon from '@mui/icons-material/Terminal';
import { Box, Link, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { SkillRoadmapDetails } from '../CareerMatch/CareerRoadmap/CareerRoadmap.types';
import { COLORS } from '../../theme/tokens';
import { roadmapPalette } from './roadmapTheme';

export const SkillResources = ({ roadmap }: { roadmap: SkillRoadmapDetails }) => {
  const { t } = useTranslation();
  return (
    <Stack spacing={2} mt={3}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {roadmap.officialDocs && (
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: COLORS.bgIconTinted, border: '1px solid #cce2d4', flex: 1, minWidth: 220 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: roadmapPalette.primary, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <MenuBookIcon sx={{ fontSize: 15 }} /> {t('Official Documentation')}
            </Typography>
            <Link href={roadmap.officialDocs.url} target="_blank" rel="noreferrer" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 800, color: roadmapPalette.ink, mt: 0.5, textDecoration: 'none' }}>
              {roadmap.officialDocs.title} <LaunchIcon sx={{ fontSize: 14 }} />
            </Link>
          </Paper>
        )}
        {roadmap.playground && (
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: COLORS.warningSoft, border: '1px solid #f2dec0', flex: 1, minWidth: 220 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: roadmapPalette.amber, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <TerminalIcon sx={{ fontSize: 15 }} /> {t('Interactive Playground / Testing')}
            </Typography>
            <Link href={roadmap.playground.url} target="_blank" rel="noreferrer" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 800, color: roadmapPalette.ink, mt: 0.5, textDecoration: 'none' }}>
              {roadmap.playground.title} <LaunchIcon sx={{ fontSize: 14 }} />
            </Link>
          </Paper>
        )}
      </Box>
      {roadmap.projectIdeas && roadmap.projectIdeas.length > 0 && (
        <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: COLORS.surfaceSubtle, border: '1px solid #e2ebe4' }}>
          <Typography sx={{ fontWeight: 850, fontSize: 14, color: roadmapPalette.ink, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeIcon sx={{ fontSize: 16, color: roadmapPalette.primary }} /> {t('Practical Project Ideas to Build')}
          </Typography>
          <Stack spacing={1} mt={1.5}>
            {roadmap.projectIdeas.map((idea, index) => (
              <Stack key={index} direction="row" gap={1} alignItems="flex-start">
                <Box sx={{ minWidth: 20, height: 20, borderRadius: '50%', bgcolor: roadmapPalette.primary, color: COLORS.onAccent, fontSize: 11, fontWeight: 800, display: 'grid', placeItems: 'center', mt: 0.25 }}>{index + 1}</Box>
                <Typography sx={{ fontSize: 14, color: roadmapPalette.ink, fontWeight: 600 }}>{idea}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
      {roadmap.courseLinks && roadmap.courseLinks.length > 0 && (
        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: roadmapPalette.muted, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <SchoolIcon sx={{ fontSize: 15 }} /> {t('Free Tutorials & Guides')}
          </Typography>
          <Stack direction="row" gap={2} flexWrap="wrap" mt={1}>
            {roadmap.courseLinks.map((course, index) => (
              <Link key={index} href={course.url} target="_blank" rel="noreferrer" sx={{ fontSize: 13, fontWeight: 700, color: roadmapPalette.primary, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SchoolIcon sx={{ fontSize: 15 }} /> {course.title} <LaunchIcon sx={{ fontSize: 13 }} />
              </Link>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
};
