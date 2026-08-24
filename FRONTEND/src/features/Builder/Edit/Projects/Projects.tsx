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
import UndoButton from '../../../../components/ui/UndoButton/UndoButton';
import { useEffect, useState } from 'react';
import type { RootState } from '../../../../redux/store/store';
import type { Control, UseFormSetValue } from 'react-hook-form';
import { COLORS, RADIUS } from '../../../../theme/tokens';
import { useFieldUndo } from '../../../../hooks/useFieldUndo';
import type { useTranslation as useTranslationType } from 'react-i18next';
import { normalizePastedBulletText } from '../../../../templates/bulletLines';

const projectsSchema = z.object({
  projects: z.array(
    z.object({
      name: z.string().min(1, 'Project name is required'),
      technologies: z.string().optional(),
      demoUrl: z.string().optional(),
      githubUrl: z.string().optional(),
      description: z.string().optional(),
    }),
  ),
});

type ProjectsFormData = z.infer<typeof projectsSchema>;

interface ProjectDescriptionFieldProps {
  control: Control<ProjectsFormData>;
  index: number;
  rowId: string;
  setValue: UseFormSetValue<ProjectsFormData>;
  projectName?: string;
  technologies?: string;
  t: ReturnType<typeof useTranslationType>['t'];
}

const ProjectDescriptionField = ({
  control,
  index,
  rowId,
  setValue,
  projectName,
  technologies,
  t,
}: ProjectDescriptionFieldProps) => {
  const descUndo = useFieldUndo<string>(`projects.${rowId}.description`, (v) =>
    setValue(`projects.${index}.description`, v, { shouldDirty: true }),
  );

  return (
    <Controller
      name={`projects.${index}.description`}
      control={control}
      render={({ field: f }) => (
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
              `projects.${index}.description`,
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
                section="projects"
                currentContent={f.value || ''}
                context={{ projectName, technologies }}
                onResult={(text) => {
                  descUndo.pushChange(f.value || '');
                  setValue(`projects.${index}.description`, normalizePastedBulletText(text), { shouldDirty: true });
                }}
              />
            </Stack>
          }
          placeholder={t(
            'Describe the problem you solved, your role, and the impact — then hit the AI icon to polish it',
          )}
          multiline
          minRows={3}
          formatting={{
            onValueChange: (text) => {
              descUndo.pushChange(f.value || '');
              setValue(`projects.${index}.description`, text, { shouldDirty: true });
            },
          }}
        />
      )}
    />
  );
};

const tokens = {
  root: {
    width: '100%',
    margin: '0 auto',
    padding: '12px',
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: COLORS.textDark,
    fontSize: '1.1rem',
    textAlign: 'start' as const,
  },
  addButton: {
    border: '1px dashed rgba(26,26,24,0.3)',
    borderColor: 'rgba(26,26,24,0.3)',
    color: COLORS.textPrimary,
    '&:hover': {
      borderColor: COLORS.primary,
      color: COLORS.primary,
      backgroundColor: COLORS.primaryAlpha12,
    },
    padding: '6px 12px',
    boxShadow: 'none',
  },
  entriesBox: {
    border: `1px solid ${COLORS.disabled}`,
    borderRadius: RADIUS.md,
    p: 2,
  },
  itemTitle: {
    fontWeight: 'bold',
    fontSize: '1rem',
    textAlign: 'start' as const,
  },
  deleteButton: { color: COLORS.danger },
  row: { display: 'flex', gap: '12px' },
  halfWidth: { flex: 1, minWidth: 0 },
  fullWidth: { flex: 1, minWidth: 0 },
  emptyText: { color: COLORS.textSecondary, fontStyle: 'italic', textAlign: 'start' as const },
};

import { Sparkles } from '../../../../components/icons/MuiIcons';
import ProjectImportModal, { ImportedProjectData } from './ProjectImportModal';
import { RepoEvidencePanel, RepoEvidence } from './RepoEvidencePanel';
import { EntryChipRow, EntryToolbar } from '../../components/EntryChip';

const OWNERSHIP_PREFIX: Record<string, string> = {
  sole: 'Sole engineer',
  primary: 'Primary engineer',
  major: 'Major contributor',
  contributor: 'Contributor',
};

const evidenceMonth = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '';

const Projects = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const projectsData = useSelector(
    (state: RootState) => state.cvBuilder?.formData?.projects || [],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);

  const { control, watch, setValue } = useForm<ProjectsFormData>({
    resolver: zodResolver(projectsSchema),
    defaultValues: { projects: JSON.parse(JSON.stringify(projectsData)) },
    mode: 'onChange',
  });

  const { fields, append, remove, move } = useFieldArray({ control, name: 'projects' });

  useEffect(() => {
    const subscription = watch((value) => {
      const cloned = value.projects ? JSON.parse(JSON.stringify(value.projects)) : [];
      dispatch(updateSection({ section: 'projects', data: cloned }));
    });
    return () => subscription.unsubscribe();
  }, [watch, dispatch]);

  const addProject = () => {
    append({ name: '', technologies: '', demoUrl: '', githubUrl: '', description: '' });
    setActiveIndex(fields.length);
  };

  const handleImportSuccess = (project: ImportedProjectData) => {
    append({
      name: project.name || '',
      technologies: project.technologies || '',
      demoUrl: project.demoUrl || '',
      githubUrl: project.githubUrl || '',
      description: project.description || '',
    });
    setActiveIndex(fields.length);
  };

  const handleEvidenceConfirmed = (evidence: RepoEvidence) => {
    const author = evidence.matchedAuthor;
    const ownership = evidence.ownership ? OWNERSHIP_PREFIX[evidence.ownership] : '';
    const range = [evidenceMonth(evidence.firstCommit), evidenceMonth(evidence.lastCommit)]
      .filter(Boolean)
      .join(' – ');

    const lines = [
      author && ownership
        ? `• ${ownership}, ${author.commits} of ${evidence.totalCommits} commits${range ? ` (${range})` : ''}.`
        : '',
      evidence.description ? `• ${evidence.description}` : '',
    ].filter(Boolean);

    append({
      name: evidence.repo,
      technologies: evidence.languages.slice(0, 6).join(', '),
      demoUrl: '',
      githubUrl: evidence.repoUrl,
      description: lines.join('\n'),
    });
    setActiveIndex(fields.length);
    setIsEvidenceOpen(false);
  };

  const removeProject = (index: number) => {
    remove(index);
    setActiveIndex((prev) => Math.max(0, Math.min(prev, fields.length - 2)));
  };

  const moveProject = (offset: number) => {
    const destination = activeIndex + offset;
    if (destination < 0 || destination >= fields.length) return;
    move(activeIndex, destination);
    setActiveIndex(destination);
  };

  return (
    <Box sx={{ ...tokens.root, maxWidth: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={tokens.sectionTitle}>
            {t('Projects')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('Add work that proves your skills.')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<Sparkles size={18} />}
            onClick={() => setIsImportModalOpen(true)}
            sx={{
              bgcolor: COLORS.primarySurface,
              color: COLORS.onAccent,
              textTransform: 'none',
              px: 2,
              '&:hover': { bgcolor: COLORS.primarySurfaceDark },
            }}
          >
            {t('Import with AI')}
          </Button>
          <Button
            variant="outlined"
            onClick={() => setIsEvidenceOpen((open) => !open)}
            sx={tokens.addButton}
          >
            {t('Verify with commits')}
          </Button>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={addProject} sx={tokens.addButton}>
            {t('Add Project')}
          </Button>
        </Stack>
      </Stack>

      <ProjectImportModal
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      <Collapse in={isEvidenceOpen} unmountOnExit>
        <Box sx={{ mb: 2 }}>
          <RepoEvidencePanel onEvidenceConfirmed={handleEvidenceConfirmed} />
        </Box>
      </Collapse>

      <Box sx={tokens.entriesBox}>
        <EntryChipRow
          labels={fields.map((_, index) => watch(`projects.${index}.name`) || `${t('Project')} ${index + 1}`)}
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
        />

        {fields.map((field, index) => {
          if (index !== activeIndex) return null;
          return (
            <Box key={field.id}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={tokens.itemTitle}>
                  {t('Project')} {index + 1}
                </Typography>
                <EntryToolbar
                  onMove={moveProject}
                  onDelete={() => removeProject(index)}
                  isFirst={index === 0}
                  isLast={index === fields.length - 1}
                  deleteLabel={t('Delete project')}
                  deleteSx={tokens.deleteButton}
                />
              </Box>

              {/* Row 1: Project Name + Technologies */}
              <Box sx={tokens.row}>
                <Box sx={tokens.halfWidth}>
                  <Controller
                    name={`projects.${index}.name`}
                    control={control}
                    render={({ field: f, fieldState: { error } }) => (
                      <FormInput
                        {...f}
                        label={t('Project Name')}
                        placeholder={t('My Awesome App')}
                        error={!!error}
                        helperText={error ? t(error.message ?? '') : ''}
                        required
                      />
                    )}
                  />
                </Box>
                <Box sx={tokens.halfWidth}>
                  <Controller
                    name={`projects.${index}.technologies`}
                    control={control}
                    render={({ field: f }) => (
                      <FormInput
                        {...f}
                        label={t('Technologies Used')}
                        placeholder={t('React, Node.js, PostgreSQL')}
                      />
                    )}
                  />
                </Box>
              </Box>

              {/* Row 2: Live Demo + GitHub Repo */}
              <Box sx={tokens.row}>
                <Box sx={tokens.halfWidth}>
                  <Controller
                    name={`projects.${index}.demoUrl`}
                    control={control}
                    render={({ field: f }) => (
                      <FormInput
                        {...f}
                        label={t('Live Demo URL')}
                        placeholder="https://myapp.com"
                      />
                    )}
                  />
                </Box>
                <Box sx={tokens.halfWidth}>
                  <Controller
                    name={`projects.${index}.githubUrl`}
                    control={control}
                    render={({ field: f }) => (
                      <FormInput
                        {...f}
                        label={t('GitHub Repository')}
                        placeholder="https://github.com/..."
                      />
                    )}
                  />
                </Box>
              </Box>

              {/* Description with AI */}
              <ProjectDescriptionField
                control={control}
                index={index}
                rowId={field.id}
                setValue={setValue}
                projectName={watch(`projects.${index}.name`)}
                technologies={watch(`projects.${index}.technologies`)}
                t={t}
              />
            </Box>
          );
        })}

        {fields.length === 0 && (
          <Typography sx={tokens.emptyText}>{t('No projects added yet')}</Typography>
        )}
      </Box>
    </Box>
  );
};

export default Projects;
