# JDBC ticket persistence

The feature branch includes a Java 17 HTTP service backed by H2 through JDBC.

## Run

```powershell
mvn package
java -jar target\ticket-persistence-1.0.0.jar
```

Open `http://localhost:8080/testing/html/manage-tickets.html`.

Set `TICKET_JDBC_URL` to use a different H2 URL. The default is `jdbc:h2:file:./data/campus-tickets`.

## API

- `GET /api/tickets`
- `POST /api/tickets`
- `GET /api/tickets/{id}`
- `PUT /api/tickets/{id}`
- `DELETE /api/tickets/{id}`
- `POST /api/tickets/reset`
