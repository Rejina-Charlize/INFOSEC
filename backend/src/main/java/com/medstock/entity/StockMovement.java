package com.medstock.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "stock_movements")
public class StockMovement {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "medicine_id", nullable = false)
    private Medicine medicine;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id")
    private MedicineBatch batch;

    @Column(name = "movement_type", nullable = false, length = 40)
    private String movementType;

    @Column(name = "quantity_delta", nullable = false)
    private int quantityDelta;

    @Column(length = 500)
    private String note;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected StockMovement() {}

    public StockMovement(Medicine medicine, MedicineBatch batch, String movementType, int quantityDelta, String note) {
        this.id = UUID.randomUUID();
        this.medicine = medicine;
        this.batch = batch;
        this.movementType = movementType;
        this.quantityDelta = quantityDelta;
        this.note = note;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public MedicineBatch getBatch() { return batch; }
    public String getMovementType() { return movementType; }
    public int getQuantityDelta() { return quantityDelta; }
    public String getNote() { return note; }
    public Instant getCreatedAt() { return createdAt; }
}
