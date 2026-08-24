import { Paper, Tab, Tabs } from '@mui/material';
import { useTranslation } from 'react-i18next';
import CvVariantResults, { type CvVariant } from '../components/CvVariantResults';
import type { ApplicationUserProfile, ChecklistItem } from './applicationWorkspace.types';
import { ChecklistPanel } from './ChecklistPanel';
import { QuickCopyPanel } from './QuickCopyPanel';

interface WorkspaceTabsProps {
  activeTab: number;
  cvText?: string;
  coverLetter: string;
  userProfile?: ApplicationUserProfile | null;
  variants: CvVariant[];
  selectedVariantId: string | null;
  checklist: ChecklistItem[];
  onTabChange: (tab: number) => void;
  onCopy: (text: string, label: string) => void;
  onSelectVariant: (variantId: string) => void;
  onRecordVariant: (variantId: string, outcome: 'sent' | 'response') => void;
  onToggleChecklist: (id: string) => void;
}

export const WorkspaceTabs = ({
  activeTab,
  cvText,
  coverLetter,
  userProfile,
  variants,
  selectedVariantId,
  checklist,
  onTabChange,
  onCopy,
  onSelectVariant,
  onRecordVariant,
  onToggleChecklist,
}: WorkspaceTabsProps) => {
  const { t } = useTranslation();
  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <Tabs value={activeTab} onChange={(_, value) => onTabChange(value)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: '1px solid', borderColor: 'divider', mb: 3 }}>
        <Tab label={t('Match Analysis')} />
        <Tab label={t('Cover Letter')} />
        <Tab label={t('CV Variants (A/B)')} />
        <Tab label={t('Screening Q&A')} />
        <Tab label={t('Notes & Reminder')} />
      </Tabs>
      {activeTab === 0 && <QuickCopyPanel cvText={cvText} coverLetter={coverLetter} userProfile={userProfile} onCopy={onCopy} />}
      {activeTab === 2 && (
        <CvVariantResults
          variants={variants}
          selectedVariantId={selectedVariantId}
          onSelect={onSelectVariant}
          onRecord={onRecordVariant}
          onCopy={onCopy}
        />
      )}
      <ChecklistPanel checklist={checklist} onToggle={onToggleChecklist} />
    </Paper>
  );
};
