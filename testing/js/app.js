/**
 * js/app.js
 * Entry module initializing application state, UI components, and testing runner.
 */

import { loadTickets } from './store.js';
import { initUI } from './ui.js';
import { runAutomatedTests } from './tests.js';

window.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize State Store
    loadTickets();

    // 2. Initialize UI Controller and Event Handlers
    initUI();

    // 3. Attach Test Runner Event Handler
    const runBtn = document.getElementById('run-tests-btn');
    if (runBtn) {
        runBtn.addEventListener('click', runAutomatedTests);
    }
});