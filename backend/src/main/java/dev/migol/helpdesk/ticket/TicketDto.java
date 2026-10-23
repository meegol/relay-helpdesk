package dev.migol.helpdesk.ticket;

import java.time.Instant;
import java.util.List;

import dev.migol.helpdesk.attachment.AttachmentDto;
import dev.migol.helpdesk.user.UserSummary;

public record TicketDto(
        Long id,
        String code,
        String subject,
        String description,
        TicketStatus status,
        TicketPriority priority,
        TicketCategory category,
        UserSummary client,
        UserSummary assignee,
        Instant createdAt,
        Instant lastActivityAt,
        Instant firstResponseAt,
        Instant resolvedAt,
        List<AttachmentDto> attachments) {

    public static TicketDto of(Ticket t, List<AttachmentDto> attachments) {
        return new TicketDto(t.getId(), t.code(), t.getSubject(), t.getDescription(), t.getStatus(), t.getPriority(),
                t.getCategory(), UserSummary.of(t.getClient()), UserSummary.of(t.getAssignee()), t.getCreatedAt(),
                t.getLastActivityAt(), t.getFirstResponseAt(), t.getResolvedAt(), attachments);
    }

    public static TicketDto summary(Ticket t) {
        return of(t, List.of());
    }
}
