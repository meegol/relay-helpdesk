package dev.migol.helpdesk.ticket;

public enum TicketStatus {
    OPEN, IN_PROGRESS, WAITING_ON_CLIENT, RESOLVED, CLOSED;

    public boolean isActive() {
        return this != RESOLVED && this != CLOSED;
    }

    public String label() {
        return switch (this) {
            case OPEN -> "Open";
            case IN_PROGRESS -> "In progress";
            case WAITING_ON_CLIENT -> "Waiting on client";
            case RESOLVED -> "Resolved";
            case CLOSED -> "Closed";
        };
    }
}
