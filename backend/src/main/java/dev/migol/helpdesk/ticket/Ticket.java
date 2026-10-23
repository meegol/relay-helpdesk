package dev.migol.helpdesk.ticket;

import java.time.Instant;

import dev.migol.helpdesk.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "tickets", indexes = {
        @Index(columnList = "status"),
        @Index(columnList = "client_id"),
        @Index(columnList = "assignee_id")
})
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 160)
    private String subject;

    @Column(nullable = false, length = 8000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private TicketStatus status = TicketStatus.OPEN;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private TicketPriority priority = TicketPriority.NORMAL;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private TicketCategory category = TicketCategory.GENERAL;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "client_id")
    private User client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant lastActivityAt;

    private Instant firstResponseAt;

    private Instant resolvedAt;

    protected Ticket() {
    }

    public Ticket(User client, String subject, String description, TicketPriority priority, TicketCategory category) {
        this.client = client;
        this.subject = subject;
        this.description = description;
        this.priority = priority;
        this.category = category;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (lastActivityAt == null) {
            lastActivityAt = createdAt;
        }
    }

    public void touch() {
        lastActivityAt = Instant.now();
    }

    public void changeStatus(TicketStatus next) {
        status = next;
        if (next == TicketStatus.RESOLVED || next == TicketStatus.CLOSED) {
            if (resolvedAt == null) {
                resolvedAt = Instant.now();
            }
        } else {
            resolvedAt = null;
        }
        touch();
    }

    public boolean isAssignedTo(Long userId) {
        return assignee != null && assignee.getId().equals(userId);
    }

    public String code() {
        return "HD-" + id;
    }

    public Long getId() { return id; }
    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public TicketStatus getStatus() { return status; }
    public TicketPriority getPriority() { return priority; }
    public void setPriority(TicketPriority priority) { this.priority = priority; }
    public TicketCategory getCategory() { return category; }
    public void setCategory(TicketCategory category) { this.category = category; }
    public User getClient() { return client; }
    public User getAssignee() { return assignee; }
    public void setAssignee(User assignee) { this.assignee = assignee; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getLastActivityAt() { return lastActivityAt; }
    public void setLastActivityAt(Instant lastActivityAt) { this.lastActivityAt = lastActivityAt; }
    public Instant getFirstResponseAt() { return firstResponseAt; }
    public void setFirstResponseAt(Instant firstResponseAt) { this.firstResponseAt = firstResponseAt; }
    public Instant getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(Instant resolvedAt) { this.resolvedAt = resolvedAt; }
}
