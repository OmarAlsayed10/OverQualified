import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Fade,
  Grow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Alert,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import LinkIcon from '@mui/icons-material/Link';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import { useTranslation } from 'react-i18next';
import i18n from '../../../i18n';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { JOB_ENDPOINTS } from '../../../constants/endpoints';
import HeroCVMockup from '../HeroCVMockup';
import heroSection from './heroSection.tokens';

const HeroSection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentLang = i18n.language;
  const isRTL = currentLang !== 'en';

  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [jobUrl, setJobUrl] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  const [savedMatches, setSavedMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (modalOpen && activeTab === 1) {
      setLoadingMatches(true);
      axios
        .get(JOB_ENDPOINTS.matches, { withCredentials: true })
        .then((res) => {
          setSavedMatches(res.data?.matches || []);
        })
        .catch(() => {
          setError(t('Failed to load saved jobs. Please log in or try again.'));
        })
        .finally(() => setLoadingMatches(false));
    }
  }, [modalOpen, activeTab, t]);

  const handleLaunchCustom = async () => {
    setCreating(true);
    setError('');
    try {
      const res = await axios.post(
        `${JOB_ENDPOINTS.matches}/custom`,
        {
          title: jobTitle || 'Target Role',
          company: company || 'Target Company',
          url: jobUrl || 'https://linkedin.com',
          description: jobDescription,
        },
        { withCredentials: true }
      );
      setModalOpen(false);
      navigate(`/applications/${res.data.match.id}`);
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate('/getStart');
      } else {
        const message = err.response?.data?.message;
        setError(typeof message === 'string' ? t(message) : t('Failed to launch workspace.'));
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box sx={heroSection.root}>
      <Box sx={heroSection.container}>
        <Grow in timeout={1000}>
          <Box sx={heroSection.headlineBlock}>
            <Typography sx={heroSection.eyebrow}>
              {t('AI Application Copilot')}
            </Typography>

            <Typography variant="h1" sx={heroSection.h1}>
              {t('Match, Prepare & Apply')}{' '}
              <Box component="i" sx={heroSection.accent}>{t('10x Faster')}</Box>
            </Typography>

            <Typography variant="body1" sx={heroSection.subtitle}>
              {t(
                'Transform your job hunt with a single workspace per application. Tailor CVs, generate cover letters, and prepare screening answers effortlessly.'
              )}
            </Typography>

            <Box sx={heroSection.buttonRow}>
              <Button
                variant="contained"
                size="large"
                onClick={() => setModalOpen(true)}
                startIcon={<RocketLaunchIcon />}
                endIcon={isRTL ? <ArrowBackIcon /> : <ArrowForwardIcon />}
                sx={heroSection.primaryButton}
              >
                {t('Start Job Application Workspace')}
              </Button>
            </Box>
          </Box>
        </Grow>

        <Fade in timeout={1200}>
          <Box sx={heroSection.mockupWrapper}>
            <HeroCVMockup />
          </Box>
        </Fade>
      </Box>

      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, p: 1 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <RocketLaunchIcon color="primary" />
          {t('Start Job Application Workspace')}
        </DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="fullWidth"
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { minHeight: 56, fontSize: { xs: '0.8rem', sm: '0.875rem' } } }}
          >
            <Tab icon={<LinkIcon />} iconPosition="start" label={t('Paste Job Link / Text')} />
            <Tab icon={<WorkHistoryIcon />} iconPosition="start" label={t('Pick Saved Job')} />
          </Tabs>

          {activeTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                fullWidth
                size="small"
                label={t('Job Listing URL')}
                placeholder="https://linkedin.com/jobs/view/..."
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label={t('Job Title')}
                  placeholder="e.g. Senior Frontend Developer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
                <TextField
                  fullWidth
                  size="small"
                  label={t('Company')}
                  placeholder="e.g. Google"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </Box>
              <TextField
                fullWidth
                size="small"
                multiline
                minRows={4}
                label={t('Job Description (Optional)')}
                placeholder={t('Paste job requirements or description...')}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </Box>
          )}

          {activeTab === 1 && (
            <Box sx={{ minHeight: 220, pt: 1 }}>
              {loadingMatches ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : savedMatches.length === 0 ? (
                <Box
                  sx={{
                    py: 3,
                    px: 2,
                    textAlign: 'center',
                    backgroundColor: 'action.hover',
                    borderRadius: 2,
                    border: '1px dashed',
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      bgcolor: 'primary.light',
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.9,
                    }}
                  >
                    <WorkHistoryIcon sx={{ fontSize: 28 }} />
                  </Box>

                  <Typography variant="h6" fontWeight={700}>
                    {t('No Saved Jobs in Job Radar Yet')}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto' }}>
                    {t(
                      'Job Radar automatically matches live market vacancies to your profile. Explore active job listings or paste any vacancy details to get started.'
                    )}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center', mt: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<RocketLaunchIcon />}
                      onClick={() => {
                        setModalOpen(false);
                        navigate('/job-radar');
                      }}
                    >
                      {t('Explore Job Radar Page')}
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<LinkIcon />}
                      onClick={() => setActiveTab(0)}
                    >
                      {t('Paste Job Link Instead')}
                    </Button>
                  </Box>

                  <Typography variant="caption" color="text.tertiary" sx={{ mt: 1 }}>
                    {t('Or try quick presets:')}{' '}
                    <Typography
                      component="span"
                      variant="caption"
                      color="primary.main"
                      sx={{ cursor: 'pointer', fontWeight: 600, mr: 1, '&:hover': { textDecoration: 'underline' } }}
                      onClick={() => {
                        setJobTitle('Frontend Developer');
                        setCompany('Tech Company');
                        setActiveTab(0);
                      }}
                    >
                      Frontend Developer
                    </Typography>
                    •{' '}
                    <Typography
                      component="span"
                      variant="caption"
                      color="primary.main"
                      sx={{ cursor: 'pointer', fontWeight: 600, ml: 1, mr: 1, '&:hover': { textDecoration: 'underline' } }}
                      onClick={() => {
                        setJobTitle('Full Stack Engineer');
                        setCompany('Innovation Labs');
                        setActiveTab(0);
                      }}
                    >
                      Full Stack Engineer
                    </Typography>
                  </Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {savedMatches.map((m) => (
                    <ListItemButton
                      key={m.id}
                      onClick={() => {
                        setModalOpen(false);
                        navigate(`/applications/${m.id}`);
                      }}
                      sx={{
                        borderRadius: 2,
                        mb: 1.5,
                        p: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: 2,
                          transform: 'translateY(-1px)',
                        },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2" fontWeight={700}>
                            {m.title}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {m.company} {m.location ? `• ${m.location}` : ''}
                          </Typography>
                        }
                      />
                      <Box
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 5,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          bgcolor: m.analysisStatus === 'pending' ? 'warning.lighter' : m.fitScore >= 80 ? 'success.lighter' : 'info.lighter',
                          color: m.analysisStatus === 'pending' ? 'warning.dark' : m.fitScore >= 80 ? 'success.dark' : 'info.dark',
                        }}
                      >
                        {m.analysisStatus === 'pending' ? t('Analysis required') : `${m.fitScore}% ${t('Match')}`}
                      </Box>
                    </ListItemButton>
                  ))}
                </List>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setModalOpen(false)} color="inherit">
            {t('Cancel')}
          </Button>
          {activeTab === 0 && (
            <Button
              variant="contained"
              onClick={handleLaunchCustom}
              disabled={creating}
              startIcon={creating ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {t('Launch Workspace')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HeroSection;
