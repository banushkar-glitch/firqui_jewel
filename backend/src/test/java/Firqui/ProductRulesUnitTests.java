package Firqui;

import Firqui.entity.Product;
import Firqui.service.ProductRules;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class ProductRulesUnitTests {

    private Product valid() {
        Product p = new Product();
        p.setName("Rogue Pearl");
        p.setPrice(1999.0);
        p.setStockQuantity(5);
        p.setAvailability("In Stock");
        return p;
    }

    private String error(Product p) {
        return assertThrows(IllegalArgumentException.class, () -> ProductRules.normalizeAndValidate(p)).getMessage();
    }

    @Test
    @DisplayName("Scripts and attributes are stripped; simple formatting is kept")
    void descriptionIsSanitised() {
        Product p = valid();
        p.setName("<img src=x onerror=alert(1)>Rogue <b>Pearl</b>");
        p.setDescription("<p onclick=\"steal()\">Hand <b>made</b><script>alert(1)</script><a href=\"javascript:x\">link</a></p>");
        p.setProductDetailsHighlights(List.of("<i>Gold</i> plated", "  ", "<script>x</script>"));
        ProductRules.normalizeAndValidate(p);

        assertEquals("Rogue Pearl", p.getName());
        assertEquals("<p>Hand <b>made</b>link</p>", p.getDescription());
        assertEquals(List.of("Gold plated"), p.getProductDetailsHighlights());
    }

    @Test
    @DisplayName("Price must be positive and below the compare-at price")
    void priceRules() {
        Product zero = valid();
        zero.setPrice(0.0);
        assertTrue(error(zero).contains("Price"));

        Product compare = valid();
        compare.setComparePrice(1500.0);
        assertTrue(error(compare).contains("Compare-at"));

        Product emptyCompare = valid();
        emptyCompare.setComparePrice(0.0);
        ProductRules.normalizeAndValidate(emptyCompare);
        assertNull(emptyCompare.getComparePrice());
    }

    @Test
    @DisplayName("In Stock needs stock; Arriving Soon needs a future restock date")
    void availabilityMatchesStock() {
        Product noStock = valid();
        noStock.setStockQuantity(0);
        assertTrue(error(noStock).contains("at least 1"));

        Product negative = valid();
        negative.setStockQuantity(-1);
        assertTrue(error(negative).contains("negative"));

        Product preorder = valid();
        preorder.setStockQuantity(0);
        preorder.setAvailability("Arriving Soon");
        assertTrue(error(preorder).contains("restock date"));

        preorder.setRestockDate(LocalDate.now().minusDays(1).toString());
        assertTrue(error(preorder).contains("past"));

        preorder.setRestockDate(LocalDate.now().plusDays(10).toString());
        ProductRules.normalizeAndValidate(preorder);

        Product unknown = valid();
        unknown.setAvailability("Maybe");
        assertTrue(error(unknown).contains("Availability"));

        Product outOfStock = valid();
        outOfStock.setAvailability("Out of Stock");
        outOfStock.setRestockDate("2030-01-01");
        ProductRules.normalizeAndValidate(outOfStock);
        assertNull(outOfStock.getRestockDate(), "restock date only applies to Arriving Soon");
    }

    @Test
    @DisplayName("SKU is normalised and must use a safe format")
    void skuFormat() {
        Product p = valid();
        p.setSku(" fq rng 0042 ");
        ProductRules.normalizeAndValidate(p);
        assertEquals("FQ-RNG-0042", p.getSku());

        Product bad = valid();
        bad.setSku("<b>x</b>");
        assertTrue(error(bad).contains("SKU"));

        assertEquals("FQ-RIN-0007", ProductRules.generateSku("RINGS", 7L));
        assertEquals("FQ-GEN-0012", ProductRules.generateSku(null, 12L));
    }

    @Test
    @DisplayName("Checkout: out of stock refused, pre-order allowed, selling out marks Out of Stock")
    void checkoutRules() {
        Product p = valid();
        p.setStockQuantity(2);

        assertThrows(IllegalStateException.class, () -> ProductRules.checkCanOrder(p, 3));
        ProductRules.checkCanOrder(p, 2);
        ProductRules.deductStock(p, 2);
        assertEquals(0, p.getStockQuantity());
        assertEquals(ProductRules.OUT_OF_STOCK, p.getAvailability());
        assertThrows(IllegalStateException.class, () -> ProductRules.checkCanOrder(p, 1));

        Product preorder = valid();
        preorder.setStockQuantity(0);
        preorder.setAvailability(ProductRules.ARRIVING_SOON);
        ProductRules.checkCanOrder(preorder, 3);
        ProductRules.deductStock(preorder, 3);
        assertEquals(0, preorder.getStockQuantity());

        Product hidden = valid();
        hidden.setActive(false);
        assertThrows(IllegalStateException.class, () -> ProductRules.checkCanOrder(hidden, 1));
    }
}
