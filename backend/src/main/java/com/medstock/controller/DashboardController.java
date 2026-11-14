package com.medstock.controller;

import com.medstock.dto.DashboardSummary;
import com.medstock.service.InventoryService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DashboardController {
    private final InventoryService inventory;

    public DashboardController(InventoryService inventory) {
        this.inventory = inventory;
    }

    @GetMapping("/api/dashboard/summary")
    public DashboardSummary summary() {
        return inventory.summary();
    }

    @GetMapping("/api/categories")
    public List<String> categories() {
        return inventory.categories();
    }
}
