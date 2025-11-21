// Streak Calculation and Display Utilities
// Additional helpers for streak management and UI display

import type { StreakData, LearningProgress } from './progressStore';
import { getTodayDate, loadProgress, saveProgress } from './progressStore';

export interface StreakStatus {
  isActive: boolean;
  currentStreak: number;
  longestStreak: number;
  daysUntilLost: number; // 0 = will lose today if no activity, 1 = safe for today
  message: string;
  urgency: 'safe' | 'warning' | 'danger' | 'lost';
}

// Get comprehensive streak status
export function getStreakStatus(progress: LearningProgress): StreakStatus {
  const { streaks } = progress;
  const today = getTodayDate();
  const lastActive = streaks.lastActiveDate;

  // No activity yet
  if (!lastActive) {
    return {
      isActive: false,
      currentStreak: 0,
      longestStreak: 0,
      daysUntilLost: 0,
      message: 'Start your learning journey!',
      urgency: 'safe',
    };
  }

  // Active today
  if (lastActive === today) {
    return {
      isActive: true,
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
      daysUntilLost: 1,
      message: streaks.current === 1
        ? 'Great start! Come back tomorrow!'
        : `${streaks.current} day streak! Keep it going!`,
      urgency: 'safe',
    };
  }

  // Calculate days since last activity
  const lastDate = new Date(lastActive);
  const todayDate = new Date(today);
  const diffDays = Math.floor(
    (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 1) {
    // Yesterday - streak at risk
    return {
      isActive: false,
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
      daysUntilLost: 0,
      message: `Complete a topic today to keep your ${streaks.current} day streak!`,
      urgency: 'warning',
    };
  } else {
    // Streak is lost
    return {
      isActive: false,
      currentStreak: 0,
      longestStreak: streaks.longest,
      daysUntilLost: 0,
      message: streaks.longest > 0
        ? `Your ${streaks.current} day streak ended. Start a new one!`
        : 'Start your streak today!',
      urgency: 'lost',
    };
  }
}

// Get streak milestone achievements
export function getStreakMilestones(currentStreak: number): string[] {
  const milestones: string[] = [];

  if (currentStreak >= 3) milestones.push('3-Day Starter');
  if (currentStreak >= 7) milestones.push('Week Warrior');
  if (currentStreak >= 14) milestones.push('Two-Week Titan');
  if (currentStreak >= 30) milestones.push('Monthly Master');
  if (currentStreak >= 60) milestones.push('Bi-Monthly Beast');
  if (currentStreak >= 100) milestones.push('Century Champion');
  if (currentStreak >= 365) milestones.push('Year-Long Legend');

  return milestones;
}

// Get next milestone info
export function getNextMilestone(currentStreak: number): { days: number; name: string } | null {
  const milestones = [
    { days: 3, name: '3-Day Starter' },
    { days: 7, name: 'Week Warrior' },
    { days: 14, name: 'Two-Week Titan' },
    { days: 30, name: 'Monthly Master' },
    { days: 60, name: 'Bi-Monthly Beast' },
    { days: 100, name: 'Century Champion' },
    { days: 365, name: 'Year-Long Legend' },
  ];

  for (const milestone of milestones) {
    if (currentStreak < milestone.days) {
      return milestone;
    }
  }

  return null;
}

// Generate activity calendar data for the last N days
export function getActivityCalendar(
  progress: LearningProgress,
  days: number = 30
): { date: string; hasActivity: boolean; isToday: boolean }[] {
  const calendar: { date: string; hasActivity: boolean; isToday: boolean }[] = [];
  const today = getTodayDate();
  const todayDate = new Date(today);

  // Get all completion dates
  const activityDates = new Set<string>();
  for (const topicData of Object.values(progress.completedTopics)) {
    const date = topicData.completedAt.split('T')[0];
    activityDates.add(date);
  }

  // Generate calendar going back N days
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(todayDate);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    calendar.push({
      date: dateStr,
      hasActivity: activityDates.has(dateStr),
      isToday: dateStr === today,
    });
  }

  return calendar;
}

// Get streak flame intensity (for visual display)
export function getStreakIntensity(currentStreak: number): 'none' | 'low' | 'medium' | 'high' | 'max' {
  if (currentStreak === 0) return 'none';
  if (currentStreak < 3) return 'low';
  if (currentStreak < 7) return 'medium';
  if (currentStreak < 30) return 'high';
  return 'max';
}

// Format streak for display
export function formatStreakDisplay(streaks: StreakData): string {
  if (streaks.current === 0) {
    return 'No active streak';
  }

  const dayWord = streaks.current === 1 ? 'day' : 'days';
  return `${streaks.current} ${dayWord}`;
}

// Check if user achieved a new milestone today
export function checkNewMilestone(
  oldStreak: number,
  newStreak: number
): { achieved: boolean; milestone: string } | null {
  const oldMilestones = getStreakMilestones(oldStreak);
  const newMilestones = getStreakMilestones(newStreak);

  // Find newly achieved milestone
  const newAchievement = newMilestones.find(m => !oldMilestones.includes(m));

  if (newAchievement) {
    return {
      achieved: true,
      milestone: newAchievement,
    };
  }

  return null;
}

// Get motivational message based on streak status
export function getMotivationalMessage(status: StreakStatus): string {
  const messages = {
    safe: [
      "You're on fire! Keep learning!",
      "Excellent progress today!",
      "Every day counts. Well done!",
      "Knowledge compounds. Keep going!",
    ],
    warning: [
      "Your streak is at risk! Learn something today!",
      "Don't break the chain! Complete a topic now!",
      "Just one topic keeps your streak alive!",
      "You've come so far. Don't stop now!",
    ],
    danger: [
      "Last chance to save your streak!",
      "Quick! Complete a topic before midnight!",
      "Your streak needs you!",
    ],
    lost: [
      "Every expert was once a beginner. Start fresh!",
      "New day, new streak. Let's go!",
      "The best time to start is now!",
      "Your previous record: proof you can do it!",
    ],
  };

  const pool = messages[status.urgency] || messages.safe;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Calculate weekly activity summary
export function getWeeklySummary(progress: LearningProgress): {
  topicsCompleted: number;
  minutesSpent: number;
  daysActive: number;
} {
  const today = new Date(getTodayDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  let topicsCompleted = 0;
  let minutesSpent = 0;
  const activeDays = new Set<string>();

  for (const topicData of Object.values(progress.completedTopics)) {
    const completedDate = new Date(topicData.completedAt);
    if (completedDate >= weekAgo) {
      topicsCompleted++;
      minutesSpent += topicData.timeSpentMinutes || 0;
      activeDays.add(topicData.completedAt.split('T')[0]);
    }
  }

  return {
    topicsCompleted,
    minutesSpent,
    daysActive: activeDays.size,
  };
}
