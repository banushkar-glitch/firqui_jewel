/**
 * FIRQUI JEWELS - client-side image downscaling
 * Phone photos are often 4000px+ and 5-12 MB. Shrinking them before upload
 * makes uploads fast and keeps the product pages light.
 *
 *   const smaller = await FirquiImage.compress(file, { maxDimension: 2000 });
 *
 * Returns the original file when it is not a still image, cannot be decoded,
 * or would not get smaller.
 */
(function () {
    "use strict";

    const STILL_IMAGE = /^image\/(jpeg|png|webp)$/i;

    function canvasToBlob(canvas, type, quality) {
        return new Promise(function (resolve) {
            canvas.toBlob(resolve, type, quality);
        });
    }

    async function decode(file) {
        if (window.createImageBitmap) {
            try {
                return await createImageBitmap(file, { imageOrientation: "from-image" });
            } catch (e) {
                // Fall through to <img> decoding
            }
        }
        const url = URL.createObjectURL(file);
        try {
            const img = new Image();
            img.decoding = "async";
            img.src = url;
            await img.decode();
            return img;
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    function renamed(name, type) {
        const ext = type === "image/jpeg" ? ".jpg" : type === "image/webp" ? ".webp" : ".png";
        return (name || "image").replace(/\.[^.]+$/, "") + ext;
    }

    async function compress(file, options) {
        const opts = Object.assign({ maxDimension: 2000, quality: 0.85, output: "auto" }, options || {});
        if (!file || !STILL_IMAGE.test(file.type || "")) return file;

        let source;
        try {
            source = await decode(file);
        } catch (e) {
            return file;
        }

        const width = source.width || source.naturalWidth;
        const height = source.height || source.naturalHeight;
        if (!width || !height) return file;

        const scale = Math.min(1, opts.maxDimension / Math.max(width, height));
        // Already small enough in both pixels and bytes: leave it alone
        if (scale === 1 && file.size < 600 * 1024) {
            if (source.close) source.close();
            return file;
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
        if (source.close) source.close();

        // JPEG for photos; PNG/WebP sources may be transparent, so keep alpha with WebP
        let type = "image/jpeg";
        if (opts.output === "jpeg") {
            type = "image/jpeg";
        } else if (/png|webp/i.test(file.type)) {
            type = "image/webp";
        }

        let blob = await canvasToBlob(canvas, type, opts.quality);
        // Browsers that cannot encode WebP silently return PNG
        if (blob && type === "image/webp" && blob.type !== "image/webp") {
            blob = await canvasToBlob(canvas, "image/png");
        }
        if (!blob || blob.size >= file.size) return file;

        return new File([blob], renamed(file.name, blob.type), {
            type: blob.type,
            lastModified: Date.now()
        });
    }

    window.FirquiImage = { compress: compress };
})();
