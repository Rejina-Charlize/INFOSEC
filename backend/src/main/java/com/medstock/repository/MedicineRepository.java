package com.medstock.repository;

import com.medstock.entity.Medicine;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MedicineRepository extends MongoRepository<Medicine, UUID> {
    List<Medicine> findAllByArchivedFalse(Sort sort);
    java.util.Optional<Medicine> findByIdAndArchivedFalse(UUID id);
    boolean existsByNormalizedSku(String normalizedSku);
    boolean existsByNormalizedSkuAndIdNot(String normalizedSku, UUID id);
}
