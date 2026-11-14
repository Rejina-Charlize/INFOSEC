package com.medstock;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.time.LocalDate;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class InventoryApiIntegrationTest {
    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate rest;

    @Test
    void protectedMedicineCrudAndBatchMovementsUsePersistentStorage() {
        String base = "http://localhost:" + port + "/api";
        Map<String, Object> medicineInput = Map.ofEntries(
                Map.entry("name", "Integration Test Medicine"),
                Map.entry("genericName", "test generic"),
                Map.entry("brandName", "MedStock"),
                Map.entry("sku", "TEST-API-001"),
                Map.entry("dosageStrength", "10 mg"),
                Map.entry("unitPrice", 24.50),
                Map.entry("costPrice", 18.00),
                Map.entry("prescriptionRequired", true),
                Map.entry("storageRequirements", "2°C-8°C"),
                Map.entry("reorderThreshold", 3),
                Map.entry("category", "Chronic Care"));

        ResponseEntity<Map<String, Object>> unauthorized = rest.exchange(
                base + "/medicines", HttpMethod.POST, json(medicineInput, null),
                new ParameterizedTypeReference<>() {});
        assertEquals(HttpStatus.UNAUTHORIZED, unauthorized.getStatusCode());

        ResponseEntity<Map<String, Object>> created = rest.withBasicAuth("test-admin", "test-password").exchange(
                base + "/medicines", HttpMethod.POST, json(medicineInput, null),
                new ParameterizedTypeReference<>() {});
        assertEquals(HttpStatus.CREATED, created.getStatusCode());
        String id = created.getBody().get("id").toString();

        Map<String, Object> receive = Map.of(
                "direction", "receive", "quantity", 5,
                "batchNumber", "BATCH-API-01",
                "expirationDate", LocalDate.now().plusDays(10).toString());
        ResponseEntity<Map<String, Object>> received = rest.withBasicAuth("test-admin", "test-password").exchange(
                base + "/medicines/" + id + "/adjustments", HttpMethod.POST, json(receive, null),
                new ParameterizedTypeReference<>() {});
        assertEquals(HttpStatus.OK, received.getStatusCode());
        assertEquals(5, ((Number) received.getBody().get("availableStock")).intValue());
        assertNotNull(received.getBody().get("batches"));

        Map<String, Object> oversell = Map.of("direction", "dispense", "quantity", 6);
        ResponseEntity<Map<String, Object>> rejected = rest.withBasicAuth("test-admin", "test-password").exchange(
                base + "/medicines/" + id + "/adjustments", HttpMethod.POST, json(oversell, null),
                new ParameterizedTypeReference<>() {});
        assertEquals(HttpStatus.BAD_REQUEST, rejected.getStatusCode());

        Map<String, Object> dispense = Map.of("direction", "dispense", "quantity", 2);
        ResponseEntity<Map<String, Object>> dispensed = rest.withBasicAuth("test-admin", "test-password").exchange(
                base + "/medicines/" + id + "/adjustments", HttpMethod.POST, json(dispense, null),
                new ParameterizedTypeReference<>() {});
        assertEquals(HttpStatus.OK, dispensed.getStatusCode());
        assertEquals(3, ((Number) dispensed.getBody().get("availableStock")).intValue());
        assertEquals(2, ((java.util.List<?>) dispensed.getBody().get("recentMovements")).size());
    }

    private HttpEntity<?> json(Object body, String authorization) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (authorization != null) headers.set(HttpHeaders.AUTHORIZATION, authorization);
        return new HttpEntity<>(body, headers);
    }
}
