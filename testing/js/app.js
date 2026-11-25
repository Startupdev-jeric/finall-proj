/**
 * js/app.js
 * Entry module initializing application state, UI components, and testing runner.
 */

import { loadTickets } from './store.js';
import { initUI } from './ui.js';

window.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize State Store
    loadTickets();

    // 2. Initialize UI Controller and Event Handlers
    initUI();
});
