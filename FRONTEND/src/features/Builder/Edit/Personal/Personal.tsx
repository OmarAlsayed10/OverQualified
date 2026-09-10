import { Avatar, Box, Typography, Stack, Button, CircularProgress } from '@mui/material';
import axios from 'axios';
import { AI_ENDPOINTS } from '../../../../constants/endpoints';
import EmailIcon from '@mui/icons-material/Email';
import WorkIcon from '@mui/icons-material/Work';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import GitHubIcon from '@mui/icons-material/GitHub';
import LanguageIcon from '@mui/icons-material/Language';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { updateSection } from '../../../../redux/store/slices/cvBuilderSlice';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { personalSchema } from '../../cvRequirements';
import FormInput from '../../../../components/ui/FormInput';
import AIEditInput from '../../components/AIEditInput/AIEditInput';
import PhotoCropDialog from '../../components/PhotoCropDialog/PhotoCropDialog';
import UndoButton from '../../../../components/ui/UndoButton/UndoButton';
import PhoneInput from '../../../../components/ui/PhoneInput';
import LocationInput from '../../../../components/ui/LocationInput';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import { useTemplate } from '../../../../hooks/useTemplate';
import { useFieldUndo } from '../../../../hooks/useFieldUndo';
import personal from './personal.tokens';
import type { RootState } from '../../../../redux/store/store';
import type { PersonalFormData } from './Personal.types';
import { COLORS } from '../../../../theme/tokens';


const Personal = () => {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const { user } = useAuth();
  const personalInfo = useSelector(
    (state: RootState) => state.cvBuilder?.formData?.personalInfo || {},
  );

  const [activeSubTab, setActiveSubTab] = useState<'details' | 'role' | 'summary'>('details');
  const { choosenTemp } = useTemplate();
  const supportsPhoto = choosenTemp === 'photo-cv';
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const { control, watch, setValue, trigger } = useForm<PersonalFormData>({
    resolver: zodResolver(personalSchema),
    defaultValues: personalInfo,
    mode: 'onChange',
  });

  const summaryUndo = useFieldUndo<string>('personalInfo.ProfessionalSummary', (v) =>
    setValue('ProfessionalSummary', v, { shouldDirty: true }),
  );

  // The AI writes only the facts the user gave, so an entry it created can land with required
  // fields empty. Validate once on mount so those fields show their error instead of failing
  // silently; a brand-new empty section stays quiet.
  useEffect(() => {
    if (Object.values(personalInfo).some(Boolean)) void trigger();
  }, []);

  useEffect(() => {
    const subscription = watch((value) => {
      dispatch(updateSection({ section: 'personalInfo', data: value }));
    });
    return () => subscription.unsubscribe();
  }, [watch, dispatch]);

  // Prefill a brand-new CV from the user's saved profile so they don't retype it.
  // Only seeds when the personal section is still empty — never overwrites a loaded CV.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !user) return;
    seeded.current = true;
    const pi = personalInfo as Partial<PersonalFormData>;
    if (pi.firstName || pi.email) return;
    const seed: Partial<PersonalFormData> = {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      professionalTitle: user.title || '',
      ProfessionalSummary: user.summary || '',
      linkedin: user.linkedin || '',
      github: user.github || '',
      portfolio: user.portfolio || '',
    };
    (Object.entries(seed) as [keyof PersonalFormData, string][]).forEach(
      ([k, v]) => v && setValue(k, v),
    );
    dispatch(updateSection({ section: 'personalInfo', data: seed }));
  }, [user, personalInfo, setValue, dispatch]);

  const releaseObjectUrl = () => {
    if (!objectUrlRef.current) return;
    URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
  };

  useEffect(() => releaseObjectUrl, []);

  const selectPhoto = (file?: File) => {
    if (photoInputRef.current) photoInputRef.current.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError(t('Photo must be smaller than 5 MB.'));
      return;
    }
    setPhotoError('');
    releaseObjectUrl();
    objectUrlRef.current = URL.createObjectURL(file);
    setCropSrc(objectUrlRef.current);
  };

  const closeCrop = () => {
    releaseObjectUrl();
    setCropSrc(null);
  };

  const uploadPhoto = async (blob: Blob) => {
    setPhotoError('');
    setPhotoUploading(true);
    const body = new FormData();
    body.append('photo', new File([blob], 'cv-photo.jpg', { type: 'image/jpeg' }));
    try {
      const response = await axios.post(AI_ENDPOINTS.cvPhoto, body, { withCredentials: true });
      setValue('photo', response.data.url, { shouldDirty: true });
      closeCrop();
    } catch {
      setPhotoError(t('Could not upload that photo. Please try another image.'));
    } finally {
      setPhotoUploading(false);
    }
  };

  return (
    <Box sx={{ ...personal.root, maxWidth: '100%' }}>
      <Typography variant="h6" sx={personal.sectionTitle}>
        {t('Personal Information')}
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: 'auto', pb: 1 }}>
        <Button
          onClick={() => setActiveSubTab('details')}
          variant={activeSubTab === 'details' ? 'contained' : 'outlined'}
          size="small"
          sx={{
            borderRadius: 20,
            textTransform: 'none',
            whiteSpace: 'nowrap',
            px: 2,
            bgcolor: activeSubTab === 'details' ? COLORS.primary : 'transparent',
            color: activeSubTab === 'details' ? COLORS.onAccent : COLORS.textSecondary,
            borderColor: activeSubTab === 'details' ? COLORS.primary : COLORS.borderMedium,
            '&:hover': {
              bgcolor: activeSubTab === 'details' ? COLORS.primaryDark : COLORS.primaryAlpha12,
              borderColor: COLORS.primary,
            }
          }}
        >
          {t('Personal Details')}
        </Button>
        <Button
          onClick={() => setActiveSubTab('role')}
          variant={activeSubTab === 'role' ? 'contained' : 'outlined'}
          size="small"
          sx={{
            borderRadius: 20,
            textTransform: 'none',
            whiteSpace: 'nowrap',
            px: 2,
            bgcolor: activeSubTab === 'role' ? COLORS.primary : 'transparent',
            color: activeSubTab === 'role' ? COLORS.onAccent : COLORS.textSecondary,
            borderColor: activeSubTab === 'role' ? COLORS.primary : COLORS.borderMedium,
            '&:hover': {
              bgcolor: activeSubTab === 'role' ? COLORS.primaryDark : COLORS.primaryAlpha12,
              borderColor: COLORS.primary,
            }
          }}
        >
          {t('Role')}
        </Button>
        <Button
          onClick={() => setActiveSubTab('summary')}
          variant={activeSubTab === 'summary' ? 'contained' : 'outlined'}
          size="small"
          sx={{
            borderRadius: 20,
            textTransform: 'none',
            whiteSpace: 'nowrap',
            px: 2,
            bgcolor: activeSubTab === 'summary' ? COLORS.primary : 'transparent',
            color: activeSubTab === 'summary' ? COLORS.onAccent : COLORS.textSecondary,
            borderColor: activeSubTab === 'summary' ? COLORS.primary : COLORS.borderMedium,
            '&:hover': {
              bgcolor: activeSubTab === 'summary' ? COLORS.primaryDark : COLORS.primaryAlpha12,
              borderColor: COLORS.primary,
            }
          }}
        >
          {t('Professional Summary')}
        </Button>
      </Stack>

      {activeSubTab === 'details' && (
        <Box>
          {supportsPhoto && (
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2.5, minWidth: 0 }}>
            <Avatar src={watch('photo') || undefined} sx={{ width: 64, height: 64, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={photoUploading}
                  onClick={() => photoInputRef.current?.click()}
                  startIcon={photoUploading ? <CircularProgress size={14} /> : undefined}
                >
                  {watch('photo') ? t('Change Photo') : t('Add Photo')}
                </Button>
                {watch('photo') && (
                  <Button size="small" variant="outlined" onClick={() => setCropSrc(watch('photo') || null)}>
                    {t('Edit')}
                  </Button>
                )}
                {watch('photo') && (
                  <Button size="small" color="inherit" onClick={() => setValue('photo', '', { shouldDirty: true })}>
                    {t('Remove')}
                  </Button>
                )}
              </Stack>
              <Typography variant="caption" sx={{ color: photoError ? 'error.main' : COLORS.textSecondary, display: 'block', mt: 0.5 }}>
                {photoError || t('Optional. JPG or PNG, up to 5 MB.')}
              </Typography>
            </Box>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => selectPhoto(e.target.files?.[0])}
            />
            <PhotoCropDialog
              src={cropSrc}
              saving={photoUploading}
              onCancel={closeCrop}
              onSave={(blob) => void uploadPhoto(blob)}
            />
          </Stack>
          )}

          <Box sx={personal.row}>
            <Box sx={personal.halfWidth}>
              <Controller
                name="firstName"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <FormInput
                    {...field}
                    label={t('First Name')}
                    placeholder={t('John')}
                    error={!!error}
                    helperText={error ? t(error.message ?? '') : ''}
                    required
                  />
                )}
              />
            </Box>

            <Box sx={personal.halfWidth}>
              <Controller
                name="lastName"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <FormInput
                    {...field}
                    label={t('Last Name')}
                    placeholder={t('Smith')}
                    error={!!error}
                    helperText={error ? t(error.message ?? '') : ''}
                    required
                  />
                )}
              />
            </Box>
          </Box>

          <Controller
            name="email"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <FormInput
                {...field}
                label={t('Email')}
                placeholder="john.smith@example.com"
                icon={EmailIcon}
                error={!!error}
                helperText={error ? t(error.message ?? '') : ''}
                required
              />
            )}
          />

          <PhoneInput control={control as any} />

          <LocationInput control={control as any} watch={watch as any} setValue={setValue as any} />

          <Controller
            name="town"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <FormInput
                {...field}
                label={t('Town')}
                placeholder={t('Type your town')}
                error={!!error}
                helperText={error ? t(error.message ?? '') : ''}
              />
            )}
          />

          <Controller
            name="linkedin"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <FormInput
                {...field}
                label={t('LinkedIn')}
                placeholder="linkedin.com/in/username"
                icon={LinkedInIcon}
                error={!!error}
                helperText={error ? t(error.message ?? '') : ''}
              />
            )}
          />

          <Controller
            name="github"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <FormInput
                {...field}
                label={t('GitHub (Others)')}
                placeholder="github.com/username"
                icon={GitHubIcon}
                error={!!error}
                helperText={error ? t(error.message ?? '') : ''}
              />
            )}
          />

          <Controller
            name="portfolio"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <FormInput
                {...field}
                label={t('Portfolio / Website')}
                placeholder="portfolio.com"
                icon={LanguageIcon}
                error={!!error}
                helperText={error ? t(error.message ?? '') : ''}
              />
            )}
          />
        </Box>
      )}

      {activeSubTab === 'role' && (
        <Controller
          name="professionalTitle"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <FormInput
              {...field}
              label={t('Professional Title')}
              placeholder={t('Marketing Manager')}
              icon={WorkIcon}
              error={!!error}
              helperText={error ? t(error.message ?? '') : ''}
              required
            />
          )}
        />
      )}

      {activeSubTab === 'summary' && (
        <Controller
          name="ProfessionalSummary"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <FormInput
              {...field}
              onChange={(e) => {
                summaryUndo.onTypingChange(field.value || '');
                field.onChange(e);
              }}
              onBlur={() => {
                summaryUndo.commitTyping();
                field.onBlur();
              }}
              label={t('Professional Summary')}
              labelAction={
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <UndoButton disabled={!summaryUndo.canUndo} onUndo={summaryUndo.undo} />
                  <AIEditInput
                    section="summary"
                    currentContent={field.value || ''}
                    context={{
                      jobTitle: watch('professionalTitle'),
                    }}
                    onResult={(text) => {
                      summaryUndo.pushChange(field.value || '');
                      setValue('ProfessionalSummary', text, { shouldDirty: true });
                    }}
                  />
                </Stack>
              }
              placeholder={t('Write your professional summary here...')}
              error={!!error}
              helperText={error ? t(error.message ?? '') : ''}
              multiline
              minRows={5}
              formatting={{
                onValueChange: (text) => {
                  summaryUndo.pushChange(field.value || '');
                  setValue('ProfessionalSummary', text, { shouldDirty: true });
                },
              }}
            />
          )}
        />
      )}
    </Box>
  );
};

export default Personal;
