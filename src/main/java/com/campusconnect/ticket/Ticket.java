package com.campusconnect.ticket;

public record Ticket(
    String id,
    String studentName,
    String studentId,
    String category,
    String priority,
    String status,
    double estimatedHours,
    String description,
    String createdAt,
    String updatedAt
) {
}
