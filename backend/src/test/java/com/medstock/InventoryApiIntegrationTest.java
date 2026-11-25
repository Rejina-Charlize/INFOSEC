package com.medstock;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.medstock.entity.Account;
import com.medstock.entity.Category;
import com.medstock.entity.Role;
import com.medstock.repository.AccountRepository;
import com.medstock.repository.CategoryRepository;
import com.medstock.repository.MedicineBatchRepository;
import com.medstock.repository.MedicineRepository;
import com.medstock.repository.StockMovementRepository;
import java.net.URI;
import java.time.LocalDate;
import java.util.Map;
import java.util.Objects;
import org.junit.jupiter.api.BeforeEach;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class InventoryApiIntegrationTest {
    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate rest;

    @Autowired private AccountRepository accounts;
    @Autowired private CategoryRepository categories;
    @Autowired private MedicineRepository medicines;
    @Autowired private MedicineBatchRepository batches;
    @Autowired private StockMovementRepository movements;
    @Autowired private PasswordEncoder passwordEncoder;

    @BeforeEach
    void resetMongoDatabase() {
        movements.deleteAll();
        batches.deleteAll();
        medicines.deleteAll();
        accounts.deleteAll();
        categories.deleteAll();
        categories.save(new Category("Chronic Care", null));
        accounts.save(new Account("test-admin", passwordEncoder.encode("test-password"), Role.ADMINISTRATOR));
    }

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
        Map<String, Object> createdBody = Objects.requireNonNull(created.getBody());
        String id = Objects.requireNonNull(createdBody.get("id")).toString();

        Map<String, Object> receive = Map.of(
                "direction", "receive", "quantity", 5,
                "batchNumber", "BATCH-API-01",
                "expirationDate", LocalDate.now().plusDays(10).toString());
        ResponseEntity<Map<String, Object>> received = rest.withBasicAuth("test-admin", "test-password").exchange(
                base + "/medicines/" + id + "/adjustments", HttpMethod.POST, json(receive, null),
                new ParameterizedTypeReference<>() {});
        assertEquals(HttpStatus.OK, received.getStatusCode());
        Map<String, Object> receivedBody = Objects.requireNonNull(received.getBody());
        assertEquals(5, ((Number) Objects.requireNonNull(receivedBody.get("availableStock"))).intValue());
        Objects.requireNonNull(receivedBody.get("batches"));

        ResponseEntity<Map<String, Object>> filtered = rest.exchange(
                URI.create(base + "/medicines?search=Integration%20Test&category=Chronic%20Care"
                        + "&prescription=true&stock=healthy&expiry=soon"),
                HttpMethod.GET, null, new ParameterizedTypeReference<>() {});
        assertEquals(HttpStatus.OK, filtered.getStatusCode());
        java.util.List<?> filteredContent = (java.util.List<?>) Objects.requireNonNull(
                Objects.requireNonNull(filtered.getBody()).get("content"));
        assertEquals(1, filteredContent.size());
        Map<?, ?> filteredMedicine = (Map<?, ?>) filteredContent.get(0);
        assertEquals("TEST-API-001", filteredMedicine.get("sku"));
        assertEquals(5, ((Number) Objects.requireNonNull(filteredMedicine.get("availableStock"))).intValue());

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
        Map<String, Object> dispensedBody = Objects.requireNonNull(dispensed.getBody());
        assertEquals(3, ((Number) Objects.requireNonNull(dispensedBody.get("availableStock"))).intValue());
        assertEquals(2, ((java.util.List<?>) Objects.requireNonNull(dispensedBody.get("recentMovements"))).size());
    }

    @Test
    void onlyAdministratorsCanCreatePharmacistAccounts() {
        String endpoint = "http://localhost:" + port + "/api/admin/accounts";
        Map<String, Object> input = Map.of("username", "test@gmail.com", "password", "12345678");

        ResponseEntity<Map<String, Object>> unauthorized = rest.exchange(
                endpoint, HttpMethod.POST, json(input, null),
                new ParameterizedTypeReference<>() {});
        assertEquals(HttpStatus.UNAUTHORIZED, unauthorized.getStatusCode());

        ResponseEntity<Map<String, Object>> created = rest.withBasicAuth("test-admin", "test-password").exchange(
                endpoint, HttpMethod.POST, json(input, null),
                new ParameterizedTypeReference<>() {});
        assertEquals(HttpStatus.CREATED, created.getStatusCode());
        Map<String, Object> createdBody = Objects.requireNonNull(created.getBody());
        assertEquals("PHARMACIST", createdBody.get("role"));

        ResponseEntity<Map<String, Object>> workerIdentity = rest.withBasicAuth(
                "test@gmail.com", "12345678").exchange(
                        "http://localhost:" + port + "/api/auth/me",
                        HttpMethod.GET, null, new ParameterizedTypeReference<>() {});
        assertEquals(HttpStatus.OK, workerIdentity.getStatusCode());
        Map<String, Object> workerIdentityBody = Objects.requireNonNull(workerIdentity.getBody());
        assertEquals("ROLE_PHARMACIST", workerIdentityBody.get("role"));

        ResponseEntity<Map<String, Object>> forbidden = rest.withBasicAuth(
                "test@gmail.com", "12345678").exchange(
                        endpoint, HttpMethod.POST, json(Map.of(
                                "username", "another-worker",
                                "password", "worker-password-456"), null),
                        new ParameterizedTypeReference<>() {});
        assertEquals(HttpStatus.FORBIDDEN, forbidden.getStatusCode());
    }

    private HttpEntity<?> json(Object body, String authorization) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (authorization != null) headers.set(HttpHeaders.AUTHORIZATION, authorization);
        return new HttpEntity<>(body, headers);
    }
}
