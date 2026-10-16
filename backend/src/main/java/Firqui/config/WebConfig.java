package Firqui.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    public static Path getUploadsPath() {
        Path path = Paths.get("uploads").toAbsolutePath().normalize();
        if (Files.exists(path)) {
            return path;
        }
        Path parentPath = Paths.get("../uploads").toAbsolutePath().normalize();
        if (Files.exists(parentPath)) {
            return parentPath;
        }
        // If neither exists yet, create at root uploads
        try {
            Files.createDirectories(path);
        } catch (IOException ignored) {}
        return path;
    }

    public static Path getPrivatePaymentStoragePath() {
        Path path = Paths.get("private_storage", "payment_proofs").toAbsolutePath().normalize();
        if (Files.exists(path)) {
            return path;
        }
        Path parentPath = Paths.get("..", "private_storage", "payment_proofs").toAbsolutePath().normalize();
        if (Files.exists(parentPath)) {
            return parentPath;
        }
        try {
            Files.createDirectories(path);
        } catch (IOException ignored) {}
        return path;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadDir = getUploadsPath();
        String location = "file:" + uploadDir.toString().replace("\\", "/") + "/";
        // Uploaded files get a unique random prefix and are never overwritten, so browsers may keep them
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(location)
                .setCachePeriod(30 * 24 * 60 * 60);
    }
}
