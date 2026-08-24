import { useEffect, useState } from 'react';
import { Box, Button, IconButton, MenuItem, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import AIEditInput from '../../components/AIEditInput/AIEditInput';
import UndoButton from '../../../../components/ui/UndoButton/UndoButton';
import { updateSection } from '../../../../redux/store/slices/cvBuilderSlice';
import { useFieldUndo } from '../../../../hooks/useFieldUndo';
import type { RootState } from '../../../../redux/store/store';
import { Plus, Trash2 } from '../../../../components/icons/MuiIcons';
import skillsTokens from './skills.tokens';
import { parseLanguageEntries, serializeLanguageEntries } from './languageEntries';

const PROFICIENCY_LEVELS = [
  'Native',
  'Full professional proficiency',
  'Professional working proficiency',
  'Limited working proficiency',
  'Elementary proficiency',
];

const LanguagesSection = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const value = useSelector((state: RootState) => state.cvBuilder.formData.skills.languages);
  const professionalTitle = useSelector(
    (state: RootState) => state.cvBuilder.formData.personalInfo.professionalTitle || '',
  );
  const setValue = (next: string) => dispatch(updateSection({ section: 'skills', data: { languages: next } }));
  const undo = useFieldUndo<string>('skills.languages', setValue);
  const [entries, setEntries] = useState(() => {
    const parsed = parseLanguageEntries(value);
    return parsed.length > 0 ? parsed : [{ name: '', proficiency: '' }];
  });

  useEffect(() => {
    const parsed = parseLanguageEntries(value);
    if (serializeLanguageEntries(entries) !== value) {
      setEntries(parsed.length > 0 ? parsed : [{ name: '', proficiency: '' }]);
    }
  }, [entries, value]);

  const updateEntry = (index: number, field: 'name' | 'proficiency', next: string) => {
    const updated = entries.map((entry, entryIndex) =>
      entryIndex === index ? { ...entry, [field]: next } : entry,
    );
    setEntries(updated);
    setValue(serializeLanguageEntries(updated));
  };

  const removeEntry = (index: number) => {
    undo.pushChange(value);
    const updated = entries.filter((_, entryIndex) => entryIndex !== index);
    setEntries(updated.length > 0 ? updated : [{ name: '', proficiency: '' }]);
    setValue(serializeLanguageEntries(updated));
  };

  const addEntry = () => {
    undo.pushChange(value);
    setEntries([...entries, { name: '', proficiency: '' }]);
  };

  return (
    <Box sx={{ ...skillsTokens.root, maxWidth: '100%', padding: '12px' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="h6" sx={{ ...skillsTokens.sectionTitle, fontSize: '1.1rem' }}>
          {t('languages')}
        </Typography>
        <UndoButton disabled={!undo.canUndo} onUndo={undo.undo} />
      </Box>

      <Box sx={{ display: 'grid', gap: 1.25 }}>
        {entries.map((entry, index) => (
          <Box
            key={index}
            sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr auto', sm: 'minmax(0, 1fr) minmax(210px, .9fr) auto' }, gap: 1, alignItems: 'center' }}
          >
            <TextField
              label={t('Language')}
              value={entry.name}
              onChange={(event) => {
                undo.onTypingChange(value);
                updateEntry(index, 'name', event.target.value);
              }}
              onBlur={undo.commitTyping}
              size="small"
              sx={{ gridColumn: { xs: '1 / 2', sm: 'auto' } }}
            />
            <TextField
              select
              label={t('Proficiency')}
              value={entry.proficiency}
              onChange={(event) => {
                undo.pushChange(value);
                updateEntry(index, 'proficiency', event.target.value);
              }}
              size="small"
              sx={{ gridColumn: { xs: '1 / 3', sm: 'auto' }, gridRow: { xs: 2, sm: 'auto' } }}
            >
              <MenuItem value="">{t('Not specified')}</MenuItem>
              {PROFICIENCY_LEVELS.map((level) => (
                <MenuItem key={level} value={level}>{t(level)}</MenuItem>
              ))}
            </TextField>
            <IconButton onClick={() => removeEntry(index)} aria-label={t('Remove language')} color="error">
              <Trash2 size={17} />
            </IconButton>
          </Box>
        ))}
      </Box>

      <Button startIcon={<Plus size={16} />} onClick={addEntry} sx={{ mt: 1.5 }}>
        {t('Add language')}
      </Button>

      <AIEditInput
        section="languages"
        currentContent={value || ''}
        context={{ jobTitle: professionalTitle }}
        onResult={(text) => {
          undo.pushChange(value || '');
          setValue(text.replace(/^[-•*]\s*/gm, '').split('\n').map((line) => line.trim()).filter(Boolean).join(', '));
        }}
      />
    </Box>
  );
};

export { LanguagesSection };
export default LanguagesSection;
