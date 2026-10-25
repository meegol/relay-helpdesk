# Relay

A helpdesk where clients open tickets, attach screenshots, and chat live with the support person handling their request. Separate panels for clients, support staff and admins.

- **Backend:** Spring Boot 4.1 on Java 21, Spring Security with JWT, Spring Data JPA, STOMP over WebSocket
- **Frontend:** React 19, Vite, Tailwind CSS 4, lucide icons, Schibsted Grotesk
- **Database:** H2 file database for local development, PostgreSQL in Docker

## What it does

**Clients** open requests with a category and urgency, paste or drop screenshots, and follow the conversation in real time. They can mark a request resolved, close it, or reopen it.

**Support staff** work from an inbox with two views: tickets assigned to them and the unassigned queue. They pick up tickets from the queue, reply to the client, leave internal notes the client never sees, and change status, priority and category.

**Admins** see an overview (ticket states, created vs. resolved over 14 days, response times, team workload), every ticket with filters, and can reassign any ticket. They manage people: add staff, change roles, reset passwords and deactivate accounts.

Live features, all over a single authenticated WebSocket:

- New messages, status changes and assignments appear instantly for everyone on the ticket
- Typing indicators
- Toast notifications for replies on your tickets and new tickets in the queue
- Lists refresh themselves when something changes

Works on phones: the sidebar becomes a drawer and ticket details become a slide-over sheet.

## Run it locally

Requirements: Java 21 and Node 20+.

```bash
# terminal 1
cd backend
./mvnw spring-boot:run

# terminal 2
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` and `/ws` to the backend on port 8080.

The first start seeds a demo workspace:

| Role   | Email               | Password     |
| ------ | ------------------- | ------------ |
| Admin  | admin@relay.dev     | admin1234    |
| Staff  | jordan@relay.dev    | staff1234    |
| Staff  | sam@relay.dev       | staff1234    |
| Staff  | priya@relay.dev     | staff1234    |
| Client | lena@northwind.io   | client1234   |
| Client | marco@acme.co       | client1234   |
| Client | hana@kitelabs.com   | client1234   |

To test live chat, sign in as a client in one browser and as staff in a private window, then open the same ticket.

Data lives in `backend/data/` and uploads in `backend/uploads/`. Delete both to start fresh.

## Run with Docker

```bash
docker compose up --build
```

Open http://localhost:8081. This runs PostgreSQL, the backend and an nginx container serving the built frontend.

## Configuration

Backend environment variables:

| Variable          | Default                          | Purpose                                         |
| ----------------- | -------------------------------- | ----------------------------------------------- |
| `JWT_SECRET`      | dev value                        | HMAC key for tokens, at least 32 bytes. **Set this in production.** |
| `DB_URL`          | H2 file in `./data`              | JDBC URL                                        |
| `DB_USER`, `DB_PASSWORD` | `sa`, empty               | Database credentials                            |
| `UPLOAD_DIR`      | `./uploads`                      | Where attachments are stored                    |
| `CORS_ORIGINS`    | localhost and private LAN ranges | Allowed origins for the API and WebSocket       |
| `SEED_DEMO_DATA`  | `true`                           | Seed demo data into an empty database. With `false`, only the admin account is created. |

Use `SPRING_PROFILES_ACTIVE=postgres` to switch to PostgreSQL.

Frontend: set `VITE_API_URL` at build time if the API is served from a different origin.

## How it fits together

```
backend/src/main/java/dev/migol/helpdesk
  auth/         login, registration, profile, password
  security/     JWT issuing, request authentication, security rules
  ticket/       tickets, visibility rules (TicketAccess), status flow
  chat/         messages: replies, internal notes, activity lines
  attachment/   uploads and authenticated downloads
  realtime/     STOMP config, subscription guard, event publisher, typing
  admin/        user management and stats
  config/       properties and demo data

frontend/src
  lib/          API client, auth, realtime (STOMP), formatting
  components/   app shell, ticket list, conversation, composer, UI primitives
  pages/        client, staff and admin panels, ticket view, auth, account
```

**Access rules.** Clients only see their own tickets. Staff see tickets assigned to them plus the unassigned queue, and must pick up a ticket before replying. Admins see and do everything. The same rules guard REST endpoints, WebSocket subscriptions and attachment downloads.

**Realtime topics.**

- `/topic/tickets/{id}`: conversation, ticket updates and typing for one ticket
- `/topic/tickets/{id}/internal`: internal notes, agents only
- `/topic/queue`: change signals for agent lists
- `/user/queue/events`: per-user notifications

The WebSocket authenticates with the same JWT as the REST API, sent in the STOMP `CONNECT` frame.

**Uploads.** PNG, JPEG, GIF, WebP, PDF and plain text up to 10 MB. SVG is rejected because it can carry scripts. Files are served with `nosniff` and only to people who can see the ticket.

## Tests

```bash
cd backend && ./mvnw test
```

Integration tests cover authentication, role boundaries, the full ticket lifecycle with a screenshot and internal note, and upload validation.
