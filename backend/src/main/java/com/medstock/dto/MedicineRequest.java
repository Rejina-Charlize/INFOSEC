package com.medstock.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record MedicineRequest(
        @NotBlank @Size(max = 180) String name,
        @Size(max = 180) String genericName,
        @Size(max = 180) String brandName,
        @NotBlank @Size(max = 80) String sku,
        @Size(max = 100) String dosageStrength,
        @Size(max = 2000) String description,
        @NotNull @DecimalMin("0.00") BigDecimal unitPrice,
        @NotNull @DecimalMin("0.00") BigDecimal costPrice,
        boolean prescriptionRequired,
        @Size(max = 250) String storageRequirements,
        @PositiveOrZero int reorderThreshold,
        @NotBlank @Size(max = 100) String category) {}
