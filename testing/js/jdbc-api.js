const API_BASE = '/api/tickets';

export async function getJdbcTickets() {
  const response = await fetch(API_BASE);
  if (!response.ok) throw new Error('Unable to load tickets from JDBC.');
  return response.json();
}

export async function createJdbcTicket(ticket) {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ticket)
  });
  if (!response.ok) throw new Error('Unable to create ticket in JDBC.');
  return response.json();
}

export async function updateJdbcTicket(ticket) {
  const response = await fetch(`${API_BASE}/${encodeURIComponent(ticket.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ticket)
  });
  if (!response.ok) throw new Error('Unable to update ticket in JDBC.');
  return response.json();
}

export async function deleteJdbcTicket(id) {
  const response = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Unable to delete ticket in JDBC.');
  return response.json();
}

export async function resetJdbcTickets() {
  const response = await fetch(`${API_BASE}/reset`, { method: 'POST' });
  if (!response.ok) throw new Error('Unable to reset tickets in JDBC.');
  return response.json();
}
