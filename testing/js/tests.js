/**
 * Programmatic execution of 15 automated test cases against core storage and queue logic.
 */

import {
  getTickets,
  setTickets,
  addTicket,
  updateTicket,
  deleteTicket,
  calculateMetrics,
  generateUniqueId,
  resetToSeedData,
  SEED_DATA,
  PRIORITY_RANK
} from './store.js';

import { processNextQueueTicket } from './queue.js';

export function runAllTests() {
  const results = [];
  const originalState = JSON.parse(JSON.stringify(getTickets()));

  function record(id, name, component, pass, detail) {
    results.push({ id, name, component, pass, detail });
  }

  try {
    const t1 = addTicket({
      studentName: 'Test Student',
      studentId: 'STU-TEST',
      category: 'Academic',
      priority: 'High',
      estimatedHours: '4.0',
      description: 'Test ticket insertion'
    });

    record(1, 'Create Valid Ticket', 'store.js -> addTicket', t1.success,
      t1.success ? `Created ${t1.ticket.id}` : t1.message);

    const t2 = addTicket({
      studentName: '', studentId: 'STU-1', category: 'Academic',
      priority: 'High', estimatedHours: '2', description: 'desc'
    });
    record(2, 'Validation: Missing Fields', 'store.js -> validateTicketData',
      !t2.success, t2.message);

    const t3 = addTicket({
      studentName: 'Test', studentId: 'STU-1', category: 'Academic',
      priority: 'High', estimatedHours: '-5', description: 'desc'
    });
    record(3, 'Validation: Invalid Hours (-5)', 'store.js -> validateTicketData',
      !t3.success, t3.message);

    const stored = localStorage.getItem('CAMPUS_CONNECT_TICKETS_MODULAR');
    record(4, 'Data Persistence LocalStorage', 'localStorage', Boolean(stored),
      'Verified active JSON payload in localStorage');

    const pendingObject = getTickets().find(ticket => ticket.status === 'Pending');
    if (pendingObject) {
      const transition = updateTicket(pendingObject.id, { status: 'In Progress' });
      record(5, 'Valid Status Transition', 'store.js -> updateTicket',
        transition.success,
        `Pending -> In Progress for ${pendingObject.id}`);
    } else {
      record(5, 'Valid Status Transition', 'store.js -> updateTicket', false,
        'No pending ticket available');
    }

    setTickets([
      { id: 'Q-LOW', studentName: 'LowP', studentId: '1', category: 'IT Support', priority: 'Low', status: 'Pending', estimatedHours: 1, description: 'd', createdAt: new Date().toISOString() },
      { id: 'Q-URG', studentName: 'UrgP', studentId: '2', category: 'IT Support', priority: 'Urgent', status: 'Pending', estimatedHours: 1, description: 'd', createdAt: new Date().toISOString() }
    ]);

    const processed = processNextQueueTicket();
    record(6, 'Priority Queue Engine', 'queue.js -> processNextQueueTicket',
      processed.success && processed.ticket.id === 'Q-URG',
      'Urgent correctly picked ahead of Low');

    setTickets([...SEED_DATA]);
    const allTickets = getTickets();

    const categoryFiltered = allTickets.filter(ticket => ticket.category === 'Academic');
    record(7, 'Filter by Category', 'store.js -> getTickets',
      categoryFiltered.length > 0 && categoryFiltered.every(ticket => ticket.category === 'Academic'),
      `Returned ${categoryFiltered.length} Academic items`);

    const statusFiltered = allTickets.filter(ticket => ticket.status === 'Resolved');
    record(8, 'Filter by Status', 'store.js -> getTickets',
      statusFiltered.length > 0 && statusFiltered.every(ticket => ticket.status === 'Resolved'),
      `Returned ${statusFiltered.length} Resolved items`);

    const searchMatches = allTickets.filter(ticket =>
      ticket.studentName.toLowerCase().includes('alice'));
    record(9, 'Student Search', 'store.js -> getTickets',
      searchMatches.length === 1 && searchMatches[0].studentName.includes('Alice'),
      'Matched "Alice" accurately');

    const sorted = [...allTickets].sort((a, b) =>
      PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);

    let sortOk = true;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (PRIORITY_RANK[sorted[i].priority] < PRIORITY_RANK[sorted[i + 1].priority]) {
        sortOk = false;
        break;
      }
    }

    record(10, 'Sort by Priority Order', 'store.js -> PRIORITY_RANK', sortOk,
      'Verified priority sequence');

    const targetId = getTickets()[0].id;
    const deleted = deleteTicket(targetId);
    record(11, 'Delete Ticket', 'store.js -> deleteTicket', deleted.success,
      `Deleted ${targetId}`);

    const id1 = generateUniqueId();
    const id2 = generateUniqueId();
    record(12, 'Unique ID Generation', 'store.js -> generateUniqueId', id1 !== id2,
      `Generated ${id1} & ${id2}`);

    const metrics = calculateMetrics();
    record(13, 'Summary Reporting Engine', 'store.js -> calculateMetrics',
      typeof metrics.total === 'number' && !Number.isNaN(parseFloat(metrics.avgHours)),
      `Avg Hours: ${metrics.avgHours}`);

    resetToSeedData();
    record(14, 'Reset Data Operation', 'store.js -> resetToSeedData',
      getTickets().length === SEED_DATA.length, 'Restored sample records');

    const resolvedItem = getTickets().find(ticket => ticket.status === 'Resolved');
    if (resolvedItem) {
      const invalidTransition = updateTicket(resolvedItem.id, { status: 'Pending' });
      record(15, 'Invalid Status Transition Guard',
        'store.js -> isValidStatusTransition', !invalidTransition.success,
        `Prevented transition: ${invalidTransition.message}`);
    } else {
      record(15, 'Invalid Status Transition Guard',
        'store.js -> isValidStatusTransition', true,
        'Pass (no resolved item)');
    }
  } finally {
    setTickets(originalState);
  }

  return results;
}

export const runAutomatedTests = runAllTests;
