import { Box, IconButton, MenuItem, Select, Step, StepButton, Stepper, TextField, Tooltip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Plus } from '../../../components/icons/MuiIcons';
import builder from './builder.tokens';

interface BuilderNavigationProps {
  title: string;
  titlePlaceholder: string;
  steps: string[];
  activeStep: number;
  onTitleChange: (title: string) => void;
  onStepChange: (step: number) => void;
  onAddSection: () => void;
}

export const BuilderNavigation = ({
  title,
  titlePlaceholder,
  steps,
  activeStep,
  onTitleChange,
  onStepChange,
  onAddSection,
}: BuilderNavigationProps) => {
  const { t } = useTranslation();
  return (
    <>
      <Box sx={builder.nameBar}>
        <TextField
          size="small"
          variant="standard"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={titlePlaceholder}
          inputProps={{ maxLength: 80, 'aria-label': t('CV name') }}
          sx={builder.nameField}
        />
      </Box>
      <Box sx={builder.stepperBar}>
        <Stepper nonLinear activeStep={activeStep} alternativeLabel sx={builder.stepper}>
          {steps.map((label, index) => (
            <Step key={`${label}-${index}`}>
              <StepButton onClick={() => onStepChange(index)}>{t(label)}</StepButton>
            </Step>
          ))}
        </Stepper>
        <Tooltip title={t('Add a section')}>
          <IconButton onClick={onAddSection} sx={{ ml: 1, flexShrink: 0 }}><Plus size={20} /></IconButton>
        </Tooltip>
        <Box sx={builder.stepperCompact}>
          <Typography sx={builder.stepperCompactCount}>{activeStep + 1}/{steps.length}</Typography>
          <Select
            variant="standard"
            disableUnderline
            value={activeStep}
            onChange={(event) => onStepChange(Number(event.target.value))}
            sx={builder.stepperCompactSelect}
          >
            {steps.map((label, index) => <MenuItem key={label} value={index}>{t(label)}</MenuItem>)}
          </Select>
        </Box>
      </Box>
    </>
  );
};
