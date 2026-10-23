package dev.migol.helpdesk.ticket;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import dev.migol.helpdesk.security.UserPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    public record CreateTicketRequest(
            @NotBlank @Size(max = 160) String subject,
            @NotBlank @Size(max = 8000) String description,
            TicketPriority priority,
            TicketCategory category,
            @Size(max = 10) List<Long> attachmentIds) {
    }

    public record UpdateTicketRequest(TicketStatus status, TicketPriority priority, TicketCategory category) {
    }

    public record AssignRequest(Long assigneeId) {
    }

    private final TicketService service;

    public TicketController(TicketService service) {
        this.service = service;
    }

    @GetMapping
    public List<TicketDto> list(@AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String scope,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) TicketPriority priority,
            @RequestParam(required = false) String q) {
        return service.list(principal, new TicketService.ListQuery(scope, status, priority, q));
    }

    @GetMapping("/summary")
    public Map<String, Long> summary(@AuthenticationPrincipal UserPrincipal principal) {
        return service.summary(principal);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TicketDto create(@AuthenticationPrincipal UserPrincipal principal, @Valid @RequestBody CreateTicketRequest req) {
        return service.create(principal, req.subject(), req.description(), req.priority(), req.category(), req.attachmentIds());
    }

    @GetMapping("/{id}")
    public TicketDto get(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        return service.get(principal, id);
    }

    @PatchMapping("/{id}")
    public TicketDto update(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
            @RequestBody UpdateTicketRequest req) {
        return service.update(principal, id, req.status(), req.priority(), req.category());
    }

    @PostMapping("/{id}/assign")
    public TicketDto assign(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
            @RequestBody AssignRequest req) {
        return service.assign(principal, id, req.assigneeId());
    }
}
