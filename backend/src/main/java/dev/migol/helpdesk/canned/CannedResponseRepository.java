package dev.migol.helpdesk.canned;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CannedResponseRepository extends JpaRepository<CannedResponse, Long> {
    List<CannedResponse> findAllByOrderByTitleAsc();
}
