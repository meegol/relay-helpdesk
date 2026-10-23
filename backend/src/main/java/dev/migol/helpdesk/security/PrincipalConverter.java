package dev.migol.helpdesk.security;

import java.util.List;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import dev.migol.helpdesk.user.User;
import dev.migol.helpdesk.user.UserRepository;

/**
 * Turns a verified JWT into an authentication backed by the current database
 * state, so role changes and deactivations apply without waiting for expiry.
 */
@Component
public class PrincipalConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserRepository users;

    public PrincipalConverter(UserRepository users) {
        this.users = users;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        User user = users.findById(Long.valueOf(jwt.getSubject()))
                .filter(User::isActive)
                .orElseThrow(() -> new DisabledException("Account is disabled"));
        var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
        return new UsernamePasswordAuthenticationToken(UserPrincipal.of(user), jwt, authorities);
    }
}
