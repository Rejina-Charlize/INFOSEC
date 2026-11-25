package com.medstock.dto;

public record LoginResponse(String token, String username, String role) {
}
