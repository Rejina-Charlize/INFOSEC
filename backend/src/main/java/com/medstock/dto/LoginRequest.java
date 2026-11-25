package com.medstock.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank
        @Size(min = 1, max = 120) String username,
        @NotBlank
        @Size(min = 1, max = 72) String password) {
}
