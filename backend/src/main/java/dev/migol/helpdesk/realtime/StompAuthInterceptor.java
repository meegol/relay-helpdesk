package dev.migol.helpdesk.realtime;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;

import dev.migol.helpdesk.security.PrincipalConverter;
import dev.migol.helpdesk.security.UserPrincipal;
import dev.migol.helpdesk.ticket.TicketAccess;

/**
 * Authenticates the STOMP CONNECT frame with the same JWT used for REST and
 * guards every subscription against the ticket visibility rules.
 */
@Component
public class StompAuthInterceptor implements ChannelInterceptor {

    private static final Pattern TICKET_TOPIC = Pattern.compile("^/topic/tickets/(\\d+)(/internal)?$");

    private final JwtDecoder jwtDecoder;
    private final PrincipalConverter principalConverter;
    private final TicketAccess access;

    public StompAuthInterceptor(JwtDecoder jwtDecoder, PrincipalConverter principalConverter, TicketAccess access) {
        this.jwtDecoder = jwtDecoder;
        this.principalConverter = principalConverter;
        this.access = access;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }
        StompCommand command = accessor.getCommand();
        if (command == StompCommand.CONNECT) {
            accessor.setUser(authenticate(accessor.getFirstNativeHeader("Authorization")));
        } else if (command == StompCommand.SUBSCRIBE) {
            authorizeSubscription(principal(accessor), accessor.getDestination());
        } else if (command == StompCommand.SEND) {
            principal(accessor);
        }
        return message;
    }

    private Authentication authenticate(String header) {
        if (header == null || !header.startsWith("Bearer ")) {
            throw new MessageDeliveryException("Missing token");
        }
        try {
            return principalConverter.convert(jwtDecoder.decode(header.substring(7)));
        } catch (JwtException e) {
            throw new MessageDeliveryException("Invalid token");
        }
    }

    private UserPrincipal principal(StompHeaderAccessor accessor) {
        if (accessor.getUser() instanceof Authentication auth && auth.getPrincipal() instanceof UserPrincipal p) {
            return p;
        }
        throw new MessageDeliveryException("Not authenticated");
    }

    private void authorizeSubscription(UserPrincipal user, String destination) {
        if (destination == null) {
            throw new MessageDeliveryException("No destination");
        }
        if (destination.startsWith("/user/queue/")) {
            return;
        }
        if (destination.equals("/topic/queue") && user.isAgent()) {
            return;
        }
        Matcher m = TICKET_TOPIC.matcher(destination);
        if (m.matches()) {
            boolean internal = m.group(2) != null;
            if ((!internal || user.isAgent()) && access.canView(user, Long.valueOf(m.group(1)))) {
                return;
            }
        }
        throw new MessageDeliveryException("Subscription denied");
    }
}
