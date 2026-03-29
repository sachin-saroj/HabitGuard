/**
 * HabitGuard — Utility Functions
 * Date helpers, UUID generation, formatters, and greeting logic.
 */
(function () {
  'use strict';

  const HG = window.HabitGuard = window.HabitGuard || {};

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  HG.Utils = {
    /**
     * Generate a UUID v4 string
     */
    uuid() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },

    /**
     * Get today's date as YYYY-MM-DD string
     */
    getToday() {
      return this.formatDateKey(new Date());
    },

    /**
     * Format a Date object to YYYY-MM-DD string
     */
    formatDateKey(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    },

    /**
     * Parse a YYYY-MM-DD string to a Date object
     */
    parseDate(dateStr) {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    },

    /**
     * Get a human-readable date string
     * e.g. "28 Mar 2026, 11:42 pm"
     */
    formatDisplayDate(date) {
      const d = date.getDate();
      const month = MONTHS_SHORT[date.getMonth()];
      const year = date.getFullYear();
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12 || 12;
      return `${d} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
    },

    /**
     * Get day name from Date
     */
    getDayName(date) {
      return DAYS[date.getDay()];
    },

    getDayNameShort(date) {
      return DAYS_SHORT[date.getDay()];
    },

    /**
     * Get month name
     */
    getMonthName(monthIndex) {
      return MONTHS[monthIndex];
    },

    getMonthNameShort(monthIndex) {
      return MONTHS_SHORT[monthIndex];
    },

    /**
     * Get number of days in a month
     */
    getDaysInMonth(year, month) {
      return new Date(year, month + 1, 0).getDate();
    },

    /**
     * Get the day of week the month starts on (0=Sunday)
     */
    getFirstDayOfMonth(year, month) {
      return new Date(year, month, 1).getDay();
    },

    /**
     * Get greeting based on time of day
     */
    getGreeting() {
      const hour = new Date().getHours();
      const day = DAYS[new Date().getDay()];

      if (hour < 5) return `Good Night 🌙`;
      if (hour < 12) return `Good Morning ☀️`;
      if (hour < 17) return `Good Afternoon 🌤️`;
      if (hour < 21) return `Good Evening 🌅`;
      return `Good Night 🌙`;
    },

    /**
     * Get a contextual title (e.g., "Happy Tuesday 👋")
     */
    getGreetingTitle() {
      const day = DAYS[new Date().getDay()];
      return `Happy ${day} 👋`;
    },

    /**
     * Format time string "HH:MM" to "H:MMam/pm"
     */
    formatTime(timeStr) {
      if (!timeStr) return '';
      const [h, m] = timeStr.split(':').map(Number);
      const ampm = h >= 12 ? 'pm' : 'am';
      const hour = h % 12 || 12;
      return `${hour}:${String(m).padStart(2, '0')}${ampm}`;
    },

    /**
     * Format a large number with K suffix
     */
    formatCount(num) {
      if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
      }
      return String(num);
    },

    /**
     * Check if a date string is today
     */
    isToday(dateStr) {
      return dateStr === this.getToday();
    },

    /**
     * Check if a date is in the future
     */
    isFuture(dateStr) {
      return dateStr > this.getToday();
    },

    /**
     * Get array of date strings for the last N days
     */
    getLastNDays(n) {
      const dates = [];
      const today = new Date();
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(this.formatDateKey(d));
      }
      return dates;
    },

    /**
     * Debounce helper
     */
    debounce(fn, delay = 250) {
      let timer;
      return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(null, args), delay);
      };
    },

    /**
     * Clamp a number between min and max
     */
    clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }
  };
})();
