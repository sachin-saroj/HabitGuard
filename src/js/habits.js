/**
 * HabitGuard — Habits Module
 * Business logic for habit operations: create, toggle, delete, query.
 */
(function () {
  'use strict';

  const HG = window.HabitGuard = window.HabitGuard || {};
  function Utils() { return HG.Utils; }
  function Store() { return HG.Store; }

  /**
   * Available icons for the icon picker
   */
  const HABIT_ICONS = [
    '💪', '🏋️', '🏃', '📚', '📖', '🥗', '🧘', '🎨', '✍️',
    '💻', '🎵', '🌅', '⏰', '💤', '🚴', '🏊', '🎯', '🧠',
    '💊', '🌿', '🚶', '💧', '🚿', '🤸', '🌙', '🙏', '📵',
    '🔤', '🎸', '📝', '🍎', '☕', '🧹', '📷', '🎮', '⚽'
  ];

  /**
   * Popular habits (for the Browse modal)
   */
  const POPULAR_HABITS = [
    { name: 'Morning Workout', icon: '💪', category: 'fitness', likes: 12400 },
    { name: 'Read 30 Minutes', icon: '📖', category: 'learning', likes: 9800 },
    { name: 'Meditation', icon: '🧘', category: 'mindfulness', likes: 8700 },
    { name: 'Drink 8 Glasses of Water', icon: '💧', category: 'health', likes: 11200 },
    { name: 'Journal Writing', icon: '✍️', category: 'lifestyle', likes: 6300 },
    { name: 'No Social Media Before Noon', icon: '📵', category: 'lifestyle', likes: 7100 },
    { name: 'Walk 10,000 Steps', icon: '🚶', category: 'fitness', likes: 8900 },
    { name: 'Learn a New Word', icon: '🔤', category: 'learning', likes: 5400 },
    { name: 'Cook a Healthy Meal', icon: '🥗', category: 'health', likes: 7800 },
    { name: 'Practice Gratitude', icon: '🙏', category: 'mindfulness', likes: 6700 },
    { name: 'Cold Shower', icon: '🚿', category: 'health', likes: 4200 },
    { name: 'Stretch for 10 Minutes', icon: '🤸', category: 'fitness', likes: 5900 },
    { name: 'Night Routine', icon: '🌙', category: 'lifestyle', likes: 8100 },
    { name: 'Drawing Practice', icon: '🎨', category: 'creative', likes: 3800 },
    { name: 'No Junk Food', icon: '🚫', category: 'health', likes: 9200 },
    { name: 'The 5am Club', icon: '⏰', category: 'lifestyle', likes: 5400 },
    { name: 'Run 5km', icon: '🏃', category: 'fitness', likes: 6800 },
    { name: 'Swimming', icon: '🏊', category: 'fitness', likes: 4500 }
  ];

  HG.Habits = {
    ICONS: HABIT_ICONS,
    POPULAR: POPULAR_HABITS,

    /**
     * Create a new habit from form data
     * @param {Object} data - { name, icon, time, location, category }
     * @returns {Object} Created habit
     */
    create(data) {
      if (!data.name || data.name.trim().length === 0) {
        throw new Error('Habit name is required');
      }
      return Store().addHabit(data);
    },

    /**
     * Add a popular habit directly
     * @param {Object} popularHabit - from POPULAR_HABITS
     * @returns {Object} Created habit
     */
    addPopular(popularHabit) {
      return Store().addHabit({
        name: popularHabit.name,
        icon: popularHabit.icon,
        time: '08:00',
        location: '',
        category: popularHabit.category
      });
    },

    /**
     * Toggle habit completion for a date
     * @param {string} habitId
     * @param {string} date - YYYY-MM-DD (defaults to today)
     * @returns {Object|null}
     */
    toggleComplete(habitId, date) {
      date = date || Utils().getToday();
      return Store().toggleComplete(habitId, date);
    },

    /**
     * Delete a habit
     * @param {string} habitId
     * @returns {boolean}
     */
    delete(habitId) {
      return Store().deleteHabit(habitId);
    },

    /**
     * Get all habits
     * @returns {Array}
     */
    getAll() {
      return Store().getHabits();
    },

    /**
     * Get completion status for a specific habit on a specific date
     * @param {Object} habit
     * @param {string} date
     * @returns {boolean}
     */
    isCompleted(habit, date) {
      return habit.history && habit.history[date] === 1;
    },

    /**
     * Check if all habits are completed for a given date
     * @param {string} date
     * @returns {boolean}
     */
    allCompletedForDate(date) {
      const habits = this.getAll();
      if (habits.length === 0) return false;
      return habits.every(h => h.history && h.history[date] === 1);
    },

    /**
     * Get completion count for a specific date
     * @param {string} date
     * @returns {{ completed: number, total: number, percentage: number }}
     */
    getCompletionForDate(date) {
      const habits = this.getAll();
      const total = habits.length;
      const completed = habits.filter(h => h.history && h.history[date] === 1).length;
      return {
        completed,
        total,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    },

    /**
     * Get overall stats
     * @returns {Object}
     */
    getOverallStats() {
      const habits = this.getAll();
      const today = Utils().getToday();
      const todayCompletion = this.getCompletionForDate(today);

      // Calculate overall completion rate (last 30 days)
      let totalCompleted = 0;
      let totalPossible = 0;
      for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = Utils().formatDateKey(d);
        habits.forEach(h => {
          const createdStr = h.createdAt ? h.createdAt.substring(0, 10) : '2000-01-01';
          if (dateKey >= createdStr) {
            totalPossible++;
            if (h.history && h.history[dateKey] === 1) totalCompleted++;
          }
        });
      }

      return {
        totalHabits: habits.length,
        todayCompleted: todayCompletion.completed,
        todayTotal: todayCompletion.total,
        overallRate: totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0,
        totalCompleted,
        totalPossible
      };
    },

    /**
     * Calculate month-over-month improvement percentage
     * Compares current month's completion rate to previous month's
     */
    getMonthlyImprovement() {
      const habits = this.getAll();
      const today = Utils().getToday();
      const now = new Date();
      
      let curCompleted = 0, curTotal = 0;
      let prevCompleted = 0, prevTotal = 0;

      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      const daysInCur = Utils().getDaysInMonth(currentYear, currentMonth);
      const daysInPrev = Utils().getDaysInMonth(prevYear, prevMonth);

      habits.forEach(h => {
        const createdStr = h.createdAt ? h.createdAt.substring(0, 10) : '2000-01-01';

        // Current month
        for (let d = 1; d <= daysInCur; d++) {
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          if (dateStr <= today && dateStr >= createdStr) {
            curTotal++;
            if (h.history && h.history[dateStr] === 1) curCompleted++;
          }
        }

        // Previous month
        for (let d = 1; d <= daysInPrev; d++) {
          const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          if (dateStr <= today && dateStr >= createdStr) {
            prevTotal++;
            if (h.history && h.history[dateStr] === 1) prevCompleted++;
          }
        }
      });

      const curRate = curTotal > 0 ? curCompleted / curTotal : 0;
      const prevRate = prevTotal > 0 ? prevCompleted / prevTotal : 0;

      if (prevRate === 0 && curRate > 0) return { change: 100, direction: 'up' };
      if (prevRate === 0) return { change: 0, direction: 'neutral' };

      const change = ((curRate - prevRate) / prevRate) * 100;
      return {
        change: Math.abs(Math.round(change * 10) / 10),
        direction: change >= 0 ? 'up' : 'down'
      };
    },

    /**
     * Get habit completion counts by category (for bar chart)
     * @returns {Array} [{ name, count, category }]
     */
    getHabitCompletionCounts(filter = 'all') {
      const habits = this.getAll();
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      return habits.map(h => {
        let completions = 0;
        if (h.history) {
          Object.entries(h.history).forEach(([dateStr, val]) => {
            if (val === 1) {
              if (filter === 'current') {
                const [y, m] = dateStr.split('-').map(Number);
                if (y === currentYear && m === currentMonth + 1) {
                  completions++;
                }
              } else {
                completions++;
              }
            }
          });
        }
        
        return {
          name: h.name,
          icon: h.icon,
          count: completions,
          category: h.category
        };
      }).sort((a, b) => b.count - a.count);
    },
  };
})();
