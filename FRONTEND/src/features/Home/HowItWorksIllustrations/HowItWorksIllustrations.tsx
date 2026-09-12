import { Box } from '@mui/material';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { ReactNode } from 'react';
import { COLORS } from '../../../theme/tokens';

const keyframes = `
@keyframes hiw-line { from { width: 0; opacity: 0; } to { opacity: 1; } }
@keyframes hiw-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes hiw-pop { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes hiw-ring { from { stroke-dashoffset: 264; } to { stroke-dashoffset: 21; } }
@keyframes hiw-bar { from { width: 0; } }
@keyframes hiw-fly { 0% { transform: translate(0,0) rotate(0); opacity: 0; } 20% { opacity: 1; } 100% { transform: translate(140px,-60px) rotate(-15deg); opacity: 0; } }
@keyframes hiw-fill { from { width: 0; } to { width: 100%; } }
`;

const frame = {
  position: 'relative',
  width: '100%',
  height: '100%',
  minHeight: 180,
  p: { xs: 2, md: 3 },
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  bgcolor: COLORS.surfaceSubtle,
  overflow: 'hidden',
} as const;

const line = (width: string, delay: number, color: string = COLORS.primaryAlpha20) => ({
  height: 8,
  width,
  borderRadius: 4,
  bgcolor: color,
  animation: `hiw-line 0.5s ${delay}s cubic-bezier(0.22,1,0.36,1) both`,
});

const UploadIllustration = () => (
  <Box sx={frame}>
    <style>{keyframes}</style>
    <Box sx={{ width: 190, p: 2, borderRadius: 2, bgcolor: COLORS.bgWhite, border: `1px solid ${COLORS.borderLight}`, boxShadow: '0 12px 30px rgba(0,0,0,0.08)', animation: 'hiw-float 4s ease-in-out infinite' }}>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 1.5 }}>
        <Box sx={{ width: 34, height: 34, borderRadius: '50%', bgcolor: COLORS.primaryAlpha12, animation: 'hiw-pop 0.4s both' }} />
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Box sx={line('80%', 0.1, COLORS.primary)} />
          <Box sx={line('55%', 0.2)} />
        </Box>
      </Box>
      {[['100%', 0.35], ['90%', 0.45], ['70%', 0.55], ['95%', 0.65], ['60%', 0.75]].map(([w, d], i) => (
        <Box key={i} sx={{ ...line(w as string, d as number), mb: 0.75 }} />
      ))}
    </Box>
    <Box sx={{ position: 'absolute', right: { xs: 16, md: 36 }, bottom: { xs: 16, md: 32 }, width: 56, height: 56, borderRadius: '50%', bgcolor: COLORS.primary, color: COLORS.onAccent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 24px rgba(0,0,0,0.18)', animation: 'hiw-pop 0.5s 0.9s both, hiw-float 3s 1.4s ease-in-out infinite' }}>
      <UploadFileOutlinedIcon />
    </Box>
  </Box>
);

const SCORE_BARS: [string, string][] = [['ATS match', '92%'], ['Keywords', '78%'], ['Readability', '88%']];

const AnalysisIllustration = () => (
  <Box sx={{ ...frame, gap: { xs: 2, md: 4 }, flexWrap: 'wrap' }}>
    <style>{keyframes}</style>
    <Box sx={{ position: 'relative', width: 120, height: 120, animation: 'hiw-pop 0.5s both' }}>
      <svg viewBox="0 0 100 100" width="120" height="120">
        <circle cx="50" cy="50" r="42" fill="none" stroke={COLORS.primaryAlpha12} strokeWidth="9" />
        <circle
          cx="50" cy="50" r="42" fill="none" stroke={COLORS.primary} strokeWidth="9" strokeLinecap="round"
          strokeDasharray="264" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', animation: 'hiw-ring 1.4s 0.3s cubic-bezier(0.22,1,0.36,1) both' }}
        />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: COLORS.textPrimary }}>
        <Box sx={{ fontSize: '1.7rem', lineHeight: 1 }}>92</Box>
        <Box sx={{ fontSize: '0.6rem', color: COLORS.textSecondary, letterSpacing: 1 }}>SCORE</Box>
      </Box>
    </Box>
    <Box sx={{ flex: '1 1 160px', maxWidth: 240, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {SCORE_BARS.map(([label, value], i) => (
        <Box key={label}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 600, color: COLORS.textSecondary, mb: 0.5 }}>
            <span>{label}</span><span>{value}</span>
          </Box>
          <Box sx={{ height: 8, borderRadius: 4, bgcolor: COLORS.primaryAlpha12, overflow: 'hidden' }}>
            <Box sx={{ height: '100%', width: value, borderRadius: 4, bgcolor: i === 1 ? COLORS.warning : COLORS.success, animation: `hiw-bar 1s ${0.5 + i * 0.2}s cubic-bezier(0.22,1,0.36,1) both` }} />
          </Box>
        </Box>
      ))}
    </Box>
  </Box>
);

const STAGES = ['Applied', 'Screening', 'Interview', 'Offer'];

const ApplyIllustration = () => (
  <Box sx={{ ...frame, flexDirection: 'column', gap: 3 }}>
    <style>{keyframes}</style>
    <Box sx={{ position: 'relative', width: '100%', maxWidth: 360, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box sx={{ position: 'absolute', left: 16, right: 16, top: 16, height: 3, bgcolor: COLORS.primaryAlpha12, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ height: '100%', bgcolor: COLORS.primary, animation: 'hiw-fill 1.6s 0.4s cubic-bezier(0.22,1,0.36,1) both' }} />
      </Box>
      {STAGES.map((stage, i) => (
        <Box key={stage} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, position: 'relative', zIndex: 1 }}>
          <Box sx={{ width: 34, height: 34, borderRadius: '50%', bgcolor: COLORS.primary, color: COLORS.onAccent, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: `hiw-pop 0.4s ${0.5 + i * 0.4}s cubic-bezier(0.34,1.56,0.64,1) both` }}>
            <CheckRoundedIcon sx={{ fontSize: 18 }} />
          </Box>
          <Box sx={{ fontSize: '0.68rem', fontWeight: 700, color: COLORS.textSecondary }}>{stage}</Box>
        </Box>
      ))}
    </Box>
    <Box sx={{ position: 'relative', width: 200, p: 1.5, borderRadius: 2, bgcolor: COLORS.bgWhite, border: `1px solid ${COLORS.borderLight}`, display: 'flex', alignItems: 'center', gap: 1.5, animation: 'hiw-pop 0.5s 0.2s both' }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Box sx={line('70%', 0.3, COLORS.primary)} />
        <Box sx={line('45%', 0.4)} />
      </Box>
      <Box sx={{ color: COLORS.primary, animation: 'hiw-fly 2.4s 1s ease-in-out infinite' }}>
        <SendRoundedIcon />
      </Box>
    </Box>
  </Box>
);

export const STEP_ILLUSTRATIONS: ReactNode[] = [
  <UploadIllustration key="upload" />,
  <AnalysisIllustration key="analysis" />,
  <ApplyIllustration key="apply" />,
];
