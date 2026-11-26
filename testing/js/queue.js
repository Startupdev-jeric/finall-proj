/**
 * js/queue.js
 * Priority Queue resolution algorithm (TSA3 Service Engine).
 */

import { getTickets, updateTicket, PRIORITY_RANK } from './store.js';

export function getSortedPendingQueue(ticketList = getTickets()) {
  const pending = ticketList.filter(
    (ticket) => ticket.status === 'Pending'
  );

  return [...pending].sort((a, b) => {
    const rankDifference =
      PRIORITY_RANK[b.priority] -
      PRIORITY_RANK[a.priority];

    if (rankDifference !== 0) {
      return rankDifference;
    }

    return new Date(a.createdAt) -
      new Date(b.createdAt);
  });
}

export function processNextQueueTicket() {
    const sortedQueue = getSortedPendingQueue();

    if (sortedQueue.length === 0) {
        return { success: false, message: 'Queue Empty: No pending tickets.' };
    }

    const nextTicket = sortedQueue[0];
    const updateResult = updateTicket(nextTicket.id, { status: 'In Progress' });

    if (updateResult.success) {
        return { success: true, ticket: updateResult.ticket };
    } else {
        return { success: false, message: updateResult.message };
    }
}
