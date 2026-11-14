package com.medstock.repository;

import com.medstock.entity.StockMovement;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockMovementRepository extends JpaRepository<StockMovement, UUID> {
    List<StockMovement> findTop10ByMedicineIdOrderByCreatedAtDesc(UUID medicineId);
}
