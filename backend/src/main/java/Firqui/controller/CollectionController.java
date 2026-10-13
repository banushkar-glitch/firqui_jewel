package Firqui.controller;

import Firqui.entity.ProductCollection;
import Firqui.repository.ProductCollectionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/collections")
@CrossOrigin(origins = "*", maxAge = 3600)
public class CollectionController {

    @Autowired
    private ProductCollectionRepository collectionRepository;

    @GetMapping
    public ResponseEntity<List<ProductCollection>> getAllCollections() {
        return ResponseEntity.ok(collectionRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<ProductCollection> createCollection(@RequestBody ProductCollection collection) {
        return ResponseEntity.ok(collectionRepository.save(collection));
    }
}
