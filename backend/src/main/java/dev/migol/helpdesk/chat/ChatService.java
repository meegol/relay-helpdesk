package dev.migol.helpdesk.chat;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.migol.helpdesk.attachment.Attachment;
import dev.migol.helpdesk.attachment.AttachmentDto;
import dev.migol.helpdesk.attachment.AttachmentRepository;
import dev.migol.helpdesk.attachment.AttachmentService;
import dev.migol.helpdesk.common.ApiException;
import dev.migol.helpdesk.realtime.RealtimePublisher;
import dev.migol.helpdesk.security.UserPrincipal;
import dev.migol.helpdesk.ticket.Ticket;
import dev.migol.helpdesk.ticket.TicketAccess;
import dev.migol.helpdesk.ticket.TicketDto;
import dev.migol.helpdesk.ticket.TicketStatus;
import dev.migol.helpdesk.user.User;
import dev.migol.helpdesk.user.UserRepository;

@Service
public class ChatService {

    private final MessageRepository messages;
    private final AttachmentRepository attachmentRepository;
    private final AttachmentService attachments;
    private final UserRepository users;
    private final TicketAccess access;
    private final RealtimePublisher publisher;

    public ChatService(MessageRepository messages, AttachmentRepository attachmentRepository, AttachmentService attachments,
            UserRepository users, TicketAccess access, RealtimePublisher publisher) {
        this.messages = messages;
        this.attachmentRepository = attachmentRepository;
        this.attachments = attachments;
        this.users = users;
        this.access = access;
        this.publisher = publisher;
    }

    @Transactional(readOnly = true)
    public List<MessageDto> list(UserPrincipal principal, Long ticketId) {
        access.requireViewable(principal, ticketId);
        var types = principal.isAgent()
                ? List.of(MessageType.CHAT, MessageType.NOTE, MessageType.SYSTEM)
                : List.of(MessageType.CHAT, MessageType.SYSTEM);
        List<Message> found = messages.findByTicketIdAndTypeInOrderByCreatedAtAscIdAsc(ticketId, types);
        Map<Long, List<AttachmentDto>> files = attachmentRepository
                .findByMessageIdInOrderById(found.stream().map(Message::getId).toList()).stream()
                .collect(Collectors.groupingBy(a -> a.getMessage().getId(),
                        Collectors.mapping(AttachmentDto::of, Collectors.toList())));
        return found.stream().map(m -> MessageDto.of(m, files.getOrDefault(m.getId(), List.of()))).toList();
    }

    @Transactional
    public MessageDto send(UserPrincipal principal, Long ticketId, String body, List<Long> attachmentIds, boolean internal) {
        Ticket ticket = access.requireViewable(principal, ticketId);
        if (!access.canParticipate(principal, ticket)) {
            throw ApiException.forbidden(principal.isAgent()
                    ? "Claim this ticket before replying"
                    : "You can't reply to this ticket");
        }
        if (internal && !principal.isAgent()) {
            throw ApiException.forbidden("Only support staff can add internal notes");
        }
        String text = body == null ? "" : body.strip();
        boolean hasFiles = attachmentIds != null && !attachmentIds.isEmpty();
        if (text.isEmpty() && !hasFiles) {
            throw ApiException.badRequest("Message is empty");
        }
        if (!internal && ticket.getStatus() == TicketStatus.CLOSED) {
            throw new ApiException(HttpStatus.CONFLICT, "This ticket is closed. Reopen it or start a new one.");
        }

        User author = users.getReferenceById(principal.id());
        Message message = messages.save(new Message(ticket, author, internal ? MessageType.NOTE : MessageType.CHAT, text));
        List<Attachment> files = attachments.claim(principal, attachmentIds, ticket, message);

        boolean ticketChanged = false;
        if (!internal) {
            ticketChanged = applyReplyTransitions(principal, ticket, author);
        }
        ticket.touch();

        TicketDto ticketDto = TicketDto.summary(ticket);
        MessageDto dto = MessageDto.of(message, files.stream().map(AttachmentDto::of).toList());
        publisher.messageCreated(dto, ticketDto);
        if (ticketChanged) {
            publisher.ticketChanged(ticketDto);
        }
        return dto;
    }

    /** Moves the ticket along when someone replies. Returns true if the status changed. */
    private boolean applyReplyTransitions(UserPrincipal principal, Ticket ticket, User author) {
        TicketStatus before = ticket.getStatus();
        if (principal.isAgent()) {
            if (ticket.getFirstResponseAt() == null) {
                ticket.setFirstResponseAt(Instant.now());
            }
            if (before == TicketStatus.OPEN) {
                ticket.changeStatus(TicketStatus.IN_PROGRESS);
            }
        } else if (before == TicketStatus.WAITING_ON_CLIENT) {
            ticket.changeStatus(TicketStatus.IN_PROGRESS);
        } else if (before == TicketStatus.RESOLVED) {
            ticket.changeStatus(ticket.getAssignee() == null ? TicketStatus.OPEN : TicketStatus.IN_PROGRESS);
            system(ticket, author, "reopened the ticket by replying");
        }
        return before != ticket.getStatus();
    }

    /** Records an activity line in the conversation and pushes it out. */
    @Transactional
    public void system(Ticket ticket, User actor, String body) {
        Message message = messages.save(new Message(ticket, actor, MessageType.SYSTEM, body));
        publisher.messageCreated(MessageDto.of(message, List.of()), TicketDto.summary(ticket));
    }
}
