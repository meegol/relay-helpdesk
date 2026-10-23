package dev.migol.helpdesk.user;

import java.time.Instant;

public record UserDto(Long id, String email, String fullName, Role role, String title, boolean active, Instant createdAt) {

    public static UserDto of(User u) {
        return new UserDto(u.getId(), u.getEmail(), u.getFullName(), u.getRole(), u.getTitle(), u.isActive(), u.getCreatedAt());
    }
}
