package dev.migol.helpdesk.admin;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import dev.migol.helpdesk.common.ApiException;
import dev.migol.helpdesk.security.UserPrincipal;
import dev.migol.helpdesk.ticket.Ticket;
import dev.migol.helpdesk.ticket.TicketPriority;
import dev.migol.helpdesk.ticket.TicketRepository;
import dev.migol.helpdesk.ticket.TicketStatus;
import dev.migol.helpdesk.user.Role;
import dev.migol.helpdesk.user.User;
import dev.migol.helpdesk.user.UserDto;
import dev.migol.helpdesk.user.UserRepository;
import dev.migol.helpdesk.user.UserSummary;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    public record CreateUserRequest(
            @NotBlank @Email String email,
            @NotBlank @Size(max = 80) String fullName,
            @NotNull Role role,
            @Size(max = 80) String title,
            @NotBlank @Size(min = 8, max = 100) String password) {
    }

    public record UpdateUserRequest(@Size(max = 80) String fullName, Role role, @Size(max = 80) String title, Boolean active,
            @Size(min = 8, max = 100) String password) {
    }

    public record DayCount(LocalDate date, long created, long resolved) {
    }

    public record AgentLoad(UserSummary agent, long active, long resolved) {
    }

    public record Stats(
            Map<TicketStatus, Long> byStatus,
            Map<TicketPriority, Long> activeByPriority,
            long total,
            long unassigned,
            Double avgFirstResponseHours,
            Double avgResolutionHours,
            List<DayCount> last14Days,
            List<AgentLoad> agents,
            Map<Role, Long> users) {
    }

    private final UserRepository users;
    private final TicketRepository tickets;
    private final PasswordEncoder passwordEncoder;

    public AdminController(UserRepository users, TicketRepository tickets, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.tickets = tickets;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/users")
    public List<UserDto> users() {
        return users.findAllByOrderByCreatedAtDesc().stream().map(UserDto::of).toList();
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto createUser(@Valid @RequestBody CreateUserRequest req) {
        String email = req.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
        User user = new User(email, passwordEncoder.encode(req.password()), req.fullName().trim(), req.role());
        user.setTitle(req.title() == null || req.title().isBlank() ? null : req.title().trim());
        return UserDto.of(users.save(user));
    }

    @PatchMapping("/users/{id}")
    @Transactional
    public UserDto updateUser(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest req) {
        User user = users.findById(id).orElseThrow(() -> ApiException.notFound("User"));
        boolean self = user.getId().equals(principal.id());
        if (self && (Boolean.FALSE.equals(req.active()) || (req.role() != null && req.role() != Role.ADMIN))) {
            throw ApiException.badRequest("You can't demote or deactivate your own account");
        }
        if (req.fullName() != null && !req.fullName().isBlank()) {
            user.setFullName(req.fullName().trim());
        }
        if (req.role() != null) {
            user.setRole(req.role());
        }
        if (req.title() != null) {
            user.setTitle(req.title().isBlank() ? null : req.title().trim());
        }
        if (req.active() != null) {
            user.setActive(req.active());
        }
        if (req.password() != null && !req.password().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(req.password()));
        }
        return UserDto.of(user);
    }

    @GetMapping("/stats")
    @Transactional(readOnly = true)
    public Stats stats() {
        Map<TicketStatus, Long> byStatus = new EnumMap<>(TicketStatus.class);
        for (TicketStatus s : TicketStatus.values()) {
            byStatus.put(s, 0L);
        }
        long total = 0;
        for (Object[] row : tickets.countByStatus()) {
            byStatus.put((TicketStatus) row[0], (Long) row[1]);
            total += (Long) row[1];
        }

        Map<TicketPriority, Long> byPriority = new EnumMap<>(TicketPriority.class);
        for (TicketPriority p : TicketPriority.values()) {
            byPriority.put(p, 0L);
        }
        for (Object[] row : tickets.countActiveByPriority()) {
            byPriority.put((TicketPriority) row[0], (Long) row[1]);
        }

        Double avgFirstResponse = tickets.findByFirstResponseAtIsNotNull().stream()
                .mapToLong(t -> Duration.between(t.getCreatedAt(), t.getFirstResponseAt()).toMinutes())
                .average().stream().map(m -> round(m / 60.0)).boxed().findFirst().orElse(null);
        Double avgResolution = tickets.findByResolvedAtIsNotNull().stream()
                .mapToLong(t -> Duration.between(t.getCreatedAt(), t.getResolvedAt()).toMinutes())
                .average().stream().map(m -> round(m / 60.0)).boxed().findFirst().orElse(null);

        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        Instant since = today.minusDays(13).atStartOfDay().toInstant(ZoneOffset.UTC);
        Map<LocalDate, long[]> days = new LinkedHashMap<>();
        for (int i = 13; i >= 0; i--) {
            days.put(today.minusDays(i), new long[2]);
        }
        for (Ticket t : tickets.findByCreatedAtAfter(since)) {
            long[] c = days.get(LocalDate.ofInstant(t.getCreatedAt(), ZoneOffset.UTC));
            if (c != null) {
                c[0]++;
            }
        }
        for (Ticket t : tickets.findByResolvedAtIsNotNull()) {
            long[] c = days.get(LocalDate.ofInstant(t.getResolvedAt(), ZoneOffset.UTC));
            if (c != null) {
                c[1]++;
            }
        }
        List<DayCount> series = days.entrySet().stream()
                .map(e -> new DayCount(e.getKey(), e.getValue()[0], e.getValue()[1])).toList();

        Map<Long, long[]> load = new HashMap<>();
        for (Object[] row : tickets.countByAssigneeAndStatus()) {
            long[] c = load.computeIfAbsent((Long) row[0], k -> new long[2]);
            c[((TicketStatus) row[1]).isActive() ? 0 : 1] += (Long) row[2];
        }
        List<AgentLoad> agents = new ArrayList<>();
        for (User agent : users.findByRoleInAndActiveTrueOrderByFullName(List.of(Role.STAFF, Role.ADMIN))) {
            long[] c = load.getOrDefault(agent.getId(), new long[2]);
            agents.add(new AgentLoad(UserSummary.of(agent), c[0], c[1]));
        }

        Map<Role, Long> userCounts = new EnumMap<>(Role.class);
        for (Role r : Role.values()) {
            userCounts.put(r, 0L);
        }
        users.findAll().forEach(u -> userCounts.merge(u.getRole(), 1L, Long::sum));

        return new Stats(byStatus, byPriority, total, tickets.countUnassignedActive(), avgFirstResponse, avgResolution,
                series, agents, userCounts);
    }

    private static double round(double v) {
        return Math.round(v * 10) / 10.0;
    }
}
