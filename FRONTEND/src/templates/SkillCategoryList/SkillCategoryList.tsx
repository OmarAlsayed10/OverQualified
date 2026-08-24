import { Box, Typography } from '@mui/material';
import type { SkillCategoryListProps } from './SkillCategoryList.types';

export const SkillCategoryList = ({
  categories,
  skills,
  categorySx,
  labelSx,
  containerSx,
}: SkillCategoryListProps) => {
  const validCategories = (categories || []).filter((cat) => {
    if (!cat) return false;
    const hasName = Boolean(cat.name && cat.name.trim());
    const hasSkills = Array.isArray(cat.skills)
      ? cat.skills.some((s) => typeof s === 'string' && s.trim())
      : Boolean(cat.skills && cat.skills.trim());
    return hasName || hasSkills;
  });

  if (validCategories.length > 0) {
    return (
      <Box component="ul" sx={containerSx} style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {validCategories.map((cat, index) => {
          const skillsText = Array.isArray(cat.skills)
            ? cat.skills.filter((s) => typeof s === 'string' && s.trim()).join(', ')
            : cat.skills;
          const name = cat.name?.trim();

          return (
            <Typography component="li" data-cv-compact-break key={index} sx={categorySx}>
              {name && (
                <Box component="span" sx={labelSx}>
                  {name}:{' '}
                </Box>
              )}
              {skillsText}
            </Typography>
          );
        })}
      </Box>
    );
  }

  if (skills && skills.trim()) {
    const lines = skills.split('\n').map((l) => l.trim()).filter(Boolean);
    return (
      <Box component="ul" sx={containerSx} style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {lines.map((line, index) => {
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const categoryName = line.slice(0, colonIndex).trim();
            const rest = line.slice(colonIndex + 1).trim();
            return (
              <Typography component="li" data-cv-compact-break key={index} sx={categorySx}>
                <Box component="span" sx={labelSx}>
                  {categoryName}:{' '}
                </Box>
                {rest}
              </Typography>
            );
          }
          return (
            <Typography component="li" data-cv-compact-break key={index} sx={categorySx}>
              {line}
            </Typography>
          );
        })}
      </Box>
    );
  }

  return null;
};

export default SkillCategoryList;
