/**
 * HabitGuard — App Module (Entry Point)
 * Initializes the entire application, sets up event listeners,
 * handles export/import, and orchestrates all modules.
 */
(function () {
  'use strict';

  const HG = window.HabitGuard = window.HabitGuard || {};
  function Store() { return HG.Store; }
  function Habits() { return HG.Habits; }
  function Calendar() { return HG.Calendar; }
  function Analytics() { return HG.Analytics; }
  function UI() { return HG.UI; }

  HG.App = {
    /**
     * Main initialization — called on DOMContentLoaded
     */
    init() {
      console.log('[HabitGuard] Initializing...');

      // 1. Initialize data store (seed defaults if first run)
      Store().init();

      // 2. Render all UI sections
      UI().renderGreeting();
      Calendar().init();
      this.refresh();

      // 3. Setup event listeners
      this._setupButtons();
      this._setupAddHabitForm();
      UI().setupModals();
      UI().renderIconPicker();
      UI().renderPopularHabits();

      // 4. Setup Electron IPC for export/import
      this._setupElectronIPC();

      // 5. Start clock update (greeting date/time)
      this._startClock();

      console.log('[HabitGuard] Ready ✅');
    },

    /**
     * Refresh all dynamic UI sections
     * Called after any data change (add/toggle/delete habit)
     */
    refresh() {
      UI().renderTodoList();
      UI().renderPredictionCard();
      UI().renderPatternCard();
      Calendar().render();
      Analytics().refresh();
    },

    /**
     * Setup button click listeners
     */
    _setupButtons() {
      // "+ New Habit" button
      const newHabitBtn = document.getElementById('btn-new-habit');
      if (newHabitBtn) {
        newHabitBtn.addEventListener('click', () => {
          this._resetAddHabitForm();
          UI().showModal('modal-add-habit');
        });
      }

      // "Browse Popular Habits" button
      const browseBtn = document.getElementById('btn-browse-habits');
      if (browseBtn) {
        browseBtn.addEventListener('click', () => {
          UI().renderPopularHabits();
          UI().showModal('modal-browse-habits');
        });
      }

      // Close modal buttons
      const closeAddHabit = document.getElementById('close-add-habit');
      if (closeAddHabit) {
        closeAddHabit.addEventListener('click', () => {
          UI().hideModal('modal-add-habit');
        });
      }

      const closeBrowse = document.getElementById('close-browse-habits');
      if (closeBrowse) {
        closeBrowse.addEventListener('click', () => {
          UI().hideModal('modal-browse-habits');
        });
      }
    },

    /**
     * Setup the add-habit form submission
     */
    _setupAddHabitForm() {
      const form = document.getElementById('form-add-habit');
      if (!form) return;

      form.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('input-habit-name').value.trim();
        const icon = document.getElementById('input-habit-icon').value;
        const time = document.getElementById('input-habit-time').value;
        const location = document.getElementById('input-habit-location').value.trim();
        const category = document.getElementById('input-habit-category').value;

        if (!name) {
          UI().showToast('Please enter a habit name', 'error');
          return;
        }

        // Check for duplicates
        const existing = Habits().getAll();
        if (existing.find(h => h.name.toLowerCase() === name.toLowerCase())) {
          UI().showToast('A habit with this name already exists', 'error');
          return;
        }

        try {
          const habit = Habits().create({ name, icon, time, location, category });
          UI().showToast(`"${habit.name}" created! 🎉`, 'success');
          UI().hideModal('modal-add-habit');
          this._resetAddHabitForm();
          this.refresh();
        } catch (err) {
          UI().showToast(err.message, 'error');
        }
      });
    },

    /**
     * Reset the add-habit form to defaults
     */
    _resetAddHabitForm() {
      const form = document.getElementById('form-add-habit');
      if (form) form.reset();

      const iconInput = document.getElementById('input-habit-icon');
      if (iconInput) iconInput.value = '💪';

      const timeInput = document.getElementById('input-habit-time');
      if (timeInput) timeInput.value = '08:00';

      // Re-render icon picker to reset selection
      UI().renderIconPicker();
    },

    /**
     * Setup Electron IPC for export/import via menu
     */
    _setupElectronIPC() {
      if (!window.electronAPI) {
        console.log('[HabitGuard] Not running in Electron — IPC unavailable');
        return;
      }

      // Handle export request from menu
      window.electronAPI.onRequestExport(async () => {
        try {
          const json = Store().exportData();
          const result = await window.electronAPI.saveExport(json);
          if (result.success) {
            UI().showToast('Data exported successfully! 📦', 'success');
          }
        } catch (err) {
          UI().showToast('Export failed: ' + err.message, 'error');
        }
      });

      // Handle import from menu
      window.electronAPI.onImportData((data) => {
        const success = Store().importData(data);
        if (success) {
          UI().showToast('Data imported successfully! 🎉', 'success');
          this.refresh();
        } else {
          UI().showToast('Import failed — invalid data format', 'error');
        }
      });
    },

    /**
     * Start a clock to update greeting time every minute
     */
    _startClock() {
      setInterval(() => {
        UI().renderGreeting();
      }, 60000); // Update every minute
    }
  };

  // ==============================
  // BOOTSTRAP
  // ==============================
  document.addEventListener('DOMContentLoaded', () => {
    HG.App.init();
  });
})();
