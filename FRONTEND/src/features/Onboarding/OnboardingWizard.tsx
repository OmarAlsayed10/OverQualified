import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  Avatar,
  CircularProgress,
  Grid,
  Alert,
} from '@mui/material';
import { Camera, FileText, BarChart3, FileUp, Sparkles } from "../../components/icons/MuiIcons";
import axios from 'axios';
import { displayName } from '../../utils/displayName';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { USER_ENDPOINTS, AI_ENDPOINTS, CV_ENDPOINTS } from '../../constants/endpoints';
import CountrySelect from '../../components/ui/CountrySelect';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../theme/tokens';

interface ProfileForm {
  title: string;
  location: string;
  phone: string;
  summary: string;
  linkedin: string;
  github: string;
  portfolio: string;
}

interface ParsedCV {
  personalInfo: {
    firstName: string; lastName: string; email: string; phoneCode: string; phone: string;
    country: string; city: string; town: string; professionalTitle: string; ProfessionalSummary: string;
  };
  experience: unknown[];
  education: unknown[];
  skills: { skills: string[]; languages: string; certifications: unknown };
}

const EMPTY: ProfileForm = {
  title: '', location: '', phone: '', summary: '', linkedin: '', github: '', portfolio: '',
};

const STEPS = ['Your details', 'Choose your path'];

const OnboardingWizard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [cvData, setCvData] = useState<ParsedCV | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imported, setImported] = useState('');

  const set = (k: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const initials =
    `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'U';

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    e.target.value = '';
    const fd = new FormData();
    fd.append('photo', file);
    setUploading(true);
    try {
      await axios.post(`${USER_ENDPOINTS.updateProfile}/photo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });
      await refreshUser?.();
    } catch {
      setError(t('Photo upload failed. You can add one later in Settings.'));
    } finally {
      setUploading(false);
    }
  };

  // Upload a CV, parse it, and pre-fill the form so the user only reviews.
  const importCV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    e.target.value = '';
    const fd = new FormData();
    fd.append('cv', file);
    setImporting(true);
    setError('');
    setImported('');
    try {
      const res = await axios.post(AI_ENDPOINTS.importCv, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      });
      const parsed = res.data?.formData as ParsedCV | undefined;
      if (!parsed) throw new Error('no data');
      const p = parsed.personalInfo;
      setForm((f) => ({
        ...f,
        title: p.professionalTitle || f.title,
        location: [p.city, p.country].filter(Boolean).join(', ') || p.town || f.location,
        phone: [p.phoneCode, p.phone].filter(Boolean).join(' ').trim() || f.phone,
        summary: p.ProfessionalSummary || f.summary,
      }));
      setCvData(parsed);
      const skillCount = parsed.skills?.skills?.length ?? 0;
      const expCount = parsed.experience?.length ?? 0;
      setImported(
        t('We filled your details from your CV — {{s}} skills and {{e}} roles found. Review below.', {
          s: skillCount, e: expCount,
        }),
      );
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? t("Couldn't read that CV. Try another file or fill your details manually."));
    } finally {
      setImporting(false);
    }
  };

  // Persist profile, mark onboarded, save the imported CV as primary, then route.
  const finish = async (destination: string) => {
    setSaving(true);
    setError('');
    try {
      const extractedProfileSkills = Array.isArray(cvData?.skills?.skillCategories)
        ? cvData.skills.skillCategories.flatMap((cat: any) => cat.skills || []).filter(Boolean)
        : Array.isArray((cvData?.skills as any)?.skills)
          ? (cvData?.skills as any).skills
          : [];

      await axios.patch(
        USER_ENDPOINTS.updateProfile,
        {
          ...form,
          ...(extractedProfileSkills.length ? { skills: extractedProfileSkills } : {}),
          onboarded: true,
        },
        { withCredentials: true },
      );
      if (cvData) {
        const saved = await axios.post(
          CV_ENDPOINTS.save,
          {
            personalInfo: cvData.personalInfo,
            experience: cvData.experience,
            education: cvData.education,
            skills: cvData.skills,
          },
          { withCredentials: true },
        );
        const cvId = saved.data?.cv?.id;
        if (cvId) {
          await axios.patch(CV_ENDPOINTS.setPrimary(cvId), {}, { withCredentials: true }).catch(() => {});
        }
      }
      await refreshUser?.();
      navigate(destination);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? t('Could not save your profile. Please try again.'));
      setSaving(false);
    }
  };

  const skip = () => finish('/getStart');

  return (
    <Box sx={{ bgcolor: COLORS.bgLight, minHeight: '100vh', py: { xs: 4, md: 8 }, px: 2 }}>
      <Paper
        elevation={0}
        sx={{
          maxWidth: 640,
          mx: 'auto',
          borderRadius: RADIUS.xl,
          border: `1px solid ${COLORS.borderLight}`,
          bgcolor: COLORS.bgWhite,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: { xs: 3, md: 4 }, pb: 0 }}>
          <Typography sx={{ fontFamily: TYPOGRAPHY.fontSerif, fontSize: '1.6rem', color: COLORS.textPrimary, mb: 0.5 }}>
            {t('Welcome')}, {user?.firstName || t('there')} 👋
          </Typography>
          <Typography sx={{ color: COLORS.textSecondary, mb: 3 }}>
            {t('A few details now so the builder can fill your CV for you. You can skip and do this later.')}
          </Typography>
          <Stepper activeStep={step} sx={{ mb: 3 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel sx={{ '& .MuiStepIcon-root.Mui-active, & .MuiStepIcon-root.Mui-completed': { color: COLORS.primary } }}>
                  {t(label)}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <Box sx={{ p: { xs: 3, md: 4 } }}>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: RADIUS.md }}>{error}</Alert>}
          {imported && <Alert severity="success" sx={{ mb: 2, borderRadius: RADIUS.md }}>{imported}</Alert>}

          {step === 0 && (
            <>
              <Box
                sx={{
                  display: 'flex', alignItems: 'center', gap: 2, p: 2, mb: 3,
                  borderRadius: RADIUS.lg, border: `1px dashed ${COLORS.primaryAlpha35}`,
                  bgcolor: COLORS.bgIconTinted,
                }}
              >
                <FileUp size={26} color={COLORS.primary} />
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={600} fontSize={14}>{t('Already have a CV?')}</Typography>
                  <Typography fontSize={12.5} color="text.secondary">
                    {t('Upload it and we\'ll fill your profile automatically.')}
                  </Typography>
                </Box>
                <Button
                  component="label"
                  variant="contained"
                  disabled={importing}
                  startIcon={importing ? <CircularProgress size={15} sx={{ color: COLORS.onAccent }} /> : <Sparkles size={16} />}
                  sx={{ bgcolor: COLORS.primarySurface, textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap', '&:hover': { bgcolor: COLORS.primarySurfaceDark } }}
                >
                  {importing ? t('Reading...') : t('Upload CV')}
                  <input type="file" hidden accept=".pdf,.doc,.docx" onChange={importCV} />
                </Button>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{ position: 'relative' }}>
                  <Avatar src={user?.photo || ''} sx={{ width: 64, height: 64, bgcolor: COLORS.primarySurface }}>
                    {initials}
                  </Avatar>
                  <Box
                    component="label"
                    sx={{
                      position: 'absolute', bottom: -4, right: -4, width: 26, height: 26,
                      borderRadius: '50%', bgcolor: COLORS.bgWhite, border: `1px solid ${COLORS.borderLight}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}
                  >
                    {uploading ? <CircularProgress size={13} /> : <Camera size={15} color={COLORS.textSecondary} />}
                    <input type="file" hidden accept="image/*" onChange={uploadPhoto} />
                  </Box>
                </Box>
                <Box>
                  <Typography fontWeight={600}>{displayName(user?.firstName, user?.lastName)}</Typography>
                  <Typography fontSize={13} color="text.secondary">{user?.email}</Typography>
                </Box>
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth size="small" label={t('Professional title')} placeholder={t('Frontend Developer')} value={form.title} onChange={set('title')} inputProps={{ maxLength: 100 }} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CountrySelect value={form.location} onChange={(v) => setForm((f) => ({ ...f, location: v }))} label={t('Location')} placeholder={t('Country')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth size="small" label={t('Phone')} placeholder="+20 100 000 0000" value={form.phone} onChange={set('phone')} inputProps={{ maxLength: 30 }} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth size="small" label="LinkedIn" placeholder="linkedin.com/in/you" value={form.linkedin} onChange={set('linkedin')} inputProps={{ maxLength: 200 }} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth size="small" label="GitHub" placeholder="github.com/you" value={form.github} onChange={set('github')} inputProps={{ maxLength: 200 }} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth size="small" label={t('Portfolio')} placeholder="yoursite.com" value={form.portfolio} onChange={set('portfolio')} inputProps={{ maxLength: 200 }} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth size="small" multiline minRows={3} label={t('Professional summary')} placeholder={t('One or two sentences about who you are and what you do.')} value={form.summary} onChange={set('summary')} inputProps={{ maxLength: 2000 }} />
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button onClick={skip} disabled={saving} sx={{ color: COLORS.textSecondary }}>
                  {t('Skip for now')}
                </Button>
                <Button variant="contained" onClick={() => setStep(1)} sx={{ bgcolor: COLORS.primarySurface, '&:hover': { bgcolor: COLORS.primarySurfaceDark } }}>
                  {t('Continue')}
                </Button>
              </Box>
            </>
          )}

          {step === 1 && (
            <>
              <Typography sx={{ color: COLORS.textSecondary, mb: 3 }}>
                {t('What would you like to do first?')}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <PathCard
                    icon={<FileText size={32} color={COLORS.primary} />}
                    title={t('Build a CV')}
                    subtitle={cvData ? t('Your imported CV is ready to edit.') : t('Start from your details with a guided builder.')}
                    disabled={saving}
                    onClick={() => finish('/builder')}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <PathCard
                    icon={<BarChart3 size={32} color={COLORS.primary} />}
                    title={t('Analyze my CV')}
                    subtitle={t('Upload an existing CV for a quality score and practical tips.')}
                    disabled={saving}
                    onClick={() => finish('/cv-analysis')}
                  />
                </Grid>
              </Grid>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button onClick={() => setStep(0)} disabled={saving} sx={{ color: COLORS.textSecondary }}>
                  {t('Back')}
                </Button>
                {saving && <CircularProgress size={22} />}
              </Box>
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

interface PathCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  disabled: boolean;
  onClick: () => void;
}

const PathCard = ({ icon, title, subtitle, disabled, onClick }: PathCardProps) => (
  <Box
    onClick={disabled ? undefined : onClick}
    sx={{
      p: 3, height: '100%', borderRadius: RADIUS.lg, border: `2px solid ${COLORS.borderLight}`,
      cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1,
      transition: 'border-color 0.2s, box-shadow 0.2s',
      '&:hover': disabled ? {} : { borderColor: COLORS.primary },
    }}
  >
    {icon}
    <Typography sx={{ fontWeight: 600, mt: 1, mb: 0.5, color: COLORS.textPrimary }}>{title}</Typography>
    <Typography sx={{ fontSize: '0.85rem', color: COLORS.textSecondary }}>{subtitle}</Typography>
  </Box>
);

export default OnboardingWizard;
