package Firqui.controller;

import Firqui.config.WebConfig;
import Firqui.dto.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/media")
@CrossOrigin(origins = "*", maxAge = 3600)
public class MediaUploadController {

    private static final long MAX_IMAGE_SIZE = 10L * 1024 * 1024; // 10MB
    private static final long MAX_VIDEO_SIZE = 50L * 1024 * 1024; // 50MB

    public static class MediaValidationResult {
        private final boolean valid;
        private final String mediaType; // "image" or "video"
        private final String mimeType;
        private final String extension;
        private final String errorMessage;

        public MediaValidationResult(boolean valid, String mediaType, String mimeType, String extension, String errorMessage) {
            this.valid = valid;
            this.mediaType = mediaType;
            this.mimeType = mimeType;
            this.extension = extension;
            this.errorMessage = errorMessage;
        }

        public boolean isValid() { return valid; }
        public String getMediaType() { return mediaType; }
        public String getMimeType() { return mimeType; }
        public String getExtension() { return extension; }
        public String getErrorMessage() { return errorMessage; }
    }

    public static MediaValidationResult inspectAndValidateMedia(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return new MediaValidationResult(false, null, null, null, "File is missing or empty.");
        }

        long size = file.getSize();
        byte[] header = new byte[16];
        try (InputStream is = file.getInputStream()) {
            int read = is.read(header);
            if (read < 4) {
                return new MediaValidationResult(false, null, null, null, "Invalid or corrupt file header.");
            }
        } catch (IOException e) {
            return new MediaValidationResult(false, null, null, null, "Could not inspect file contents: " + e.getMessage());
        }

        // Magic byte checks:
        // 1. JPEG: FF D8 FF
        if ((header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF) {
            if (size > MAX_IMAGE_SIZE) {
                return new MediaValidationResult(false, "image", "image/jpeg", ".jpg", "Image file exceeds 10MB limit.");
            }
            return new MediaValidationResult(true, "image", "image/jpeg", ".jpg", null);
        }

        // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
        if ((header[0] & 0xFF) == 0x89 && (header[1] & 0xFF) == 0x50 &&
            (header[2] & 0xFF) == 0x4E && (header[3] & 0xFF) == 0x47) {
            if (size > MAX_IMAGE_SIZE) {
                return new MediaValidationResult(false, "image", "image/png", ".png", "Image file exceeds 10MB limit.");
            }
            return new MediaValidationResult(true, "image", "image/png", ".png", null);
        }

        // 3. GIF: "GIF87a" or "GIF89a"
        if (header[0] == 'G' && header[1] == 'I' && header[2] == 'F' && header[3] == '8') {
            if (size > MAX_IMAGE_SIZE) {
                return new MediaValidationResult(false, "image", "image/gif", ".gif", "Image file exceeds 10MB limit.");
            }
            return new MediaValidationResult(true, "image", "image/gif", ".gif", null);
        }

        // 4. WEBP: "RIFF" .... "WEBP"
        if (header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F' &&
            header.length >= 12 && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P') {
            if (size > MAX_IMAGE_SIZE) {
                return new MediaValidationResult(false, "image", "image/webp", ".webp", "Image file exceeds 10MB limit.");
            }
            return new MediaValidationResult(true, "image", "image/webp", ".webp", null);
        }

        // 5. MP4: byte 4..7 contains 'ftyp'
        if (header.length >= 8 && header[4] == 'f' && header[5] == 't' && header[6] == 'y' && header[7] == 'p') {
            if (size > MAX_VIDEO_SIZE) {
                return new MediaValidationResult(false, "video", "video/mp4", ".mp4", "Video file exceeds 50MB limit.");
            }
            return new MediaValidationResult(true, "video", "video/mp4", ".mp4", null);
        }

        // 6. WEBM / MKV EBML Header: 1A 45 DF A3
        if ((header[0] & 0xFF) == 0x1A && (header[1] & 0xFF) == 0x45 &&
            (header[2] & 0xFF) == 0xDF && (header[3] & 0xFF) == 0xA3) {
            if (size > MAX_VIDEO_SIZE) {
                return new MediaValidationResult(false, "video", "video/webm", ".webm", "Video file exceeds 50MB limit.");
            }
            return new MediaValidationResult(true, "video", "video/webm", ".webm", null);
        }

        // Fallback check against declared content type if magic bytes allow
        String reportedContentType = file.getContentType();
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";

        if (reportedContentType != null) {
            if (reportedContentType.equalsIgnoreCase("video/mp4") || originalName.endsWith(".mp4")) {
                if (size > MAX_VIDEO_SIZE) {
                    return new MediaValidationResult(false, "video", "video/mp4", ".mp4", "Video file exceeds 50MB limit.");
                }
                return new MediaValidationResult(true, "video", "video/mp4", ".mp4", null);
            }
            if (reportedContentType.equalsIgnoreCase("video/webm") || originalName.endsWith(".webm")) {
                if (size > MAX_VIDEO_SIZE) {
                    return new MediaValidationResult(false, "video", "video/webm", ".webm", "Video file exceeds 50MB limit.");
                }
                return new MediaValidationResult(true, "video", "video/webm", ".webm", null);
            }
        }

        return new MediaValidationResult(false, null, null, null,
                "Unsupported file format. Only JPEG, PNG, WEBP, GIF images and MP4, WEBM videos are accepted.");
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadMedia(@RequestParam("file") MultipartFile file,
                                         @RequestParam(value = "slot", required = false) String slot) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, "Please select a valid media file to upload."));
        }

        MediaValidationResult validation = inspectAndValidateMedia(file);
        if (!validation.isValid()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiResponse(false, validation.getErrorMessage()));
        }

        try {
            Path uploadDir = WebConfig.getUploadsPath();
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }

            String originalName = file.getOriginalFilename();
            String safeBaseName = (originalName != null && !originalName.trim().isEmpty())
                    ? originalName.replaceAll("[^a-zA-Z0-9._-]", "_")
                    : "media";

            if (safeBaseName.lastIndexOf('.') != -1) {
                safeBaseName = safeBaseName.substring(0, safeBaseName.lastIndexOf('.'));
            }

            String fileName = UUID.randomUUID().toString().substring(0, 8) + "_" + System.currentTimeMillis() + "_" + safeBaseName + validation.getExtension();
            Path destination = uploadDir.resolve(fileName).normalize();

            try (InputStream is = file.getInputStream()) {
                Files.copy(is, destination, StandardCopyOption.REPLACE_EXISTING);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Media uploaded successfully");
            response.put("url", "/uploads/" + fileName);
            response.put("mediaType", validation.getMediaType());
            response.put("mimeType", validation.getMimeType());
            response.put("slot", slot);
            response.put("fileName", fileName);
            response.put("size", file.getSize());

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ApiResponse(false, "Failed to store media file: " + e.getMessage()));
        }
    }
}
