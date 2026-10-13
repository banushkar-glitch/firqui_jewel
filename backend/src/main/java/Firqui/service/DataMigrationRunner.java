package Firqui.service;

import Firqui.entity.Category;
import Firqui.entity.Product;
import Firqui.entity.ProductCollection;
import Firqui.entity.User;
import Firqui.repository.CategoryRepository;
import Firqui.repository.ProductCollectionRepository;
import Firqui.repository.ProductRepository;
import Firqui.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Component
public class DataMigrationRunner implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductCollectionRepository collectionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        try {
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'USER'");
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS pincode VARCHAR(10)");
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS address1 VARCHAR(255)");
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS address2 VARCHAR(255)");
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE");
            jdbcTemplate.execute("ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS selected_size VARCHAR(100)");
            jdbcTemplate.execute("ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS product_id VARCHAR(100)");
            jdbcTemplate.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS discount DOUBLE PRECISION");
            jdbcTemplate.execute("ALTER TABLE products ALTER COLUMN main_image TYPE TEXT");
            jdbcTemplate.execute("ALTER TABLE product_images ALTER COLUMN image_url TYPE TEXT");
            try {
                jdbcTemplate.execute("ALTER TABLE order_items DROP CONSTRAINT IF EXISTS fkcf7rywrdyh4drhnslwb4v79er");
                jdbcTemplate.execute("ALTER TABLE order_items ADD CONSTRAINT fkcf7rywrdyh4drhnslwb4v79er FOREIGN KEY (product_db_id) REFERENCES products(id) ON DELETE SET NULL");
            } catch (Exception fkEx) {
                System.out.println("order_items constraint update note: " + fkEx.getMessage());
            }
        } catch (Exception e) {
            System.out.println("User/Cart/Product table schema check/alter: " + e.getMessage());
        }
        seedUsers();
        seedCategories();
        seedCollections();
        seedProducts();
    }

    private void seedUsers() {
        if (!userRepository.existsByEmail("admin@firqui.com")) {
            User admin = new User(
                    "FIRQUI Admin",
                    "admin@firqui.com",
                    "9999999999",
                    passwordEncoder.encode("Admin@123"),
                    "ADMIN"
            );
            userRepository.save(admin);
            System.out.println("✅ Seeded default Admin user: admin@firqui.com");
        }

        if (!userRepository.existsByEmail("user@firqui.com")) {
            User user = new User(
                    "Demo Customer",
                    "user@firqui.com",
                    "8888888888",
                    passwordEncoder.encode("User@123"),
                    "USER"
            );
            userRepository.save(user);
            System.out.println("✅ Seeded default Customer user: user@firqui.com");
        }
    }

    private void seedCategories() {
        if (categoryRepository.count() == 0) {
            List<Category> categories = Arrays.asList(
                    new Category("BRACELETS & CUFFS", "bracelets-and-cuffs", "Exquisite designer bracelets and cuffs.", "../assets/Cuffs.png"),
                    new Category("RINGS", "rings", "Timeless handcrafted rings.", "../assets/Heart Pearl Ring.png"),
                    new Category("BROOCHES", "brooches", "Artisanal brooches for statement elegance.", "../assets/page_10_image_02.png"),
                    new Category("EARRINGS", "earrings", "Dazzling earrings for every occasion.", "../assets/FE1007 Ice Cream Earrings.png"),
                    new Category("NECKLACES", "necklaces", "Majestic necklaces crafted to radiate.", "../assets/FN1003 Ice Cream Necklace.png"),
                    new Category("PEARLS GONE ROGUE", "pearls-gone-rogue", "Unconventional, modern pearl artistry.", "../assets/page_06_image_02.png")
            );
            categoryRepository.saveAll(categories);
            System.out.println("✅ Seeded 6 FIRQUI categories.");
        }
    }

    private void seedCollections() {
        if (collectionRepository.count() == 0) {
            List<ProductCollection> collections = Arrays.asList(
                    new ProductCollection("Firqui Originals", "firqui-originals", "Signature designs from Firqui.", "../assets/page_07_image_02.png"),
                    new ProductCollection("Royale Heritage", "royale-heritage", "Regal inspirations and timeless motifs.", "../assets/page_08_image_02.png"),
                    new ProductCollection("Celestial Glow", "celestial-glow", "Lustrous pieces that capture celestial radiance.", "../assets/page_09_image_02.png"),
                    new ProductCollection("Minimal Luxe", "minimal-luxe", "Clean geometric silhouettes for modern wear.", "../assets/page_11_image_02.png"),
                    new ProductCollection("Vintage Charm", "vintage-charm", "Old-world romance infused with contemporary sparkle.", "../assets/page_12_image_02.png")
            );
            collectionRepository.saveAll(collections);
            System.out.println("✅ Seeded 5 FIRQUI collections.");
        }
    }

    private void seedProducts() {
        if (productRepository.count() > 0) {
            System.out.println("ℹ️ Products already exist in database (" + productRepository.count() + " found). Skipping seed.");
            return;
        }

        List<Product> productsToSave = new ArrayList<>();

        // Helper highlight bullets
        List<String> defaultHighlights = Arrays.asList(
                "Handcrafted with artisanal precision",
                "Hypoallergenic and tarnish-resistant coating",
                "Signature FIRQUI JEWELS hallmark and premium gift packaging",
                "Perfect for festive celebrations and everyday luxury"
        );
        String defaultDesc = "Carefully crafted with attention to detail, designed to blend timeless aesthetics with modern versatility. Made with premium hypoallergenic alloy and high-grade lustrous finish.";

        // 1. Bracelets & Cuffs (1 to 6)
        productsToSave.add(buildProduct("1", "Golden Grace", "BRACELETS & CUFFS", 1499.0, 1899.0,
                "Elegant gold bracelet designed to add sophistication and charm to every look.",
                "../assets/Cuffs.png",
                Arrays.asList("../assets/Cuffs.png", "../assets/page_07_image_02.png"),
                Arrays.asList("Small (6.5 in)", "Standard (7 in)", "Large (7.5 in)"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("2", "Pearl Charm", "BRACELETS & CUFFS", 1799.0, 2199.0,
                "A timeless pearl bracelet combining classic elegance with a refined contemporary finish.",
                "../assets/bracelets/bracelet2.jpg",
                Arrays.asList("../assets/bracelets/bracelet2.jpg", "../assets/page_07_image_02.png"),
                Arrays.asList("Small (6.5 in)", "Standard (7 in)", "Large (7.5 in)"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("3", "Rose Harmony", "BRACELETS & CUFFS", 1299.0, 1599.0,
                "A beautiful designer bracelet created to bring a soft and sophisticated touch to your style.",
                "../assets/bracelets/bracelet3.jpg",
                Arrays.asList("../assets/bracelets/bracelet3.jpg", "../assets/page_07_image_02.png"),
                Arrays.asList("Small (6.5 in)", "Standard (7 in)", "Large (7.5 in)"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("4", "Silver Edge", "BRACELETS & CUFFS", 999.0, 1299.0,
                "Minimal silver cuff with a clean modern design that works beautifully for everyday styling.",
                "../assets/bracelets/bracelet4.jpg",
                Arrays.asList("../assets/bracelets/bracelet4.jpg", "../assets/page_07_image_02.png"),
                Arrays.asList("Small (6.5 in)", "Standard (7 in)", "Large (7.5 in)"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("5", "Floral Bloom", "BRACELETS & CUFFS", 1599.0, 1999.0,
                "A floral-inspired bracelet designed with delicate details for an elegant feminine finish.",
                "../assets/bracelets/bracelet5.jpg",
                Arrays.asList("../assets/bracelets/bracelet5.jpg", "../assets/page_07_image_02.png"),
                Arrays.asList("Small (6.5 in)", "Standard (7 in)", "Large (7.5 in)"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("6", "Luxury Cuff", "BRACELETS & CUFFS", 2199.0, 2699.0,
                "Premium designer cuff featuring a luxurious finish and statement-making contemporary style.",
                "../assets/bracelets/bracelet6.jpg",
                Arrays.asList("../assets/bracelets/bracelet6.jpg", "../assets/page_07_image_02.png"),
                Arrays.asList("Small (6.5 in)", "Standard (7 in)", "Large (7.5 in)"),
                defaultDesc, defaultHighlights));

        // 2. Rings (ring-1 to ring-6)
        productsToSave.add(buildProduct("ring-1", "Elegant Ring", "RINGS", 2499.0, 2999.0,
                "Delicate design for everyday elegance.",
                "../assets/rings/ring1.jpg",
                Arrays.asList("../assets/rings/ring1.jpg", "../assets/Heart Pearl Ring.png"),
                Arrays.asList("US 6", "US 7", "US 8"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("ring-2", "Classic Ring", "RINGS", 2899.0, 3399.0,
                "A timeless piece with a refined finish.",
                "../assets/rings/ring2.jpg",
                Arrays.asList("../assets/rings/ring2.jpg", "../assets/Heart Pearl Ring.png"),
                Arrays.asList("US 6", "US 7", "US 8"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("ring-3", "Statement Ring", "RINGS", 3299.0, 3899.0,
                "Designed to add a sophisticated touch.",
                "../assets/rings/ring3.jpg",
                Arrays.asList("../assets/rings/ring3.jpg", "../assets/Heart Pearl Ring.png"),
                Arrays.asList("US 6", "US 7", "US 8"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("ring-4", "Floral Ring", "RINGS", 2699.0, 3199.0,
                "Inspired by delicate floral details.",
                "../assets/rings/ring4.jpg",
                Arrays.asList("../assets/rings/ring4.jpg", "../assets/Heart Pearl Ring.png"),
                Arrays.asList("US 6", "US 7", "US 8"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("ring-5", "Minimal Ring", "RINGS", 2199.0, 2699.0,
                "Simple, modern and effortlessly elegant.",
                "../assets/rings/ring5.jpg",
                Arrays.asList("../assets/rings/ring5.jpg", "../assets/Heart Pearl Ring.png"),
                Arrays.asList("US 6", "US 7", "US 8"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("ring-6", "Signature Ring", "RINGS", 3499.0, 4199.0,
                "A bold statement piece designed to stand out.",
                "../assets/rings/ring6.jpg",
                Arrays.asList("../assets/rings/ring6.jpg", "../assets/Heart Pearl Ring.png"),
                Arrays.asList("US 6", "US 7", "US 8"),
                defaultDesc, defaultHighlights));

        // 3. Brooches (brooch-1 to brooch-6)
        productsToSave.add(buildProduct("brooch-1", "Elegant Brooch", "BROOCHES", 1899.0, 2299.0,
                "Delicate design for everyday elegance.",
                "../assets/brooches/brooch1.jpg",
                Arrays.asList("../assets/brooches/brooch1.jpg", "../assets/page_10_image_02.png"),
                Arrays.asList("Standard (45mm)"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("brooch-2", "Classic Brooch", "BROOCHES", 2199.0, 2599.0,
                "A timeless piece with a refined finish.",
                "../assets/brooches/brooch2.jpg",
                Arrays.asList("../assets/brooches/brooch2.jpg", "../assets/page_10_image_02.png"),
                Arrays.asList("Standard (45mm)"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("brooch-3", "Statement Brooch", "BROOCHES", 2599.0, 2999.0,
                "Designed to add a sophisticated touch.",
                "../assets/brooches/brooch3.jpg",
                Arrays.asList("../assets/brooches/brooch3.jpg", "../assets/page_10_image_02.png"),
                Arrays.asList("Standard (45mm)"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("brooch-4", "Floral Brooch", "BROOCHES", 1999.0, 2399.0,
                "Inspired by delicate floral details.",
                "../assets/brooches/brooch4.jpg",
                Arrays.asList("../assets/brooches/brooch4.jpg", "../assets/page_10_image_02.png"),
                Arrays.asList("Standard (45mm)"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("brooch-5", "Minimal Brooch", "BROOCHES", 1699.0, 1999.0,
                "Simple, modern and effortlessly elegant.",
                "../assets/brooches/brooch5.jpg",
                Arrays.asList("../assets/brooches/brooch5.jpg", "../assets/page_10_image_02.png"),
                Arrays.asList("Standard (45mm)"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("brooch-6", "Signature Brooch", "BROOCHES", 2799.0, 3299.0,
                "A bold statement piece designed to stand out.",
                "../assets/brooches/brooch6.jpg",
                Arrays.asList("../assets/brooches/brooch6.jpg", "../assets/page_10_image_02.png"),
                Arrays.asList("Standard (45mm)"),
                defaultDesc, defaultHighlights));

        // 4. Earrings (earring-1 to earring-6)
        productsToSave.add(buildProduct("earring-1", "Golden Elegance", "EARRINGS", 1499.0, 1899.0,
                "Statement Earrings designed to impress.",
                "../assets/earrings/earring1.jpg",
                Arrays.asList("../assets/earrings/earring1.jpg", "../assets/FE1007 Ice Cream Earrings.png"),
                Arrays.asList("Standard Drop"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("earring-2", "Pearl Drop", "EARRINGS", 1799.0, 2199.0,
                "Classic Pearl Earrings combining sophistication and style.",
                "../assets/earrings/earring2.jpg",
                Arrays.asList("../assets/earrings/earring2.jpg", "../assets/FE1007 Ice Cream Earrings.png"),
                Arrays.asList("Standard Drop"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("earring-3", "Rose Charm", "EARRINGS", 1299.0, 1599.0,
                "Designer Earrings with an elegant rose finish.",
                "../assets/earrings/earring3.jpg",
                Arrays.asList("../assets/earrings/earring3.jpg", "../assets/FE1007 Ice Cream Earrings.png"),
                Arrays.asList("Standard Drop"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("earring-4", "Silver Grace", "EARRINGS", 999.0, 1299.0,
                "Minimal Earrings crafted for daily radiance.",
                "../assets/earrings/earring4.jpg",
                Arrays.asList("../assets/earrings/earring4.jpg", "../assets/FE1007 Ice Cream Earrings.png"),
                Arrays.asList("Standard Drop"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("earring-5", "Floral Bloom", "EARRINGS", 1599.0, 1999.0,
                "Floral Earrings with delicate handcrafted touches.",
                "../assets/earrings/earring5.jpg",
                Arrays.asList("../assets/earrings/earring5.jpg", "../assets/FE1007 Ice Cream Earrings.png"),
                Arrays.asList("Standard Drop"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("earring-6", "Luxury Drop", "EARRINGS", 2199.0, 2699.0,
                "Premium Earrings featuring exquisite details.",
                "../assets/earrings/earring6.jpg",
                Arrays.asList("../assets/earrings/earring6.jpg", "../assets/FE1007 Ice Cream Earrings.png"),
                Arrays.asList("Standard Drop"),
                defaultDesc, defaultHighlights));

        // 5. Necklaces (necklace-1 to necklace-6)
        productsToSave.add(buildProduct("necklace-1", "Golden Elegance", "NECKLACES", 1499.0, 1899.0,
                "Statement Necklace bringing captivating glow.",
                "../assets/necklaces/necklace1.jpg",
                Arrays.asList("../assets/necklaces/necklace1.jpg", "../assets/FN1003 Ice Cream Necklace.png"),
                Arrays.asList("16 inch", "18 inch"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("necklace-2", "Pearl Grace", "NECKLACES", 1799.0, 2199.0,
                "Classic Pearl Necklace for a majestic look.",
                "../assets/necklaces/necklace2.jpg",
                Arrays.asList("../assets/necklaces/necklace2.jpg", "../assets/FN1003 Ice Cream Necklace.png"),
                Arrays.asList("16 inch", "18 inch"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("necklace-3", "Rose Charm", "NECKLACES", 1299.0, 1599.0,
                "Designer Necklace with subtle rose charm.",
                "../assets/necklaces/necklace3.jpg",
                Arrays.asList("../assets/necklaces/necklace3.jpg", "../assets/FN1003 Ice Cream Necklace.png"),
                Arrays.asList("16 inch", "18 inch"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("necklace-4", "Silver Grace", "NECKLACES", 999.0, 1299.0,
                "Minimal Necklace for sleek contemporary style.",
                "../assets/necklaces/necklace4.jpg",
                Arrays.asList("../assets/necklaces/necklace4.jpg", "../assets/FN1003 Ice Cream Necklace.png"),
                Arrays.asList("16 inch", "18 inch"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("necklace-5", "Floral Bloom", "NECKLACES", 1599.0, 1999.0,
                "Floral Necklace inspired by gentle blooms.",
                "../assets/necklaces/necklace5.jpg",
                Arrays.asList("../assets/necklaces/necklace5.jpg", "../assets/FN1003 Ice Cream Necklace.png"),
                Arrays.asList("16 inch", "18 inch"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("necklace-6", "Luxury Drop", "NECKLACES", 2199.0, 2699.0,
                "Premium Necklace for special celebrations.",
                "../assets/necklaces/necklace6.jpg",
                Arrays.asList("../assets/necklaces/necklace6.jpg", "../assets/FN1003 Ice Cream Necklace.png"),
                Arrays.asList("16 inch", "18 inch"),
                defaultDesc, defaultHighlights));

        // 6. Pearls Gone Rogue (pearl-1 to pearl-6)
        productsToSave.add(buildProduct("pearl-1", "Rogue Pearl", "PEARLS GONE ROGUE", 1999.0, 2499.0,
                "Elegant Pearl Necklace that defies convention.",
                "../assets/pearls/pearl1.jpg",
                Arrays.asList("../assets/pearls/pearl1.jpg", "../assets/page_06_image_02.png"),
                Arrays.asList("Standard"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("pearl-2", "Pearl Rebel", "PEARLS GONE ROGUE", 1499.0, 1899.0,
                "Statement Pearl Earrings with rebel flair.",
                "../assets/pearls/pearl2.jpg",
                Arrays.asList("../assets/pearls/pearl2.jpg", "../assets/page_06_image_02.png"),
                Arrays.asList("Standard"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("pearl-3", "Baroque Twist", "PEARLS GONE ROGUE", 2299.0, 2799.0,
                "Designer Pearl Bracelet with organic shapes.",
                "../assets/pearls/pearl3.jpg",
                Arrays.asList("../assets/pearls/pearl3.jpg", "../assets/page_06_image_02.png"),
                Arrays.asList("Standard"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("pearl-4", "Midnight Pearl", "PEARLS GONE ROGUE", 1799.0, 2199.0,
                "Modern Pearl Ring featuring dark undertones.",
                "../assets/pearls/pearl4.jpg",
                Arrays.asList("../assets/pearls/pearl4.jpg", "../assets/page_06_image_02.png"),
                Arrays.asList("Standard"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("pearl-5", "Ocean Whisper", "PEARLS GONE ROGUE", 2499.0, 2999.0,
                "Layered Pearl Necklace inspired by the deep sea.",
                "../assets/pearls/pearl5.jpg",
                Arrays.asList("../assets/pearls/pearl5.jpg", "../assets/page_06_image_02.png"),
                Arrays.asList("Standard"),
                defaultDesc, defaultHighlights));

        productsToSave.add(buildProduct("pearl-6", "Royal Cascade", "PEARLS GONE ROGUE", 2999.0, 3599.0,
                "Luxury Pearl Set for regal elegance.",
                "../assets/pearls/pearl6.jpg",
                Arrays.asList("../assets/pearls/pearl6.jpg", "../assets/page_06_image_02.png"),
                Arrays.asList("Standard"),
                defaultDesc, defaultHighlights));

        productRepository.saveAll(productsToSave);
        System.out.println("✅ Successfully migrated and seeded all 30 FIRQUI products to PostgreSQL!");
    }

    private Product buildProduct(String legacyId, String name, String category, Double price, Double comparePrice,
                                 String desc, String mainImg, List<String> images, List<String> measurements,
                                 String detailsDesc, List<String> detailsHighlights) {
        Product p = new Product();
        p.setLegacyId(legacyId);
        p.setName(name);
        p.setCategory(category);
        p.setPrice(price);
        p.setComparePrice(comparePrice);
        p.setDescription(desc);
        p.setMainImage(mainImg);
        p.setImages(new ArrayList<>(images));
        p.setMeasurement(new ArrayList<>(measurements));
        p.setProductDetailsDescription(detailsDesc);
        p.setProductDetailsHighlights(new ArrayList<>(detailsHighlights));
        p.setStockQuantity(15);
        p.setAvailability("In Stock");
        p.setActive(true);
        p.setFeatured(true);
        p.setCollection("Firqui Originals");
        return p;
    }
}
