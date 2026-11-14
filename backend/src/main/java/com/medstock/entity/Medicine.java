package com.medstock.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "medicines")
public class Medicine {
    @Id
    private UUID id;

    @Column(nullable = false, length = 180)
    private String name;

    @Column(name = "generic_name", length = 180)
    private String genericName;

    @Column(name = "brand_name", length = 180)
    private String brandName;

    @Column(nullable = false, unique = true, length = 80)
    private String sku;

    @Column(name = "dosage_strength", length = 100)
    private String dosageStrength;

    @Column(length = 2000)
    private String description;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "cost_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal costPrice;

    @Column(name = "prescription_required", nullable = false)
    private boolean prescriptionRequired;

    @Column(name = "storage_requirements", length = 250)
    private String storageRequirements;

    @Column(name = "reorder_threshold", nullable = false)
    private int reorderThreshold;

    @Column(nullable = false)
    private boolean archived;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

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
        this.category = category;
        this.updatedAt = Instant.now();
    }

    public void archive() { this.archived = true; this.updatedAt = Instant.now(); }
    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getGenericName() { return genericName; }
    public String getBrandName() { return brandName; }
    public String getSku() { return sku; }
    public String getDosageStrength() { return dosageStrength; }
    public String getDescription() { return description; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public BigDecimal getCostPrice() { return costPrice; }
    public boolean isPrescriptionRequired() { return prescriptionRequired; }
    public String getStorageRequirements() { return storageRequirements; }
    public int getReorderThreshold() { return reorderThreshold; }
    public boolean isArchived() { return archived; }
    public Category getCategory() { return category; }
}
