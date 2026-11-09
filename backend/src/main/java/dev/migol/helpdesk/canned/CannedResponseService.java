package dev.migol.helpdesk.canned;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.migol.helpdesk.common.ApiException;
import dev.migol.helpdesk.security.UserPrincipal;
import dev.migol.helpdesk.user.User;
import dev.migol.helpdesk.user.UserRepository;

@Service
public class CannedResponseService {

    private final CannedResponseRepository cannedRepository;
    private final UserRepository userRepository;

    public CannedResponseService(CannedResponseRepository cannedRepository, UserRepository userRepository) {
        this.cannedRepository = cannedRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<CannedResponseDto> list(UserPrincipal principal) {
        requireAgent(principal);
        return cannedRepository.findAllByOrderByTitleAsc().stream()
                .map(CannedResponseDto::of)
                .toList();
    }

    @Transactional
    public CannedResponseDto create(UserPrincipal principal, String title, String shortcut, String content) {
        requireAgent(principal);
        User author = userRepository.findById(principal.id()).orElseThrow();
        String cleanShortcut = shortcut != null && !shortcut.isBlank() ? shortcut.trim().replaceFirst("^/", "") : null;
        CannedResponse canned = new CannedResponse(title.trim(), cleanShortcut, content.trim(), author);
        return CannedResponseDto.of(cannedRepository.save(canned));
    }

    @Transactional
    public void delete(UserPrincipal principal, Long id) {
        requireAgent(principal);
        CannedResponse canned = cannedRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Canned response not found"));
        cannedRepository.delete(canned);
    }

    private void requireAgent(UserPrincipal principal) {
        if (principal == null || !principal.isAgent()) {
            throw ApiException.forbidden("Only support agents can access canned responses");
        }
    }
}
