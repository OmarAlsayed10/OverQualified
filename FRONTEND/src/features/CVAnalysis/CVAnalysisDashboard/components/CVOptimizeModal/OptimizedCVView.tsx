import { Box } from '@mui/material';
import { COLORS, TYPOGRAPHY } from '../../../../../theme/tokens';

interface OptimizedCVViewProps {
  cvText: string;
}

export const OptimizedCVView = ({ cvText }: OptimizedCVViewProps) => (
  <Box
    component="pre"
    sx={{
      fontFamily: TYPOGRAPHY.fontSans,
      fontSize: '0.88rem',
      lineHeight: 1.75,
      color: COLORS.textPrimary,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      m: 0,
      p: 0,
    }}
  >
    {cvText}
  </Box>
);
