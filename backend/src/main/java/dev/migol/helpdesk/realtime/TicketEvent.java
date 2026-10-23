package dev.migol.helpdesk.realtime;

/**
 * Envelope pushed over STOMP. {@code kind} tells the client how to read the payload:
 * {@code message}, {@code ticket}, {@code typing} or {@code notification}.
 */
public record TicketEvent(String kind, Long ticketId, Object payload) {
}
