package dev.migol.helpdesk.realtime;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import dev.migol.helpdesk.chat.MessageDto;
import dev.migol.helpdesk.chat.MessageType;
import dev.migol.helpdesk.ticket.TicketDto;

/**
 * Pushes changes to connected clients once the surrounding transaction commits.
 *
 * <ul>
 * <li>{@code /topic/tickets/{id}} public conversation and ticket updates</li>
 * <li>{@code /topic/tickets/{id}/internal} internal notes, agents only</li>
 * <li>{@code /topic/queue} "something changed" signal for agent lists</li>
 * <li>{@code /user/queue/events} per-user list refreshes and notifications</li>
 * </ul>
 */
@Component
public class RealtimePublisher {

    private final SimpMessagingTemplate broker;

    public RealtimePublisher(SimpMessagingTemplate broker) {
        this.broker = broker;
    }

    public void messageCreated(MessageDto message, TicketDto ticket) {
        afterCommit(() -> {
            String topic = "/topic/tickets/" + ticket.id() + (message.type() == MessageType.NOTE ? "/internal" : "");
            broker.convertAndSend(topic, new TicketEvent("message", ticket.id(), message));
            if (message.type() == MessageType.SYSTEM) {
                return;
            }
            Long authorId = message.author() == null ? null : message.author().id();
            String preview = preview(message.body(), message.attachments().isEmpty());
            var note = new Notification(ticket.id(), ticket.code(), message.author().fullName(), preview);
            if (message.type() == MessageType.CHAT && !ticket.client().id().equals(authorId)) {
                toUser(ticket.client().id(), new TicketEvent("notification", ticket.id(), note));
            }
            if (ticket.assignee() != null && !ticket.assignee().id().equals(authorId)) {
                toUser(ticket.assignee().id(), new TicketEvent("notification", ticket.id(), note));
            }
            signalLists(ticket);
        });
    }

    public void ticketChanged(TicketDto ticket) {
        afterCommit(() -> {
            broker.convertAndSend("/topic/tickets/" + ticket.id(), new TicketEvent("ticket", ticket.id(), ticket));
            signalLists(ticket);
        });
    }

    public void ticketCreated(TicketDto ticket) {
        afterCommit(() -> {
            signalLists(ticket);
            broker.convertAndSend("/topic/queue", new TicketEvent("notification", ticket.id(),
                    new Notification(ticket.id(), ticket.code(), "New ticket from " + ticket.client().fullName(), ticket.subject())));
        });
    }

    public void typing(Long ticketId, Object payload) {
        broker.convertAndSend("/topic/tickets/" + ticketId, new TicketEvent("typing", ticketId, payload));
    }

    private void signalLists(TicketDto ticket) {
        var signal = new TicketEvent("ticket", ticket.id(), null);
        broker.convertAndSend("/topic/queue", signal);
        toUser(ticket.client().id(), signal);
        if (ticket.assignee() != null) {
            toUser(ticket.assignee().id(), signal);
        }
    }

    private void toUser(Long userId, TicketEvent event) {
        broker.convertAndSendToUser(String.valueOf(userId), "/queue/events", event);
    }

    private static String preview(String body, boolean noAttachments) {
        if (body == null || body.isBlank()) {
            return noAttachments ? "" : "Sent an attachment";
        }
        return body.length() > 120 ? body.substring(0, 117) + "..." : body;
    }

    private static void afterCommit(Runnable task) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    task.run();
                }
            });
        } else {
            task.run();
        }
    }
}
