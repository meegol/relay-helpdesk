package dev.migol.helpdesk.realtime;

public record Notification(Long ticketId, String code, String title, String body) {
}
