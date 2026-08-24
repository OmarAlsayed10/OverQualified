import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { Box, Chip, Divider, LinearProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../../../theme/tokens';
import { roundScore } from '../../../../../utils/scoreDisplay';
import type { CVChange, ScoreCategory } from '../../../../../redux/store/slices/cvAdjustSlice';
import { PathTo100 } from './PathTo100';

const IMPACT_CONFIG = {
  high: { color: COLORS.danger, bg: COLORS.dangerSoft, label: 'High Impact' },
  medium: { color: COLORS.accentOrange, bg: COLORS.accentOrangeSoft, label: 'Medium Impact' },
  low: { color: COLORS.textSecondary, bg: COLORS.bgHover, label: 'Low Impact' },
};

interface ChangesListProps {
  changes: CVChange[];
  originalScore: number;
  newScore: number;
  newBreakdown: ScoreCategory[];
}

export const ChangesList = ({ changes, originalScore, newScore, newBreakdown }: ChangesListProps) => {
  const { t } = useTranslation();
  const safeOrig = roundScore(Number.isFinite(originalScore) ? originalScore : 0);
  const safeNew = roundScore(Number.isFinite(newScore) ? newScore : originalScore);
  const gain = safeNew - safeOrig;

  return (
    <Box>
      <Box sx={{
        p: 3, mb: 3, borderRadius: '16px',
        background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
        color: COLORS.onAccent, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap',
      }}>
        <TrendingUpIcon sx={{ fontSize: 40, opacity: 0.9 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            {t('CV Quality Score After Optimization')}
          </Typography>
          <Typography sx={{ opacity: 0.85, fontSize: '0.95rem' }}>
            {t('Your optimized CV was re-scored by the same AI — an estimate of how it now performs against ATS standards.')}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '2rem', fontWeight: 'bold', opacity: 0.7 }}>{safeOrig}</Typography>
              <Typography sx={{ fontSize: '0.75rem', opacity: 0.7 }}>{t('Before')}</Typography>
            </Box>
            <Typography sx={{ fontSize: '2rem', opacity: 0.6 }}>→</Typography>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{safeNew}</Typography>
              <Typography sx={{ fontSize: '0.75rem', opacity: 0.9 }}>{t('After')}</Typography>
            </Box>
            <Chip
              label={gain > 0 ? `+${gain} pts` : `${gain} pts`}
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: COLORS.onAccent, fontWeight: 'bold', fontSize: '1rem' }}
            />
          </Box>
          <LinearProgress
            variant="determinate"
            value={safeNew}
            sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.2)', '& .MuiLinearProgress-bar': { bgcolor: COLORS.bgWhite } }}
          />
        </Box>
      </Box>

      <PathTo100 breakdown={newBreakdown} newScore={safeNew} />

      {gain <= 0 ? (
        <Box sx={{ p: 2.5, borderRadius: '14px', bgcolor: COLORS.bgLight, border: `1px solid ${COLORS.borderLight}` }}>
          <Typography sx={{ color: COLORS.textPrimary, fontWeight: 600, mb: 0.5 }}>
            {t('Your CV is already well-optimized')}
          </Typography>
          <Typography sx={{ color: COLORS.textSecondary, fontSize: '0.88rem', lineHeight: 1.6 }}>
            {t('Rewriting did not raise the score — the writing is already strong. The remaining points above are what to focus on next.')}
          </Typography>
        </Box>
      ) : (
        <>
      <Typography variant="h6" sx={{ fontWeight: 'bold', color: COLORS.textPrimary, mb: 2 }}>
        {t('What was changed and why')}
      </Typography>
      {changes.map((change, i) => {
        const config = IMPACT_CONFIG[change.impact] || IMPACT_CONFIG.low;
        return (
          <Box key={i} sx={{ mb: 2.5, p: 2.5, borderRadius: '14px', border: `1px solid ${COLORS.borderLight}`, bgcolor: config.bg }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
              <Chip
                label={change.section}
                size="small"
                sx={{ bgcolor: COLORS.primaryAlpha12, color: COLORS.primary, fontWeight: 'bold', fontSize: '0.78rem' }}
              />
              <Chip
                label={t(config.label)}
                size="small"
                sx={{ bgcolor: config.bg, color: config.color, fontWeight: 600, fontSize: '0.75rem', border: `1px solid ${COLORS.borderLight}` }}
              />
            </Box>
            <Typography sx={{ fontWeight: 600, color: COLORS.textPrimary, mb: 0.5, fontSize: '0.92rem' }}>
              {change.what}
            </Typography>
            <Typography sx={{ color: COLORS.textSecondary, fontSize: '0.85rem', lineHeight: 1.6 }}>
              <b>{t('Why:')}</b> {change.why}
            </Typography>
            {i < changes.length - 1 && <Divider sx={{ mt: 2, opacity: 0 }} />}
          </Box>
        );
      })}
        </>
      )}
    </Box>
  );
};
