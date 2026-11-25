package com.medstock.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

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

    public Page<MedicineResponse> list(int page, int size, String search, String category,
                                       Boolean prescription, String stock, String expiry) {
        if (page < 0 || size < 1 || size > 100) throw new IllegalArgumentException("Invalid pagination values.");
        if (stock != null && !stock.isBlank() && !List.of("low", "healthy").contains(stock)) {
            throw new IllegalArgumentException("Stock filter must be low or healthy.");
        }
        if (expiry != null && !expiry.isBlank() && !List.of("soon", "expired", "ok").contains(expiry)) {
            throw new IllegalArgumentException("Expiry filter must be soon, expired, or ok.");
        }

        List<Medicine> active = medicines.findAllByArchivedFalse(Sort.by("name").ascending());
        List<UUID> medicineIds = active.stream().map(Medicine::getId).toList();
        Map<UUID, List<MedicineBatch>> batchesByMedicine = medicineIds.isEmpty()
                ? Map.of()
                : groupBy(batches.findAllByMedicineIdInOrderByExpirationDateAsc(medicineIds), MedicineBatch::getMedicineId);
        LocalDate today = LocalDate.now();
        String term = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        List<Medicine> filtered = active.stream()
                .filter(medicine -> matchesSearch(medicine, term))
                .filter(medicine -> category == null || category.isBlank()
                        || medicine.getCategory().name().equalsIgnoreCase(category.trim()))
                .filter(medicine -> prescription == null || medicine.isPrescriptionRequired() == prescription)
                .filter(medicine -> matchesStock(medicine, batchesByMedicine.getOrDefault(medicine.getId(), List.of()), stock, today))
                .filter(medicine -> matchesExpiry(batchesByMedicine.getOrDefault(medicine.getId(), List.of()), expiry, today))
                .toList();

        int from = (int) Math.min((long) page * size, filtered.size());
        int to = Math.min(from + size, filtered.size());
        List<Medicine> selected = filtered.subList(from, to);
        List<UUID> selectedIds = selected.stream().map(Medicine::getId).toList();
        Map<UUID, List<StockMovement>> movementsByMedicine = selectedIds.isEmpty()
                ? Map.of()
                : groupBy(movements.findAllByMedicineIdInOrderByCreatedAtDesc(selectedIds), StockMovement::getMedicineId);
        List<MedicineResponse> responses = selected.stream()
                .map(medicine -> toResponse(
                        medicine,
                        batchesByMedicine.getOrDefault(medicine.getId(), List.of()),
                        movementsByMedicine.getOrDefault(medicine.getId(), List.of())))
                .toList();
        return new PageImpl<>(responses, PageRequest.of(page, size, Sort.by("name").ascending()), filtered.size());
    }

    public MedicineResponse get(UUID id) {
        Medicine medicine = findActive(id);
        return toResponse(
                medicine,
                batches.findAllByMedicineIdOrderByExpirationDateAsc(id),
                movements.findTop10ByMedicineIdOrderByCreatedAtDesc(id));
    }

    public MedicineResponse create(MedicineRequest request) {
        if (medicines.existsByNormalizedSku(normalize(request.sku()))) {
            throw new IllegalArgumentException("A medicine with this SKU already exists.");
        }
        Category category = findCategory(request.category());
        Medicine medicine = new Medicine(request.name().trim(), clean(request.genericName()), clean(request.brandName()),
                request.sku().trim(), clean(request.dosageStrength()), clean(request.description()),
                request.unitPrice(), request.costPrice(), request.prescriptionRequired(),
                clean(request.storageRequirements()), request.reorderThreshold(), category);
        return toResponse(medicines.save(medicine), List.of(), List.of());
    }

    public MedicineResponse update(UUID id, MedicineRequest request) {
        Medicine medicine = findActive(id);
        String normalizedSku = normalize(request.sku());
        if (!medicine.getNormalizedSku().equals(normalizedSku)
                && medicines.existsByNormalizedSkuAndIdNot(normalizedSku, id)) {
            throw new IllegalArgumentException("A medicine with this SKU already exists.");
        }
        medicine.update(request.name().trim(), clean(request.genericName()), clean(request.brandName()),
                request.sku().trim(), clean(request.dosageStrength()), clean(request.description()),
                request.unitPrice(), request.costPrice(), request.prescriptionRequired(),
                clean(request.storageRequirements()), request.reorderThreshold(), findCategory(request.category()));
        Medicine saved = medicines.save(medicine);
        return toResponse(saved, batches.findAllByMedicineIdOrderByExpirationDateAsc(id),
                movements.findTop10ByMedicineIdOrderByCreatedAtDesc(id));
    }

    public void archive(UUID id) {
        Medicine medicine = findActive(id);
        medicine.archive();
        medicines.save(medicine);
    }

    public MedicineResponse adjust(UUID id, StockAdjustmentRequest request) {
        Medicine medicine = findActive(id);
        if ("receive".equals(request.direction())) {
            if (!request.expirationDate().isAfter(LocalDate.now())) {
                throw new IllegalArgumentException("Received batches must have a future expiration date.");
            }
            String batchNumber = request.batchNumber().trim();
            if (batches.existsByMedicineIdAndBatchNumber(id, batchNumber)) {
                throw new IllegalArgumentException("A batch with this number already exists for the medicine.");
            }
            MedicineBatch batch = batches.save(new MedicineBatch(
                    medicine, batchNumber, request.expirationDate(), request.quantity()));
            movements.save(new StockMovement(medicine, batch, "STOCK_RECEIVED",
                    request.quantity(), clean(request.note())));
        } else {
            List<MedicineBatch> eligible = batches
                    .findByMedicineIdAndStatusAndCurrentQuantityGreaterThanAndExpirationDateGreaterThanEqualOrderByExpirationDateAscCreatedAtAsc(
                            id, Status.AVAILABLE, 0, LocalDate.now());
            int available = eligible.stream().mapToInt(MedicineBatch::getCurrentQuantity).sum();
            if (request.quantity() > available) {
                throw new IllegalArgumentException("Requested quantity exceeds available unexpired stock.");
            }
            int remaining = request.quantity();
            for (MedicineBatch batch : eligible) {
                if (remaining == 0) break;
                int removed = Math.min(remaining, batch.getCurrentQuantity());
                batch.removeQuantity(removed);
                batches.save(batch);
                movements.save(new StockMovement(medicine, batch, "DISPENSED",
                        -removed, clean(request.note())));
                remaining -= removed;
            }
        }
        return get(id);
    }

    public DashboardSummary summary() {
        List<Medicine> active = medicines.findAllByArchivedFalse(Sort.by("name").ascending());
        List<UUID> medicineIds = active.stream().map(Medicine::getId).toList();
        Map<UUID, List<MedicineBatch>> batchesByMedicine = medicineIds.isEmpty()
                ? Map.of()
                : groupBy(batches.findAllByMedicineIdInOrderByExpirationDateAsc(medicineIds), MedicineBatch::getMedicineId);
        LocalDate today = LocalDate.now();
        long lowStock = 0;
        long expiring = 0;
        long expired = 0;
        long totalStock = 0;
        BigDecimal value = BigDecimal.ZERO;
        for (Medicine medicine : active) {
            List<MedicineBatch> medicineBatches = batchesByMedicine.getOrDefault(medicine.getId(), List.of());
            int available = availableStock(medicineBatches, today);
            if (available <= medicine.getReorderThreshold()) lowStock++;
            if (hasExpiringBatch(medicineBatches, today)) expiring++;
            if (hasExpiredBatch(medicineBatches, today)) expired++;
            totalStock += available;
            value = value.add(medicine.getUnitPrice().multiply(BigDecimal.valueOf(available)));
        }
        return new DashboardSummary(active.size(), lowStock, expiring, expired, value, totalStock,
                categories.findAllByActiveTrueOrderByNameAsc().stream()
                        .map(Category::getName).toList());
    }

    public List<String> categories() {
        return categories.findAllByActiveTrueOrderByNameAsc().stream()
                .map(Category::getName).toList();
    }

    private MedicineResponse toResponse(Medicine medicine, List<MedicineBatch> allBatches,
                                        List<StockMovement> recentMovements) {
        LocalDate today = LocalDate.now();
        List<MedicineBatch> orderedBatches = allBatches.stream()
                .sorted(Comparator.comparing(MedicineBatch::getExpirationDate)).toList();
        List<MedicineBatch> availableBatches = orderedBatches.stream()
                .filter(batch -> isAvailable(batch, today)).toList();
        int stock = availableStock(orderedBatches, today);
        MedicineBatch next = availableBatches.isEmpty() ? null : availableBatches.get(0);
        String expiryStatus = next == null ? "ok"
                : !next.getExpirationDate().isAfter(today.plusDays(30)) ? "soon" : "ok";
        if (hasExpiredBatch(orderedBatches, today)) expiryStatus = "expired";
        List<BatchResponse> batchResponses = orderedBatches.stream().map(batch -> new BatchResponse(
                batch.getId(), batch.getBatchNumber(), batch.getExpirationDate(), batch.getCurrentQuantity(),
                batch.getStatus().name(), batch.getExpirationDate().isBefore(today) ? "expired"
                : !batch.getExpirationDate().isAfter(today.plusDays(30)) ? "soon" : "ok")).toList();
        List<MovementResponse> movementResponses = recentMovements.stream()
                .sorted(Comparator.comparing(StockMovement::getCreatedAt).reversed())
                .limit(10)
                .map(movement -> new MovementResponse(movement.getId(), movement.getMovementType(),
                        movement.getQuantityDelta(), movement.getNote(), movement.getCreatedAt(),
                        movement.getBatchNumber())).toList();
        return new MedicineResponse(medicine.getId(), medicine.getName(), medicine.getGenericName(),
                medicine.getBrandName(), medicine.getSku(), medicine.getDosageStrength(), medicine.getDescription(),
                medicine.getUnitPrice(), medicine.getCostPrice(), medicine.isPrescriptionRequired(),
                medicine.getStorageRequirements(), medicine.getReorderThreshold(), medicine.getCategory().name(),
                stock, medicine.getUnitPrice().multiply(BigDecimal.valueOf(stock)),
                next == null ? null : next.getExpirationDate(), expiryStatus,
                next == null ? null : next.getBatchNumber(), null, null, batchResponses, movementResponses);
    }

    private Medicine findActive(UUID id) {
        return medicines.findByIdAndArchivedFalse(id)
                .orElseThrow(() -> new IllegalArgumentException("Medicine not found."));
    }

    private Category findCategory(String name) {
        return categories.findByNormalizedNameAndActiveTrue(normalize(name))
                .orElseThrow(() -> new IllegalArgumentException("Category does not exist."));
    }

    private boolean matchesSearch(Medicine medicine, String term) {
        if (term.isEmpty()) return true;
        return contains(medicine.getName(), term) || contains(medicine.getGenericName(), term)
                || contains(medicine.getBrandName(), term) || contains(medicine.getSku(), term);
    }

    private boolean matchesStock(Medicine medicine, List<MedicineBatch> medicineBatches,
                                 String stock, LocalDate today) {
        if (stock == null || stock.isBlank()) return true;
        boolean low = availableStock(medicineBatches, today) <= medicine.getReorderThreshold();
        return "low".equals(stock) == low;
    }

    private boolean matchesExpiry(List<MedicineBatch> medicineBatches, String expiry, LocalDate today) {
        return switch (Objects.toString(expiry, "")) {
            case "soon" -> hasExpiringBatch(medicineBatches, today);
            case "expired" -> hasExpiredBatch(medicineBatches, today);
            case "ok" -> !hasExpiringBatch(medicineBatches, today) && !hasExpiredBatch(medicineBatches, today);
            default -> true;
        };
    }

    private int availableStock(List<MedicineBatch> medicineBatches, LocalDate today) {
        return medicineBatches.stream().filter(batch -> isAvailable(batch, today))
                .mapToInt(MedicineBatch::getCurrentQuantity).sum();
    }

    private boolean isAvailable(MedicineBatch batch, LocalDate today) {
        return batch.getStatus() == Status.AVAILABLE && batch.getCurrentQuantity() > 0
                && !batch.getExpirationDate().isBefore(today);
    }

    private boolean hasExpiringBatch(List<MedicineBatch> medicineBatches, LocalDate today) {
        return medicineBatches.stream().anyMatch(batch -> isAvailable(batch, today)
                && !batch.getExpirationDate().isAfter(today.plusDays(30)));
    }

    private boolean hasExpiredBatch(List<MedicineBatch> medicineBatches, LocalDate today) {
        return medicineBatches.stream().anyMatch(batch -> batch.getStatus() == Status.AVAILABLE
                && batch.getCurrentQuantity() > 0 && batch.getExpirationDate().isBefore(today));
    }

    private boolean contains(String value, String term) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(term);
    }

    private String normalize(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private <T> Map<UUID, List<T>> groupBy(List<T> values, Function<T, UUID> keyExtractor) {
        return values.stream().collect(Collectors.groupingBy(keyExtractor));
    }
}
