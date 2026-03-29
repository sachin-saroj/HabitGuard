/**
 * HabitGuard — Calendar Module
 * Renders the interactive monthly calendar with completion highlights.
 */
(function () {
  'use strict';

  const HG = window.HabitGuard = window.HabitGuard || {};
  function Utils() { return HG.Utils; }
  function Store() { return HG.Store; }
  function Habits() { return HG.Habits; }

  HG.Calendar = {
    currentMonth: null,
    currentYear: null,

    /**
     * Initialize the calendar with the current month
     */
    init() {
      const settings = Store().getSettings();
      const now = new Date();
      this.currentMonth = settings.calendarMonth ?? now.getMonth();
      this.currentYear = settings.calendarYear ?? now.getFullYear();
      this.render();
      this.setupNavigation();
    },

    /**
     * Render the calendar grid for the current month/year
     */
    render() {
      const grid = document.getElementById('calendar-grid');
      const title = document.getElementById('calendar-title');
      if (!grid || !title) return;

      // Update title
      title.textContent = `${Utils().getMonthName(this.currentMonth)}, ${this.currentYear}`;

      const daysInMonth = Utils().getDaysInMonth(this.currentYear, this.currentMonth);
      const firstDay = Utils().getFirstDayOfMonth(this.currentYear, this.currentMonth);
      const today = Utils().getToday();
      const settings = Store().getSettings();
      const selectedDate = settings.selectedDate || today;

      // Get completion data for the month
      const completionMap = this._getMonthCompletionMap();

      // Build grid HTML
      let html = '';

      // Empty cells for days before the 1st
      for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day calendar-day--empty"></div>';
      }

      // Days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = dateStr === today;
        const isSelected = dateStr === selectedDate && !isToday;
        const isFuture = dateStr > today;
        const completion = completionMap[dateStr];

        let classes = 'calendar-day';
        if (isToday) classes += ' calendar-day--today';
        if (isSelected) classes += ' calendar-day--selected';
        if (isFuture) classes += ' calendar-day--future';

        if (!isFuture && !isToday && completion) {
          if (completion.percentage === 100) {
            classes += ' calendar-day--completed';
          } else if (completion.percentage > 0) {
            classes += ' calendar-day--partial';
          } else if (completion.total > 0) {
            classes += ' calendar-day--missed';
          }
        }

        const dataAttr = isFuture ? '' : `data-date="${dateStr}"`;
        html += `<div class="${classes}" ${dataAttr}>${day}</div>`;
      }

      grid.innerHTML = html;

      // Add click handlers
      grid.querySelectorAll('.calendar-day[data-date]').forEach(el => {
        el.addEventListener('click', () => {
          const date = el.getAttribute('data-date');
          this._selectDate(date);
        });
      });

      // Update progress text
      this._updateProgress();
    },

    /**
     * Get completion data for each day of the current month
     */
    _getMonthCompletionMap() {
      const habits = Habits().getAll();
      const daysInMonth = Utils().getDaysInMonth(this.currentYear, this.currentMonth);
      const today = Utils().getToday();
      const map = {};

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        let total = 0;
        let completed = 0;

        if (dateStr <= today) {
          habits.forEach(h => {
            const createdStr = h.createdAt ? h.createdAt.substring(0, 10) : '2000-01-01';
            if (dateStr >= createdStr) {
              total++;
              if (h.history && h.history[dateStr] === 1) completed++;
            }
          });
        }

        if (total > 0) {
          map[dateStr] = {
            completed,
            total,
            percentage: Math.round((completed / total) * 100)
          };
        }
      }

      return map;
    },

    /**
     * Select a date and refresh the UI
     */
    _selectDate(date) {
      Store().updateSettings({ selectedDate: date });

      // Notify app to refresh (which includes calendar re-render)
      if (HG.App && HG.App.refresh) {
        HG.App.refresh();
      }
    },

    /**
     * Update the monthly progress comparison text
     */
    _updateProgress() {
      const progressEl = document.getElementById('calendar-progress');
      const textEl = document.getElementById('progress-text');
      if (!progressEl || !textEl) return;

      const improvement = Habits().getMonthlyImprovement();

      if (improvement.change === 0) {
        textEl.textContent = 'No change from last month';
        progressEl.className = 'calendar-progress';
      } else {
        textEl.textContent = `${improvement.direction === 'up' ? '+' : '-'}${improvement.change}% from last month`;
        progressEl.className = improvement.direction === 'up'
          ? 'calendar-progress'
          : 'calendar-progress negative';
      }
    },

    /**
     * Setup month navigation buttons
     */
    setupNavigation() {
      const prevBtn = document.getElementById('btn-prev-month');
      const nextBtn = document.getElementById('btn-next-month');

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          this.currentMonth--;
          if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
          }
          Store().updateSettings({
            calendarMonth: this.currentMonth,
            calendarYear: this.currentYear
          });
          this.render();
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          this.currentMonth++;
          if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
          }
          Store().updateSettings({
            calendarMonth: this.currentMonth,
            calendarYear: this.currentYear
          });
          this.render();
        });
      }
    }
  };
})();
