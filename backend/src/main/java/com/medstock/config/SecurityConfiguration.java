package com.medstock.config;

import com.medstock.entity.Account;
import com.medstock.entity.Category;
import com.medstock.entity.Medicine;
import com.medstock.entity.MedicineBatch;
import com.medstock.entity.Role;
import com.medstock.entity.StockMovement;
import com.medstock.repository.AccountRepository;
import com.medstock.repository.CategoryRepository;
import com.medstock.repository.MedicineBatchRepository;
import com.medstock.repository.MedicineRepository;
import com.medstock.repository.StockMovementRepository;
import com.medstock.security.JwtAuthenticationFilter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@SuppressWarnings("unused")
public class SecurityConfiguration {
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    UserDetailsService userDetailsService(AccountRepository accounts) {
        return username -> {
            Account account = accounts.findByNormalizedUsername(username.trim().toLowerCase(Locale.ROOT))
                    .orElseThrow(() -> new UsernameNotFoundException("Staff account not found."));
            return User.withUsername(account.getUsername())
                    .password(account.getPasswordHash())
                    .roles(account.getRole().name())
                    .disabled(!account.isEnabled())
                    .build();
        };
    }

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtAuthenticationFilter jwtFilter,
            @Qualifier("corsConfigurationSource") CorsConfigurationSource cors) throws Exception {
        return http
                .cors(configuration -> configuration.configurationSource(cors))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .httpBasic(Customizer.withDefaults())
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/api/health").permitAll()
                        .requestMatchers("/api/auth/login", "/api/auth/login/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/me").authenticated()
                        .requestMatchers(HttpMethod.GET,
                                "/api/medicines",
                                "/api/medicines/*",
                                "/api/categories",
                                "/api/dashboard/summary").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMINISTRATOR")
                        .requestMatchers(HttpMethod.DELETE, "/api/**").hasRole("ADMINISTRATOR")
                        .requestMatchers("/api/**").hasAnyRole("ADMINISTRATOR", "PHARMACIST")
                        .anyRequest().denyAll())
                .build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(
            @Value("${medstock.frontend-origin}") String frontendOrigin) {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(frontendOrigin));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }

    @Bean
    ApplicationRunner initialData(
            CategoryRepository categories,
            AccountRepository accounts,
            MedicineRepository medicines,
            MedicineBatchRepository batches,
            StockMovementRepository movements,
            MongoTemplate mongoTemplate,
            PasswordEncoder encoder,
            @Value("${medstock.admin.username}") String adminUsername,
            @Value("${medstock.admin.password}") String adminPassword,
            @Value("${medstock.pharmacist.username}") String pharmacistUsername,
            @Value("${medstock.pharmacist.password}") String pharmacistPassword,
            @Value("${medstock.local-admin-reset:false}") boolean localAdminReset,
            @Value("${medstock.demo-data.enabled:false}") boolean demoDataEnabled) {
        return args -> {
            dropObsoleteCategoryIndex(mongoTemplate);
            for (String name : List.of("Analgesics", "Antibiotics", "Chronic Care", "Antihistamines")) {
                if (!categories.existsByNormalizedName(normalize(name))) categories.save(new Category(name, null));
            }
            if (adminUsername.isBlank() || adminPassword.isBlank()) {
                System.err.println("No administrator account was provisioned. Set MEDSTOCK_ADMIN_USERNAME and MEDSTOCK_ADMIN_PASSWORD.");
            } else {
                String normalizedAdmin = normalize(adminUsername);
                Account admin = accounts.findByNormalizedUsername(normalizedAdmin)
                        .orElseGet(() -> new Account(adminUsername, encoder.encode(adminPassword), Role.ADMINISTRATOR));
                if (localAdminReset) {
                    accounts.delete(admin);
                    admin = new Account(adminUsername, encoder.encode(adminPassword), Role.ADMINISTRATOR);
                }
                if (admin.getId() != null
                        && !encoder.matches(adminPassword, admin.getPasswordHash())) {
                    admin.updateCredentials(encoder.encode(adminPassword), Role.ADMINISTRATOR);
                } else if (admin.getId() != null
                        && admin.getRole() != Role.ADMINISTRATOR) {
                    admin.updateCredentials(admin.getPasswordHash(), Role.ADMINISTRATOR);
                }
                if (admin.getId() == null || !accounts.existsByNormalizedUsername(normalizedAdmin)) {
                    admin.updateCredentials(encoder.encode(adminPassword), Role.ADMINISTRATOR);
                }
                accounts.save(admin);
            }
            if (!pharmacistUsername.isBlank() && !pharmacistPassword.isBlank()
                    && !accounts.existsByNormalizedUsername(normalize(pharmacistUsername))) {
                accounts.save(new Account(pharmacistUsername, encoder.encode(pharmacistPassword), Role.PHARMACIST));
            }
            if (demoDataEnabled) seedDemoInventory(categories, medicines, batches, movements);
        };
    }

    private void dropObsoleteCategoryIndex(MongoTemplate mongoTemplate) {
        var indexOperations = mongoTemplate.indexOps(Medicine.class);
        indexOperations.getIndexInfo().stream()
                .filter(index -> "category.normalizedName".equals(index.getName()))
                .findFirst()
                .ifPresent(index -> indexOperations.dropIndex(index.getName()));
    }

    private void seedDemoInventory(CategoryRepository categories, MedicineRepository medicines,
                                   MedicineBatchRepository batches, StockMovementRepository movements) {
        List<DemoMedicine> demoMedicines = List.of(
                new DemoMedicine("Paracetamol Tablets", "Paracetamol", "MedStock", "DEMO-PARA-500",
                        "500 mg", new BigDecimal("4.50"), new BigDecimal("2.00"), false,
                        "Store below 25°C", 20, "Analgesics", "DEMO-PARA-B01", 120, 365),
                new DemoMedicine("Ibuprofen Tablets", "Ibuprofen", "MedStock", "DEMO-IBU-200",
                        "200 mg", new BigDecimal("6.00"), new BigDecimal("3.00"), false,
                        "Store below 25°C", 30, "Analgesics", "DEMO-IBU-B01", 35, 120),
                new DemoMedicine("Amoxicillin Capsules", "Amoxicillin", "MedStock", "DEMO-AMOX-500",
                        "500 mg", new BigDecimal("12.50"), new BigDecimal("8.00"), true,
                        "Store below 25°C", 15, "Antibiotics", "DEMO-AMOX-B01", 12, 180),
                new DemoMedicine("Cetirizine Tablets", "Cetirizine", "MedStock", "DEMO-CET-10",
                        "10 mg", new BigDecimal("5.50"), new BigDecimal("2.50"), false,
                        "Store below 25°C", 20, "Antihistamines", "DEMO-CET-B01", 50, 20),
                new DemoMedicine("Metformin Tablets", "Metformin", "MedStock", "DEMO-MET-500",
                        "500 mg", new BigDecimal("8.00"), new BigDecimal("4.50"), true,
                        "Store below 25°C", 25, "Chronic Care", "DEMO-MET-B01", 75, 240));

        for (DemoMedicine demo : demoMedicines) {
            if (medicines.existsByNormalizedSku(normalize(demo.sku()))) continue;
            Category category = categories.findByNormalizedNameAndActiveTrue(normalize(demo.category()))
                    .orElseThrow(() -> new IllegalStateException("Demo medicine category is missing: " + demo.category()));
            Medicine medicine = medicines.save(new Medicine(
                    demo.name(), demo.genericName(), demo.brandName(), demo.sku(), demo.dosageStrength(),
                    "Sample inventory record for local demonstration.", demo.unitPrice(), demo.costPrice(),
                    demo.prescriptionRequired(), demo.storageRequirements(), demo.reorderThreshold(), category));
            MedicineBatch batch = batches.save(new MedicineBatch(
                    medicine, demo.batchNumber(), LocalDate.now().plusDays(demo.expiryDays()), demo.quantity()));
            movements.save(new StockMovement(medicine, batch, "STOCK_RECEIVED",
                    demo.quantity(), "Initial demo stock"));
        }
    }

    private static String normalize(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private record DemoMedicine(String name, String genericName, String brandName, String sku,
                                String dosageStrength, BigDecimal unitPrice, BigDecimal costPrice,
                                boolean prescriptionRequired, String storageRequirements, int reorderThreshold,
                                String category, String batchNumber, int quantity, int expiryDays) {}
}
