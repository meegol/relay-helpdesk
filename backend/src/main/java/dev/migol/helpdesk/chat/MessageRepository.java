package dev.migol.helpdesk.chat;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageRepository extends JpaRepository<Message, Long> {

    @EntityGraph(attributePaths = "author")
    List<Message> findByTicketIdAndTypeInOrderByCreatedAtAscIdAsc(Long ticketId, Collection<MessageType> types);
}
