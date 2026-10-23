package dev.migol.helpdesk.chat;

import java.time.Instant;
import java.util.List;

import dev.migol.helpdesk.attachment.AttachmentDto;
import dev.migol.helpdesk.user.UserSummary;

public record MessageDto(Long id, Long ticketId, MessageType type, String body, UserSummary author, Instant createdAt,
        List<AttachmentDto> attachments) {

    public static MessageDto of(Message m, List<AttachmentDto> attachments) {
        return new MessageDto(m.getId(), m.getTicket().getId(), m.getType(), m.getBody(), UserSummary.of(m.getAuthor()),
                m.getCreatedAt(), attachments);
    }
}
