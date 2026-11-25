package com.medstock.repository;

import com.medstock.entity.StockMovement;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface StockMovementRepository extends MongoRepository<StockMovement, UUID> {
    List<StockMovement> findTop10ByMedicineIdOrderByCreatedAtDesc(UUID medicineId);
    List<StockMovement> findAllByMedicineIdInOrderByCreatedAtDesc(Collection<UUID> medicineIds);
}
