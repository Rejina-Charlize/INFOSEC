package com.medstock.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record StaffAccountRequest(
        @NotBlank
        @Size(min = 3, max = 120)
        @Pattern(regexp = "^[a-zA-Z0-9][a-zA-Z0-9._@+-]*$")
        String username,
        @NotBlank
        @Size(min = 8, max = 72)
        String password) {
}
