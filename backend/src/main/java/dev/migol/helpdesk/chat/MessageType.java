package dev.migol.helpdesk.chat;

public enum MessageType {
    /** Visible to the client and agents. */
    CHAT,
    /** Internal note, agents only. */
    NOTE,
    /** Activity line such as a status change. */
    SYSTEM
}
