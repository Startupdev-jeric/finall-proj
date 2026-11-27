/**
 * js/app.js
 * Entry module initializing application state, UI components, and testing runner.
 */

import { loadTickets, loadTicketsFromJdbc } from './store.js';
import { initUI } from './ui.js';

window.addEventListener('DOMContentLoaded', () => {
    // Load durable JDBC state when the server is running, with localStorage fallback.
    loadTicketsFromJdbc().then(() => {
        loadTickets();
        initUI();
    });
});
