package dev.migol.helpdesk.security;

import java.security.Principal;

import org.springframework.security.core.Authentication;

import dev.migol.helpdesk.common.ApiException;
import dev.migol.helpdesk.user.Role;
import dev.migol.helpdesk.user.User;

/**
 * Authenticated user attached to HTTP requests and STOMP sessions. The name is
 * the user id so Spring's user destinations ({@code /user/queue/..}) resolve by id.
 */
public record UserPrincipal(Long id, String email, String fullName, Role role) implements Principal {

    public static UserPrincipal of(User u) {
        return new UserPrincipal(u.getId(), u.getEmail(), u.getFullName(), u.getRole());
    }

    public static UserPrincipal from(Principal principal) {
        if (principal instanceof Authentication auth && auth.getPrincipal() instanceof UserPrincipal p) {
            return p;
        }
        throw ApiException.forbidden("Not authenticated");
    }

    @Override
    public String getName() {
        return String.valueOf(id);
    }

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }

    public boolean isAgent() {
        return role.isAgent();
    }

    public boolean isClient() {
        return role == Role.CLIENT;
    }
}
