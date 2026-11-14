package com.medstock.repository;

import com.medstock.entity.Category;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
    List<Category> findAllByActiveTrueOrderByNameAsc();
    Optional<Category> findByNameIgnoreCaseAndActiveTrue(String name);
    boolean existsByNameIgnoreCase(String name);
}
