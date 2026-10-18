package Firqui.service;

import Firqui.config.WebConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.net.URI;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;

import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

/**
 * ONE-TIME MAINTENANCE: wipe test data before going live.
 *
 * Off unless started with --app.maintenance.reset-test-data=true. Then, before the
 * normal startup seeding runs, it:
 *   1. backs up the database with pg_dump and copies uploaded photos and payment
 *      screenshots into app.maintenance.backup-dir (and stops if the backup fails);
 *   2. deletes all products, orders, carts, wishlists, cancellation requests,
 *      newsletter subscribers, password-reset tokens and non-admin accounts, and every
 *      collection except Pearls Gone Rogue (categories and admin accounts stay);
 *   3. empties the uploads and payment-proof folders.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class DataResetRunner implements CommandLineRunner {

    @Value("${app.maintenance.reset-test-data:false}")
    private boolean enabled;

    @Value("${app.maintenance.backup-dir:../../firqui_backups}")
    private String backupDir;

    @Value("${app.maintenance.pg-dump:pg_dump}")
    private String pgDump;

    @Value("${spring.datasource.url}")
    private String jdbcUrl;

    @Value("${spring.datasource.username}")
    private String dbUser;

    @Value("${spring.datasource.password:}")
    private String dbPassword;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private TransactionTemplate tx;

    @Override
    public void run(String... args) throws Exception {
        if (!enabled) return;

        String stamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"));
        Path dir = Paths.get(backupDir).toAbsolutePath().normalize().resolve("before-reset-" + stamp);
        Files.createDirectories(dir);
        log("Backing up to " + dir);

        backupDatabase(dir.resolve("firqui_jewels.dump"));
        copyTree(WebConfig.getUploadsPath(), dir.resolve("uploads"));
        copyTree(WebConfig.getPrivatePaymentStoragePath(), dir.resolve("payment_proofs"));

        tx.executeWithoutResult(status -> {
            for (String sql : List.of(
                    "DELETE FROM cancellation_requests",
                    "DELETE FROM order_items",
                    "DELETE FROM orders",
                    "DELETE FROM cart_items",
                    "DELETE FROM wishlist_items",
                    "DELETE FROM password_reset_tokens",
                    "DELETE FROM newsletter_subscribers",
                    "DELETE FROM product_images",
                    "DELETE FROM product_measurements",
                    "DELETE FROM product_highlights",
                    "DELETE FROM products",
                    "DELETE FROM users WHERE UPPER(COALESCE(role, '')) NOT IN ('ADMIN', 'ROLE_ADMIN')",
                    "DELETE FROM collections WHERE LOWER(name) <> 'pearls gone rogue'")) {
                int rows = jdbc.update(sql);
                log(sql + "  -> " + rows + " row(s)");
            }
        });

        emptyFolder(WebConfig.getUploadsPath());
        emptyFolder(WebConfig.getPrivatePaymentStoragePath());

        log("Done. Backup kept in " + dir);
        log("Start the backend again WITHOUT --app.maintenance.reset-test-data so this never runs twice.");
    }

    private void backupDatabase(Path file) throws IOException, InterruptedException {
        // jdbc:postgresql://host:port/database
        URI uri = URI.create(jdbcUrl.substring("jdbc:".length()));
        String db = uri.getPath().replaceFirst("^/", "");
        ProcessBuilder pb = new ProcessBuilder(pgDump,
                "-h", uri.getHost(),
                "-p", String.valueOf(uri.getPort() > 0 ? uri.getPort() : 5432),
                "-U", dbUser,
                "-F", "c",
                "-f", file.toString(),
                db);
        pb.environment().put("PGPASSWORD", dbPassword == null ? "" : dbPassword);
        pb.redirectErrorStream(true);
        Process p;
        try {
            p = pb.start();
        } catch (IOException e) {
            throw new IllegalStateException("Could not run pg_dump (" + pgDump + "). Set --app.maintenance.pg-dump to its full path. Nothing was deleted.", e);
        }
        String output = new String(p.getInputStream().readAllBytes());
        if (!p.waitFor(10, TimeUnit.MINUTES) || p.exitValue() != 0 || !Files.exists(file) || Files.size(file) == 0) {
            throw new IllegalStateException("Database backup failed, so nothing was deleted. pg_dump said: " + output);
        }
        log("Database backup: " + file + " (" + Files.size(file) / 1024 + " KB)");
    }

    private static void copyTree(Path from, Path to) throws IOException {
        if (!Files.isDirectory(from)) return;
        try (Stream<Path> paths = Files.walk(from)) {
            for (Path src : (Iterable<Path>) paths::iterator) {
                Path dest = to.resolve(from.relativize(src).toString());
                if (Files.isDirectory(src)) Files.createDirectories(dest);
                else Files.copy(src, dest, StandardCopyOption.REPLACE_EXISTING);
            }
        }
        log("Copied " + from + " -> " + to);
    }

    private static void emptyFolder(Path folder) throws IOException {
        if (!Files.isDirectory(folder)) return;
        try (Stream<Path> paths = Files.walk(folder)) {
            List<Path> inside = paths.filter(p -> !p.equals(folder))
                    .sorted(Comparator.reverseOrder())
                    .toList();
            for (Path p : inside) Files.deleteIfExists(p);
            log("Emptied " + folder + " (" + inside.size() + " item(s))");
        }
    }

    private static void log(String message) {
        System.out.println("[DATA RESET] " + message.replace("\n", " ").trim());
    }
}
