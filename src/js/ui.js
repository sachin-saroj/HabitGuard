/**
 * HabitGuard — UI Module
 * DOM rendering helpers: todo list, modals, icon picker, toasts,
 * prediction/pattern cards, and popular habits grid.
 */
(function () {
  'use strict';

  const HG = window.HabitGuard = window.HabitGuard || {};
  function Utils() { return HG.Utils; }
  function Store() { return HG.Store; }
  function Habits() { return HG.Habits; }
  function Prediction() { return HG.Prediction; }

  HG.UI = {
    /**
     * Render the greeting section
     */
    renderGreeting() {
      const titleEl = document.getElementById('greeting-title');
      const dateEl = document.getElementById('greeting-date');

      if (titleEl) titleEl.textContent = Utils().getGreetingTitle();
      if (dateEl) dateEl.textContent = Utils().formatDisplayDate(new Date());
    },

    /**
     * Render the todo list for the selected date
     */
    renderTodoList() {
      const container = document.getElementById('todo-list');
      if (!container) return;

      const settings = Store().getSettings();
      const date = settings.selectedDate || Utils().getToday();
      const habits = Habits().getAll();
      const isToday = Utils().isToday(date);

      if (habits.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-emoji">🎯</div>
            <h4>No habits yet</h4>
            <p>Click "+ New Habit" to start tracking your first habit!</p>
          </div>
        `;
        return;
      }

      let html = '';
      habits.forEach((habit, index) => {
        const completed = habit.history && habit.history[date] === 1;
        const streak = Prediction().calculateStreak(habit.history);

        html += `
          <div class="todo-item ${completed ? 'completed' : ''}" data-habit-id="${habit.id}">
            <div class="todo-emoji">${habit.icon}</div>
            <div class="todo-info">
              <div class="todo-name">${this._escapeHtml(habit.name)}</div>
              <div class="todo-meta">
                <span>🕐 ${Utils().formatTime(habit.time)}</span>
                ${habit.location ? `<span>📍 ${this._escapeHtml(habit.location)}</span>` : ''}
              </div>
            </div>
            ${streak > 1 ? `<div class="streak-badge">🔥 ${streak}</div>` : ''}
            <div class="todo-checkbox ${completed ? 'checked' : ''}"
                 data-toggle-id="${habit.id}"
                 data-date="${date}"
                 role="checkbox"
                 aria-checked="${completed}"
                 aria-label="Mark ${habit.name} as ${completed ? 'incomplete' : 'complete'}">
            </div>
            <button class="btn-delete-habit"
                    data-delete-id="${habit.id}"
                    aria-label="Delete ${habit.name}"
                    title="Delete habit">🗑️</button>
          </div>
        `;
      });

      container.innerHTML = html;
      this._attachTodoListeners();
    },

    /**
     * Attach event listeners to todo items
     */
    _attachTodoListeners() {
      // Checkbox toggles
      document.querySelectorAll('.todo-checkbox').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = el.getAttribute('data-toggle-id');
          const date = el.getAttribute('data-date');
          const isCompleted = el.classList.contains('checked');

          // Optimistically update the UI
          el.classList.toggle('checked');
          const item = el.closest('.todo-item');
          if (item) item.classList.toggle('completed');

          // Add animation class
          if (!isCompleted) {
            el.classList.add('just-checked');
            setTimeout(() => el.classList.remove('just-checked'), 400);
          }

          Habits().toggleComplete(id, date);

          // Update stats immediately without full re-render of list
          if (HG.App) {
            HG.UI.renderPredictionCard();
            HG.UI.renderPatternCard();
            if (HG.Calendar) HG.Calendar.render();
            if (HG.Analytics) HG.Analytics.refresh();
          }
        });
      });

      // Delete buttons
      document.querySelectorAll('.btn-delete-habit').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = el.getAttribute('data-delete-id');
          const habit = Store().getHabit(id);

          if (confirm(`Delete "${habit?.name || 'this habit'}"? This cannot be undone.`)) {
            Habits().delete(id);
            this.showToast(`"${habit?.name}" deleted`, 'info');
            if (HG.App && HG.App.refresh) {
              HG.App.refresh();
            }
          }
        });
      });
    },

    /**
     * Update the prediction card based on all habits
     */
    renderPredictionCard() {
      const card = document.getElementById('prediction-card');
      const titleEl = document.getElementById('prediction-title');
      const messageEl = document.getElementById('prediction-message');
      if (!card || !titleEl || !messageEl) return;

      const habits = Habits().getAll();
      const highest = Prediction().getHighestRisk(habits);

      if (!highest || habits.length === 0) {
        card.className = 'card prediction-card risk-low';
        titleEl.textContent = 'No Predictions Yet';
        messageEl.textContent = 'Add habits and track them to see predictions';
        card.querySelector('.prediction-icon').textContent = '💡';
        return;
      }

      const { prediction } = highest;
      card.className = `card prediction-card risk-${prediction.riskLevel}`;
      titleEl.textContent = prediction.title;
      messageEl.textContent = prediction.message;
      card.querySelector('.prediction-icon').textContent = prediction.icon;
    },

    /**
     * Update the pattern insight card
     */
    renderPatternCard() {
      const card = document.getElementById('pattern-card');
      const titleEl = document.getElementById('pattern-title');
      const messageEl = document.getElementById('pattern-message');
      if (!card || !titleEl || !messageEl) return;

      const habits = Habits().getAll();
      const significant = Prediction().getMostSignificantPattern(habits);

      if (!significant) {
        card.className = 'card pattern-card no-pattern';
        titleEl.textContent = 'No Pattern Yet';
        messageEl.textContent = 'Keep tracking — patterns emerge over time';
        card.querySelector('.pattern-icon').textContent = '🔍';
        return;
      }

      card.className = 'card pattern-card';
      titleEl.textContent = `Pattern Detected (${significant.habit.name})`;
      messageEl.textContent = significant.pattern.message;
      card.querySelector('.pattern-icon').textContent = '🧠';
    },

    /**
     * Render the icon picker in the add-habit modal
     */
    renderIconPicker() {
      const container = document.getElementById('icon-picker');
      if (!container) return;

      const hiddenInput = document.getElementById('input-habit-icon');
      const currentIcon = hiddenInput ? hiddenInput.value : '💪';

      let html = '';
      Habits().ICONS.forEach(icon => {
        const selected = icon === currentIcon ? 'selected' : '';
        html += `<div class="icon-option ${selected}" data-icon="${icon}">${icon}</div>`;
      });

      container.innerHTML = html;

      // Click to select
      container.querySelectorAll('.icon-option').forEach(el => {
        el.addEventListener('click', () => {
          container.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
          el.classList.add('selected');
          if (hiddenInput) hiddenInput.value = el.getAttribute('data-icon');
        });
      });
    },

    /**
     * Render the popular habits grid in the browse modal
     */
    renderPopularHabits() {
      const container = document.getElementById('popular-habits-grid');
      if (!container) return;

      let html = '';
      Habits().POPULAR.forEach(habit => {
        html += `
          <div class="popular-habit-card" data-popular-name="${this._escapeHtml(habit.name)}">
            <div class="popular-habit-emoji">${habit.icon}</div>
            <div class="popular-habit-info">
              <h4>${this._escapeHtml(habit.name)}</h4>
              <span>❤️ ${Utils().formatCount(habit.likes)} love this</span>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;

      // Click to add
      container.querySelectorAll('.popular-habit-card').forEach(el => {
        el.addEventListener('click', () => {
          const name = el.getAttribute('data-popular-name');
          const popular = Habits().POPULAR.find(h => h.name === name);
          if (popular) {
            // Check for duplicates
            const existing = Habits().getAll();
            if (existing.find(h => h.name.toLowerCase() === popular.name.toLowerCase())) {
              this.showToast(`"${popular.name}" is already in your habits`, 'error');
              return;
            }

            Habits().addPopular(popular);
            this.showToast(`"${popular.name}" added! 🎉`, 'success');
            this.hideModal('modal-browse-habits');
            if (HG.App && HG.App.refresh) {
              HG.App.refresh();
            }
          }
        });
      });
    },

    // ==============================
    // MODAL MANAGEMENT
    // ==============================

    showModal(modalId) {
      const overlay = document.getElementById(modalId);
      if (overlay) {
        overlay.classList.add('active');
        // Focus first input
        setTimeout(() => {
          const input = overlay.querySelector('input[type="text"]');
          if (input) input.focus();
        }, 300);
      }
    },

    hideModal(modalId) {
      const overlay = document.getElementById(modalId);
      if (overlay) {
        overlay.classList.remove('active');
      }
    },

    /**
     * Setup modal close on overlay click and ESC key
     */
    setupModals() {
      document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            overlay.classList.remove('active');
          }
        });
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          document.querySelectorAll('.modal-overlay.active').forEach(overlay => {
            overlay.classList.remove('active');
          });
        }
      });
    },

    // ==============================
    // TOAST NOTIFICATIONS
    // ==============================

    /**
     * Show a toast notification
     * @param {string} message
     * @param {string} type - 'success', 'error', 'info'
     */
    showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      container.appendChild(toast);

      // Auto-remove after 3s
      setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    },

    // ==============================
    // HELPERS
    // ==============================

    /**
     * Escape HTML to prevent XSS
     */
    _escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
  };
})();
