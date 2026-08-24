import type { SkillCategory } from '../../../../redux/store/slices/cvBuilderSlice';

export interface SkillsProps {}

export interface SkillsFormData {
  skillCategories: SkillCategory[];
  languages?: string;
}
