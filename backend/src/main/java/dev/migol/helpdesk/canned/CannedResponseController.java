package dev.migol.helpdesk.canned;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import dev.migol.helpdesk.security.UserPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/canned-responses")
public class CannedResponseController {

    public record CreateCannedResponseRequest(
            @NotBlank @Size(max = 100) String title,
            @Size(max = 50) String shortcut,
            @NotBlank @Size(max = 4000) String content) {
    }

    private final CannedResponseService service;

    public CannedResponseController(CannedResponseService service) {
        this.service = service;
    }

    @GetMapping
    public List<CannedResponseDto> list(@AuthenticationPrincipal UserPrincipal principal) {
        return service.list(principal);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CannedResponseDto create(@AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateCannedResponseRequest req) {
        return service.create(principal, req.title(), req.shortcut(), req.content());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        service.delete(principal, id);
    }
}
