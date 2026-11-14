package com.medstock.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.medstock.dto.StockAdjustmentRequest;
import com.medstock.entity.Category;
import com.medstock.entity.Medicine;
import com.medstock.entity.MedicineBatch;
import com.medstock.repository.CategoryRepository;
import com.medstock.repository.MedicineBatchRepository;
import com.medstock.repository.MedicineRepository;
import com.medstock.repository.StockMovementRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {
    @Mock private MedicineRepository medicines;
    @Mock private MedicineBatchRepository batches;
    @Mock private StockMovementRepository movements;
    @Mock private CategoryRepository categories;
    @InjectMocks private InventoryService inventory;

    private UUID medicineId;
    private Medicine medicine;

    @BeforeEach
    void setUp() {
        Category category = new Category("Chronic Care", null);
        medicine = new Medicine("Insulin Glargine", "insulin glargine", "MedStock",
                "INS-GLA-100", "100 IU/mL", null, new BigDecimal("24.50"),
                new BigDecimal("18.00"), true, "2°C–8°C", 20, category);
        medicineId = medicine.getId();
        when(medicines.findActiveByIdForUpdate(medicineId)).thenReturn(Optional.of(medicine));
    }

    @Test
    void dispenseConsumesEarliestExpiryFirstAndRecordsEachMovement() {
        LocalDate today = LocalDate.now();
        MedicineBatch first = new MedicineBatch(medicine, "EARLIEST", today.plusDays(2), 3);
        MedicineBatch second = new MedicineBatch(medicine, "NEXT", today.plusDays(12), 6);
        when(batches.findEligibleForUpdate(medicineId, MedicineBatch.Status.AVAILABLE, today))
                .thenReturn(List.of(first, second));
        when(batches.findAllByMedicineIdOrderByExpirationDateAsc(medicineId))
                .thenReturn(List.of(first, second));
        when(movements.findTop10ByMedicineIdOrderByCreatedAtDesc(medicineId)).thenReturn(List.of());

        var result = inventory.adjust(medicineId,
                new StockAdjustmentRequest("dispense", 4, null, null, "Counter dispense"));

        assertEquals(0, first.getCurrentQuantity());
        assertEquals(MedicineBatch.Status.UNAVAILABLE, first.getStatus());
        assertEquals(5, second.getCurrentQuantity());
        assertEquals(5, result.availableStock());
        verify(movements, times(2)).save(any());
    }

    @Test
    void dispenseRejectsQuantitiesAboveEligibleStock() {
        when(batches.findEligibleForUpdate(medicineId, MedicineBatch.Status.AVAILABLE, LocalDate.now()))
                .thenReturn(List.of(new MedicineBatch(medicine, "SMALL", LocalDate.now().plusDays(2), 2)));

        assertThrows(IllegalArgumentException.class, () -> inventory.adjust(medicineId,
                new StockAdjustmentRequest("dispense", 3, null, null, null)));
        verify(movements, times(0)).save(any());
    }

    @Test
    void receiveRejectsAlreadyExpiredBatches() {
        assertThrows(IllegalArgumentException.class, () -> inventory.adjust(medicineId,
                new StockAdjustmentRequest("receive", 5, "OLD", LocalDate.now(), null)));
    }
}
