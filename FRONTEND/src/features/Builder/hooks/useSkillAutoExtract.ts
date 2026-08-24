import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateSection } from '../../../redux/store/slices/cvBuilderSlice';
import type { RootState } from '../../../redux/store/store';
import { extractSkills } from '../skillDictionary';
import { mergeSkillCategories, mergeSkillsIntoCategories } from '../skillCategories';
import axios from 'axios';
import { AI_ENDPOINTS } from '../../../constants/endpoints';

// Watches the experience text and adds newly-detected skills to the Skills section once.
// A skill is only ever auto-added a single time, so the user can freely remove one without
// it reappearing on the next keystroke.
export const useSkillAutoExtract = () => {
  const dispatch = useDispatch();
  const formData = useSelector((state: RootState) => state.cvBuilder.formData);
  const experience = formData.experience;
  const skills = formData.skills;

  const everAdded = useRef<Set<string>>(new Set());
  const formDataRef = useRef(formData);
  const lastFetchedTextRef = useRef('');

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    const text = experience.map((e) => `${e.jobTitle ?? ''} ${e.description ?? ''}`).join(' ');
    
    // 1. Instant static dictionary extraction
    const detected = extractSkills(text);
    if (detected.length === 0) return;

    const currentCategories = skills.skillCategories || [];
    const allSkills = currentCategories.flatMap((c) => c.skills || []);
    const currentLower = new Set(allSkills.map((s) => s.toLowerCase()));
    const toAdd = detected.filter(
      (s) => !everAdded.current.has(s.toLowerCase()) && !currentLower.has(s.toLowerCase()),
    );

    detected.forEach((s) => everAdded.current.add(s.toLowerCase()));

    if (toAdd.length > 0) {
      const merged = mergeSkillsIntoCategories(currentCategories, toAdd);
      dispatch(updateSection({ section: 'skills', data: { ...skills, skillCategories: merged } }));
    }

    // 2. AI-powered smart extraction (debounced to avoid spamming the API on every keystroke)
    const timeout = setTimeout(async () => {
      // Only run AI extraction if there's substantial text
      if (text.trim().length > 30 && text !== lastFetchedTextRef.current) {
        lastFetchedTextRef.current = text;
        try {
          const { data } = await axios.post(
            AI_ENDPOINTS.generateSmartSkills,
            { formData: formDataRef.current },
            { withCredentials: true }
          );
          const liveCategories = formDataRef.current?.skills?.skillCategories || [];
          if (Array.isArray(data?.skillCategories)) {
            const mergedCategories = mergeSkillCategories(liveCategories, data.skillCategories);
            dispatch(updateSection({ section: 'skills', data: { ...formDataRef.current?.skills, skillCategories: mergedCategories } }));
          } else if (Array.isArray(data?.skills)) {
            const aiDetected: string[] = data.skills;
            const liveSkills = liveCategories.flatMap((category) => category.skills || []);
            const currentAILower = new Set(liveSkills.map((skill) => skill.toLowerCase()));
            const newSkills = aiDetected.filter(
              (skill) => !everAdded.current.has(skill.toLowerCase()) && !currentAILower.has(skill.toLowerCase()),
            );
            aiDetected.forEach((skill) => everAdded.current.add(skill.toLowerCase()));
            if (newSkills.length > 0) {
              const mergedSkills = mergeSkillsIntoCategories(liveCategories, newSkills);
              dispatch(updateSection({ section: 'skills', data: { ...formDataRef.current?.skills, skillCategories: mergedSkills } }));
            }
          }
        } catch (ignoredError) {
          void ignoredError;
        }
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [experience, skills, dispatch]);
};
