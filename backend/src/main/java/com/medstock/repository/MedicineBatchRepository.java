package com.medstock.repository;

import com.medstock.entity.MedicineBatch;
import com.medstock.entity.MedicineBatch.Status;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MedicineBatchRepository extends MongoRepository<MedicineBatch, UUID> {
    List<MedicineBatch> findAllByMedicineIdOrderByExpirationDateAsc(UUID medicineId);
    List<MedicineBatch> findAllByMedicineIdInOrderByExpirationDateAsc(Collection<UUID> medicineIds);
    List<MedicineBatch> findByMedicineIdAndStatusAndCurrentQuantityGreaterThanAndExpirationDateGreaterThanEqualOrderByExpirationDateAscCreatedAtAsc(
            UUID medicineId, Status status, int quantity, LocalDate today);
    boolean existsByMedicineIdAndBatchNumber(UUID medicineId, String batchNumber);
}
