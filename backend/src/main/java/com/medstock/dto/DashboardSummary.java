package com.medstock.dto;

import java.math.BigDecimal;
import java.util.List;

public record DashboardSummary(
        long totalMedicines,
        long lowStockCount,
        long expiringSoonCount,
        long expiredMedicines,
        BigDecimal inventoryValue,
        long totalAvailableStock,
        List<String> categories) {}
