import type { SkillCategory } from '../../redux/store/slices/cvBuilderSlice';

export const DEFAULT_FALLBACK_CATEGORY = 'Other Skills';

export const flattenSkills = (categories?: SkillCategory[] | null): string[] => {
  if (!Array.isArray(categories)) return [];
  return categories.flatMap((category) => category.skills || []).filter(Boolean);
};

export const countTotalSkills = (categories?: SkillCategory[] | null): number => {
  return flattenSkills(categories).length;
};

export const mergeSkillCategories = (
  categories: SkillCategory[],
  additions: SkillCategory[],
): SkillCategory[] => {
  const merged = categories.map((category) => ({ ...category, skills: [...category.skills] }));
  const knownSkills = new Set(flattenSkills(merged).map((skill) => skill.toLowerCase()));

  additions.forEach((addition) => {
    const categoryName = addition.name.trim();
    const newSkills = addition.skills
      .map((skill) => skill.trim())
      .filter((skill) => {
        const normalizedSkill = skill.toLowerCase();
        if (!skill || knownSkills.has(normalizedSkill)) return false;
        knownSkills.add(normalizedSkill);
        return true;
      });
    if (newSkills.length === 0) return;
    const existingCategory = merged.find(
      (category) => category.name.trim().toLowerCase() === categoryName.toLowerCase(),
    );
    if (existingCategory) existingCategory.skills.push(...newSkills);
    else merged.push({ name: categoryName || DEFAULT_FALLBACK_CATEGORY, skills: newSkills });
  });

  return merged;
};

export const mergeSkillsIntoCategories = (
  categories: SkillCategory[],
  newSkills: string[],
  fallbackCategoryName = 'Technical Skills',
): SkillCategory[] => {
  const cleanNewSkills = newSkills.map((s) => s.trim()).filter(Boolean);
  if (cleanNewSkills.length === 0) return categories;

  const existingLower = new Set(
    categories.flatMap((cat) => (cat.skills || []).map((s) => s.toLowerCase())),
  );
  const toAdd = cleanNewSkills.filter((s) => !existingLower.has(s.toLowerCase()));
  if (toAdd.length === 0) return categories;

  if (categories.length === 0) {
    return [{ name: fallbackCategoryName, skills: toAdd }];
  }

  let added = false;
  const updated = categories.map((cat, idx) => {
    if (idx === 0 && !added) {
      added = true;
      const merged = [...(cat.skills || [])];
      toAdd.forEach((s) => {
        if (!merged.includes(s)) merged.push(s);
      });
      return { ...cat, skills: merged };
    }
    return cat;
  });

  return updated;
};
