package dev.migol.helpdesk.ticket;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface TicketRepository extends JpaRepository<Ticket, Long>, JpaSpecificationExecutor<Ticket> {

    @Override
    @EntityGraph(attributePaths = {"client", "assignee"})
    List<Ticket> findAll(org.springframework.data.jpa.domain.Specification<Ticket> spec, org.springframework.data.domain.Sort sort);

    @Query("select t.status, count(t) from Ticket t group by t.status")
    List<Object[]> countByStatus();

    @Query("select t.priority, count(t) from Ticket t where t.status not in ('RESOLVED','CLOSED') group by t.priority")
    List<Object[]> countActiveByPriority();

    @Query("select t.assignee.id, t.status, count(t) from Ticket t where t.assignee is not null group by t.assignee.id, t.status")
    List<Object[]> countByAssigneeAndStatus();

    @Query("select count(t) from Ticket t where t.assignee is null and t.status not in ('RESOLVED','CLOSED')")
    long countUnassignedActive();

    List<Ticket> findByCreatedAtAfter(Instant since);

    List<Ticket> findByResolvedAtIsNotNull();

    List<Ticket> findByFirstResponseAtIsNotNull();

    long countByClientIdAndStatusIn(Long clientId, List<TicketStatus> statuses);

    long countByAssigneeIdAndStatusIn(Long assigneeId, List<TicketStatus> statuses);

    long countByAssigneeIdAndResolvedAtAfter(Long assigneeId, Instant since);
}
