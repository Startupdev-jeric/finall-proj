package com.campusconnect.ticket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public class TicketServer {
    private static final ObjectMapper JSON = new ObjectMapper();

    public static void main(String[] args) throws Exception {
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        String jdbcUrl = System.getenv().getOrDefault(
            "TICKET_JDBC_URL",
            "jdbc:h2:file:./data/campus-tickets"
        );

        try (TicketDao dao = new TicketDao(jdbcUrl)) {
            if (dao.findAll().isEmpty()) {
                for (Ticket ticket : seedTickets()) {
                    dao.insert(ticket);
                }
            }
            HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
            server.createContext("/api/tickets", exchange -> handleTickets(exchange, dao));
            server.createContext("/", TicketServer::handleStaticFile);
            server.setExecutor(null);
            server.start();
            System.out.println("Ticket persistence server listening on http://localhost:" + port);
            Thread.currentThread().join();
        }
    }

    private static void handleTickets(HttpExchange exchange, TicketDao dao) throws IOException {
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");
        exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");

        if ("OPTIONS".equals(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        try {
            String path = exchange.getRequestURI().getPath();
            String method = exchange.getRequestMethod();

            if ("/api/tickets/reset".equals(path) && "POST".equals(method)) {
                dao.deleteAll();
                for (Ticket ticket : seedTickets()) {
                    dao.insert(ticket);
                }
                sendJson(exchange, 200, dao.findAll());
                return;
            }

            if ("/api/tickets".equals(path) && "GET".equals(method)) {
                sendJson(exchange, 200, dao.findAll());
                return;
            }

            if ("/api/tickets".equals(path) && "POST".equals(method)) {
                Ticket ticket = JSON.readValue(exchange.getRequestBody(), Ticket.class);
                validate(ticket);
                dao.insert(ticket);
                sendJson(exchange, 201, ticket);
                return;
            }

            String idPrefix = "/api/tickets/";
            if (path.startsWith(idPrefix)) {
                String id = path.substring(idPrefix.length());
                if ("PUT".equals(method)) {
                    Ticket ticket = JSON.readValue(exchange.getRequestBody(), Ticket.class);
                    validate(ticket);
                    Ticket withId = new Ticket(
                        id, ticket.studentName(), ticket.studentId(), ticket.category(),
                        ticket.priority(), ticket.status(), ticket.estimatedHours(),
                        ticket.description(), ticket.createdAt(), Instant.now().toString()
                    );
                    if (!dao.update(withId)) {
                        sendJson(exchange, 404, Map.of("message", "Ticket not found."));
                    } else {
                        sendJson(exchange, 200, dao.findById(id));
                    }
                    return;
                }
                if ("DELETE".equals(method)) {
                    if (!dao.delete(id)) {
                        sendJson(exchange, 404, Map.of("message", "Ticket not found."));
                    } else {
                        sendJson(exchange, 200, Map.of("success", true));
                    }
                    return;
                }
                if ("GET".equals(method)) {
                    Ticket ticket = dao.findById(id);
                    if (ticket == null) {
                        sendJson(exchange, 404, Map.of("message", "Ticket not found."));
                    } else {
                        sendJson(exchange, 200, ticket);
                    }
                    return;
                }
            }

            sendJson(exchange, 404, Map.of("message", "Not found."));
        } catch (IllegalArgumentException error) {
            sendJson(exchange, 400, Map.of("message", error.getMessage()));
        } catch (SQLException error) {
            sendJson(exchange, 500, Map.of("message", "Database error."));
        }
    }

    private static void validate(Ticket ticket) {
        if (ticket == null
            || isBlank(ticket.id())
            || isBlank(ticket.studentName())
            || isBlank(ticket.category())
            || isBlank(ticket.priority())
            || isBlank(ticket.status())
            || isBlank(ticket.description())
            || ticket.estimatedHours() < 0.5
            || ticket.estimatedHours() > 40) {
            throw new IllegalArgumentException("Invalid ticket data.");
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private static List<Ticket> seedTickets() {
        String now = Instant.now().toString();
        return List.of(
            new Ticket("CC-1001", "Alice Smith", "STU-88102", "Academic", "Urgent", "Pending", 3.5,
                "Course overload permit request for final semester graduation.", now, now),
            new Ticket("CC-1002", "Bob Jones", "STU-44109", "Financial", "High", "In Progress", 5.0,
                "Scholarship grant disbursement inquiry for Spring semester.", now, now),
            new Ticket("CC-1003", "Charlie Brown", "STU-12004", "IT Support", "Medium", "Pending", 1.0,
                "LMS portal password reset and multi-factor authentication unlock.", now, now),
            new Ticket("CC-1004", "Diana Prince", "STU-99401", "Registrar", "Low", "Resolved", 2.0,
                "Official Transcript of Records request for graduate school.", now, now)
        );
    }

    private static void handleStaticFile(HttpExchange exchange) throws IOException {
        String requestPath = exchange.getRequestURI().getPath();
        if ("/".equals(requestPath)) {
            requestPath = "/testing/html/index.html";
        } else if (!requestPath.contains(".")) {
            sendJson(exchange, 404, Map.of("message", "Not found."));
            return;
        }

        Path file = Path.of(".").resolve(requestPath.substring(1)).normalize();
        if (!Files.isRegularFile(file)) {
            sendJson(exchange, 404, Map.of("message", "Not found."));
            return;
        }

        byte[] body = Files.readAllBytes(file);
        exchange.getResponseHeaders().add("Content-Type", contentType(file));
        exchange.sendResponseHeaders(200, body.length);
        exchange.getResponseBody().write(body);
        exchange.close();
    }

    private static String contentType(Path file) {
        String name = file.getFileName().toString();
        if (name.endsWith(".html")) return "text/html; charset=utf-8";
        if (name.endsWith(".css")) return "text/css; charset=utf-8";
        if (name.endsWith(".js")) return "text/javascript; charset=utf-8";
        return "application/octet-stream";
    }

    private static void sendJson(HttpExchange exchange, int status, Object body) throws IOException {
        byte[] bytes = JSON.writeValueAsBytes(body);
        exchange.getResponseHeaders().add("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }
}
