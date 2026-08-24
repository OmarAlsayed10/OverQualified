import { useEffect, useState } from 'react';
import { Box, Container } from '@mui/material';
import axios from 'axios';
import type { SkillRoadmapDetails } from '../features/CareerMatch/CareerRoadmap/CareerRoadmap.types';
import { MarketTrends } from '../features/Roadmap/MarketTrends';
import { RoadmapHero } from '../features/Roadmap/RoadmapHero';
import type { RoadmapFilter, RoadmapStatusTarget, UserProgressItem } from '../features/Roadmap/roadmap.types';
import { roadmapPalette } from '../features/Roadmap/roadmapTheme';
import { normalizeSkillKey } from '../features/Roadmap/skillKey';
import { UserRoadmap } from '../features/Roadmap/UserRoadmap';
import { ROADMAP_ENDPOINTS } from '../constants/endpoints';

export default function RoadmapPage() {
  const [items, setItems] = useState<UserProgressItem[]>([]);
  const [trends, setTrends] = useState<SkillRoadmapDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RoadmapFilter>('all');
  const [deletingSkill, setDeletingSkill] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [progressResponse, trendsResponse] = await Promise.all([
        axios.get<{ progress: UserProgressItem[] }>(ROADMAP_ENDPOINTS.getProgress, { withCredentials: true }),
        axios.get<{ trends: SkillRoadmapDetails[] }>(ROADMAP_ENDPOINTS.getTrends, { withCredentials: true }),
      ]);
      if (Array.isArray(progressResponse.data?.progress)) setItems(progressResponse.data.progress);
      if (Array.isArray(trendsResponse.data?.trends)) setTrends(trendsResponse.data.trends);
    } catch (error) {
      console.error('Failed to fetch roadmap data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const toggleStatus = async (item: RoadmapStatusTarget) => {
    const currentStatus = 'status' in item && item.status ? item.status : 'in_progress';
    const nextStatus = currentStatus === 'learned' ? 'in_progress' : 'learned';
    const targetKey = normalizeSkillKey(item.skillKey || item.skill || '');
    setItems((currentItems) => {
      const exists = currentItems.some((current) => normalizeSkillKey(current.skillKey || current.skill || '') === targetKey);
      if (!exists) return currentItems;
      return currentItems.map((current) => (
        normalizeSkillKey(current.skillKey || current.skill || '') === targetKey
          ? { ...current, status: nextStatus }
          : current
      ));
    });
    try {
      await axios.post(
        ROADMAP_ENDPOINTS.updateProgress,
        { skill: item.skill, status: nextStatus },
        { withCredentials: true },
      );
      void fetchData();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const deleteSkill = async (item: UserProgressItem) => {
    const targetKey = normalizeSkillKey(item.skillKey || item.skill || '');
    setDeletingSkill(targetKey);
    setItems((currentItems) => currentItems.filter(
      (current) => normalizeSkillKey(current.skillKey || current.skill || '') !== targetKey,
    ));
    try {
      await axios.delete(ROADMAP_ENDPOINTS.deleteProgress, {
        data: { skill: item.skill },
        withCredentials: true,
      });
    } catch (error) {
      console.error('Failed to delete skill:', error);
      void fetchData();
    } finally {
      setDeletingSkill(null);
    }
  };

  const dedupedItems = items.reduce<UserProgressItem[]>((uniqueItems, item) => {
    const skillKey = normalizeSkillKey(item.skillKey || item.skill || '');
    if (!uniqueItems.some((current) => normalizeSkillKey(current.skillKey || current.skill || '') === skillKey)) {
      uniqueItems.push({ ...item, skillKey });
    }
    return uniqueItems;
  }, []);
  const filteredItems = dedupedItems.filter((item) => filter === 'all' || item.status === filter);
  const learnedCount = dedupedItems.filter((item) => item.status === 'learned').length;
  const inProgressCount = dedupedItems.filter((item) => item.status === 'in_progress').length;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: roadmapPalette.sand, pb: 10 }}>
      <RoadmapHero />
      <Container maxWidth="lg" sx={{ mt: -6, position: 'relative' }}>
        <MarketTrends trends={trends} progress={dedupedItems} onToggleStatus={(item) => void toggleStatus(item)} />
        <UserRoadmap
          items={filteredItems}
          totalCount={dedupedItems.length}
          learnedCount={learnedCount}
          inProgressCount={inProgressCount}
          loading={loading}
          filter={filter}
          deletingSkill={deletingSkill}
          onFilterChange={setFilter}
          onToggleStatus={(item) => void toggleStatus(item)}
          onDelete={(item) => void deleteSkill(item)}
        />
      </Container>
    </Box>
  );
}
