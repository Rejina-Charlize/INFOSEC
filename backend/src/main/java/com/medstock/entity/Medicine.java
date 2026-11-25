package com.medstock.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Document("medicines")
public class Medicine {
    @Id
    private UUID id;

    private String name;

    private String genericName;

    private String brandName;

    @Indexed(unique = true)
    private String normalizedSku;

    private String sku;

    private String dosageStrength;

    private String description;

    private BigDecimal unitPrice;

    private BigDecimal costPrice;

    private boolean prescriptionRequired;

    private String storageRequirements;

    private int reorderThreshold;

    private boolean archived;

    private CategorySnapshot category;

    private Instant createdAt;

    private Instant updatedAt;

    @Version
    private Long version;

    protected Medicine() {}

    public Medicine(String name, String genericName, String brandName, String sku,
                    String dosageStrength, String description, BigDecimal unitPrice,
                    BigDecimal costPrice, boolean prescriptionRequired,
                    String storageRequirements, int reorderThreshold, Category category) {
        this.id = UUID.randomUUID();
        update(name, genericName, brandName, sku, dosageStrength, description, unitPrice,
                costPrice, prescriptionRequired, storageRequirements, reorderThreshold, category);
        this.archived = false;
        this.createdAt = Instant.now();
    }

    public void update(String name, String genericName, String brandName, String sku,
                       String dosageStrength, String description, BigDecimal unitPrice,
                       BigDecimal costPrice, boolean prescriptionRequired,
                       String storageRequirements, int reorderThreshold, Category category) {
        this.name = name;
        this.genericName = genericName;
        this.brandName = brandName;
        this.sku = sku;
        this.dosageStrength = dosageStrength;
        this.description = description;
        this.unitPrice = unitPrice;
        this.costPrice = costPrice;
        this.prescriptionRequired = prescriptionRequired;
        this.storageRequirements = storageRequirements;
        this.reorderThreshold = reorderThreshold;
        this.category = new CategorySnapshot(category.getId(), category.getName());
        this.normalizedSku = normalize(sku);
        this.updatedAt = Instant.now();
    }

    public void archive() { this.archived = true; this.updatedAt = Instant.now(); }
    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getGenericName() { return genericName; }
    public String getBrandName() { return brandName; }
    public String getSku() { return sku; }
    public String getNormalizedSku() { return normalizedSku; }
    public String getDosageStrength() { return dosageStrength; }
    public String getDescription() { return description; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public BigDecimal getCostPrice() { return costPrice; }
    public boolean isPrescriptionRequired() { return prescriptionRequired; }
    public String getStorageRequirements() { return storageRequirements; }
    public int getReorderThreshold() { return reorderThreshold; }
    public boolean isArchived() { return archived; }
    public CategorySnapshot getCategory() { return category; }

    private static String normalize(String value) {
        return value.trim().toLowerCase(java.util.Locale.ROOT);
    }
}
