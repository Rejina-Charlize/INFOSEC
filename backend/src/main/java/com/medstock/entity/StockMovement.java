package com.medstock.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;
import java.util.UUID;

@Document("stock_movements")
public class StockMovement {
    @Id
    private UUID id;

    private UUID medicineId;

    private UUID batchId;
    private String batchNumber;

    private String movementType;

    private int quantityDelta;

    private String note;

    private Instant createdAt;

    protected StockMovement() {}

    public StockMovement(Medicine medicine, MedicineBatch batch, String movementType, int quantityDelta, String note) {
        this.id = UUID.randomUUID();
        this.medicineId = medicine.getId();
        this.batchId = batch == null ? null : batch.getId();
        this.batchNumber = batch == null ? null : batch.getBatchNumber();
        this.movementType = movementType;
        this.quantityDelta = quantityDelta;
        this.note = note;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getMedicineId() { return medicineId; }
    public UUID getBatchId() { return batchId; }
    public String getBatchNumber() { return batchNumber; }
    public String getMovementType() { return movementType; }
    public int getQuantityDelta() { return quantityDelta; }
    public String getNote() { return note; }
    public Instant getCreatedAt() { return createdAt; }
}
