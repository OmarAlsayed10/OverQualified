import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Box, Chip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../../../theme/tokens';
import type { ScoreCategory } from '../../../../../redux/store/slices/cvAdjustSlice';

interface PathTo100Props {
  breakdown: ScoreCategory[];
  newScore: number;
}

export const PathTo100 = ({ breakdown, newScore }: PathTo100Props) => {
  const { t } = useTranslation();
  const gaps = breakdown
    .filter((c) => c.earned < c.max && c.tip && c.tip !== 'null')
    .sort((a, b) => (b.max - b.earned) - (a.max - a.earned));
  if (gaps.length === 0 || newScore >= 100) return null;

  const userGaps = gaps.filter((c) => c.owner !== 'ai');
  const aiGaps = gaps.filter((c) => c.owner === 'ai');
  const content = userGaps.filter((c) => c.blocker !== 'experience');
  const experience = userGaps.filter((c) => c.blocker === 'experience');
  const toGo = Math.max(1, 100 - newScore);

  const Row = ({ c }: { c: ScoreCategory }) => (
    <Box sx={{ mb: 1.5 }}>
      <Typography sx={{ fontWeight: 600, color: COLORS.textPrimary, fontSize: '0.88rem' }}>
        {c.name}
      </Typography>
      <Typography sx={{ color: COLORS.textSecondary, fontSize: '0.82rem', lineHeight: 1.55 }}>{c.tip}</Typography>
    </Box>
  );

  return (
    <Box sx={{ mb: 3, p: 3, borderRadius: '16px', border: `1px solid ${COLORS.borderLight}`, bgcolor: COLORS.bgLight }}>
      <Typography variant="h6" sx={{ fontWeight: 'bold', color: COLORS.textPrimary, mb: 0.5 }}>
        {t('Your path to 100')}
      </Typography>
      <Typography sx={{ color: COLORS.textSecondary, fontSize: '0.88rem', mb: 2.5 }}>
        {t('You are at {{score}} — {{gap}} points to 100. Here is how to close the gap:', { score: newScore, gap: toGo })}
      </Typography>

      {content.length > 0 && (
        <Box sx={{ mb: experience.length > 0 || aiGaps.length > 0 ? 2.5 : 0 }}>
          <Chip
            label={t('Only you can add these')}
            size="small"
            sx={{ mb: 1.5, bgcolor: COLORS.primaryAlpha12, color: COLORS.primary, fontWeight: 700 }}
          />
          {content.map((c) => <Row key={c.name} c={c} />)}
        </Box>
      )}

      {experience.length > 0 && (
        <Box sx={{ mb: aiGaps.length > 0 ? 2.5 : 0 }}>
          <Chip
            label={t('Needs more real experience')}
            size="small"
            sx={{ mb: 1.5, bgcolor: COLORS.borderLight, color: COLORS.textSecondary, fontWeight: 700 }}
          />
          {experience.map((c) => <Row key={c.name} c={c} />)}
          <Typography sx={{ mt: 1, color: COLORS.textSecondary, fontSize: '0.8rem', fontStyle: 'italic' }}>
            {t('These points come from experience you earn over time — a perfect 100 is not expected, or honest, for every stage of a career.')}
          </Typography>
        </Box>
      )}

      {aiGaps.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <CheckCircleIcon sx={{ color: COLORS.primary, fontSize: 18, mt: 0.2 }} />
          <Typography sx={{ color: COLORS.textSecondary, fontSize: '0.82rem', lineHeight: 1.55 }}>
            {t('The AI already rewrote your {{sections}} for maximum impact — no action needed there.', {
              sections: aiGaps.map((c) => c.name).join(', '),
            })}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
