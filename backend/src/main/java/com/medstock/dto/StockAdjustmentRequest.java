package com.medstock.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record StockAdjustmentRequest(
        @NotBlank String direction,
        @Positive int quantity,
        @Size(max = 100) String batchNumber,
        LocalDate expirationDate,
        @Size(max = 500) String note) {
    public StockAdjustmentRequest {
        if (!"receive".equals(direction) && !"dispense".equals(direction)) {
            throw new IllegalArgumentException("Direction must be receive or dispense.");
        }
        if ("receive".equals(direction) && (batchNumber == null || batchNumber.isBlank() || expirationDate == null)) {
            throw new IllegalArgumentException("Receiving stock requires a batch number and expiration date.");
        }
    }
}
