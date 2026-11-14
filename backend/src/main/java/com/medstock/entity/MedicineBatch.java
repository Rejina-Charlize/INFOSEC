package com.medstock.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "medicine_batches", uniqueConstraints = @UniqueConstraint(columnNames = {"medicine_id", "batch_number"}))
public class MedicineBatch {
    public enum Status { AVAILABLE, QUARANTINED, UNAVAILABLE }

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "medicine_id", nullable = false)
    private Medicine medicine;

    @Column(name = "batch_number", nullable = false, length = 100)
    private String batchNumber;

    @Column(name = "expiration_date", nullable = false)
    private LocalDate expirationDate;

    @Column(name = "current_quantity", nullable = false)
    private int currentQuantity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected MedicineBatch() {}

    public MedicineBatch(Medicine medicine, String batchNumber, LocalDate expirationDate, int quantity) {
        this.id = UUID.randomUUID();
        this.medicine = medicine;
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
    public Medicine getMedicine() { return medicine; }
    public String getBatchNumber() { return batchNumber; }
    public LocalDate getExpirationDate() { return expirationDate; }
    public int getCurrentQuantity() { return currentQuantity; }
    public Status getStatus() { return status; }
}
