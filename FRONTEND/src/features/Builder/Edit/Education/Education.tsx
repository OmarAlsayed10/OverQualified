import {
  Box,
  Typography,
  Button,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { updateSection } from '../../../../redux/store/slices/cvBuilderSlice';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { educationSchema } from '../../cvRequirements';
import FormInput from '../../../../components/ui/FormInput';
import AIEditInput from '../../components/AIEditInput/AIEditInput';
import UndoButton from '../../../../components/ui/UndoButton/UndoButton';
import { useEffect, useState } from 'react';
import education from './education.tokens';
import type { RootState } from '../../../../redux/store/store';
import type { Control, UseFormSetValue } from 'react-hook-form';
import type { EducationFormData } from './Education.types';
import { EDUCATION_STATUSES, type EducationStatus } from '../../../../utils/educationPeriod';
import { useFieldUndo } from '../../../../hooks/useFieldUndo';
import { EntryChipRow, EntryToolbar } from '../../components/EntryChip';
import type { useTranslation as useTranslationType } from 'react-i18next';

interface EducationDescriptionFieldProps {
  control: Control<EducationFormData>;
  index: number;
  rowId: string;
  setValue: UseFormSetValue<EducationFormData>;
  institution?: string;
  degree?: string;
  t: ReturnType<typeof useTranslationType>['t'];
}

const EducationDescriptionField = ({
  control,
  index,
  rowId,
  setValue,
  institution,
  degree,
  t,
}: EducationDescriptionFieldProps) => {
  const descUndo = useFieldUndo<string>(`education.${rowId}.description`, (v) =>
    setValue(`education.${index}.description`, v, { shouldDirty: true }),
  );

  return (
    <Controller
      name={`education.${index}.description`}
      control={control}
      render={({ field: f, fieldState: { error } }) => (
        <FormInput
          {...f}
          onChange={(e) => {
            descUndo.onTypingChange(f.value || '');
            f.onChange(e);
          }}
          onBlur={() => {
            descUndo.commitTyping();
            f.onBlur();
          }}
          label={t('Description (Optional)')}
          labelAction={
            <Stack direction="row" spacing={0.5} alignItems="center">
              <UndoButton disabled={!descUndo.canUndo} onUndo={descUndo.undo} />
              <AIEditInput
                section="education"
                currentContent={f.value || ''}
                context={{ institution, degree }}
                onResult={(text) => {
                  descUndo.pushChange(f.value || '');
                  setValue(`education.${index}.description`, text, { shouldDirty: true });
                }}
              />
            </Stack>
          }
          placeholder={t('Describe your education experience here...')}
          error={!!error}
          helperText={error ? t(error.message ?? '') : ''}
          multiline
          minRows={3}
          formatting={{
            onValueChange: (text) => {
              descUndo.pushChange(f.value || '');
              setValue(`education.${index}.description`, text, { shouldDirty: true });
            },
          }}
        />
      )}
    />
  );
};


const STATUS_OPTIONS: { value: EducationStatus; label: string }[] = [
  { value: 'graduated', label: 'Graduated' },
  { value: 'undergraduate', label: 'Undergraduate' },
];

const DEGREE_LABEL: Record<EducationStatus, string> = {
  graduated: 'Degree',
  undergraduate: 'Degree in progress',
};

const END_YEAR_LABEL: Record<EducationStatus, string> = {
  graduated: 'Graduation Year',
  undergraduate: 'Expected Graduation Year (Optional)',
};

const Education = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const educations = useSelector(
    (state: RootState) => state.cvBuilder?.formData?.education || [],
  );

  const [activeIndex, setActiveIndex] = useState(0);

  const { control, watch, setValue, trigger } = useForm<EducationFormData>({
    resolver: zodResolver(educationSchema),
    defaultValues: {
      // CVs saved before the status existed describe a finished degree — that was the only
      // case the builder supported — so they load as "graduated" rather than as an empty toggle.
      education: (JSON.parse(JSON.stringify(educations)) as EducationFormData['education']).map(
        (entry) => ({ ...entry, status: entry.status || 'graduated' }),
      ),
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'education' });

  // The AI writes only the facts the user gave, so an entry it created can land with required
  // fields empty. Validate once on mount so those fields show their error instead of failing
  // silently; a brand-new empty section stays quiet.
  useEffect(() => {
    if (educations.some((entry) => Object.values(entry).some(Boolean))) void trigger();
  }, []);

  useEffect(() => {
    const subscription = watch((value) => {
      const clonedData = value.education ? JSON.parse(JSON.stringify(value.education)) : [];
      dispatch(updateSection({ section: 'education', data: clonedData }));
    });
    return () => subscription.unsubscribe();
  }, [watch, dispatch]);

  const addEducation = () => {
    append({ status: 'graduated', institution: '', degree: '', location: '', startYear: '', endYear: '', description: '' });
    setActiveIndex(fields.length);
  };

  const removeEducation = (index: number) => {
    remove(index);
    setActiveIndex((prev) => Math.max(0, Math.min(prev, fields.length - 2)));
  };

  return (
    <Box sx={{ ...education.root, maxWidth: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5" sx={education.sectionTitle}>
          {t('Education')}
        </Typography>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={addEducation} sx={education.addButton}>
          {t('Add Education')}
        </Button>
      </Stack>

      <Box sx={education.entriesBox}>
        <EntryChipRow
          labels={fields.map((_, index) => watch(`education.${index}`)?.institution || `${t('Education')} ${index + 1}`)}
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
        />

        {fields.map((field, index) => {
          if (index !== activeIndex) return null;
          const status = (watch(`education.${index}.status`) || 'graduated') as EducationStatus;
          return (
            <Box key={field.id}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={education.itemTitle}>
                  {t('Education')} {index + 1}
                </Typography>
                <IconButton onClick={() => removeEducation(index)} sx={education.deleteButton}>
                  <DeleteIcon />
                </IconButton>
              </Box>

              <Controller
                name={`education.${index}.status`}
                control={control}
                render={({ field: f }) => (
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={f.value || 'graduated'}
                    onChange={(_, value) => {
                      if (!value) return;
                      f.onChange(value);
                      void trigger(`education.${index}`);
                    }}
                    sx={{ mb: 2, flexWrap: 'wrap' }}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <ToggleButton key={option.value} value={option.value} sx={{ textTransform: 'none' }}>
                        {t(option.label)}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                )}
              />

              <Box sx={education.row}>
                <Box sx={education.halfWidth}>
                  <Controller
                    name={`education.${index}.institution`}
                    control={control}
                    render={({ field: f, fieldState: { error } }) => (
                      <FormInput {...f} label={t('Institution')} placeholder={t('University Name')} error={!!error} helperText={error ? t(error.message ?? '') : ''} required />
                    )}
                  />
                </Box>
                <Box sx={education.halfWidth}>
                  <Controller
                    name={`education.${index}.degree`}
                    control={control}
                    render={({ field: f, fieldState: { error } }) => (
                      <FormInput {...f} label={t(DEGREE_LABEL[status])} placeholder={t("Bachelor's in Computer Science")} error={!!error} helperText={error ? t(error.message ?? '') : ''} required />
                    )}
                  />
                </Box>
              </Box>

              <Box sx={education.row}>
                <Box sx={education.halfWidth}>
                  <Controller
                    name={`education.${index}.location`}
                    control={control}
                    render={({ field: f, fieldState: { error } }) => (
                      <FormInput {...f} label={t('Location')} placeholder={t('New York, NY')} error={!!error} helperText={error ? t(error.message ?? '') : ''} required />
                    )}
                  />
                </Box>
                <Box sx={education.quarterWidth}>
                  <Controller
                    name={`education.${index}.startYear`}
                    control={control}
                    render={({ field: f, fieldState: { error } }) => (
                      <FormInput {...f} label={t('Start Year')} placeholder={t('2018')} error={!!error} helperText={error ? t(error.message ?? '') : ''} required />
                    )}
                  />
                </Box>
                <Box sx={education.quarterWidth}>
                  <Controller
                    name={`education.${index}.endYear`}
                    control={control}
                    render={({ field: f, fieldState: { error } }) => (
                      <FormInput
                        {...f}
                        label={t(END_YEAR_LABEL[status])}
                        placeholder={status === 'undergraduate' ? t('2027') : t('2022')}
                        error={!!error}
                        helperText={error ? t(error.message ?? '') : (status === 'undergraduate' ? t('Leave empty to show Present') : '')}
                        required={status !== 'undergraduate'}
                      />
                    )}
                  />
                </Box>
              </Box>

               <EducationDescriptionField
                 control={control}
                 index={index}
                 rowId={field.id}
                 setValue={setValue}
                 institution={watch(`education.${index}.institution`)}
                 degree={watch(`education.${index}.degree`)}
                 t={t}
               />
            </Box>
          );
        })}

        {fields.length === 0 && (
          <Typography>
            {t('No educations added yet')}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default Education;
