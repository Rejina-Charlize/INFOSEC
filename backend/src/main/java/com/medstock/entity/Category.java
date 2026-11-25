package com.medstock.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;
import java.util.UUID;

@Document("categories")
public class Category {
    @Id
    private UUID id;

    private String name;

    private String description;

    private boolean active = true;

    private Instant createdAt;

    @Indexed(unique = true)
    private String normalizedName;

    protected Category() {}

    public Category(String name, String description) {
        this.id = UUID.randomUUID();
        this.name = name;
        this.normalizedName = normalize(name);
        this.description = description;
        this.active = true;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getNormalizedName() { return normalizedName; }
    public boolean isActive() { return active; }

    private static String normalize(String value) {
        return value.trim().toLowerCase(java.util.Locale.ROOT);
    }
}
