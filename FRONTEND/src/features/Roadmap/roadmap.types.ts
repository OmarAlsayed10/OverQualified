import type { SkillRoadmapDetails } from '../CareerMatch/CareerRoadmap/CareerRoadmap.types';

export interface UserProgressItem {
  id: string;
  skillKey: string;
  skill: string;
  category: string;
  status: 'in_progress' | 'learned';
  learnedAt: string | null;
  roadmap: SkillRoadmapDetails;
}

export type RoadmapFilter = 'all' | 'in_progress' | 'learned';
export type RoadmapStatusTarget = UserProgressItem | { skill: string; skillKey: string; status?: string };
