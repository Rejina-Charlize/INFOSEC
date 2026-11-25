package com.medstock.repository;

import com.medstock.entity.Account;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AccountRepository extends MongoRepository<Account, UUID> {
    Optional<Account> findByNormalizedUsername(String username);
    boolean existsByNormalizedUsername(String username);
}
