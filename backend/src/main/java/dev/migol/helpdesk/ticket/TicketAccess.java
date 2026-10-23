package dev.migol.helpdesk.ticket;

import org.springframework.stereotype.Component;

import dev.migol.helpdesk.common.ApiException;
import dev.migol.helpdesk.security.UserPrincipal;

/**
 * Visibility rules: admins see everything, clients see their own tickets, staff
 * see tickets assigned to them plus the unassigned queue. Only the client, the
 * assignee and admins may post in a ticket's conversation.
 */
@Component
public class TicketAccess {

    private final TicketRepository tickets;

    public TicketAccess(TicketRepository tickets) {
        this.tickets = tickets;
    }

    public boolean canView(UserPrincipal user, Ticket t) {
        return switch (user.role()) {
            case ADMIN -> true;
            case CLIENT -> t.getClient().getId().equals(user.id());
            case STAFF -> t.getAssignee() == null || t.isAssignedTo(user.id());
        };
    }

    public boolean canParticipate(UserPrincipal user, Ticket t) {
        return switch (user.role()) {
            case ADMIN -> true;
            case CLIENT -> t.getClient().getId().equals(user.id());
            case STAFF -> t.isAssignedTo(user.id());
        };
    }

    public boolean canView(UserPrincipal user, Long ticketId) {
        return tickets.findById(ticketId).map(t -> canView(user, t)).orElse(false);
    }

    public Ticket requireViewable(UserPrincipal user, Long ticketId) {
        Ticket t = tickets.findById(ticketId).orElseThrow(() -> ApiException.notFound("Ticket"));
        if (!canView(user, t)) {
            throw ApiException.notFound("Ticket");
        }
        return t;
    }
}
