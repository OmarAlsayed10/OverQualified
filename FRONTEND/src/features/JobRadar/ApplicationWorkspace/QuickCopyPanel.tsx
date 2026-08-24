import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Box, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ApplicationUserProfile } from './applicationWorkspace.types';

interface QuickCopyPanelProps {
  cvText?: string;
  coverLetter: string;
  userProfile?: ApplicationUserProfile | null;
  onCopy: (text: string, label: string) => void;
}

export const QuickCopyPanel = ({ cvText, coverLetter, userProfile, onCopy }: QuickCopyPanelProps) => {
  const { t } = useTranslation();
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <ContentCopyIcon color="primary" fontSize="small" />
        <Typography variant="h6" fontWeight={700}>{t('Quick Copy Chips')}</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('One-click copy for application forms:')}</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {cvText && (
          <Button fullWidth variant="outlined" size="small" startIcon={<ContentCopyIcon />} onClick={() => onCopy(cvText, t('Primary CV Text'))} sx={{ justifyContent: 'flex-start' }}>
            {t('Copy Full CV Text')}
          </Button>
        )}
        {coverLetter && (
          <Button fullWidth variant="outlined" size="small" startIcon={<ContentCopyIcon />} onClick={() => onCopy(coverLetter, t('Cover Letter'))} sx={{ justifyContent: 'flex-start' }}>
            {t('Copy Cover Letter')}
          </Button>
        )}
        {userProfile?.salaryExpectation && (
          <Button fullWidth variant="outlined" size="small" startIcon={<ContentCopyIcon />} onClick={() => onCopy(`${userProfile.salaryExpectation} ${userProfile.salaryCurrency || 'USD'}`, t('Salary Expectation'))} sx={{ justifyContent: 'flex-start' }}>
            {t('Salary')}: {userProfile.salaryExpectation} {userProfile.salaryCurrency || 'USD'}
          </Button>
        )}
        {userProfile?.noticePeriod && (
          <Button fullWidth variant="outlined" size="small" startIcon={<ContentCopyIcon />} onClick={() => onCopy(userProfile.noticePeriod!, t('Notice Period'))} sx={{ justifyContent: 'flex-start' }}>
            {t('Notice Period')}: {userProfile.noticePeriod.replace('_', ' ')}
          </Button>
        )}
        {userProfile?.visaStatus && (
          <Button fullWidth variant="outlined" size="small" startIcon={<ContentCopyIcon />} onClick={() => onCopy(userProfile.visaStatus!, t('Visa Status'))} sx={{ justifyContent: 'flex-start' }}>
            {t('Visa')}: {userProfile.visaStatus.replace('_', ' ')}
          </Button>
        )}
        {userProfile?.workPreference && (
          <Button fullWidth variant="outlined" size="small" startIcon={<ContentCopyIcon />} onClick={() => onCopy(userProfile.workPreference!, t('Work Preference'))} sx={{ justifyContent: 'flex-start' }}>
            {t('Preference')}: {userProfile.workPreference}
          </Button>
        )}
      </Box>
    </Box>
  );
};
