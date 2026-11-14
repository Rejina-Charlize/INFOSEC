package com.medstock.controller;

import com.medstock.dto.MedicineRequest;
import com.medstock.dto.MedicineResponse;
import com.medstock.dto.StockAdjustmentRequest;
import com.medstock.service.InventoryService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MedicineController {
    private final InventoryService inventory;

    public MedicineController(InventoryService inventory) {
        this.inventory = inventory;
    }

    @GetMapping("/api/medicines")
    public Page<MedicineResponse> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "8") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean prescription,
            @RequestParam(required = false) String stock,
            @RequestParam(required = false) String expiry) {
        return inventory.list(page, size, search, category, prescription, stock, expiry);
    }

    @GetMapping("/api/medicines/{id}")
    public MedicineResponse get(@PathVariable UUID id) {
        return inventory.get(id);
    }

    @PostMapping("/api/medicines")
    @ResponseStatus(HttpStatus.CREATED)
    public MedicineResponse create(@Valid @RequestBody MedicineRequest request) {
        return inventory.create(request);
    }

    @PutMapping("/api/medicines/{id}")
    public MedicineResponse update(@PathVariable UUID id, @Valid @RequestBody MedicineRequest request) {
        return inventory.update(id, request);
    }

    @DeleteMapping("/api/medicines/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archive(@PathVariable UUID id) {
        inventory.archive(id);
    }

    @PostMapping("/api/medicines/{id}/adjustments")
    public MedicineResponse adjust(@PathVariable UUID id, @Valid @RequestBody StockAdjustmentRequest request) {
        return inventory.adjust(id, request);
    }
}
