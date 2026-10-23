package dev.migol.helpdesk.chat;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import dev.migol.helpdesk.security.UserPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/tickets/{ticketId}/messages")
public class MessageController {

    public record SendMessageRequest(@Size(max = 8000) String body, @Size(max = 10) List<Long> attachmentIds, Boolean internal) {
    }

    private final ChatService chat;

    public MessageController(ChatService chat) {
        this.chat = chat;
    }

    @GetMapping
    public List<MessageDto> list(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long ticketId) {
        return chat.list(principal, ticketId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MessageDto send(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long ticketId,
            @Valid @RequestBody SendMessageRequest req) {
        return chat.send(principal, ticketId, req.body(), req.attachmentIds(), Boolean.TRUE.equals(req.internal()));
    }
}
