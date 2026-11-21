package Firqui;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.List;

@SpringBootApplication
@EnableScheduling
public class FirquiApplication {

	public static void main(String[] args) {
		loadDotenv();
		SpringApplication.run(FirquiApplication.class, args);
	}

	private static void loadDotenv() {
		String[] possiblePaths = { ".env", "../.env", "../../.env" };
		for (String path : possiblePaths) {
			File file = new File(path);
			if (file.exists() && file.isFile()) {
				try {
					List<String> lines = Files.readAllLines(file.toPath());
					for (String line : lines) {
						String trimmed = line.trim();
						if (trimmed.isEmpty() || trimmed.startsWith("#") || !trimmed.contains("=")) {
							continue;
						}
						int idx = trimmed.indexOf('=');
						String key = trimmed.substring(0, idx).trim();
						String value = trimmed.substring(idx + 1).trim();
						if ((value.startsWith("\"") && value.endsWith("\"")) ||
							(value.startsWith("'") && value.endsWith("'"))) {
							value = value.substring(1, value.length() - 1);
						}
						if (System.getProperty(key) == null && System.getenv(key) == null) {
							System.setProperty(key, value);
						}
					}
					break;
				} catch (IOException ignored) {
				}
			}
		}
	}
}
