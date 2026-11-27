package com.campusconnect.ticket;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class TicketDao implements AutoCloseable {
    private final Connection connection;

    public TicketDao(String jdbcUrl) throws SQLException {
        connection = DriverManager.getConnection(jdbcUrl);
        connection.setAutoCommit(true);
        createTable();
    }

    private void createTable() throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("""
                CREATE TABLE IF NOT EXISTS tickets (
                    id VARCHAR(32) PRIMARY KEY,
                    student_name VARCHAR(200) NOT NULL,
                    student_id VARCHAR(100),
                    category VARCHAR(100) NOT NULL,
                    priority VARCHAR(20) NOT NULL,
                    status VARCHAR(20) NOT NULL,
                    estimated_hours DOUBLE NOT NULL,
                    description VARCHAR(2000) NOT NULL,
                    created_at VARCHAR(40) NOT NULL,
                    updated_at VARCHAR(40) NOT NULL
                )
                """);
        }
    }

    public List<Ticket> findAll() throws SQLException {
        List<Ticket> tickets = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(
            "SELECT * FROM tickets ORDER BY created_at DESC");
             ResultSet result = statement.executeQuery()) {
            while (result.next()) {
                tickets.add(map(result));
            }
        }
        return tickets;
    }

    public Ticket findById(String id) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
            "SELECT * FROM tickets WHERE id = ?")) {
            statement.setString(1, id);
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? map(result) : null;
            }
        }
    }

    public void insert(Ticket ticket) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("""
            INSERT INTO tickets (
                id, student_name, student_id, category, priority, status,
                estimated_hours, description, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """)) {
            bind(statement, ticket);
            statement.executeUpdate();
        }
    }

    public boolean update(Ticket ticket) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("""
            UPDATE tickets SET student_name = ?, student_id = ?, category = ?,
                priority = ?, status = ?, estimated_hours = ?, description = ?,
                updated_at = ?
            WHERE id = ?
            """)) {
            statement.setString(1, ticket.studentName());
            statement.setString(2, ticket.studentId());
            statement.setString(3, ticket.category());
            statement.setString(4, ticket.priority());
            statement.setString(5, ticket.status());
            statement.setDouble(6, ticket.estimatedHours());
            statement.setString(7, ticket.description());
            statement.setString(8, ticket.updatedAt());
            statement.setString(9, ticket.id());
            return statement.executeUpdate() == 1;
        }
    }

    public boolean delete(String id) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
            "DELETE FROM tickets WHERE id = ?")) {
            statement.setString(1, id);
            return statement.executeUpdate() == 1;
        }
    }

    public void deleteAll() throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate("DELETE FROM tickets");
        }
    }

    private void bind(PreparedStatement statement, Ticket ticket) throws SQLException {
        statement.setString(1, ticket.id());
        statement.setString(2, ticket.studentName());
        statement.setString(3, ticket.studentId());
        statement.setString(4, ticket.category());
        statement.setString(5, ticket.priority());
        statement.setString(6, ticket.status());
        statement.setDouble(7, ticket.estimatedHours());
        statement.setString(8, ticket.description());
        statement.setString(9, ticket.createdAt());
        statement.setString(10, ticket.updatedAt());
    }

    private Ticket map(ResultSet result) throws SQLException {
        return new Ticket(
            result.getString("id"),
            result.getString("student_name"),
            result.getString("student_id"),
            result.getString("category"),
            result.getString("priority"),
            result.getString("status"),
            result.getDouble("estimated_hours"),
            result.getString("description"),
            result.getString("created_at"),
            result.getString("updated_at")
        );
    }

    @Override
    public void close() throws SQLException {
        connection.close();
    }
}
