package dev.migol.helpdesk.canned;

import java.time.Instant;

import dev.migol.helpdesk.user.UserSummary;

public record CannedResponseDto(
        Long id,
        String title,
        String shortcut,
        String content,
        UserSummary createdBy,
        Instant createdAt) {

    public static CannedResponseDto of(CannedResponse c) {
        return new CannedResponseDto(
                c.getId(),
                c.getTitle(),
                c.getShortcut(),
                c.getContent(),
                c.getCreatedBy() != null ? UserSummary.of(c.getCreatedBy()) : null,
                c.getCreatedAt());
    }
}
