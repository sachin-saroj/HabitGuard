/**
 * HabitGuard — Pattern Detection Module
 * Analyzes habit history to detect repeating failure patterns.
 *
 * Algorithm:
 * 1. Extract the last N days of history (default 14)
 * 2. Find indices where value = 0 (missed days)
 * 3. Calculate gaps between consecutive misses
 * 4. Find the most frequent gap (mode)
 * 5. If mode appears >= 2 times, pattern is confirmed
 */
(function () {
  'use strict';

  const HG = window.HabitGuard = window.HabitGuard || {};
  function Utils() { return HG.Utils; }

  const ANALYSIS_WINDOW = 14; // Look back 14 days
  const MIN_PATTERN_OCCURRENCES = 2; // Need at least 2 repeating gaps

  HG.Pattern = {
    /**
     * Detect repeating skip patterns in a habit's history
     *
     * @param {Object} history - Date-keyed completion map: { "2026-03-28": 1, ... }
     * @returns {Object} PatternResult
     *   { detected: boolean, period: number, confidence: 'high'|'medium'|'low',
     *     message: string, missRate: number }
     */
    detect(habit) {
      if (!habit || !habit.history) {
        return this._noPattern('No history data');
      }

      // Build ordered array of completion values for last N days
      const values = this._getOrderedValues(habit.history, habit.createdAt, ANALYSIS_WINDOW);

      // Need at least 5 days of data to make any meaningful judgment
      if (values.length < 5) {
        return this._noPattern('Not enough data yet — keep tracking!');
      }

      // Find miss indices
      const missIndices = [];
      values.forEach((v, i) => {
        if (v === 0) missIndices.push(i);
      });

      // Calculate miss rate
      const missRate = missIndices.length / totalDays;

      if (missIndices.length < 2) {
        return this._noPattern(
          missIndices.length === 0
            ? 'Perfect streak! No misses detected 🎉'
            : 'Only 1 miss — not enough to detect a pattern'
        );
      }

      // Calculate gaps between consecutive misses
      const gaps = [];
      for (let i = 1; i < missIndices.length; i++) {
        gaps.push(missIndices[i] - missIndices[i - 1]);
      }

      // Find the mode (most frequent gap)
      const freq = {};
      gaps.forEach(g => {
        freq[g] = (freq[g] || 0) + 1;
      });

      // Sort by frequency descending
      const sorted = Object.entries(freq)
        .sort((a, b) => b[1] - a[1]);

      if (sorted.length === 0) {
        return this._noPattern('No clear skip pattern found');
      }

      const [periodStr, count] = sorted[0];
      const period = parseInt(periodStr, 10);

      if (count >= MIN_PATTERN_OCCURRENCES && period > 0 && period <= 10) {
        const confidence = count >= 4 ? 'high' : count >= 3 ? 'medium' : 'low';
        return {
          detected: true,
          period: period,
          confidence: confidence,
          occurrences: count,
          missRate: Math.round(missRate * 100),
          message: this._buildMessage(period, confidence)
        };
      }

      // Check for "after N-day streaks" pattern
      const streakBeforeMiss = this._analyzeStreaksBeforeMiss(values);
      if (streakBeforeMiss.detected) {
        return streakBeforeMiss;
      }

      return this._noPattern('No repeating skip pattern found yet');
    },

    /**
     * Analyze if misses tend to happen after a specific streak length
     */
    _analyzeStreaksBeforeMiss(values) {
      const streaksBeforeMiss = [];
      let currentStreak = 0;

      for (let i = 0; i < values.length; i++) {
        if (values[i] === 1) {
          currentStreak++;
        } else {
          if (currentStreak > 0) {
            streaksBeforeMiss.push(currentStreak);
          }
          currentStreak = 0;
        }
      }

      if (streaksBeforeMiss.length < 2) {
        return { detected: false };
      }

      // Find mode of streak lengths before miss
      const freq = {};
      streaksBeforeMiss.forEach(s => {
        freq[s] = (freq[s] || 0) + 1;
      });

      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
      const [streakStr, count] = sorted[0];
      const streakLen = parseInt(streakStr, 10);

      if (count >= 2 && streakLen > 0) {
        return {
          detected: true,
          period: streakLen + 1, // streak + 1 = period including the miss day
          confidence: count >= 3 ? 'high' : 'medium',
          occurrences: count,
          missRate: Math.round((streaksBeforeMiss.length / values.length) * 100),
          message: `You tend to skip after ${streakLen}-day streaks`
        };
      }

      return { detected: false };
    },

    /**
     * Get ordered array of completion values for the last N days
     */
    _getOrderedValues(history, createdAt, days) {
      const values = [];
      const today = new Date();
      const createdStr = createdAt ? createdAt.substring(0, 10) : '2000-01-01';

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = Utils().formatDateKey(d);
        
        if (key < createdStr) continue;

        if (history.hasOwnProperty(key)) {
          values.push(history[key]);
        } else if (i > 0) {
          // Past days with no entry = missed
          values.push(0);
        }
        // Skip today if no entry yet
      }
      return values;
    },

    /**
     * Build human-readable pattern message
     */
    _buildMessage(period, confidence) {
      if (period === 1) {
        return 'You skip almost every other day';
      }
      if (period === 2) {
        return 'You skip every 2nd day';
      }
      if (period === 3) {
        return 'You skip every 3rd day';
      }
      return `You skip every ${period} days`;
    },

    /**
     * Return a "no pattern" result
     */
    _noPattern(message) {
      return {
        detected: false,
        period: null,
        confidence: null,
        occurrences: 0,
        missRate: 0,
        message: message || 'No pattern detected yet'
      };
    }
  };
})();
