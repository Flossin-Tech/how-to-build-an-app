// Progress Storage System for Gamified Learning Course
// Manages user progress, completed topics, and learning path state in localStorage

export interface CompletedTopic {
  depth: 'surface' | 'mid-depth' | 'deep-water';
  completedAt: string; // ISO date string
  timeSpentMinutes?: number;
}

export interface PathProgress {
  startedAt: string; // ISO date string
  currentStep: number;
  completedSteps: number[];
  lastAccessedAt: string;
}

export interface StreakData {
  current: number;
  longest: number;
  lastActiveDate: string; // YYYY-MM-DD format
}

export interface LearningProgress {
  currentPathId: string | null;
  currentPathCategory: 'personas' | 'tracks' | 'journeys' | null;
  completedTopics: Record<string, CompletedTopic>; // key: "phase/topic/depth"
  pathProgress: Record<string, PathProgress>; // key: pathId
  streaks: StreakData;
  preferences: {
    preferredDepth: 'surface' | 'mid-depth' | 'deep-water';
    notifications: boolean;
  };
  stats: {
    totalTopicsCompleted: number;
    totalTimeSpentMinutes: number;
    firstActivityDate: string | null;
  };
}

const STORAGE_KEY = 'htbaa_learning_progress';

const defaultProgress: LearningProgress = {
  currentPathId: null,
  currentPathCategory: null,
  completedTopics: {},
  pathProgress: {},
  streaks: {
    current: 0,
    longest: 0,
    lastActiveDate: '',
  },
  preferences: {
    preferredDepth: 'surface',
    notifications: true,
  },
  stats: {
    totalTopicsCompleted: 0,
    totalTimeSpentMinutes: 0,
    firstActivityDate: null,
  },
};

// Check if we're in browser environment
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

// Get today's date in YYYY-MM-DD format (local timezone)
export function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Load progress from localStorage
export function loadProgress(): LearningProgress {
  if (!isBrowser()) {
    return { ...defaultProgress };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<LearningProgress>;
      // Merge with defaults to ensure all fields exist
      return {
        ...defaultProgress,
        ...parsed,
        streaks: { ...defaultProgress.streaks, ...parsed.streaks },
        preferences: { ...defaultProgress.preferences, ...parsed.preferences },
        stats: { ...defaultProgress.stats, ...parsed.stats },
      };
    }
  } catch (error) {
    console.error('Failed to load learning progress:', error);
  }

  return { ...defaultProgress };
}

// Save progress to localStorage
export function saveProgress(progress: LearningProgress): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save learning progress:', error);
  }
}

// Generate topic key for storage
export function getTopicKey(phase: string, topic: string, depth: string): string {
  return `${phase}/${topic}/${depth}`;
}

// Check if a topic is completed
export function isTopicCompleted(
  progress: LearningProgress,
  phase: string,
  topic: string,
  depth: string
): boolean {
  const key = getTopicKey(phase, topic, depth);
  return key in progress.completedTopics;
}

// Get completion status for all depths of a topic
export function getTopicDepthCompletion(
  progress: LearningProgress,
  phase: string,
  topic: string
): { surface: boolean; midDepth: boolean; deepWater: boolean } {
  return {
    surface: isTopicCompleted(progress, phase, topic, 'surface'),
    midDepth: isTopicCompleted(progress, phase, topic, 'mid-depth'),
    deepWater: isTopicCompleted(progress, phase, topic, 'deep-water'),
  };
}

// Count completed depths for a topic (0, 1, 2, or 3)
export function getTopicCompletionCount(
  progress: LearningProgress,
  phase: string,
  topic: string
): number {
  const completion = getTopicDepthCompletion(progress, phase, topic);
  return [completion.surface, completion.midDepth, completion.deepWater].filter(Boolean).length;
}

// Mark a topic as completed
export function completeTopic(
  progress: LearningProgress,
  phase: string,
  topic: string,
  depth: 'surface' | 'mid-depth' | 'deep-water',
  timeSpentMinutes?: number
): LearningProgress {
  const key = getTopicKey(phase, topic, depth);
  const now = new Date().toISOString();
  const today = getTodayDate();

  // Check if this is a new completion
  const isNewCompletion = !(key in progress.completedTopics);

  const updatedProgress: LearningProgress = {
    ...progress,
    completedTopics: {
      ...progress.completedTopics,
      [key]: {
        depth,
        completedAt: now,
        timeSpentMinutes,
      },
    },
    stats: {
      ...progress.stats,
      totalTopicsCompleted: isNewCompletion
        ? progress.stats.totalTopicsCompleted + 1
        : progress.stats.totalTopicsCompleted,
      totalTimeSpentMinutes:
        progress.stats.totalTimeSpentMinutes + (timeSpentMinutes || 0),
      firstActivityDate: progress.stats.firstActivityDate || today,
    },
  };

  // Update streak
  const updatedStreak = updateStreak(updatedProgress.streaks, today);
  updatedProgress.streaks = updatedStreak;

  saveProgress(updatedProgress);
  return updatedProgress;
}

// Update streak based on activity
function updateStreak(streaks: StreakData, today: string): StreakData {
  const lastActive = streaks.lastActiveDate;

  if (!lastActive) {
    // First activity ever
    return {
      current: 1,
      longest: 1,
      lastActiveDate: today,
    };
  }

  if (lastActive === today) {
    // Already active today, no change
    return streaks;
  }

  const lastDate = new Date(lastActive);
  const todayDate = new Date(today);
  const diffDays = Math.floor(
    (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 1) {
    // Consecutive day, increment streak
    const newCurrent = streaks.current + 1;
    return {
      current: newCurrent,
      longest: Math.max(streaks.longest, newCurrent),
      lastActiveDate: today,
    };
  } else {
    // Streak broken, start fresh
    return {
      current: 1,
      longest: streaks.longest,
      lastActiveDate: today,
    };
  }
}

// Start a learning path
export function startPath(
  progress: LearningProgress,
  pathId: string,
  category: 'personas' | 'tracks' | 'journeys'
): LearningProgress {
  const now = new Date().toISOString();

  const updatedProgress: LearningProgress = {
    ...progress,
    currentPathId: pathId,
    currentPathCategory: category,
    pathProgress: {
      ...progress.pathProgress,
      [pathId]: progress.pathProgress[pathId] || {
        startedAt: now,
        currentStep: 0,
        completedSteps: [],
        lastAccessedAt: now,
      },
    },
  };

  // Update last accessed
  updatedProgress.pathProgress[pathId].lastAccessedAt = now;

  saveProgress(updatedProgress);
  return updatedProgress;
}

// Update current step in path
export function updatePathStep(
  progress: LearningProgress,
  pathId: string,
  stepIndex: number,
  completed: boolean = false
): LearningProgress {
  if (!progress.pathProgress[pathId]) {
    return progress;
  }

  const pathData = progress.pathProgress[pathId];
  const updatedCompletedSteps = completed
    ? [...new Set([...pathData.completedSteps, stepIndex])]
    : pathData.completedSteps;

  const updatedProgress: LearningProgress = {
    ...progress,
    pathProgress: {
      ...progress.pathProgress,
      [pathId]: {
        ...pathData,
        currentStep: stepIndex,
        completedSteps: updatedCompletedSteps,
        lastAccessedAt: new Date().toISOString(),
      },
    },
  };

  saveProgress(updatedProgress);
  return updatedProgress;
}

// Get path completion percentage
export function getPathCompletionPercent(
  progress: LearningProgress,
  pathId: string,
  totalSteps: number
): number {
  const pathData = progress.pathProgress[pathId];
  if (!pathData || totalSteps === 0) return 0;

  return Math.round((pathData.completedSteps.length / totalSteps) * 100);
}

// Check if user is on a streak today
export function isActiveToday(progress: LearningProgress): boolean {
  return progress.streaks.lastActiveDate === getTodayDate();
}

// Get days since last activity
export function getDaysSinceLastActivity(progress: LearningProgress): number {
  if (!progress.streaks.lastActiveDate) return -1;

  const lastDate = new Date(progress.streaks.lastActiveDate);
  const today = new Date(getTodayDate());
  return Math.floor(
    (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
  );
}

// Clear a specific path's progress
export function clearPathProgress(
  progress: LearningProgress,
  pathId: string
): LearningProgress {
  const { [pathId]: _, ...remainingPaths } = progress.pathProgress;

  const updatedProgress: LearningProgress = {
    ...progress,
    currentPathId: progress.currentPathId === pathId ? null : progress.currentPathId,
    currentPathCategory:
      progress.currentPathId === pathId ? null : progress.currentPathCategory,
    pathProgress: remainingPaths,
  };

  saveProgress(updatedProgress);
  return updatedProgress;
}

// Clear current path selection (keeps the progress data)
export function clearCurrentPath(progress: LearningProgress): LearningProgress {
  const updatedProgress: LearningProgress = {
    ...progress,
    currentPathId: null,
    currentPathCategory: null,
  };

  saveProgress(updatedProgress);
  return updatedProgress;
}

// Reset all progress (with confirmation)
export function resetAllProgress(): LearningProgress {
  const fresh = { ...defaultProgress };
  saveProgress(fresh);
  return fresh;
}

// Export progress as JSON (for backup)
export function exportProgress(): string {
  const progress = loadProgress();
  return JSON.stringify(progress, null, 2);
}

// Import progress from JSON (for restore)
export function importProgress(jsonString: string): LearningProgress | null {
  try {
    const imported = JSON.parse(jsonString) as LearningProgress;
    saveProgress(imported);
    return imported;
  } catch (error) {
    console.error('Failed to import progress:', error);
    return null;
  }
}
