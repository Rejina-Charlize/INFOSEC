package com.medstock.config;

import com.medstock.repository.AccountRepository;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import com.medstock.entity.Account;
import com.medstock.entity.Category;
import com.medstock.entity.Role;
import com.medstock.repository.CategoryRepository;

@Configuration
public class SecurityConfiguration {
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    UserDetailsService userDetailsService(AccountRepository accounts) {
        return username -> {
            Account account = accounts.findByUsername(username)
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
            @Qualifier("corsConfigurationSource") CorsConfigurationSource cors) throws Exception {
        return http
                .cors(configuration -> configuration.configurationSource(cors))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .httpBasic(Customizer.withDefaults())
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/api/health").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/me").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/**").permitAll()
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
            PasswordEncoder encoder,
            @Value("${medstock.admin.username}") String adminUsername,
            @Value("${medstock.admin.password}") String adminPassword,
            @Value("${medstock.pharmacist.username}") String pharmacistUsername,
            @Value("${medstock.pharmacist.password}") String pharmacistPassword) {
        return args -> {
            for (String name : List.of("Analgesics", "Antibiotics", "Chronic Care", "Antihistamines")) {
                if (!categories.existsByNameIgnoreCase(name)) categories.save(new Category(name, null));
            }
            if (adminUsername.isBlank() || adminPassword.isBlank()) {
                System.err.println("No administrator account was provisioned. Set MEDSTOCK_ADMIN_USERNAME and MEDSTOCK_ADMIN_PASSWORD.");
                return;
            }
            if (!accounts.existsByUsername(adminUsername)) {
                accounts.save(new Account(adminUsername, encoder.encode(adminPassword), Role.ADMINISTRATOR));
            }
            if (!pharmacistUsername.isBlank() && !pharmacistPassword.isBlank()
                    && !accounts.existsByUsername(pharmacistUsername)) {
                accounts.save(new Account(pharmacistUsername, encoder.encode(pharmacistPassword), Role.PHARMACIST));
            }
        };
    }
}
