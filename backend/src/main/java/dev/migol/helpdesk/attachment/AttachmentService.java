package dev.migol.helpdesk.attachment;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import dev.migol.helpdesk.chat.Message;
import dev.migol.helpdesk.chat.MessageType;
import dev.migol.helpdesk.common.ApiException;
import dev.migol.helpdesk.config.AppProperties;
import dev.migol.helpdesk.security.UserPrincipal;
import dev.migol.helpdesk.ticket.Ticket;
import dev.migol.helpdesk.ticket.TicketAccess;
import dev.migol.helpdesk.user.UserRepository;

@Service
public class AttachmentService {

    /** SVG is deliberately excluded: it can carry script. */
    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf", "text/plain");

    private final AttachmentRepository attachments;
    private final UserRepository users;
    private final TicketAccess access;
    private final Path root;

    public AttachmentService(AttachmentRepository attachments, UserRepository users, TicketAccess access, AppProperties props)
            throws IOException {
        this.attachments = attachments;
        this.users = users;
        this.access = access;
        this.root = Path.of(props.storage().dir()).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    @Transactional
    public AttachmentDto upload(UserPrincipal principal, MultipartFile file) {
        if (file.isEmpty()) {
            throw ApiException.badRequest("File is empty");
        }
        String type = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        if (!ALLOWED_TYPES.contains(type)) {
            throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Only images (PNG, JPEG, GIF, WebP), PDF and text files are allowed");
        }
        String storedName = UUID.randomUUID() + extensionFor(type);
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, root.resolve(storedName), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not store file");
        }
        var uploader = users.getReferenceById(principal.id());
        var attachment = new Attachment(uploader, cleanName(file.getOriginalFilename()), storedName, type, file.getSize());
        return AttachmentDto.of(attachments.save(attachment));
    }

    /** Binds pending uploads from the given user to a ticket and, optionally, a message. */
    @Transactional
    public List<Attachment> claim(UserPrincipal principal, Collection<Long> ids, Ticket ticket, Message message) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        List<Attachment> found = attachments.findByIdIn(ids);
        if (found.size() != Set.copyOf(ids).size()) {
            throw ApiException.badRequest("Unknown attachment");
        }
        for (Attachment a : found) {
            if (!a.getUploader().getId().equals(principal.id()) || a.getTicket() != null) {
                throw ApiException.badRequest("Attachment can't be used here");
            }
            a.setTicket(ticket);
            a.setMessage(message);
        }
        return found;
    }

    public record FileDownload(Resource resource, String contentType, String name) {
    }

    @Transactional(readOnly = true)
    public FileDownload load(UserPrincipal principal, Long id) {
        Attachment a = attachments.findById(id).orElseThrow(() -> ApiException.notFound("Attachment"));
        boolean allowed;
        if (a.getTicket() == null) {
            allowed = a.getUploader().getId().equals(principal.id());
        } else {
            allowed = access.canView(principal, a.getTicket());
            if (a.getMessage() != null && a.getMessage().getType() == MessageType.NOTE) {
                allowed = allowed && principal.isAgent();
            }
        }
        if (!allowed) {
            throw ApiException.notFound("Attachment");
        }
        Path path = root.resolve(a.getStoredName()).normalize();
        if (!path.startsWith(root) || !Files.exists(path)) {
            throw ApiException.notFound("File");
        }
        return new FileDownload(new FileSystemResource(path), a.getContentType(), a.getOriginalName());
    }

    private static String extensionFor(String type) {
        return switch (type) {
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "image/gif" -> ".gif";
            case "image/webp" -> ".webp";
            case "application/pdf" -> ".pdf";
            default -> ".txt";
        };
    }

    private static String cleanName(String name) {
        if (name == null || name.isBlank()) {
            return "screenshot";
        }
        String base = Path.of(name).getFileName().toString().replaceAll("[\\r\\n\"]", "");
        return base.length() > 120 ? base.substring(base.length() - 120) : base;
    }
}
