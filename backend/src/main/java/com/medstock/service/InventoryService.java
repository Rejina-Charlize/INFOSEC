package com.medstock.service;

import com.medstock.dto.DashboardSummary;
import com.medstock.dto.MedicineRequest;
import com.medstock.dto.MedicineResponse;
import com.medstock.dto.MedicineResponse.BatchResponse;
import com.medstock.dto.MedicineResponse.MovementResponse;
import com.medstock.dto.StockAdjustmentRequest;
import com.medstock.entity.Category;
import com.medstock.entity.Medicine;
import com.medstock.entity.MedicineBatch;
import com.medstock.entity.MedicineBatch.Status;
import com.medstock.entity.StockMovement;
import com.medstock.repository.CategoryRepository;
import com.medstock.repository.MedicineBatchRepository;
import com.medstock.repository.MedicineRepository;
import com.medstock.repository.StockMovementRepository;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryService {
    private final MedicineRepository medicines;
    private final MedicineBatchRepository batches;
    private final StockMovementRepository movements;
    private final CategoryRepository categories;

    public InventoryService(MedicineRepository medicines, MedicineBatchRepository batches,
                            StockMovementRepository movements, CategoryRepository categories) {
        this.medicines = medicines;
        this.batches = batches;
        this.movements = movements;
        this.categories = categories;
    }

    @Transactional(readOnly = true)
    public Page<MedicineResponse> list(int page, int size, String search, String category,
                                       Boolean prescription, String stock, String expiry) {
        if (page < 0 || size < 1 || size > 100) throw new IllegalArgumentException("Invalid pagination values.");
        if (stock != null && !stock.isBlank() && !List.of("low", "healthy").contains(stock)) {
            throw new IllegalArgumentException("Stock filter must be low or healthy.");
        }
        if (expiry != null && !expiry.isBlank() && !List.of("soon", "expired", "ok").contains(expiry)) {
            throw new IllegalArgumentException("Expiry filter must be soon, expired, or ok.");
        }
        LocalDate today = LocalDate.now();
        Specification<Medicine> specification = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isFalse(root.get("archived")));
            if (search != null && !search.isBlank()) {
                String term = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), term),
                        cb.like(cb.lower(root.get("genericName")), term),
                        cb.like(cb.lower(root.get("brandName")), term),
                        cb.like(cb.lower(root.get("sku")), term)));
            }
            if (category != null && !category.isBlank()) {
                predicates.add(cb.equal(cb.lower(root.join("category").get("name")), category.toLowerCase()));
            }
            if (prescription != null) predicates.add(cb.equal(root.get("prescriptionRequired"), prescription));

            if (stock != null && !stock.isBlank()) {
                var eligible = query.subquery(UUID.class);
                var eligibleBatch = eligible.from(MedicineBatch.class);
                eligible.select(eligibleBatch.get("medicine").get("id"));
                eligible.where(
                        cb.equal(eligibleBatch.get("medicine").get("id"), root.get("id")),
                        cb.equal(eligibleBatch.get("status"), Status.AVAILABLE),
                        cb.greaterThan(eligibleBatch.get("currentQuantity"), 0),
                        cb.greaterThanOrEqualTo(eligibleBatch.get("expirationDate"), today));

                var quantity = query.subquery(Integer.class);
                var quantityBatch = quantity.from(MedicineBatch.class);
                quantity.select(cb.sum(quantityBatch.<Integer>get("currentQuantity")));
                quantity.where(
                        cb.equal(quantityBatch.get("medicine").get("id"), root.get("id")),
                        cb.equal(quantityBatch.get("status"), Status.AVAILABLE),
                        cb.greaterThan(quantityBatch.get("currentQuantity"), 0),
                        cb.greaterThanOrEqualTo(quantityBatch.get("expirationDate"), today));
                quantity.groupBy(quantityBatch.get("medicine").get("id"));
                Predicate isLow = cb.or(cb.not(cb.exists(eligible)), cb.le(quantity, root.get("reorderThreshold")));
                predicates.add("low".equals(stock) ? isLow : cb.and(cb.exists(eligible), cb.gt(quantity, root.get("reorderThreshold"))));
            }

            if ("soon".equals(expiry)) {
                predicates.add(hasBatch(query, root, cb, today, today.plusDays(30), false));
            } else if ("expired".equals(expiry)) {
                predicates.add(hasBatch(query, root, cb, null, today.minusDays(1), true));
            } else if ("ok".equals(expiry)) {
                predicates.add(cb.not(cb.or(
                        hasBatch(query, root, cb, today, today.plusDays(30), false),
                        hasBatch(query, root, cb, null, today.minusDays(1), true))));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        return medicines.findAll(specification, PageRequest.of(page, size, Sort.by("name").ascending()))
                .map(this::toResponse);
    }

    private Predicate hasBatch(jakarta.persistence.criteria.CriteriaQuery<?> query,
                               jakarta.persistence.criteria.Root<Medicine> medicine,
                               jakarta.persistence.criteria.CriteriaBuilder cb,
                               LocalDate from, LocalDate to, boolean includeExpired) {
        var subquery = query.subquery(UUID.class);
        var batch = subquery.from(MedicineBatch.class);
        List<Predicate> conditions = new ArrayList<>();
        conditions.add(cb.equal(batch.get("medicine").get("id"), medicine.get("id")));
        conditions.add(cb.equal(batch.get("status"), Status.AVAILABLE));
        conditions.add(cb.greaterThan(batch.get("currentQuantity"), 0));
        if (includeExpired) conditions.add(cb.lessThanOrEqualTo(batch.get("expirationDate"), to));
        else conditions.add(cb.between(batch.get("expirationDate"), from, to));
        subquery.select(batch.get("medicine").get("id")).where(conditions.toArray(Predicate[]::new));
        return cb.exists(subquery);
    }

    @Transactional(readOnly = true)
    public MedicineResponse get(UUID id) {
        return toResponse(findActive(id));
    }

    @Transactional
    public MedicineResponse create(MedicineRequest request) {
        if (medicines.existsBySkuIgnoreCase(request.sku())) throw new IllegalArgumentException("A medicine with this SKU already exists.");
        Category category = findCategory(request.category());
        Medicine medicine = new Medicine(request.name().trim(), clean(request.genericName()), clean(request.brandName()),
                request.sku().trim(), clean(request.dosageStrength()), clean(request.description()),
                request.unitPrice(), request.costPrice(), request.prescriptionRequired(),
                clean(request.storageRequirements()), request.reorderThreshold(), category);
        return toResponse(medicines.save(medicine));
    }

    @Transactional
    public MedicineResponse update(UUID id, MedicineRequest request) {
        Medicine medicine = findActiveForUpdate(id);
        if (!medicine.getSku().equalsIgnoreCase(request.sku().trim()) && medicines.existsBySkuIgnoreCase(request.sku())) {
            throw new IllegalArgumentException("A medicine with this SKU already exists.");
        }
        medicine.update(request.name().trim(), clean(request.genericName()), clean(request.brandName()),
                request.sku().trim(), clean(request.dosageStrength()), clean(request.description()),
                request.unitPrice(), request.costPrice(), request.prescriptionRequired(),
                clean(request.storageRequirements()), request.reorderThreshold(), findCategory(request.category()));
        return toResponse(medicine);
    }

    @Transactional
    public void archive(UUID id) {
        Medicine medicine = findActiveForUpdate(id);
        medicine.archive();
    }

    @Transactional
    public MedicineResponse adjust(UUID id, StockAdjustmentRequest request) {
        Medicine medicine = findActiveForUpdate(id);
        if ("receive".equals(request.direction())) {
            if (!request.expirationDate().isAfter(LocalDate.now())) {
                throw new IllegalArgumentException("Received batches must have a future expiration date.");
            }
            MedicineBatch batch = batches.save(new MedicineBatch(medicine, request.batchNumber().trim(),
                    request.expirationDate(), request.quantity()));
            movements.save(new StockMovement(medicine, batch, "STOCK_RECEIVED",
                    request.quantity(), clean(request.note())));
        } else {
            List<MedicineBatch> eligible = batches.findEligibleForUpdate(id, Status.AVAILABLE, LocalDate.now());
            int available = eligible.stream().mapToInt(MedicineBatch::getCurrentQuantity).sum();
            if (request.quantity() > available) {
                throw new IllegalArgumentException("Requested quantity exceeds available unexpired stock.");
            }
            int remaining = request.quantity();
            for (MedicineBatch batch : eligible) {
                if (remaining == 0) break;
                int removed = Math.min(remaining, batch.getCurrentQuantity());
                batch.removeQuantity(removed);
                movements.save(new StockMovement(medicine, batch, "DISPENSED", -removed, clean(request.note())));
                remaining -= removed;
            }
        }
        return toResponse(medicine);
    }

    @Transactional(readOnly = true)
    public DashboardSummary summary() {
        List<Medicine> active = medicines.findAll((root, query, cb) -> cb.isFalse(root.get("archived")));
        LocalDate today = LocalDate.now();
        long lowStock = 0;
        long expiring = 0;
        long expired = 0;
        long totalStock = 0;
        BigDecimal value = BigDecimal.ZERO;
        for (Medicine medicine : active) {
            List<MedicineBatch> medicineBatches = batches.findAllByMedicineIdOrderByExpirationDateAsc(medicine.getId());
            int available = medicineBatches.stream()
                    .filter(batch -> batch.getStatus() == Status.AVAILABLE && !batch.getExpirationDate().isBefore(today))
                    .mapToInt(MedicineBatch::getCurrentQuantity).sum();
            if (available <= medicine.getReorderThreshold()) lowStock++;
            if (medicineBatches.stream().anyMatch(batch -> batch.getStatus() == Status.AVAILABLE
                    && batch.getCurrentQuantity() > 0 && !batch.getExpirationDate().isBefore(today)
                    && !batch.getExpirationDate().isAfter(today.plusDays(30)))) expiring++;
            if (medicineBatches.stream().anyMatch(batch -> batch.getStatus() == Status.AVAILABLE
                    && batch.getCurrentQuantity() > 0 && batch.getExpirationDate().isBefore(today))) expired++;
            totalStock += available;
            value = value.add(medicine.getUnitPrice().multiply(BigDecimal.valueOf(available)));
        }
        return new DashboardSummary(active.size(), lowStock, expiring, expired, value, totalStock,
                categories.findAllByActiveTrueOrderByNameAsc().stream().map(Category::getName).toList());
    }

    @Transactional(readOnly = true)
    public List<String> categories() {
        return categories.findAllByActiveTrueOrderByNameAsc().stream().map(Category::getName).toList();
    }

    private MedicineResponse toResponse(Medicine medicine) {
        LocalDate today = LocalDate.now();
        List<MedicineBatch> allBatches = batches.findAllByMedicineIdOrderByExpirationDateAsc(medicine.getId());
        List<MedicineBatch> availableBatches = allBatches.stream()
                .filter(batch -> batch.getStatus() == Status.AVAILABLE && batch.getCurrentQuantity() > 0
                        && !batch.getExpirationDate().isBefore(today)).toList();
        int stock = availableBatches.stream().mapToInt(MedicineBatch::getCurrentQuantity).sum();
        MedicineBatch next = availableBatches.isEmpty() ? null : availableBatches.get(0);
        String expiryStatus = next == null ? "ok"
                : !next.getExpirationDate().isAfter(today.plusDays(30)) ? "soon" : "ok";
        if (allBatches.stream().anyMatch(batch -> batch.getStatus() == Status.AVAILABLE
                && batch.getCurrentQuantity() > 0 && batch.getExpirationDate().isBefore(today))) {
            expiryStatus = "expired";
        }
        List<BatchResponse> batchResponses = allBatches.stream().map(batch -> new BatchResponse(
                batch.getId(), batch.getBatchNumber(), batch.getExpirationDate(), batch.getCurrentQuantity(),
                batch.getStatus().name(), batch.getExpirationDate().isBefore(today) ? "expired"
                : !batch.getExpirationDate().isAfter(today.plusDays(30)) ? "soon" : "ok")).toList();
        List<MovementResponse> movementResponses = movements.findTop10ByMedicineIdOrderByCreatedAtDesc(medicine.getId())
                .stream().map(movement -> new MovementResponse(movement.getId(), movement.getMovementType(),
                        movement.getQuantityDelta(), movement.getNote(), movement.getCreatedAt(),
                        movement.getBatch() == null ? null : movement.getBatch().getBatchNumber())).toList();
        return new MedicineResponse(medicine.getId(), medicine.getName(), medicine.getGenericName(),
                medicine.getBrandName(), medicine.getSku(), medicine.getDosageStrength(), medicine.getDescription(),
                medicine.getUnitPrice(), medicine.getCostPrice(), medicine.isPrescriptionRequired(),
                medicine.getStorageRequirements(), medicine.getReorderThreshold(), medicine.getCategory().getName(),
                stock, medicine.getUnitPrice().multiply(BigDecimal.valueOf(stock)),
                next == null ? null : next.getExpirationDate(), expiryStatus,
                next == null ? null : next.getBatchNumber(), null, null, batchResponses, movementResponses);
    }

    private Medicine findActive(UUID id) {
        return medicines.findOne((root, query, cb) -> cb.and(cb.equal(root.get("id"), id), cb.isFalse(root.get("archived"))))
                .orElseThrow(() -> new IllegalArgumentException("Medicine not found."));
    }

    private Medicine findActiveForUpdate(UUID id) {
        return medicines.findActiveByIdForUpdate(id).orElseThrow(() -> new IllegalArgumentException("Medicine not found."));
    }

    private Category findCategory(String name) {
        return categories.findByNameIgnoreCaseAndActiveTrue(name.trim())
                .orElseThrow(() -> new IllegalArgumentException("Category does not exist."));
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
