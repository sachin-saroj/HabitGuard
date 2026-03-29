/**
 * HabitGuard — Prediction Engine
 * Predicts when a user is likely to break their streak.
 * Uses pattern detection results + streak data + completion rate.
 */
(function () {
  'use strict';

  const HG = window.HabitGuard = window.HabitGuard || {};
  function Utils() { return HG.Utils; }

  HG.Prediction = {
    /**
     * Analyze a single habit and predict failure risk
     *
     * @param {Object} habit - Full habit object with history
     * @returns {Object} PredictionResult
     *   { riskLevel: 'high'|'medium'|'low'|'none',
     *     message: string, daysUntilRisk: number|null,
     *     icon: string, streak: number, completionRate: number }
     */
    analyze(habit) {
      if (!habit || !habit.history) {
        return this._result('none', 'Add history to see predictions', null, 0, 0);
      }

      const pattern = HG.Pattern.detect(habit);
      const streak = this.calculateStreak(habit.history);
      const completionRate = this.calculateCompletionRate(habit);

      // --- Case 1: Pattern detected → calculate days until predicted failure ---
      if (pattern.detected && pattern.period) {
        const daysIntoCurrentCycle = streak % pattern.period;
        const daysUntilRisk = pattern.period - daysIntoCurrentCycle;

        if (daysUntilRisk <= 1) {
          return this._result(
            'high',
            `You usually skip after ${pattern.period - 1}-day streak`,
            daysUntilRisk,
            streak,
            completionRate
          );
        }

        if (daysUntilRisk <= 2) {
          return this._result(
            'medium',
            `Risk approaching — ${daysUntilRisk} day${daysUntilRisk > 1 ? 's' : ''} until typical skip`,
            daysUntilRisk,
            streak,
            completionRate
          );
        }

        // Pattern exists but risk is far away
        return this._result(
          'low',
          `Pattern detected, but you're safe for now 💪`,
          daysUntilRisk,
          streak,
          completionRate
        );
      }

      // --- Case 2: No pattern but low completion rate ---
      if (completionRate < 40) {
        return this._result(
          'medium',
          'Low completion rate — stay focused!',
          null,
          streak,
          completionRate
        );
      }

      if (completionRate < 60) {
        return this._result(
          'low',
          'Moderate consistency — keep pushing!',
          null,
          streak,
          completionRate
        );
      }

      // --- Case 3: Good consistency, no pattern ---
      if (streak >= 7) {
        return this._result(
          'none',
          `Amazing ${streak}-day streak! Keep it alive 🔥`,
          null,
          streak,
          completionRate
        );
      }

      return this._result(
        'none',
        'Looking good! Keep the momentum going 🚀',
        null,
        streak,
        completionRate
      );
    },

    /**
     * Find the habit with the highest risk across all habits
     * Used for the main prediction card display
     *
     * @param {Array} habits - Array of habit objects
     * @returns {Object} { habit, prediction } or null
     */
    getHighestRisk(habits) {
      if (!habits || habits.length === 0) return null;

      const riskOrder = { high: 3, medium: 2, low: 1, none: 0 };
      let highest = null;

      for (const habit of habits) {
        const prediction = this.analyze(habit);
        if (!highest || riskOrder[prediction.riskLevel] > riskOrder[highest.prediction.riskLevel]) {
          highest = { habit, prediction };
        }
      }

      return highest;
    },

    /**
     * Get the most significant pattern across all habits
     *
     * @param {Array} habits
     * @returns {Object} { habit, pattern } or null
     */
    getMostSignificantPattern(habits) {
      if (!habits || habits.length === 0) return null;

      let best = null;
      const confOrder = { high: 3, medium: 2, low: 1 };

      for (const habit of habits) {
        const pattern = HG.Pattern.detect(habit.history);
        if (pattern.detected) {
          if (!best || (confOrder[pattern.confidence] || 0) > (confOrder[best.pattern.confidence] || 0)) {
            best = { habit, pattern };
          }
        }
      }

      return best;
    },

    /**
     * Calculate current streak for a habit
     * Counts consecutive completed days ending at today or the most recent day
     *
     * @param {Object} history - Date-keyed map
     * @returns {number}
     */
    calculateStreak(history) {
      if (!history) return 0;

      let streak = 0;
      const today = new Date();

      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = Utils().formatDateKey(d);

        if (history[key] === 1) {
          streak++;
        } else if (i === 0) {
          // Today hasn't been completed yet — don't break streak, skip
          continue;
        } else {
          break;
        }
      }

      return streak;
    },

    /**
     * Calculate completion rate over the last N days
     *
     * @param {Object} history - Date-keyed map
     * @param {number} days - How many days to look back (default 14)
     * @returns {number} Percentage 0-100
     */
    calculateCompletionRate(habit, days = 14) {
      if (!habit || !habit.history) return 0;

      let completed = 0;
      let total = 0;
      const today = new Date();
      const createdStr = habit.createdAt ? habit.createdAt.substring(0, 10) : '2000-01-01';

      for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = Utils().formatDateKey(d);

        if (key >= createdStr) {
          total++;
          if (habit.history[key] === 1) completed++;
        }
      }

      return total > 0 ? Math.round((completed / total) * 100) : 0;
    },

    /**
     * Build a PredictionResult object
     */
    _result(riskLevel, message, daysUntilRisk, streak, completionRate) {
      const icons = { high: '⚠️', medium: '⚡', low: '💡', none: '✅' };
      const titles = {
        high: 'High Risk Tomorrow',
        medium: 'Moderate Risk Ahead',
        low: 'Low Risk',
        none: 'On Track'
      };
      return {
        riskLevel,
        title: titles[riskLevel],
        message,
        icon: icons[riskLevel],
        daysUntilRisk,
        streak,
        completionRate
      };
    }
  };
})();
