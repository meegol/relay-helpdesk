package dev.migol.helpdesk.config;

import java.time.Duration;
import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import dev.migol.helpdesk.chat.Message;
import dev.migol.helpdesk.chat.MessageRepository;
import dev.migol.helpdesk.chat.MessageType;
import dev.migol.helpdesk.ticket.Ticket;
import dev.migol.helpdesk.ticket.TicketCategory;
import dev.migol.helpdesk.ticket.TicketPriority;
import dev.migol.helpdesk.ticket.TicketRepository;
import dev.migol.helpdesk.ticket.TicketStatus;
import dev.migol.helpdesk.user.Role;
import dev.migol.helpdesk.user.User;
import dev.migol.helpdesk.user.UserRepository;

/** Fills an empty database with a small, believable workspace so every panel has something to show. */
@Component
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final AppProperties props;
    private final UserRepository users;
    private final TicketRepository tickets;
    private final MessageRepository messages;
    private final PasswordEncoder passwordEncoder;
    private final Instant now = Instant.now();

    public DemoDataSeeder(AppProperties props, UserRepository users, TicketRepository tickets, MessageRepository messages,
            PasswordEncoder passwordEncoder) {
        this.props = props;
        this.users = users;
        this.tickets = tickets;
        this.messages = messages;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.count() > 0) {
            return;
        }
        user("admin@relay.dev", "Avery Quinn", Role.ADMIN, "Support Lead", "admin1234");
        if (!props.seed()) {
            log.info("Created admin account admin@relay.dev");
            return;
        }
        User jordan = user("jordan@relay.dev", "Jordan Reyes", Role.STAFF, "Support Engineer", "staff1234");
        User sam = user("sam@relay.dev", "Sam Okafor", Role.STAFF, "Billing Specialist", "staff1234");
        user("priya@relay.dev", "Priya Nair", Role.STAFF, "Support Engineer", "staff1234");
        User lena = user("lena@northwind.io", "Lena Fischer", Role.CLIENT, "Northwind", "client1234");
        User marco = user("marco@acme.co", "Marco Bianchi", Role.CLIENT, "Acme Co", "client1234");
        User hana = user("hana@kitelabs.com", "Hana Sato", Role.CLIENT, "Kite Labs", "client1234");

        Ticket sso = ticket(lena, "SSO login sends us back to the sign-in page",
                "Since this morning, anyone on our team who signs in through Okta lands back on the sign-in page "
                        + "after approving the push. Password login still works. Nothing changed on our side as far as I know.",
                TicketPriority.HIGH, TicketCategory.TECHNICAL, TicketStatus.IN_PROGRESS, jordan, hoursAgo(5));
        chat(sso, jordan, "Thanks Lena. Can you tell me roughly what time it started, and whether it affects every user or only some?", hoursAgo(4.6));
        chat(sso, lena, "Every user we've tried, around 8:40 our time. I can grab a HAR file if that helps.", hoursAgo(4.4));
        note(sso, jordan, "Matches the IdP cert rotation on their tenant. Checking if the new signing cert was picked up.", hoursAgo(4.2));
        chat(sso, jordan, "A HAR would be great. In the meantime, it looks like your identity provider rotated its signing certificate. I'm confirming on our side.", hoursAgo(4.1));
        sso.setFirstResponseAt(hoursAgo(4.6));
        sso.setLastActivityAt(hoursAgo(4.1));

        Ticket invoice = ticket(marco, "Invoice #4471 was charged twice",
                "Our card was charged twice for the October invoice (#4471), both on the 3rd. Could you refund the duplicate?",
                TicketPriority.NORMAL, TicketCategory.BILLING, TicketStatus.WAITING_ON_CLIENT, sam, hoursAgo(30));
        chat(invoice, sam, "Sorry about that, Marco. I can see two captures of $480.00. I've started a refund for the second one.", hoursAgo(28));
        chat(invoice, sam, "Could you confirm the last four digits of the card so I can match it with the processor?", hoursAgo(27.9));
        invoice.setFirstResponseAt(hoursAgo(28));
        invoice.setLastActivityAt(hoursAgo(27.9));

        Ticket csv = ticket(hana, "CSV export drops accented characters",
                "When we export the contacts list to CSV, names like \"José\" or \"Zoë\" come out as question marks in Excel.",
                TicketPriority.NORMAL, TicketCategory.BUG, TicketStatus.OPEN, null, hoursAgo(2));
        csv.setLastActivityAt(hoursAgo(2));

        Ticket seats = ticket(lena, "Can't add a second admin to our workspace",
                "The \"Make admin\" option is greyed out for everyone except me. We're on the Team plan.",
                TicketPriority.LOW, TicketCategory.ACCOUNT, TicketStatus.OPEN, null, hoursAgo(0.5));
        seats.setLastActivityAt(hoursAgo(0.5));

        Ticket webhook = ticket(marco, "Webhooks stopped firing for order.updated",
                "We haven't received a single order.updated webhook since yesterday afternoon. order.created still arrives.",
                TicketPriority.URGENT, TicketCategory.TECHNICAL, TicketStatus.OPEN, jordan, hoursAgo(1.2));
        webhook.setLastActivityAt(hoursAgo(1.2));

        Ticket darkMode = ticket(hana, "Dark mode for the dashboard",
                "Half of our team works late shifts. A dark theme for the dashboard would really help.",
                TicketPriority.LOW, TicketCategory.FEATURE_REQUEST, TicketStatus.RESOLVED, jordan, hoursAgo(96));
        chat(darkMode, jordan, "Good news, Hana: dark mode shipped this week. It follows your system setting, or you can pick it under Account.", hoursAgo(20));
        chat(darkMode, hana, "Just tried it, looks great. Thank you!", hoursAgo(19));
        darkMode.setFirstResponseAt(hoursAgo(20));
        darkMode.setResolvedAt(hoursAgo(18.5));
        darkMode.setLastActivityAt(hoursAgo(18.5));
        system(darkMode, jordan, "changed the status to Resolved", hoursAgo(18.5));

        Ticket password = ticket(marco, "Password reset email never arrives",
                "Tried three times to reset the password for marco.b@acme.co. Nothing in spam either.",
                TicketPriority.NORMAL, TicketCategory.ACCOUNT, TicketStatus.CLOSED, sam, hoursAgo(150));
        chat(password, sam, "Your mail server was rejecting our sender. I've whitelisted the address on our end; please try once more.", hoursAgo(146));
        chat(password, marco, "Got it this time, thanks.", hoursAgo(140));
        password.setFirstResponseAt(hoursAgo(146));
        password.setResolvedAt(hoursAgo(139));
        password.setLastActivityAt(hoursAgo(139));
        system(password, sam, "changed the status to Closed", hoursAgo(139));

        for (int i = 0; i < 9; i++) {
            Ticket old = ticket(i % 2 == 0 ? lena : hana, OLD_SUBJECTS[i], "Resolved earlier this month.",
                    TicketPriority.NORMAL, TicketCategory.GENERAL, TicketStatus.CLOSED, i % 3 == 0 ? sam : jordan,
                    hoursAgo(24 * (i + 2) + 3));
            old.setFirstResponseAt(old.getCreatedAt().plus(Duration.ofMinutes(25 + i * 11)));
            old.setResolvedAt(old.getCreatedAt().plus(Duration.ofHours(3 + i * 2)));
            old.setLastActivityAt(old.getResolvedAt());
        }

        log.info("Seeded demo data. Sign in as admin@relay.dev / admin1234, jordan@relay.dev / staff1234 or lena@northwind.io / client1234");
    }

    private static final String[] OLD_SUBJECTS = {
            "Update billing address on invoices", "API rate limit questions", "Remove former employee's access",
            "Calendar sync shows events twice", "Change workspace URL", "Bulk import failing on row 214",
            "Two-factor codes rejected", "Request for a DPA", "Slow search on large projects"
    };

    private Instant hoursAgo(double hours) {
        return now.minus(Duration.ofMinutes((long) (hours * 60)));
    }

    private User user(String email, String name, Role role, String title, String password) {
        User u = new User(email, passwordEncoder.encode(password), name, role);
        u.setTitle(title);
        u.setCreatedAt(now.minus(Duration.ofDays(30)));
        return users.save(u);
    }

    private Ticket ticket(User client, String subject, String description, TicketPriority priority, TicketCategory category,
            TicketStatus status, User assignee, Instant createdAt) {
        Ticket t = new Ticket(client, subject, description, priority, category);
        t.setCreatedAt(createdAt);
        t.setLastActivityAt(createdAt);
        t.setAssignee(assignee);
        t.changeStatus(status);
        t.setLastActivityAt(createdAt);
        return tickets.save(t);
    }

    private void chat(Ticket t, User author, String body, Instant at) {
        save(t, author, MessageType.CHAT, body, at);
    }

    private void note(Ticket t, User author, String body, Instant at) {
        save(t, author, MessageType.NOTE, body, at);
    }

    private void system(Ticket t, User author, String body, Instant at) {
        save(t, author, MessageType.SYSTEM, body, at);
    }

    private void save(Ticket t, User author, MessageType type, String body, Instant at) {
        Message m = new Message(t, author, type, body);
        m.setCreatedAt(at);
        messages.save(m);
    }
}
