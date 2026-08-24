import type { RefObject } from 'react';
import { Badge, Box, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Download, LayoutTemplate, Redo, Save, ShieldAlert, Sparkles, Undo, Upload } from '../../../components/icons/MuiIcons';
import builder from './builder.tokens';

interface BuilderDockProps {
  saving: boolean;
  downloading: boolean;
  importing: boolean;
  undoCount: number;
  redoCount: number;
  checkCount: number;
  warningCount: number;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onUndo: () => void;
  onRedo: () => void;
  onChooseTemplate: () => void;
  onEditWithAi: () => void;
  onSave: () => void;
  onShowChecks: (anchor: HTMLElement) => void;
  onDownload: () => void;
  onImport: (file?: File) => void;
}

interface DockActionProps {
  label: string;
  tooltip?: string;
  children: React.ReactElement;
}

const DockAction = ({ label, tooltip, children }: DockActionProps) => (
  <Box sx={builder.dockItem}>
    <Tooltip title={tooltip || label}>{children}</Tooltip>
    <Typography sx={builder.dockLabel}>{label}</Typography>
  </Box>
);

export const BuilderDock = ({
  saving,
  downloading,
  importing,
  undoCount,
  redoCount,
  checkCount,
  warningCount,
  fileInputRef,
  onUndo,
  onRedo,
  onChooseTemplate,
  onEditWithAi,
  onSave,
  onShowChecks,
  onDownload,
  onImport,
}: BuilderDockProps) => {
  const { t } = useTranslation();
  return (
    <Box sx={builder.dock}>
      <DockAction label={t('Undo')} tooltip={t('Undo last change')}>
        <span><IconButton onClick={onUndo} disabled={undoCount === 0} sx={builder.dockButton}><Undo size={22} /></IconButton></span>
      </DockAction>
      <DockAction label={t('Redo')} tooltip={t('Redo last change')}>
        <span><IconButton onClick={onRedo} disabled={redoCount === 0} sx={builder.dockButton}><Redo size={22} /></IconButton></span>
      </DockAction>
      <DockAction label={t('Choose Template')}>
        <IconButton onClick={onChooseTemplate} sx={builder.dockButton}><LayoutTemplate size={22} /></IconButton>
      </DockAction>
      <DockAction label={t('Edit with AI')}>
        <IconButton onClick={onEditWithAi} sx={builder.dockButton}><Sparkles size={22} /></IconButton>
      </DockAction>
      <DockAction label={t('Save')}>
        <IconButton onClick={onSave} disabled={saving} sx={builder.dockButton}>
          {saving ? <CircularProgress size={20} /> : <Save size={22} />}
        </IconButton>
      </DockAction>
      <DockAction label={t('CV Suggestions')}>
        <IconButton onClick={(event) => onShowChecks(event.currentTarget)} sx={builder.dockButton}>
          <Badge badgeContent={checkCount} color={warningCount > 0 ? 'error' : 'primary'}>
            {checkCount === 0 ? <CheckCircle2 size={22} /> : <ShieldAlert size={22} />}
          </Badge>
        </IconButton>
      </DockAction>
      <DockAction label={t('Download')}>
        <IconButton onClick={onDownload} disabled={downloading} sx={builder.dockButton}>
          {downloading ? <CircularProgress size={20} /> : <Download size={22} />}
        </IconButton>
      </DockAction>
      <DockAction label={t('Upload CV')}>
        <IconButton component="label" sx={builder.dockButton}>
          {importing ? <CircularProgress size={20} /> : <Upload size={22} />}
          <input
            hidden
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(event) => onImport(event.target.files?.[0])}
          />
        </IconButton>
      </DockAction>
    </Box>
  );
};
