import {
  loadTickets,
  saveTickets,
  generateTicketId,
  validateTicketData,
  transitionTicketStatus,
  deleteTicket,
  resetToSeedData,
  ALLOWED_STATUS_TRANSITIONS
} from './store.js';

import { getSortedQueue, processNextTicketInQueue } from './queue.js';
import { runAllTests } from './tests.js';

let activeTickets = [];
let pendingStatusTicketId = null;

export function initUI() {
  activeTickets = loadTickets();
  bindEvents();
  renderAll();
}

function bindEvents() {
  const resetBtn = document.getElementById('reset-data-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset all ticket data back to initial demo state?')) {
        activeTickets = resetToSeedData();
        renderAll();
      }
    });
  }

  const ticketForm = document.getElementById('ticket-form');
  if (ticketForm) {
    ticketForm.addEventListener('submit', handleCreateTicket);
  }

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', renderTicketTable);
  }

  const categoryFilter = document.getElementById('filter-category');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', renderTicketTable);
  }

  const statusFilter = document.getElementById('filter-status');
  if (statusFilter) {
    statusFilter.addEventListener('change', renderTicketTable);
  }

  const processNextBtn = document.getElementById('process-next-btn');
  if (processNextBtn) {
    processNextBtn.addEventListener('click', handleProcessNext);
  }

  const runTestsBtn = document.getElementById('run-tests-btn');
  if (runTestsBtn) {
    runTestsBtn.addEventListener('click', handleRunTests);
  }

  const modalClose = document.getElementById('modal-close');
  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }

  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  if (modalCancelBtn) {
    modalCancelBtn.addEventListener('click', closeModal);
  }

  const modalSaveBtn = document.getElementById('modal-save-btn');
  if (modalSaveBtn) {
    modalSaveBtn.addEventListener('click', handleSaveStatusTransition);
  }
}

function renderAll() {
  renderTicketTable();
  renderQueueView();
  renderMetrics();
}

function handleCreateTicket(e) {
  e.preventDefault();

  const formData = {
    studentName: document.getElementById('student-name').value.trim(),
    category: document.getElementById('category').value,
    priority: document.getElementById('priority').value,
    estHours: document.getElementById('est-hours').value,
    description: document.getElementById('description').value.trim()
  };

  const validation = validateTicketData(formData);
  if (!validation.valid) {
    alert(`Validation Error: ${validation.message}`);
    return;
  }

  const newTicket = {
    id: generateTicketId(activeTickets),
    studentName: formData.studentName,
    category: formData.category,
    priority: formData.priority,
    estHours: parseFloat(formData.estHours),
    description: formData.description,
    status: 'Pending',
    createdAt: new Date().toISOString()
  };

  activeTickets.push(newTicket);
  saveTickets(activeTickets);
  e.target.reset();
  renderAll();
}

function renderTicketTable() {
  const tbody = document.getElementById('ticket-table-body');
  if (!tbody) return;

  const search = (document.getElementById('search-input')?.value || '').toLowerCase();
  const categoryFilter = document.getElementById('filter-category')?.value || 'ALL';
  const statusFilter = document.getElementById('filter-status')?.value || 'ALL';

  const filtered = activeTickets.filter((t) => {
    const matchesSearch =
      t.id.toLowerCase().includes(search) ||
      t.studentName.toLowerCase().includes(search) ||
      t.description.toLowerCase().includes(search);
    const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  tbody.innerHTML = filtered.map((t) => `
    <tr>
      <td><strong>${t.id}</strong></td>
      <td>${t.studentName}</td>
      <td>${t.category}</td>
      <td><span class="badge badge-${t.priority.toLowerCase()}">${t.priority}</span></td>
      <td>${t.estHours.toFixed(1)} hrs</td>
      <td><span class="badge badge-${t.status.toLowerCase().replace(/\s+/g, '')}">${t.status}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm action-status-btn" data-id="${t.id}">Status</button>
        <button class="btn btn-danger btn-sm action-delete-btn" data-id="${t.id}">Delete</button>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="7" style="text-align:center; color:#64748b;">No matching tickets found.</td></tr>`;

  tbody.querySelectorAll('.action-status-btn').forEach((btn) => {
    btn.addEventListener('click', () => openStatusModal(btn.dataset.id));
  });

  tbody.querySelectorAll('.action-delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (confirm(`Are you sure you want to delete ticket ${btn.dataset.id}?`)) {
        activeTickets = deleteTicket(activeTickets, btn.dataset.id);
        renderAll();
      }
    });
  });
}

function renderQueueView() {
  const queue = getSortedQueue(activeTickets);
  const tbody = document.getElementById('queue-table-body');
  const banner = document.getElementById('next-ticket-banner');
  if (!tbody || !banner) return;

  if (queue.length > 0) {
    const next = queue[0];
    banner.innerHTML = `<strong>Next in Queue:</strong> ${next.id} - ${next.studentName} (${next.category}, ${next.priority} Priority)`;
  } else {
    banner.innerHTML = `<strong>Queue Empty:</strong> All pending requests are processed.`;
  }

  tbody.innerHTML = queue.map((t, index) => `
    <tr>
      <td><strong>#${index + 1}</strong></td>
      <td>${t.id}</td>
      <td>${t.studentName}</td>
      <td>${t.category}</td>
      <td><span class="badge badge-${t.priority.toLowerCase()}">${t.priority}</span></td>
      <td>${t.estHours.toFixed(1)} hrs</td>
      <td>${new Date(t.createdAt).toLocaleTimeString()}</td>
    </tr>
  `).join('') || `<tr><td colspan="7" style="text-align:center; color:#64748b;">No pending tickets in queue.</td></tr>`;
}

function handleProcessNext() {
  const result = processNextTicketInQueue(activeTickets);
  if (!result.ok) {
    alert(result.message);
  } else {
    activeTickets = result.tickets;
    renderAll();
  }
}

function openStatusModal(ticketId) {
  const ticket = activeTickets.find((t) => t.id === ticketId);
  const modal = document.getElementById('status-modal');
  const select = document.getElementById('modal-status-select');
  const info = document.getElementById('modal-ticket-info');
  if (!ticket || !modal || !select || !info) return;

  pendingStatusTicketId = ticketId;
  info.innerText = `Ticket ${ticket.id} (${ticket.studentName}) - Current: ${ticket.status}`;

  const allowed = ALLOWED_STATUS_TRANSITIONS[ticket.status] || [];
  const options = Array.from(new Set([ticket.status, ...allowed]));
  select.innerHTML = options.map((st) => `<option value="${st}">${st}</option>`).join('');
  select.value = ticket.status;

  modal.classList.add('active');
}

function closeModal() {
  const modal = document.getElementById('status-modal');
  if (modal) {
    modal.classList.remove('active');
  }
  pendingStatusTicketId = null;
}

function handleSaveStatusTransition() {
  if (!pendingStatusTicketId) return;

  const nextStatus = document.getElementById('modal-status-select').value;
  const result = transitionTicketStatus(activeTickets, pendingStatusTicketId, nextStatus);

  if (!result.ok) {
    alert(result.error);
  } else {
    activeTickets = result.tickets;
    closeModal();
    renderAll();
  }
}

function renderMetrics() {
  const totalEl = document.getElementById('metric-total');
  const pendingEl = document.getElementById('metric-pending');
  const progressEl = document.getElementById('metric-progress');
  const resolvedEl = document.getElementById('metric-resolved');
  const hoursEl = document.getElementById('metric-hours');

  if (totalEl) totalEl.innerText = activeTickets.length;
  if (pendingEl) pendingEl.innerText = activeTickets.filter((t) => t.status === 'Pending').length;
  if (progressEl) progressEl.innerText = activeTickets.filter((t) => t.status === 'In Progress').length;
  if (resolvedEl) resolvedEl.innerText = activeTickets.filter((t) => t.status === 'Resolved').length;
  if (hoursEl) {
    const backlogHours = activeTickets
      .filter((t) => t.status === 'Pending' || t.status === 'In Progress')
      .reduce((sum, t) => sum + t.estHours, 0);
    hoursEl.innerText = `${backlogHours.toFixed(1)} hrs`;
  }
}

function handleRunTests() {
  const testResults = runAllTests();
  const tbody = document.getElementById('test-table-body');
  const summary = document.getElementById('test-summary-text');
  if (!tbody) return;

  const passed = testResults.filter((r) => r.passed).length;
  if (summary) {
    summary.innerHTML = `<strong>Suite Result:</strong> ${passed} / ${testResults.length} Tests Passed.`;
  }

  tbody.innerHTML = testResults.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.name}</td>
      <td><code>${r.module}</code></td>
      <td><span class="badge ${r.passed ? 'badge-resolved' : 'badge-cancelled'}">${r.passed ? 'PASSED' : 'FAILED'}</span></td>
      <td>${r.log}</td>
    </tr>
  `).join('');
}
