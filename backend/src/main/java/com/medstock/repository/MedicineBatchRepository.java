package com.medstock.repository;

import com.medstock.entity.MedicineBatch;
import com.medstock.entity.MedicineBatch.Status;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MedicineBatchRepository extends JpaRepository<MedicineBatch, UUID> {
    List<MedicineBatch> findAllByMedicineIdOrderByExpirationDateAsc(UUID medicineId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select b from MedicineBatch b
        where b.medicine.id = :medicineId and b.status = :status
          and b.currentQuantity > 0 and b.expirationDate >= :today
        order by b.expirationDate asc, b.createdAt asc
        """)
    List<MedicineBatch> findEligibleForUpdate(
            @Param("medicineId") UUID medicineId,
            @Param("status") Status status,
            @Param("today") LocalDate today);
}
