package com.medstock.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Document("medicine_batches")
@CompoundIndex(name = "medicine_batch_unique", def = "{'medicineId': 1, 'batchNumber': 1}", unique = true)
public class MedicineBatch {
    public enum Status { AVAILABLE, QUARANTINED, UNAVAILABLE }

    @Id
    private UUID id;

    private UUID medicineId;

    private String batchNumber;

    private LocalDate expirationDate;

    private int currentQuantity;

    private Status status;

    private Instant createdAt;

    @Version
    private Long version;

    protected MedicineBatch() {}

    public MedicineBatch(Medicine medicine, String batchNumber, LocalDate expirationDate, int quantity) {
        this.id = UUID.randomUUID();
        this.medicineId = medicine.getId();
        this.batchNumber = batchNumber;
        this.expirationDate = expirationDate;
        this.currentQuantity = quantity;
        this.status = Status.AVAILABLE;
        this.createdAt = Instant.now();
    }

    public void removeQuantity(int quantity) {
        if (quantity < 1 || quantity > currentQuantity) throw new IllegalArgumentException("Invalid batch quantity.");
        currentQuantity -= quantity;
        if (currentQuantity == 0) status = Status.UNAVAILABLE;
    }

    public UUID getId() { return id; }
    public UUID getMedicineId() { return medicineId; }
    public String getBatchNumber() { return batchNumber; }
    public LocalDate getExpirationDate() { return expirationDate; }
    public int getCurrentQuantity() { return currentQuantity; }
    public Status getStatus() { return status; }
}
