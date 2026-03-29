/**
 * HabitGuard — Analytics Module
 * Computes analytics data and renders the bar chart.
 */
(function () {
  'use strict';

  const HG = window.HabitGuard = window.HabitGuard || {};
  function Habits() { return HG.Habits; }

  // Color classes mapped to category
  const CATEGORY_COLORS = {
    learning: 'reading',
    fitness: 'gym',
    health: 'swimming',
    mindfulness: 'study',
    creative: 'design',
    lifestyle: 'running',
    other: 'default'
  };

  HG.Analytics = {
    /**
     * Initialize analytics section
     */
    init() {
      this.updatePositiveHabits();
      this.updateWrappedYear();
      this.renderBarChart();

      const select = document.getElementById('chart-month-select');
      if (select) {
        select.addEventListener('change', () => this.renderBarChart());
      }
    },

    /**
     * Update the "Positive Habits" percentage card
     */
    updatePositiveHabits() {
      const el = document.getElementById('positive-habits-value');
      if (!el) return;

      const stats = Habits().getOverallStats();
      const sign = stats.overallRate >= 50 ? '+' : '';
      el.textContent = `${sign}${stats.overallRate}%`;

      // Change color based on rate
      if (stats.overallRate >= 50) {
        el.style.color = 'var(--color-success)';
      } else if (stats.overallRate >= 30) {
        el.style.color = 'var(--color-warning)';
      } else {
        el.style.color = 'var(--color-danger)';
      }
    },

    /**
     * Update the wrapped year display
     */
    updateWrappedYear() {
      const el = document.getElementById('wrapped-year');
      if (el) {
        el.textContent = new Date().getFullYear();
      }
    },

    /**
     * Render the favorite habits bar chart
     */
    renderBarChart() {
      const container = document.getElementById('habits-chart');
      if (!container) return;

      const select = document.getElementById('chart-month-select');
      const filter = select ? select.value : 'all';
      const data = Habits().getHabitCompletionCounts(filter);

      if (data.length === 0) {
        container.innerHTML = `
          <div class="analytics-no-data">
            <p>📊 Add habits to see your chart</p>
          </div>
        `;
        return;
      }

      // Find max for scaling
      const maxCount = Math.max(...data.map(d => d.count), 1);

      // Get top 6 habits for the chart
      const chartData = data.slice(0, 6);

      // Find the highlighted bar (highest count)
      const highlightIndex = 0; // First is already highest (sorted)

      let html = '';
      chartData.forEach((item, index) => {
        const heightPercent = Math.max((item.count / maxCount) * 100, 5);
        const colorClass = CATEGORY_COLORS[item.category] || 'default';
        const highlighted = index === highlightIndex ? 'highlighted' : '';

        html += `
          <div class="chart-bar-group">
            <div class="chart-bar chart-bar--${colorClass} ${highlighted}"
                 style="height: ${heightPercent}%"
                 data-value="${item.count} completions"
                 title="${item.name}: ${item.count} completions">
            </div>
            <span class="chart-bar-label">${item.name}</span>
          </div>
        `;
      });

      container.innerHTML = html;
    },

    /**
     * Refresh all analytics displays
     */
    refresh() {
      this.updatePositiveHabits();
      this.renderBarChart();
    }
  };
})();
