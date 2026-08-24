import type { SxProps, Theme } from '@mui/material';

export interface SkillCategoryItem {
  name?: string;
  skills: string[] | string;
}

export interface SkillCategoryListProps {
  categories?: SkillCategoryItem[];
  skills?: string;
  categorySx?: SxProps<Theme>;
  labelSx?: SxProps<Theme>;
  containerSx?: SxProps<Theme>;
}
