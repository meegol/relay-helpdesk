package dev.migol.helpdesk;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.jayway.jsonpath.JsonPath;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class HelpdeskApplicationTests {

    @Autowired
    MockMvc mvc;

    String login(String email, String password) throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, password)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + JsonPath.read(body, "$.token");
    }

    @Test
    void rejectsBadCredentialsAndAnonymousRequests() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@relay.dev\",\"password\":\"nope\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/tickets")).andExpect(status().isUnauthorized());
    }

    @Test
    void enforcesRoleBoundaries() throws Exception {
        String client = login("lena@northwind.io", "client1234");
        String staff = login("jordan@relay.dev", "staff1234");

        mvc.perform(get("/api/admin/users").header("Authorization", client)).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/stats").header("Authorization", staff)).andExpect(status().isForbidden());
        // Ticket 2 belongs to another client.
        mvc.perform(get("/api/tickets/2").header("Authorization", client)).andExpect(status().isNotFound());
        // Clients can't change priority.
        mvc.perform(patch("/api/tickets/1").header("Authorization", client).contentType(MediaType.APPLICATION_JSON)
                .content("{\"priority\":\"URGENT\"}")).andExpect(status().isForbidden());
    }

    @Test
    void fullTicketLifecycleWithScreenshotAndInternalNote() throws Exception {
        String client = login("hana@kitelabs.com", "client1234");
        String staff = login("priya@relay.dev", "staff1234");

        var png = new MockMultipartFile("file", "error.png", "image/png", new byte[] {(byte) 0x89, 'P', 'N', 'G'});
        String upload = mvc.perform(multipart("/api/attachments").file(png).header("Authorization", client))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        int attachmentId = JsonPath.read(upload, "$.id");

        String created = mvc.perform(post("/api/tickets").header("Authorization", client).contentType(MediaType.APPLICATION_JSON)
                .content("{\"subject\":\"Charts are blank\",\"description\":\"Since the update.\",\"priority\":\"HIGH\",\"category\":\"BUG\",\"attachmentIds\":[%d]}"
                        .formatted(attachmentId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.attachments[0].id").value(attachmentId))
                .andReturn().getResponse().getContentAsString();
        int ticketId = JsonPath.read(created, "$.id");

        // Staff must claim before replying.
        mvc.perform(post("/api/tickets/%d/messages".formatted(ticketId)).header("Authorization", staff)
                .contentType(MediaType.APPLICATION_JSON).content("{\"body\":\"hi\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/tickets/%d/assign".formatted(ticketId)).header("Authorization", staff)
                .contentType(MediaType.APPLICATION_JSON).content("{\"assigneeId\":4}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignee.fullName").value("Priya Nair"));

        mvc.perform(post("/api/tickets/%d/messages".formatted(ticketId)).header("Authorization", staff)
                .contentType(MediaType.APPLICATION_JSON).content("{\"body\":\"Looking into it\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/tickets/%d/messages".formatted(ticketId)).header("Authorization", staff)
                .contentType(MediaType.APPLICATION_JSON).content("{\"body\":\"Probably the CDN\",\"internal\":true}"))
                .andExpect(status().isCreated());

        // First agent reply moves the ticket along and records the response time.
        mvc.perform(get("/api/tickets/%d".formatted(ticketId)).header("Authorization", client))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.firstResponseAt").isNotEmpty());

        // Internal notes are hidden from the client.
        mvc.perform(get("/api/tickets/%d/messages".formatted(ticketId)).header("Authorization", client))
                .andExpect(jsonPath("$[*].body", hasItem("Looking into it")))
                .andExpect(jsonPath("$[*].body", not(hasItem("Probably the CDN"))));
        mvc.perform(get("/api/tickets/%d/messages".formatted(ticketId)).header("Authorization", staff))
                .andExpect(jsonPath("$[*].body", hasItem("Probably the CDN")));

        // The screenshot is visible to the assignee but not to other clients.
        mvc.perform(get("/api/attachments/%d".formatted(attachmentId)).header("Authorization", staff))
                .andExpect(status().isOk());
        mvc.perform(get("/api/attachments/%d".formatted(attachmentId)).header("Authorization", login("marco@acme.co", "client1234")))
                .andExpect(status().isNotFound());

        mvc.perform(patch("/api/tickets/%d".formatted(ticketId)).header("Authorization", client)
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"RESOLVED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resolvedAt").isNotEmpty());
    }

    @Test
    void rejectsUnsafeUploads() throws Exception {
        String client = login("lena@northwind.io", "client1234");
        var svg = new MockMultipartFile("file", "x.svg", "image/svg+xml", "<svg onload=alert(1)>".getBytes());
        mvc.perform(multipart("/api/attachments").file(svg).header("Authorization", client))
                .andExpect(status().isUnsupportedMediaType());
    }
}
