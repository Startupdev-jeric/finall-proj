/**
- js/store.js
- Data persistence, validation rules, and core domain state storage.
 */

const STORAGE_KEY = 'CAMPUS_CONNECT_TICKETS_MODULAR';

export function generateTicketId(existingTickets = [], prefix = 'CC', digits = 4) {
  const existingIds = new Set(existingTickets.map((ticket) => ticket.id));
  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;

  let candidateId = '';
  let attempts = 0;

  do {
    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
    candidateId = `${prefix}-${randomNum}`;
    attempts += 1;

    if (attempts > 50) {
      return generateTicketId(existingTickets, prefix, digits + 1);
    }
  } while (existingIds.has(candidateId));

  return candidateId;
}

export const PRIORITY_RANK = {
    'Urgent': 4,
    'High': 3,
    'Medium': 2,
    'Low': 1
};

export const VALID_TRANSITIONS = {
    'Pending': ['Pending', 'In Progress', 'Cancelled'],
    'In Progress': ['In Progress', 'Resolved', 'Cancelled'],
    'Resolved': ['Resolved'],
    'Cancelled': ['Cancelled']
};

export const SEED_DATA = [
    {
        id: 'CC-1001',
        studentName: 'Alice Smith',
        studentId: 'STU-88102',
        category: 'Academic',
        priority: 'Urgent',
        status: 'Pending',
        estimatedHours: 3.5,
        description: 'Course overload permit request for final semester graduation.',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
        id: 'CC-1002',
        studentName: 'Bob Jones',
        studentId: 'STU-44109',
        category: 'Financial',
        priority: 'High',
        status: 'In Progress',
        estimatedHours: 5.0,
        description: 'Scholarship grant disbursement inquiry for Spring semester.',
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
        id: 'CC-1003',
        studentName: 'Charlie Brown',
        studentId: 'STU-12004',
        category: 'IT Support',
        priority: 'Medium',
        status: 'Pending',
        estimatedHours: 1.0,
        description: 'LMS portal password reset and multi-factor authentication unlock.',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
        id: 'CC-1004',
        studentName: 'Diana Prince',
        studentId: 'STU-99401',
        category: 'Registrar',
        priority: 'Low',
        status: 'Resolved',
        estimatedHours: 2.0,
        description: 'Official Transcript of Records request for graduate school.',
        createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
    }
];

let tickets = [];

export function loadTickets() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            tickets = JSON.parse(raw);
        } catch (e) {
            tickets = [...SEED_DATA];
            saveTickets();
        }
    } else {
        tickets = [...SEED_DATA];
        saveTickets();
    }
    return tickets;
}

export function saveTickets() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

export function getTickets() {
    return tickets;
}

export function setTickets(newTickets) {
    tickets = newTickets;
    saveTickets();
}

export function resetToSeedData() {
    tickets = JSON.parse(JSON.stringify(SEED_DATA));
    saveTickets();
    return tickets;
}

export function generateUniqueId() {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `CC-${randomNum}`;
}

export function validateTicketData(data) {
    if (!data.studentName || data.studentName.trim() === '') {
        return { valid: false, message: 'Student Name is required.' };
    }
    if (!data.studentId || data.studentId.trim() === '') {
        return { valid: false, message: 'Student ID is required.' };
    }
    if (!data.category) {
        return { valid: false, message: 'Category selection is required.' };
    }
    if (!data.priority) {
        return { valid: false, message: 'Priority selection is required.' };
    }
    const hours = parseFloat(data.estimatedHours);
    if (isNaN(hours) || hours < 0.5 || hours > 100) {
        return { valid: false, message: 'Estimated Hours must be a number between 0.5 and 100.' };
    }
    if (!data.description || data.description.trim() === '') {
        return { valid: false, message: 'Description is required.' };
    }
    return { valid: true };
}

export function isValidStatusTransition(currentStatus, newStatus) {
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    return allowed.includes(newStatus);
}

export function addTicket(ticketData) {
    const validation = validateTicketData(ticketData);
    if (!validation.valid) {
        return { success: false, message: validation.message };
    }

    const newTicket = {
        id: generateUniqueId(),
        studentName: ticketData.studentName.trim(),
        studentId: ticketData.studentId.trim(),
        category: ticketData.category,
        priority: ticketData.priority,
        status: 'Pending',
        estimatedHours: parseFloat(ticketData.estimatedHours),
        description: ticketData.description.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    tickets.unshift(newTicket);
    saveTickets();
    return { success: true, ticket: newTicket };
}

export function updateTicket(id, updatedFields) {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) {
        return { success: false, message: 'Ticket not found.' };
    }

    if (updatedFields.status && updatedFields.status !== ticket.status) {
        if (!isValidStatusTransition(ticket.status, updatedFields.status)) {
            return { 
                success: false, 
                message: `Invalid status transition from "${ticket.status}" to "${updatedFields.status}".` 
            };
        }
    }

    if (updatedFields.estimatedHours !== undefined) {
        const hours = parseFloat(updatedFields.estimatedHours);
        if (isNaN(hours) || hours < 0.5 || hours > 100) {
            return { success: false, message: 'Estimated Hours must be between 0.5 and 100.' };
        }
        ticket.estimatedHours = hours;
    }

    if (updatedFields.priority) ticket.priority = updatedFields.priority;
    if (updatedFields.status) ticket.status = updatedFields.status;
    if (updatedFields.description) ticket.description = updatedFields.description.trim();
    ticket.updatedAt = new Date().toISOString();

    saveTickets();
    return { success: true, ticket };
}

export function deleteTicket(id) {
    const lenBefore = tickets.length;
    tickets = tickets.filter(t => t.id !== id);
    if (tickets.length < lenBefore) {
        saveTickets();
        return { success: true };
    }
    return { success: false, message: 'Ticket not found.' };
}

export function calculateMetrics() {
    const total = tickets.length;
    const pending = tickets.filter(t => t.status === 'Pending').length;
    const progress = tickets.filter(t => t.status === 'In Progress').length;
    const resolved = tickets.filter(t => t.status === 'Resolved').length;
    
    const sumHours = tickets.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
    const avgHours = total > 0 ? (sumHours / total).toFixed(1) : '0.0';

    return { total, pending, progress, resolved, avgHours };
}

  do {
    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
    candidateId = `${prefix}-${randomNum}`;
    attempts += 1;

    if (attempts > 50) {
      return generateTicketId(existingTickets, prefix, digits + 1);
    }
  } while (existingIds.has(candidateId));

  return candidateId;
}

export const ALLOWED_STATUS_TRANSITIONS = {
  Pending: ['In Progress', 'Cancelled'],
  'In Progress': ['Resolved', 'Cancelled'],
  Resolved: [],
  Cancelled: [],
};

export function canTransitionStatus(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) {
    return true;
  }
  const allowedNext = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  return allowedNext.includes(nextStatus);
}

export function transitionTicketStatus(tickets, ticketId, nextStatus) {
  const target = tickets.find((ticket) => ticket.id === ticketId);
  if (!target) {
    return { ok: false, error: `Ticket ${ticketId} not found.`, tickets };
  }

  if (!canTransitionStatus(target.status, nextStatus)) {
    return {
      ok: false,
      error: `Cannot change status from "${target.status}" to "${nextStatus}".`,
      tickets,
    };
  }

  const updatedTickets = tickets.map((ticket) =>
    ticket.id === ticketId
      ? { ...ticket, status: nextStatus, updatedAt: new Date().toISOString() }
      : ticket
  );

  return { ok: true, tickets: updatedTickets };
}
