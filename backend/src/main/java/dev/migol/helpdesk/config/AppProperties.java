package dev.migol.helpdesk.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(Jwt jwt, Storage storage, Cors cors, boolean seed) {

    public record Jwt(String secret, long ttlHours) {
    }

    public record Storage(String dir) {
    }

    public record Cors(List<String> origins) {
    }
}
