package dev.migol.helpdesk.user;

public enum Role {
    ADMIN, STAFF, CLIENT;

    public boolean isAgent() {
        return this == ADMIN || this == STAFF;
    }
}
