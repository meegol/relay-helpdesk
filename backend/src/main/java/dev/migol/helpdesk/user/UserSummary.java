package dev.migol.helpdesk.user;

public record UserSummary(Long id, String fullName, Role role, String title) {

    public static UserSummary of(User u) {
        return u == null ? null : new UserSummary(u.getId(), u.getFullName(), u.getRole(), u.getTitle());
    }
}
