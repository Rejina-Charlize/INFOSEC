package com.medstock.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;
import java.util.UUID;

@Document("users")
public class Account {
    @Id
    private UUID id;

    @Indexed(unique = true)
    private String normalizedUsername;

    private String username;

    private String passwordHash;

    private Role role;

    private boolean enabled = true;

    private Instant createdAt;

    protected Account() {}

    public Account(String username, String passwordHash, Role role) {
        this.id = UUID.randomUUID();
        this.username = username;
        this.normalizedUsername = normalize(username);
        this.passwordHash = passwordHash;
        this.role = role;
        this.enabled = true;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getUsername() { return username; }
    public String getNormalizedUsername() { return normalizedUsername; }
    public String getPasswordHash() { return passwordHash; }
    public Role getRole() { return role; }
    public boolean isEnabled() { return enabled; }
    public void updateCredentials(String passwordHash, Role role) {
        this.passwordHash = passwordHash;
        this.role = role;
        this.enabled = true;
    }

    private static String normalize(String value) {
        return value.trim().toLowerCase(java.util.Locale.ROOT);
    }
}
