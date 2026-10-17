package Firqui.service;

import Firqui.entity.Product;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.safety.Safelist;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * The rules every listing must follow, applied on every save (admin form or API)
 * and at checkout, so the shop and the orders always agree.
 */
public final class ProductRules {

    public static final String IN_STOCK = "In Stock";
    public static final String ARRIVING_SOON = "Arriving Soon";
    public static final String OUT_OF_STOCK = "Out of Stock";

    static final double MAX_PRICE = 10_000_000;
    static final int MAX_STOCK = 100_000;
    private static final Pattern SKU_PATTERN = Pattern.compile("^[A-Z0-9][A-Z0-9_-]{1,39}$");

    // Formatting the admin editor produces (bold / italic / underline, paragraphs, lists).
    // No attributes at all, so no links, styles, event handlers or scripts survive.
    private static final Safelist RICH_TEXT = new Safelist()
            .addTags("b", "strong", "i", "em", "u", "br", "p", "div", "ul", "ol", "li");

    private static final Document.OutputSettings COMPACT = new Document.OutputSettings().prettyPrint(false);

    private ProductRules() {
    }

    /* =====================================================
       TEXT CLEANING
    ===================================================== */

    /** Plain text: any markup removed, entities decoded, whitespace collapsed. */
    public static String plainText(String value) {
        if (value == null) return null;
        String text = Jsoup.parse(value).text().replaceAll("\\s+", " ").trim();
        return text.isEmpty() ? null : text;
    }

    /** Rich text limited to safe formatting tags. */
    public static String richText(String html) {
        if (html == null) return null;
        String clean = Jsoup.clean(html, "", RICH_TEXT, COMPACT).trim();
        return plainText(clean) == null ? null : clean;
    }

    /* =====================================================
       VALIDATION (after the form values are applied)
    ===================================================== */

    public static void normalizeAndValidate(Product p) {
        String name = plainText(p.getName());
        if (name == null || name.length() < 2) {
            throw new IllegalArgumentException("Please enter a product title (at least 2 characters).");
        }
        if (name.length() > 150) {
            throw new IllegalArgumentException("Product title can be at most 150 characters.");
        }
        p.setName(name);

        p.setDescription(limit(richText(p.getDescription()), 20_000, "Description"));
        p.setProductDetailsDescription(limit(richText(p.getProductDetailsDescription()), 20_000, "Product details"));
        p.setGemstone(limit(plainText(p.getGemstone()), 200, "Gemstone"));
        p.setMaterial(limit(plainText(p.getMaterial()), 200, "Material"));
        p.setColor(limit(plainText(p.getColor()), 200, "Color"));
        p.setTags(limit(plainText(p.getTags()), 500, "Tags"));
        p.setProductDetailsHighlights(cleanList(p.getProductDetailsHighlights(), 300, "Each highlight"));
        p.setMeasurement(cleanList(p.getMeasurement(), 100, "Each size"));

        // Price
        Double price = p.getPrice();
        if (price == null || price.isNaN() || price <= 0) {
            throw new IllegalArgumentException("Price must be more than ₹0.");
        }
        if (price > MAX_PRICE) {
            throw new IllegalArgumentException("Price looks too high. Please check it.");
        }
        p.setPrice(Math.round(price * 100) / 100.0);
        Double compare = p.getComparePrice();
        if (compare != null && compare <= 0) {
            p.setComparePrice(null);
        } else if (compare != null && compare <= price) {
            throw new IllegalArgumentException("Compare-at price must be higher than the selling price (or left empty).");
        }

        // Stock and availability must agree
        int stock = p.getStockQuantity() != null ? p.getStockQuantity() : 0;
        if (stock < 0) {
            throw new IllegalArgumentException("Stock quantity cannot be negative.");
        }
        if (stock > MAX_STOCK) {
            throw new IllegalArgumentException("Stock quantity looks too high. Please check it.");
        }
        p.setStockQuantity(stock);

        String availability = normalizeAvailability(p.getAvailability(), stock);
        p.setAvailability(availability);

        if (IN_STOCK.equals(availability) && stock == 0) {
            throw new IllegalArgumentException("An \"In Stock\" product needs a stock quantity of at least 1. "
                    + "Set the quantity, or choose \"Out of Stock\" or \"Arriving Soon\".");
        }

        if (ARRIVING_SOON.equals(availability)) {
            String date = p.getRestockDate() != null ? p.getRestockDate().trim() : "";
            if (date.isEmpty()) {
                throw new IllegalArgumentException("Please set the expected restock date for an \"Arriving Soon\" product.");
            }
            try {
                LocalDate restock = LocalDate.parse(date);
                if (restock.isBefore(LocalDate.now())) {
                    throw new IllegalArgumentException("The restock date is in the past. Please choose a future date.");
                }
            } catch (DateTimeParseException e) {
                throw new IllegalArgumentException("Restock date must be a valid date (YYYY-MM-DD).");
            }
            p.setRestockDate(date);
        } else {
            p.setRestockDate(null);
        }

        // SKU format (uniqueness is checked against the database by ProductService)
        String sku = p.getSku() != null ? p.getSku().trim().toUpperCase(Locale.ROOT).replaceAll("\\s+", "-") : "";
        if (sku.isEmpty()) {
            p.setSku(null);
        } else if (!SKU_PATTERN.matcher(sku).matches()) {
            throw new IllegalArgumentException("SKU can use letters, numbers, \"-\" and \"_\" (2-40 characters), e.g. FQ-RNG-0042.");
        } else {
            p.setSku(sku);
        }
    }

    public static String normalizeAvailability(String value, int stock) {
        if (value == null || value.isBlank()) {
            return stock > 0 ? IN_STOCK : OUT_OF_STOCK;
        }
        String v = value.trim().toLowerCase(Locale.ROOT);
        if (v.equals("in stock") || v.equals("in_stock") || v.equals("instock")) return IN_STOCK;
        if (v.startsWith("arriving") || v.contains("pre-order") || v.contains("preorder")) return ARRIVING_SOON;
        if (v.equals("out of stock") || v.equals("out_of_stock") || v.equals("outofstock")) return OUT_OF_STOCK;
        throw new IllegalArgumentException("Availability must be \"In Stock\", \"Arriving Soon\" or \"Out of Stock\".");
    }

    /** Suggested SKU, e.g. FQ-RNG-0042. */
    public static String generateSku(String category, Long id) {
        String c = category != null ? category.toUpperCase(Locale.ROOT).replaceAll("[^A-Z]", "") : "";
        String prefix = c.length() >= 3 ? c.substring(0, 3) : "GEN";
        return String.format(Locale.ROOT, "FQ-%s-%04d", prefix, id != null ? id : 0L);
    }

    /* =====================================================
       CHECKOUT
    ===================================================== */

    /** Throws when this quantity cannot be ordered right now. */
    public static void checkCanOrder(Product product, int qty) {
        String name = product.getName();
        if (Boolean.FALSE.equals(product.getActive())) {
            throw new IllegalStateException(name + " is no longer available.");
        }
        String availability = safeAvailability(product);
        if (OUT_OF_STOCK.equals(availability)) {
            throw new IllegalStateException(name + " is currently out of stock.");
        }
        if (ARRIVING_SOON.equals(availability)) {
            return; // pre-order: ships when stock arrives
        }
        int stock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
        if (stock < qty) {
            throw new IllegalStateException(stock <= 0
                    ? name + " is currently out of stock."
                    : "Only " + stock + " left of " + name + ".");
        }
    }

    /** Takes the ordered quantity out of stock; a product that sells out is marked Out of Stock. */
    public static void deductStock(Product product, int qty) {
        if (ARRIVING_SOON.equals(safeAvailability(product)) || product.getStockQuantity() == null) {
            return;
        }
        int left = Math.max(0, product.getStockQuantity() - qty);
        product.setStockQuantity(left);
        if (left == 0) {
            product.setAvailability(OUT_OF_STOCK);
        }
    }

    private static String safeAvailability(Product product) {
        int stock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
        try {
            return normalizeAvailability(product.getAvailability(), stock);
        } catch (IllegalArgumentException e) {
            return stock > 0 ? IN_STOCK : OUT_OF_STOCK;
        }
    }

    /* =====================================================
       HELPERS
    ===================================================== */

    private static String limit(String value, int max, String label) {
        if (value != null && value.length() > max) {
            throw new IllegalArgumentException(label + " is too long (max " + max + " characters).");
        }
        return value;
    }

    private static List<String> cleanList(List<String> values, int maxEach, String label) {
        List<String> out = new ArrayList<>();
        if (values == null) return out;
        for (String v : values) {
            String t = plainText(v);
            if (t != null) out.add(limit(t, maxEach, label));
        }
        return out;
    }
}
