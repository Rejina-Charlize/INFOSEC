package com.medstock.controller;

import com.medstock.dto.StaffAccountRequest;
import com.medstock.entity.Account;
import com.medstock.entity.Role;
import com.medstock.repository.AccountRepository;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StaffAccountController {
    private final AccountRepository accounts;
    private final PasswordEncoder passwordEncoder;

    public StaffAccountController(AccountRepository accounts, PasswordEncoder passwordEncoder) {
        this.accounts = accounts;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/api/admin/accounts")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> createWorker(@Valid @RequestBody StaffAccountRequest request) {
        String username = request.username().trim();
        if (accounts.existsByNormalizedUsername(username.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("That username is already in use.");
        }

        Account account = accounts.save(
                new Account(username, passwordEncoder.encode(request.password()), Role.PHARMACIST));
        return Map.of("username", account.getUsername(), "role", account.getRole().name());
    }
}
