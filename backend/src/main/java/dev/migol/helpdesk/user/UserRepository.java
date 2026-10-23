package dev.migol.helpdesk.user;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    List<User> findByRoleInAndActiveTrueOrderByFullName(List<Role> roles);

    List<User> findAllByOrderByCreatedAtDesc();
}
