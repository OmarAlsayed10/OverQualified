import {
  Box,
  Typography,
  Button,
  IconButton,
  Stack,
  Tooltip,
  Collapse,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { updateSection } from '../../../../redux/store/slices/cvBuilderSlice';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import FormInput from '../../../../components/ui/FormInput';
import AIEditInput from '../../components/AIEditInput/AIEditInput';
import { ClaimAuditPanel } from '../ClaimAuditPanel';
import { EntryChipRow, EntryToolbar } from '../../components/EntryChip';
import UndoButton from '../../../../components/ui/UndoButton/UndoButton';
import { useEffect, useState } from 'react';
import experience from './experience.tokens';
import type { RootState } from '../../../../redux/store/store';
import type { Control, UseFormSetValue } from 'react-hook-form';
import type { ExperienceFormData } from './Experience.types';
import { useFieldUndo } from '../../../../hooks/useFieldUndo';
import { useTranslation as useTranslationType } from 'react-i18next';
import { normalizePastedBulletText } from '../../../../templates/bulletLines';

interface ExperienceDescriptionFieldProps {
  control: Control<ExperienceFormData>;
  index: number;
  rowId: string;
  setValue: UseFormSetValue<ExperienceFormData>;
  jobTitle?: string;
  company?: string;
  t: ReturnType<typeof useTranslationType>['t'];
}

const ExperienceDescriptionField = ({
  control,
  index,
  rowId,
  setValue,
  jobTitle,
  company,
  t,
}: ExperienceDescriptionFieldProps) => {
  const descUndo = useFieldUndo<string>(`experience.${rowId}.description`, (v) =>
    setValue(`experience.${index}.description`, v, { shouldDirty: true }),
  );

  return (
    <Controller
      name={`experience.${index}.description`}
      control={control}
      render={({ field: f, fieldState: { error } }) => (
        <FormInput
          {...f}
          onChange={(e) => {
            descUndo.onTypingChange(f.value || '');
            f.onChange(e);
          }}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData('text');
            const normalized = normalizePastedBulletText(pasted);
            if (normalized === pasted) return;
            event.preventDefault();
            const input = event.target as HTMLTextAreaElement;
            const current = f.value || '';
            descUndo.pushChange(current);
            setValue(
              `experience.${index}.description`,
              `${current.slice(0, input.selectionStart)}${normalized}${current.slice(input.selectionEnd)}`,
              { shouldDirty: true },
            );
          }}
          onBlur={() => {
            descUndo.commitTyping();
            f.onBlur();
          }}
          label={t('Description')}
          labelAction={
            <Stack direction="row" spacing={0.5} alignItems="center">
              <UndoButton disabled={!descUndo.canUndo} onUndo={descUndo.undo} />
              <AIEditInput
                section="experience"
                currentContent={f.value || ''}
                context={{ jobTitle, company }}
                onResult={(text) => {
                  descUndo.pushChange(f.value || '');
                  setValue(`experience.${index}.description`, normalizePastedBulletText(text), { shouldDirty: true });
                }}
              />
            </Stack>
          }
          placeholder={t('Jot down rough notes — e.g. "built react dashboard, cut load time 40%" — then hit the AI icon')}
          error={!!error}
          helperText={error ? t(error.message ?? '') : ''}
          multiline
          minRows={4}
          formatting={{
            onValueChange: (text) => {
              descUndo.pushChange(f.value || '');
              setValue(`experience.${index}.description`, text, { shouldDirty: true });
            },
          }}
        />
      )}
    />
  );
};

const experienceSchema = z.object({
  experience: z.array(
    z.object({
      jobTitle: z.string().min(1, 'Job Title is required'),
      company: z.string().min(1, 'Company is required'),
      location: z.string().min(1, 'Location is required'),
      startDate: z.string().min(1, 'Start Date is required'),
      endDate: z.string().min(1, 'End Date is required'),
      description: z.string().optional(),
    }),
  ),
});

const Experience = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const experiences = useSelector(
    (state: RootState) => state.cvBuilder?.formData?.experience || [],
  );
  const projects = useSelector((state: RootState) => state.cvBuilder?.formData?.projects || []);
  const summary = useSelector(
    (state: RootState) => state.cvBuilder?.formData?.personalInfo?.ProfessionalSummary || '',
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  const { control, watch, setValue } = useForm<ExperienceFormData>({
    resolver: zodResolver(experienceSchema),
    defaultValues: { experience: JSON.parse(JSON.stringify(experiences)) },
    mode: 'onChange',
  });

  const { fields, append, remove, move } = useFieldArray({ control, name: 'experience' });

  useEffect(() => {
    const subscription = watch((value) => {
      const clonedData = value.experience ? JSON.parse(JSON.stringify(value.experience)) : [];
      dispatch(updateSection({ section: 'experience', data: clonedData }));
    });
    return () => subscription.unsubscribe();
  }, [watch, dispatch]);

  const addExperience = () => {
    append({ jobTitle: '', company: '', location: '', startDate: '', endDate: '', description: '' });
    setActiveIndex(fields.length);
  };

  const removeExperience = (index: number) => {
    remove(index);
    setActiveIndex((prev) => Math.max(0, Math.min(prev, fields.length - 2)));
  };

  const moveExperience = (offset: number) => {
    const destination = activeIndex + offset;
    if (destination < 0 || destination >= fields.length) return;
    move(activeIndex, destination);
    setActiveIndex(destination);
  };

  return (
    <Box sx={{ ...experience.root, maxWidth: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" sx={experience.sectionTitle}>
          {t('Work Experience')}
        </Typography>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={() => setIsAuditOpen((open) => !open)}
            sx={experience.addButton}
          >
            {t('Check my claims')}
          </Button>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={addExperience} sx={experience.addButton}>
            {t('Add Experience')}
          </Button>
        </Stack>
      </Stack>

      <Collapse in={isAuditOpen} unmountOnExit>
        <Box sx={{ mb: 2 }}>
          <ClaimAuditPanel
            cv={{
              summary,
              experience: experiences.map((entry: { description?: string }) => ({
                description: entry.description || '',
              })),
              projects: projects.map((entry: { description?: string }) => ({
                description: entry.description || '',
              })),
            }}
          />
        </Box>
      </Collapse>

      <Box sx={experience.entriesBox}>
        <EntryChipRow
          labels={fields.map((_, index) => watch(`experience.${index}`)?.jobTitle || `${t('Experience')} ${index + 1}`)}
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
        />

        {fields.map((field, index) => {
          if (index !== activeIndex) return null;
          return (
            <Box key={field.id}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={experience.itemTitle}>
                  {t('Experience')} {index + 1}
                </Typography>
                <EntryToolbar
                  onMove={moveExperience}
                  onDelete={() => removeExperience(index)}
                  isFirst={index === 0}
                  isLast={index === fields.length - 1}
                  deleteLabel={t('Delete experience')}
                  deleteSx={experience.deleteButton}
                />
              </Box>

              <Box sx={experience.row}>
                <Box sx={experience.halfWidth}>
                  <Controller
                    name={`experience.${index}.jobTitle`}
                    control={control}
                    render={({ field: f, fieldState: { error } }) => (
                      <FormInput {...f} label={t('Job Title')} placeholder={t('Marketing Manager')} error={!!error} helperText={error ? t(error.message ?? '') : ''} required />
                    )}
                  />
                </Box>
                <Box sx={experience.halfWidth}>
                  <Controller
                    name={`experience.${index}.company`}
                    control={control}
                    render={({ field: f, fieldState: { error } }) => (
                      <FormInput {...f} label={t('Company')} placeholder={t('Company Name')} error={!!error} helperText={error ? t(error.message ?? '') : ''} required />
                    )}
                  />
                </Box>
              </Box>

              <Box sx={experience.row}>
                <Box sx={experience.fullWidth}>
                  <Controller
                    name={`experience.${index}.location`}
                    control={control}
                    render={({ field: f, fieldState: { error } }) => (
                      <FormInput {...f} label={t('Location')} placeholder={t('New York, NY')} error={!!error} helperText={error ? t(error.message ?? '') : ''} required />
                    )}
                  />
                </Box>
                <Box sx={experience.halfWidth}>
                  <Controller
                    name={`experience.${index}.startDate`}
                    control={control}
                    render={({ field: f, fieldState: { error } }) => (
                      <FormInput {...f} label={t('Start Date')} placeholder={t('Jan 2020')} error={!!error} helperText={error ? t(error.message ?? '') : ''} required />
                    )}
                  />
                </Box>
                <Box sx={experience.halfWidth}>
                  <Controller
                    name={`experience.${index}.endDate`}
                    control={control}
                    render={({ field: f, fieldState: { error } }) => (
                      <FormInput {...f} label={t('End Date')} placeholder={t('Present')} error={!!error} helperText={error ? t(error.message ?? '') : ''} required />
                    )}
                  />
                </Box>
              </Box>

              <ExperienceDescriptionField
                control={control}
                index={index}
                rowId={field.id}
                setValue={setValue}
                jobTitle={watch(`experience.${index}.jobTitle`)}
                company={watch(`experience.${index}.company`)}
                t={t}
              />
            </Box>
          );
        })}

        {fields.length === 0 && (
          <Typography sx={experience.emptyText}>
            {t('No experiences added yet')}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default Experience;
