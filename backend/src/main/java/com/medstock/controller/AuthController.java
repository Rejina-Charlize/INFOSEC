package com.medstock.controller;

import com.medstock.dto.LoginRequest;
import com.medstock.dto.LoginResponse;
import com.medstock.entity.Account;
import com.medstock.repository.AccountRepository;
import com.medstock.security.JwtService;
import jakarta.validation.Valid;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController {
    private final AccountRepository accounts;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public AuthController(AccountRepository accounts,
                          JwtService jwtService,
                          PasswordEncoder passwordEncoder) {
        this.accounts = accounts;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/api/auth/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        String normalized = request.username().trim().toLowerCase(Locale.ROOT);
        Account account = accounts.findByNormalizedUsername(normalized)
                .orElseThrow(() -> new IllegalArgumentException("Invalid username or password."));
        if (!account.isEnabled()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Account is disabled."));
        }
        if (!passwordEncoder.matches(request.password(), account.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid username or password."));
        }
        String token = jwtService.generateAccessToken(account.getUsername(), account.getRole().name());
        return ResponseEntity.ok(new LoginResponse(token, account.getUsername(), account.getRole().name()));
    }

    @GetMapping("/api/auth/me")
    public Map<String, String> currentStaff(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalArgumentException("Not authenticated.");
        }
        return Map.of("username", authentication.getName(),
                "role", authentication.getAuthorities().iterator().next().getAuthority());
    }
}
