package com.medstock.repository;

import com.medstock.entity.Category;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CategoryRepository extends MongoRepository<Category, UUID> {
    List<Category> findAllByActiveTrueOrderByNameAsc();
    Optional<Category> findByNormalizedNameAndActiveTrue(String normalizedName);
    boolean existsByNormalizedName(String normalizedName);
}
