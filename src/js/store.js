/**
 * HabitGuard — Store Module
 * localStorage CRUD operations, data validation, export/import.
 */
(function () {
  'use strict';

  const HG = window.HabitGuard = window.HabitGuard || {};
  // Lazy access — Utils must be resolved at call time, not parse time
  function Utils() { return HG.Utils; }

  const KEYS = {
    HABITS: 'habitguard_habits',
    SETTINGS: 'habitguard_settings'
  };

  /**
   * Default habits seeded on first launch (matching the reference design)
   */
  const DEFAULT_HABITS = [
    {
      id: null, name: 'Study', icon: '📚', time: '10:00',
      location: 'K-Cafe', category: 'learning',
      history: {}, streak: 0, bestStreak: 0, createdAt: null
    },
    {
      id: null, name: 'Groceries', icon: '🛒', time: '14:00',
      location: 'Hayday Market', category: 'lifestyle',
      history: {}, streak: 0, bestStreak: 0, createdAt: null
    },
    {
      id: null, name: 'Eat Healthy Food', icon: '🥗', time: '08:30',
      location: 'Home', category: 'health',
      history: {}, streak: 0, bestStreak: 0, createdAt: null
    },
    {
      id: null, name: 'Read a book', icon: '📖', time: '08:00',
      location: 'Library', category: 'learning',
      history: {}, streak: 0, bestStreak: 0, createdAt: null
    },
    {
      id: null, name: 'Swimming', icon: '🏊', time: '06:00',
      location: 'Gym Pool', category: 'fitness',
      history: {}, streak: 0, bestStreak: 0, createdAt: null
    }
  ];

  const DEFAULT_SETTINGS = {
    userName: 'User',
    selectedDate: null, // will be set to today
    calendarMonth: null,
    calendarYear: null
  };

  /**
   * Safely read and parse from localStorage
   */
  function safeRead(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`[Store] Failed to parse ${key}, resetting to default.`, err);
      localStorage.removeItem(key);
      return fallback;
    }
  }

  /**
   * Safely write to localStorage
   */
  function safeWrite(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (err) {
      console.error(`[Store] Failed to write ${key}.`, err);
      if (err.name === 'QuotaExceededError') {
        alert('Storage is full. Please export your data and clear old entries.');
      }
      return false;
    }
  }

  /**
   * Generate demo history for seeded habits (last 10 days)
   * Creates realistic-looking data with some misses for pattern detection
   */
  function generateDemoHistory() {
    const history = {};
    const today = new Date();
    // Patterns: complete 2-3 days, skip 1, repeat
    const pattern = [1, 1, 0, 1, 1, 1, 0, 1, 1, 0];
    for (let i = 9; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = Utils().formatDateKey(d);
      history[key] = pattern[9 - i];
    }
    return history;
  }

  HG.Store = {
    /**
     * Initialize store with defaults if first run
     */
    init() {
      const existing = safeRead(KEYS.HABITS, null);
      if (existing === null) {
        this.seedDefaults();
      }

      // Ensure settings exist
      const settings = safeRead(KEYS.SETTINGS, null);
      if (settings === null) {
        const now = new Date();
        safeWrite(KEYS.SETTINGS, {
          ...DEFAULT_SETTINGS,
          selectedDate: Utils().getToday(),
          calendarMonth: now.getMonth(),
          calendarYear: now.getFullYear()
        });
      }
    },

    /**
     * Seed default habits with demo data
     */
    seedDefaults() {
      const now = new Date();
      const habits = DEFAULT_HABITS.map(h => ({
        ...h,
        id: Utils().uuid(),
        createdAt: new Date(now - 10 * 86400000).toISOString(),
        history: generateDemoHistory()
      }));
      safeWrite(KEYS.HABITS, habits);
    },

    // ==============================
    // HABITS CRUD
    // ==============================

    /**
     * Get all habits
     * @returns {Array} Array of habit objects
     */
    getHabits() {
      return safeRead(KEYS.HABITS, []);
    },

    /**
     * Get a single habit by ID
     * @param {string} id
     * @returns {Object|null}
     */
    getHabit(id) {
      const habits = this.getHabits();
      return habits.find(h => h.id === id) || null;
    },

    /**
     * Add a new habit
     * @param {Object} data - { name, icon, time, location, category }
     * @returns {Object} The created habit
     */
    addHabit(data) {
      const habits = this.getHabits();
      const habit = {
        id: Utils().uuid(),
        name: data.name.trim(),
        icon: data.icon || '⭐',
        time: data.time || '08:00',
        location: data.location ? data.location.trim() : '',
        category: data.category || 'other',
        history: {},
        streak: 0,
        bestStreak: 0,
        createdAt: new Date().toISOString()
      };
      habits.push(habit);
      safeWrite(KEYS.HABITS, habits);
      return habit;
    },

    /**
     * Update a habit's properties
     * @param {string} id
     * @param {Object} updates
     * @returns {Object|null} Updated habit
     */
    updateHabit(id, updates) {
      const habits = this.getHabits();
      const index = habits.findIndex(h => h.id === id);
      if (index === -1) return null;
      habits[index] = { ...habits[index], ...updates };
      safeWrite(KEYS.HABITS, habits);
      return habits[index];
    },

    /**
     * Delete a habit
     * @param {string} id
     * @returns {boolean}
     */
    deleteHabit(id) {
      const habits = this.getHabits();
      const filtered = habits.filter(h => h.id !== id);
      if (filtered.length === habits.length) return false;
      safeWrite(KEYS.HABITS, filtered);
      return true;
    },

    /**
     * Toggle habit completion for a specific date
     * @param {string} id
     * @param {string} date - YYYY-MM-DD
     * @returns {Object|null} Updated habit
     */
    toggleComplete(id, date) {
      const habits = this.getHabits();
      const index = habits.findIndex(h => h.id === id);
      if (index === -1) return null;

      const habit = habits[index];
      if (!habit.history) habit.history = {};

      // Toggle: if completed → remove, otherwise → complete
      if (habit.history[date] === 1) {
        habit.history[date] = 0;
      } else {
        habit.history[date] = 1;
      }

      // Recalculate streak
      habit.streak = this._calculateStreak(habit.history);
      habit.bestStreak = Math.max(habit.bestStreak || 0, habit.streak);

      habits[index] = habit;
      safeWrite(KEYS.HABITS, habits);
      return habit;
    },

    /**
     * Calculate current streak from history
     * Counts consecutive completed days ending at today (or the most recent completed day)
     */
    _calculateStreak(history) {
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = HG.Utils.formatDateKey(d);
        if (history[key] === 1) {
          streak++;
        } else if (i === 0) {
          // Today hasn't been completed yet, continue checking
          continue;
        } else {
          break;
        }
      }
      return streak;
    },

    // ==============================
    // SETTINGS
    // ==============================

    getSettings() {
      const now = new Date();
      return safeRead(KEYS.SETTINGS, {
        ...DEFAULT_SETTINGS,
        selectedDate: Utils().getToday(),
        calendarMonth: now.getMonth(),
        calendarYear: now.getFullYear()
      });
    },

    updateSettings(updates) {
      const settings = this.getSettings();
      const merged = { ...settings, ...updates };
      safeWrite(KEYS.SETTINGS, merged);
      return merged;
    },

    // ==============================
    // EXPORT / IMPORT
    // ==============================

    /**
     * Export all data as a JSON string
     */
    exportData() {
      return JSON.stringify({
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        habits: this.getHabits(),
        settings: this.getSettings()
      }, null, 2);
    },

    /**
     * Import data from a parsed JSON object
     * @param {Object} data - { habits, settings }
     * @returns {boolean}
     */
    importData(data) {
      try {
        if (!data || !Array.isArray(data.habits)) {
          throw new Error('Invalid data format: missing habits array.');
        }

        // Validate each habit has required fields
        for (const h of data.habits) {
          if (!h.id || !h.name) {
            throw new Error('Invalid habit data: missing id or name.');
          }
        }

        safeWrite(KEYS.HABITS, data.habits);

        if (data.settings) {
          safeWrite(KEYS.SETTINGS, data.settings);
        }

        return true;
      } catch (err) {
        console.error('[Store] Import failed:', err);
        return false;
      }
    },

    /**
     * Clear all data (reset)
     */
    clearAll() {
      localStorage.removeItem(KEYS.HABITS);
      localStorage.removeItem(KEYS.SETTINGS);
    }
  };
})();
