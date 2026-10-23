package dev.migol.helpdesk.attachment;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {

    List<Attachment> findByTicketIdAndMessageIsNullOrderById(Long ticketId);

    List<Attachment> findByMessageIdInOrderById(Collection<Long> messageIds);

    List<Attachment> findByIdIn(Collection<Long> ids);
}
