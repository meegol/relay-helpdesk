package dev.migol.helpdesk.realtime;

import java.security.Principal;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import dev.migol.helpdesk.security.UserPrincipal;
import dev.migol.helpdesk.ticket.TicketAccess;

@Controller
public class TypingController {

    public record TypingSignal(boolean typing) {
    }

    public record TypingPayload(Long userId, String name, boolean typing) {
    }

    private final TicketAccess access;
    private final RealtimePublisher publisher;

    public TypingController(TicketAccess access, RealtimePublisher publisher) {
        this.access = access;
        this.publisher = publisher;
    }

    @MessageMapping("/tickets/{ticketId}/typing")
    public void typing(@DestinationVariable Long ticketId, @Payload TypingSignal signal, Principal principal) {
        UserPrincipal user = UserPrincipal.from(principal);
        if (access.canView(user, ticketId)) {
            publisher.typing(ticketId, new TypingPayload(user.id(), user.fullName(), signal.typing()));
        }
    }
}
