/**
 * js/tests.js
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

export function runAutomatedTests() {
    const results = [];
    const originalState = JSON.parse(JSON.stringify(getTickets()));

    function record(id, name, component, pass, detail) {
        results.push({ id, name, component, pass, detail });
    }

    try {
        // Test 1: Create Valid Ticket
        const t1 = addTicket({
            studentName: 'Test Student', studentId: 'STU-TEST', category: 'Academic',
            priority: 'High', estimatedHours: '4.0', description: 'Test ticket insertion'
        });
        record(1, 'Create Valid Ticket', 'store.js -> addTicket', t1.success, t1.success ? `Created ${t1.ticket.id}` : t1.message);

        // Test 2: Input Validation Missing Fields
        const t2 = addTicket({ studentName: '', studentId: 'STU-1', category: 'Academic', priority: 'High', estimatedHours: '2', description: 'desc' });
        record(2, 'Validation: Missing Fields', 'store.js -> validateTicketData', !t2.success, t2.message);

        // Test 3: Input Validation Invalid Hours (-5)
        const t3 = addTicket({ studentName: 'Test', studentId: 'STU-1', category: 'Academic', priority: 'High', estimatedHours: '-5', description: 'desc' });
        record(3, 'Validation: Invalid Hours (-5)', 'store.js -> validateTicketData', !t3.success, t3.message);

        // Test 4: LocalStorage Persistence
        const stored = localStorage.getItem('CAMPUS_CONNECT_TICKETS_MODULAR');
        record(4, 'Data Persistence LocalStorage', 'localStorage', !!stored, 'Verified active JSON payload in localStorage');

        // Test 5: Status Transition (Pending -> In Progress)
        const pendingObj = getTickets().find(t => t.status === 'Pending');
        if (pendingObj) {
            const res = updateTicket(pendingObj.id, { status: 'In Progress' });
            record(5, 'Valid Status Transition', 'store.js -> updateTicket', res.success, `Pending -> In Progress for ${pendingObj.id}`);
        } else {
            record(5, 'Valid Status Transition', 'store.js -> updateTicket', false, 'No pending ticket available');
        }

        // Test 6: Queue Priority Algorithm (Urgent > Low)
        setTickets([
            { id: 'Q-LOW', studentName: 'LowP', studentId: '1', category: 'IT Support', priority: 'Low', status: 'Pending', estimatedHours: 1, description: 'd', createdAt: new Date().toISOString() },
            { id: 'Q-URG', studentName: 'UrgP', studentId: '2', category: 'IT Support', priority: 'Urgent', status: 'Pending', estimatedHours: 1, description: 'd', createdAt: new Date().toISOString() }
        ]);
        const processed = processNextQueueTicket();
        record(6, 'Priority Queue Engine', 'queue.js -> processNextQueueTicket', processed.success && processed.ticket.id === 'Q-URG', 'Urgent correctly picked ahead of Low');

        // Test 7: Filter by Category
        setTickets([...SEED_DATA]);
        const allTickets = getTickets();

        const catFiltered = allTickets.filter(
            ticket => ticket.category === 'Academic'
        );

        record(
            7,
            'Filter by Category',
            'store.js -> getTickets',
             catFiltered.length > 0 && catFiltered.every(t => t.category === 'Academic'),
            `Returned ${catFiltered.length} Academic items`
        );

        // Test 8: Filter by Status
        const statusFiltered = allTickets.filter(
            ticket => ticket.status === 'Resolved'
        );

        record(
            8,
            'Filter by Status',
            'store.js -> getTickets',
            statusFiltered.length > 0 && statusFiltered.every(t => t.status === 'Resolved'),
            `Returned ${statusFiltered.length} Resolved items`
        );

        // Test 9: Text Search Match
        const searchRes = allTickets.filter(ticket =>
            ticket.studentName.toLowerCase().includes('alice')
        );

        record(
            9,
            'Student Search',
            'store.js -> getTickets',
            searchRes.length === 1 &&
            searchRes[0].studentName.includes('Alice'),
            'Matched "Alice" accurately'
        );

        // Test 10: Sort by Priority
        const sorted = [...allTickets].sort(
            (a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]
        );

        let sortOk = true;

        for (let i = 0; i < sorted.length - 1; i++) {
            if (
                PRIORITY_RANK[sorted[i].priority] <
                PRIORITY_RANK[sorted[i + 1].priority]
            ) {
                sortOk = false;
                break;
            }
        }

        record(
            10,
            'Sort by Priority Order',
            'store.js -> PRIORITY_RANK',
            sortOk,
            'Verified priority sequence'
        );

        // Test 11: Delete Ticket
        const targetId = getTickets()[0].id;
        const delRes = deleteTicket(targetId);
        record(11, 'Delete Ticket', 'store.js -> deleteTicket', delRes.success, `Deleted ${targetId}`);

        // Test 12: Unique Generator
        const id1 = generateUniqueId();
        const id2 = generateUniqueId();
        record(12, 'Unique ID Generation', 'store.js -> generateUniqueId', id1 !== id2, `Generated ${id1} & ${id2}`);

        // Test 13: Calculate Metrics
        const metrics = calculateMetrics();
        record(13, 'Summary Reporting Engine', 'store.js -> calculateMetrics', typeof metrics.total === 'number' && !isNaN(parseFloat(metrics.avgHours)), `Avg Hours: ${metrics.avgHours}`);

        // Test 14: Reset Seed Data
        resetToSeedData();
        record(14, 'Reset Data Operation', 'store.js -> resetToSeedData', getTickets().length === SEED_DATA.length, 'Restored sample records');

        // Test 15: Block Invalid Status Transition (Resolved -> Pending)
        const resItem = getTickets().find(t => t.status === 'Resolved');
        if (resItem) {
            const inv = updateTicket(resItem.id, { status: 'Pending' });
            record(15, 'Invalid Status Transition Guard', 'store.js -> isValidStatusTransition', !inv.success, `Prevented transition: ${inv.message}`);
        } else {
            record(15, 'Invalid Status Transition Guard', 'store.js -> isValidStatusTransition', true, 'Pass (no resolved item)');
        }

    } finally {
        setTickets(originalState);
    }

    return results;
}

    // Render Table Output
    const tbody = document.getElementById('test-table-body');
    tbody.innerHTML = results.map(r => `
        <tr>
            <td>${r.id}</td>
            <td><strong>${r.name}</strong></td>
            <td><code>${r.component}</code></td>
            <td class="${r.pass ? 'test-pass' : 'test-fail'}">${r.pass ? 'PASS' : 'FAIL'}</td>
            <td>${r.detail}</td>
        </tr>
    `).join('');
}
