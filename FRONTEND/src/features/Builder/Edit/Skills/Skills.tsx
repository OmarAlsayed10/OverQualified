import { useEffect, useRef } from 'react';
import { Autocomplete, Box, Button, IconButton, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../hooks/useAuth';
import { useDispatch, useSelector } from 'react-redux';
import { updateSection, type SkillCategory } from '../../../../redux/store/slices/cvBuilderSlice';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import AIFieldButton from '../../components/AIFieldButton/AIFieldButton';
import UndoButton from '../../../../components/ui/UndoButton/UndoButton';
import { Trash2, Plus } from '../../../../components/icons/MuiIcons';
import { SKILL_DICTIONARY } from '../../skillDictionary';
import { mergeSkillCategories, mergeSkillsIntoCategories } from '../../skillCategories';
import skillsTokens from './skills.tokens';
import type { RootState } from '../../../../redux/store/store';
import type { SkillsFormData } from './Skills.types';
import { useFieldUndo } from '../../../../hooks/useFieldUndo';

const skillCategorySchema = z.object({
  name: z.string(),
  skills: z.array(z.string()),
});

const skillsSchema = z.object({
  skillCategories: z.array(skillCategorySchema),
});

const defaultCategoriesFromState = (formDataSkills: any): SkillCategory[] => {
  if (Array.isArray(formDataSkills?.skillCategories) && formDataSkills.skillCategories.length > 0) {
    return formDataSkills.skillCategories;
  }
  if (Array.isArray(formDataSkills?.skills) && formDataSkills.skills.length > 0) {
    return [{ name: 'Technical Skills', skills: formDataSkills.skills }];
  }
  return [{ name: 'Technical Skills', skills: [] }];
};

const Skills = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const dispatch = useDispatch();
  const seededProfileSkills = useRef(false);
  const formDataSkills = useSelector(
    (state: RootState) => state.cvBuilder?.formData?.skills || { skillCategories: [], languages: '', certifications: [] },
  );
  const professionalTitle = useSelector(
    (state: RootState) => state.cvBuilder?.formData?.personalInfo?.professionalTitle || '',
  );

  const { watch, setValue, getValues } = useForm<Pick<SkillsFormData, 'skillCategories'>>({
    resolver: zodResolver(skillsSchema),
    defaultValues: { skillCategories: defaultCategoriesFromState(formDataSkills) },
    mode: 'onChange',
  });

  const skillsUndo = useFieldUndo<SkillCategory[]>('skills.skillCategories', (v) => setValue('skillCategories', v));

  useEffect(() => {
    const subscription = watch((value) => {
      const clonedData = value ? JSON.parse(JSON.stringify(value)) : {};
      dispatch(updateSection({ section: 'skills', data: clonedData }));
    });
    return () => subscription.unsubscribe();
  }, [watch, dispatch]);

  useEffect(() => {
    if (seededProfileSkills.current) return;
    const profileSkills = (user as { skills?: string[] } | null)?.skills;
    if (!Array.isArray(profileSkills) || profileSkills.length === 0) return;
    const currentCategories = getValues('skillCategories') || [];
    const totalSkills = currentCategories.reduce((acc, cat) => acc + (cat.skills?.length || 0), 0);
    if (totalSkills > 0) return;
    seededProfileSkills.current = true;
    setValue('skillCategories', [{ name: 'Technical Skills', skills: profileSkills }]);
  }, [user, getValues, setValue]);

  const addAISkills = (value: string | string[]) => {
    const current = getValues('skillCategories') || [];
    const suggested = (Array.isArray(value) ? value : value.split(/[,\n]/))
      .map((s) => s.trim())
      .filter(Boolean);
    if (suggested.length === 0) return;
    skillsUndo.pushChange(current);
    const merged = mergeSkillsIntoCategories(current, suggested);
    setValue('skillCategories', merged);
  };

  const addAICategories = (suggestedCategories: SkillCategory[]) => {
    const current = getValues('skillCategories') || [];
    skillsUndo.pushChange(current);
    setValue('skillCategories', mergeSkillCategories(current, suggestedCategories));
  };

  const categories = watch('skillCategories') || [];

  const handleAddCategory = () => {
    skillsUndo.pushChange(categories);
    setValue('skillCategories', [...categories, { name: '', skills: [] }]);
  };

  const handleRemoveCategory = (index: number) => {
    skillsUndo.pushChange(categories);
    const updated = categories.filter((_, i) => i !== index);
    setValue('skillCategories', updated.length > 0 ? updated : [{ name: '', skills: [] }]);
  };

  const handleCategoryNameChange = (index: number, newName: string) => {
    const updated = categories.map((cat, i) => (i === index ? { ...cat, name: newName } : cat));
    setValue('skillCategories', updated);
  };

  const handleCategorySkillsChange = (index: number, newSkills: string[]) => {
    skillsUndo.pushChange(categories);
    const updated = categories.map((cat, i) => (i === index ? { ...cat, skills: newSkills } : cat));
    setValue('skillCategories', updated);
  };

  return (
    <Box sx={{ ...skillsTokens.root, maxWidth: '100%', padding: '12px' }}>
      <Typography variant="h6" sx={{ ...skillsTokens.sectionTitle, fontSize: '1.1rem' }}>
        {t('skills')}
      </Typography>

      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, textAlign: 'start' }}>
        {t('Organize your skills into categories (e.g. Languages, Frameworks, Databases, Tools).')}
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'start' }}>
            {t('yourSkills')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <UndoButton disabled={!skillsUndo.canUndo} onUndo={skillsUndo.undo} />
            <AIFieldButton
              section="skills"
              jobTitle={professionalTitle}
              onResult={addAISkills}
              onCategoriesResult={addAICategories}
            />
          </Box>
        </Box>

        {categories.map((category, index) => (
          <Box key={index} sx={skillsTokens.categoryCard}>
            <Box sx={skillsTokens.categoryHeader}>
              <TextField
                size="small"
                value={category.name}
                onChange={(e) => handleCategoryNameChange(index, e.target.value)}
                placeholder={t('Category name (e.g. Languages, Databases, Tools)')}
                sx={{ flex: 1 }}
                inputProps={{ 'aria-label': t('Category name') }}
              />
              <IconButton
                size="small"
                onClick={() => handleRemoveCategory(index)}
                aria-label={t('Remove category')}
                sx={{ color: 'error.main', p: 0.5 }}
              >
                <Trash2 size={18} />
              </IconButton>
            </Box>

            <Autocomplete
              multiple
              freeSolo
              options={SKILL_DICTIONARY}
              value={category.skills || []}
              onChange={(_, value) => {
                handleCategorySkillsChange(index, value as string[]);
              }}
              renderInput={(params) => (
                <TextField {...params} size="small" placeholder={t('placeholderSkills')} />
              )}
            />
          </Box>
        ))}

        <Button
          variant="outlined"
          onClick={handleAddCategory}
          startIcon={<Plus size={16} />}
          sx={skillsTokens.addButton}
        >
          {t('Add Skill Category')}
        </Button>
      </Box>
    </Box>
  );
};

export default Skills;
