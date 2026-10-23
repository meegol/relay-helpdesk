package dev.migol.helpdesk.user;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository users;

    public UserController(UserRepository users) {
        this.users = users;
    }

    /** Agents that tickets can be assigned to. */
    @GetMapping("/agents")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public List<UserSummary> agents() {
        return users.findByRoleInAndActiveTrueOrderByFullName(List.of(Role.STAFF, Role.ADMIN))
                .stream().map(UserSummary::of).toList();
    }
}
