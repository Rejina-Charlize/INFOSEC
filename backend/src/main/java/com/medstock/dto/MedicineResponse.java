package com.medstock.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record MedicineResponse(
        UUID id,
        String name,
        String genericName,
        String brandName,
        String sku,
        String dosageStrength,
        String description,
        BigDecimal unitPrice,
        BigDecimal costPrice,
        boolean prescriptionRequired,
        String storageRequirements,
        int reorderThreshold,
        String category,
        int availableStock,
        BigDecimal inventoryValue,
        LocalDate nextExpiryDate,
        String expiryStatus,
        String nextBatchNumber,
        String supplierName,
        String supplierEmail,
        List<BatchResponse> batches,
        List<MovementResponse> recentMovements) {
    public record BatchResponse(UUID id, String batchNumber, LocalDate expirationDate, int currentQuantity, String status, String expiryStatus) {}
    public record MovementResponse(UUID id, String movementType, int quantityDelta, String note, Instant createdAt, String batchNumber) {}
}
