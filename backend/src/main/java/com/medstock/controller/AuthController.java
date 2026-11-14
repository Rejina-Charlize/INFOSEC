package com.medstock.controller;

import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController {
    @GetMapping("/api/auth/me")
    public Map<String, String> currentStaff(Authentication authentication) {
        return Map.of("username", authentication.getName(),
                "role", authentication.getAuthorities().iterator().next().getAuthority());
    }
}
