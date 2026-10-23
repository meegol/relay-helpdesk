package dev.migol.helpdesk.ticket;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.migol.helpdesk.attachment.AttachmentDto;
import dev.migol.helpdesk.attachment.AttachmentRepository;
import dev.migol.helpdesk.attachment.AttachmentService;
import dev.migol.helpdesk.chat.ChatService;
import dev.migol.helpdesk.common.ApiException;
import dev.migol.helpdesk.realtime.RealtimePublisher;
import dev.migol.helpdesk.security.UserPrincipal;
import dev.migol.helpdesk.user.User;
import dev.migol.helpdesk.user.UserRepository;
import jakarta.persistence.criteria.Predicate;

@Service
public class TicketService {

    private static final List<TicketStatus> ACTIVE = List.of(TicketStatus.OPEN, TicketStatus.IN_PROGRESS,
            TicketStatus.WAITING_ON_CLIENT);
    private static final List<TicketStatus> DONE = List.of(TicketStatus.RESOLVED, TicketStatus.CLOSED);

    public record ListQuery(String scope, String status, TicketPriority priority, String q) {
    }

    private final TicketRepository tickets;
    private final UserRepository users;
    private final AttachmentRepository attachmentRepository;
    private final AttachmentService attachments;
    private final ChatService chat;
    private final TicketAccess access;
    private final RealtimePublisher publisher;

    public TicketService(TicketRepository tickets, UserRepository users, AttachmentRepository attachmentRepository,
            AttachmentService attachments, ChatService chat, TicketAccess access, RealtimePublisher publisher) {
        this.tickets = tickets;
        this.users = users;
        this.attachmentRepository = attachmentRepository;
        this.attachments = attachments;
        this.chat = chat;
        this.access = access;
        this.publisher = publisher;
    }

    @Transactional(readOnly = true)
    public List<TicketDto> list(UserPrincipal user, ListQuery query) {
        Specification<Ticket> spec = (root, cq, cb) -> {
            List<Predicate> where = new ArrayList<>();
            String scope = query.scope() == null ? "" : query.scope();
            switch (user.role()) {
                case CLIENT -> where.add(cb.equal(root.get("client").get("id"), user.id()));
                case STAFF -> {
                    var mine = cb.equal(root.get("assignee").get("id"), user.id());
                    var queue = cb.isNull(root.get("assignee"));
                    where.add(switch (scope) {
                        case "mine" -> mine;
                        case "queue" -> queue;
                        default -> cb.or(mine, queue);
                    });
                }
                case ADMIN -> {
                    if (scope.equals("mine")) {
                        where.add(cb.equal(root.get("assignee").get("id"), user.id()));
                    } else if (scope.equals("queue")) {
                        where.add(cb.isNull(root.get("assignee")));
                    }
                }
            }
            if (query.status() != null && !query.status().isBlank()) {
                switch (query.status()) {
                    case "active" -> where.add(root.get("status").in(ACTIVE));
                    case "done" -> where.add(root.get("status").in(DONE));
                    default -> where.add(cb.equal(root.get("status"), parseStatus(query.status())));
                }
            }
            if (query.priority() != null) {
                where.add(cb.equal(root.get("priority"), query.priority()));
            }
            if (query.q() != null && !query.q().isBlank()) {
                String term = query.q().trim().toLowerCase();
                String digits = term.replaceFirst("^hd-?", "");
                var text = cb.like(cb.lower(root.get("subject")), "%" + term + "%");
                where.add(digits.matches("\\d{1,9}") ? cb.or(text, cb.equal(root.get("id"), Long.valueOf(digits))) : text);
            }
            return cb.and(where.toArray(Predicate[]::new));
        };
        return tickets.findAll(spec, Sort.by(Sort.Direction.DESC, "lastActivityAt")).stream()
                .limit(500).map(TicketDto::summary).toList();
    }

    @Transactional
    public TicketDto create(UserPrincipal user, String subject, String description, TicketPriority priority,
            TicketCategory category, List<Long> attachmentIds) {
        if (!user.isClient()) {
            throw ApiException.forbidden("Only clients can open tickets");
        }
        User client = users.getReferenceById(user.id());
        Ticket ticket = tickets.save(new Ticket(client, subject.strip(), description.strip(),
                priority == null ? TicketPriority.NORMAL : priority,
                category == null ? TicketCategory.GENERAL : category));
        var files = attachments.claim(user, attachmentIds, ticket, null).stream().map(AttachmentDto::of).toList();
        TicketDto dto = TicketDto.of(ticket, files);
        publisher.ticketCreated(dto);
        return dto;
    }

    @Transactional(readOnly = true)
    public TicketDto get(UserPrincipal user, Long id) {
        Ticket ticket = access.requireViewable(user, id);
        return withAttachments(ticket);
    }

    @Transactional
    public TicketDto update(UserPrincipal user, Long id, TicketStatus status, TicketPriority priority, TicketCategory category) {
        Ticket ticket = access.requireViewable(user, id);
        User actor = users.getReferenceById(user.id());

        if (user.isClient()) {
            if (priority != null || category != null) {
                throw ApiException.forbidden("Priority and category are set by support");
            }
            if (status != null && !clientMayMove(ticket.getStatus(), status)) {
                throw ApiException.forbidden("You can't move this ticket to " + status.label());
            }
        } else if (!access.canParticipate(user, ticket)) {
            throw ApiException.forbidden("Claim this ticket before changing it");
        }

        if (status != null && status != ticket.getStatus()) {
            ticket.changeStatus(status);
            chat.system(ticket, actor, "changed the status to " + status.label());
        }
        if (priority != null && priority != ticket.getPriority()) {
            ticket.setPriority(priority);
            ticket.touch();
            chat.system(ticket, actor, "set priority to " + capitalize(priority.name()));
        }
        if (category != null && category != ticket.getCategory()) {
            ticket.setCategory(category);
            ticket.touch();
            chat.system(ticket, actor, "moved the ticket to " + capitalize(category.name()));
        }
        TicketDto dto = withAttachments(ticket);
        publisher.ticketChanged(dto);
        return dto;
    }

    @Transactional
    public TicketDto assign(UserPrincipal user, Long id, Long assigneeId) {
        Ticket ticket = access.requireViewable(user, id);
        User actor = users.findById(user.id()).orElseThrow();
        User current = ticket.getAssignee();

        if (user.isClient()) {
            throw ApiException.forbidden("Clients can't assign tickets");
        }
        if (!user.isAdmin()) {
            boolean claiming = assigneeId != null && assigneeId.equals(user.id()) && current == null;
            boolean releasing = assigneeId == null && ticket.isAssignedTo(user.id());
            if (!claiming && !releasing) {
                throw ApiException.forbidden("Staff can only claim unassigned tickets or release their own");
            }
        }

        User next = null;
        if (assigneeId != null) {
            next = users.findById(assigneeId)
                    .filter(u -> u.getRole().isAgent() && u.isActive())
                    .orElseThrow(() -> ApiException.badRequest("Assignee must be an active staff member"));
        }
        boolean unchanged = next == null ? current == null : current != null && current.getId().equals(next.getId());
        if (unchanged) {
            return withAttachments(ticket);
        }
        ticket.setAssignee(next);
        ticket.touch();

        String line;
        if (next == null) {
            line = "unassigned " + (current != null && current.getId().equals(actor.getId()) ? "themselves" : current.getFullName());
        } else if (next.getId().equals(actor.getId())) {
            line = "picked up this ticket";
        } else {
            line = "assigned the ticket to " + next.getFullName();
        }
        chat.system(ticket, actor, line);

        TicketDto dto = withAttachments(ticket);
        publisher.ticketChanged(dto);
        return dto;
    }

    @Transactional(readOnly = true)
    public Map<String, Long> summary(UserPrincipal user) {
        Map<String, Long> out = new LinkedHashMap<>();
        Instant weekAgo = Instant.now().minus(Duration.ofDays(7));
        switch (user.role()) {
            case CLIENT -> {
                out.put("active", tickets.countByClientIdAndStatusIn(user.id(), ACTIVE));
                out.put("waitingOnYou", tickets.countByClientIdAndStatusIn(user.id(), List.of(TicketStatus.WAITING_ON_CLIENT)));
                out.put("resolved", tickets.countByClientIdAndStatusIn(user.id(), DONE));
            }
            case STAFF, ADMIN -> {
                out.put("assigned", tickets.countByAssigneeIdAndStatusIn(user.id(), ACTIVE));
                out.put("queue", tickets.countUnassignedActive());
                out.put("resolvedThisWeek", tickets.countByAssigneeIdAndResolvedAtAfter(user.id(), weekAgo));
            }
        }
        return out;
    }

    private TicketDto withAttachments(Ticket ticket) {
        var files = attachmentRepository.findByTicketIdAndMessageIsNullOrderById(ticket.getId()).stream()
                .map(AttachmentDto::of).toList();
        return TicketDto.of(ticket, files);
    }

    private static boolean clientMayMove(TicketStatus from, TicketStatus to) {
        return switch (to) {
            case RESOLVED -> from.isActive();
            case CLOSED -> from != TicketStatus.CLOSED;
            case OPEN -> from == TicketStatus.RESOLVED || from == TicketStatus.CLOSED;
            default -> false;
        };
    }

    private static TicketStatus parseStatus(String value) {
        try {
            return TicketStatus.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Unknown status " + value);
        }
    }

    private static String capitalize(String enumName) {
        String s = enumName.replace('_', ' ').toLowerCase();
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }
}
