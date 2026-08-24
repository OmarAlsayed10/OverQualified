import { Alert, Box, Button, Chip, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface CvVariant {
  id: string;
  label: string;
  content: string;
  sentCount: number;
  responseCount: number;
}

interface CvVariantResultsProps {
  variants: CvVariant[];
  selectedVariantId: string | null;
  onSelect: (variantId: string) => void;
  onRecord: (variantId: string, outcome: 'sent' | 'response') => Promise<void>;
  onCopy: (text: string, label: string) => void;
}

const CvVariantResults = ({ variants, selectedVariantId, onSelect, onRecord, onCopy }: CvVariantResultsProps) => {
  const { t } = useTranslation();
  const measuredRates = variants
    .filter((variant) => variant.sentCount > 0)
    .map((variant) => variant.responseCount / variant.sentCount);
  const bestResponseRate = measuredRates.length > 0 ? Math.max(...measuredRates) : 0;

  if (variants.length === 0) {
    return <Alert severity="info">{t('Generate CV variants from Job Radar to compare their results here.')}</Alert>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {variants.map((variant) => {
        const variantResponseRate = variant.sentCount > 0 ? variant.responseCount / variant.sentCount : 0;
        const responseRate = Math.round(variantResponseRate * 100);
        const isBest = variants.length > 1 && variant.sentCount > 0 && variantResponseRate === bestResponseRate;
        return (
          <Paper key={variant.id} variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" fontWeight={700}>{variant.label}</Typography>
                {isBest && <Chip label={t('Best response rate')} color="success" size="small" />}
                {selectedVariantId === variant.id && <Chip label={t('Selected')} color="primary" size="small" />}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={`${t('Sent')}: ${variant.sentCount}`} size="small" />
                <Chip label={`${t('Responses')}: ${variant.responseCount}`} size="small" />
                <Chip label={`${t('Response rate')}: ${responseRate}%`} size="small" />
              </Box>
            </Box>
            <Typography sx={{ whiteSpace: 'pre-wrap', maxHeight: 240, overflow: 'auto', mb: 2 }}>
              {variant.content}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" onClick={() => onCopy(variant.content, variant.label)}>{t('Copy variant')}</Button>
              <Button variant={selectedVariantId === variant.id ? 'contained' : 'outlined'} onClick={() => onSelect(variant.id)}>
                {t('Use this variant')}
              </Button>
              <Button variant="outlined" disabled={variant.sentCount > 0} onClick={() => void onRecord(variant.id, 'sent')}>
                {t('Mark as sent')}
              </Button>
              <Button variant="outlined" disabled={variant.sentCount === 0 || variant.responseCount > 0} onClick={() => void onRecord(variant.id, 'response')}>
                {t('Mark response received')}
              </Button>
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
};

export default CvVariantResults;
