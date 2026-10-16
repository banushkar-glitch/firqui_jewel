/**
 * FIRQUI JEWELS - Main Interactive Script
 * Handles hero slideshow, image upload preview & persistence, and interactive elements.
 */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       1. HERO SLIDESHOW (3 CARDS ON DESKTOP, 1 ON MOBILE)
       ===================================================== */

    const track = document.getElementById("slidesTrack");
    const dots = Array.from(document.querySelectorAll(".slider-dot"));
    const prevButton = document.getElementById("prevButton");
    const nextButton = document.getElementById("nextButton");

    let isAnimating = false;
    let autoplayTimer = null;
    const autoplaySpeed = 5000;


    // Helper: calculate slide step (card width + gap)
    function getSlideStep() {

        const firstCard = track ? track.querySelector(".slide") : null;

        if (!firstCard) return 310;

        const style = window.getComputedStyle(track);
        const gap = parseFloat(style.gap) || 20;

        return firstCard.offsetWidth + gap;
    }


    // Helper: check if mobile
    function isMobileSlider() {
        return window.innerWidth <= 768;
    }


    // Helper: update active pagination dot
    function updateActiveDot() {

        if (!track || !dots.length) return;

        // The active center slide (card 1 on desktop, card 0 on mobile)
        const centerIndex = isMobileSlider() ? 0 : 1;
        const activeCard = track.children[centerIndex];

        if (!activeCard) return;

        const activeIdx = parseInt(activeCard.dataset.index, 10);

        dots.forEach((dot, idx) => {

            dot.classList.toggle(
                "active",
                idx === activeIdx
            );

        });
    }


    /* =====================================================
       UPDATE CENTER SLIDE TITLE
       Only the CENTER image shows its title
       ===================================================== */

    function updateCenterTitle() {

        if (!track) return;

        // Remove title from every slide
        Array.from(track.children).forEach((slide) => {

            slide.classList.remove("center-active");

        });


        /*
         * DESKTOP:
         * 3 cards are visible.
         * The second card is the center card.
         *
         * MOBILE:
         * Only one card is visible.
         * The first card is the center card.
         */

        const centerIndex = isMobileSlider() ? 0 : 1;

        const centerSlide = track.children[centerIndex];

        if (centerSlide) {

            // Force browser reflow to re-trigger post-slide settling animation
            void centerSlide.offsetWidth;

            centerSlide.classList.add("center-active");

        }
    }


    /* =====================================================
       SET TITLE FOR THE SLIDE THAT IS MOVING INTO CENTER
       This is the important synchronization part.
       ===================================================== */

    function setNextCenterTitle() {

        if (!track) return;

        // Remove title from all slides first
        Array.from(track.children).forEach((slide) => {

            slide.classList.remove("center-active");

        });


        /*
         * NEXT SLIDE
         *
         * Desktop:
         * [ LEFT | CENTER | RIGHT ]
         *              ↓
         * [ CENTER | RIGHT | NEW ]
         *
         * The current RIGHT card becomes CENTER.
         *
         * Mobile:
         * [ CURRENT ]
         * [ NEXT enters from right ]
         *
         * The second card becomes visible.
         */

        const targetIndex = isMobileSlider() ? 1 : 2;

        const targetSlide = track.children[targetIndex];

        if (targetSlide) {

            targetSlide.classList.add("center-active");

        }
    }


    function setPrevCenterTitle() {

        if (!track) return;

        // Remove title from all slides first
        Array.from(track.children).forEach((slide) => {

            slide.classList.remove("center-active");

        });


        /*
         * PREVIOUS SLIDE
         *
         * We first move the last card to the beginning.
         *
         * Desktop:
         * [ NEW | CURRENT LEFT | CENTER | RIGHT ]
         *
         * CURRENT LEFT moves into CENTER.
         *
         * Mobile:
         * [ NEW | CURRENT ]
         *
         * NEW becomes visible.
         */

        const targetIndex = isMobileSlider() ? 0 : 1;

        const targetSlide = track.children[targetIndex];

        if (targetSlide) {

            targetSlide.classList.add("center-active");

        }
    }


    /* =====================================================
       NEXT SLIDE
       ===================================================== */

    function nextSlide() {

        if (!track || isAnimating) return;

        isAnimating = true;

        const step = getSlideStep();


        /*
         * IMPORTANT:
         * Change the title BEFORE the image starts moving.
         *
         * This makes the font and image move together.
         */

        setNextCenterTitle();


        // Start image movement
        track.style.transition =
            "transform 0.65s cubic-bezier(0.25, 1, 0.35, 1)";

        track.style.transform =
            `translateX(-${step}px)`;


        const handleTransitionEnd = () => {

            track.removeEventListener(
                "transitionend",
                handleTransitionEnd
            );


            // Move first card to the end
            track.appendChild(
                track.firstElementChild
            );


            // Reset position without animation
            track.style.transition = "none";
            track.style.transform = "translateX(0)";


            // Update pagination
            updateActiveDot();


            /*
             * Make sure the correct center title
             * remains active after DOM rearrangement.
             */
            updateCenterTitle();


            isAnimating = false;
        };


        track.addEventListener(
            "transitionend",
            handleTransitionEnd,
            { once: true }
        );


        // Fallback in case transitionend does not fire
        setTimeout(() => {

            if (isAnimating) {

                handleTransitionEnd();

            }

        }, 700);
    }


    /* =====================================================
       PREVIOUS SLIDE
       ===================================================== */

    function prevSlide() {

        if (!track || isAnimating) return;

        isAnimating = true;

        const step = getSlideStep();


        /*
         * Move last card to the beginning BEFORE animation.
         */
        track.insertBefore(
            track.lastElementChild,
            track.firstElementChild
        );


        track.style.transition = "none";

        track.style.transform =
            `translateX(-${step}px)`;


        // Force browser reflow
        track.offsetHeight;


        /*
         * IMPORTANT:
         * Set the title BEFORE animation starts.
         *
         * Therefore the title moves exactly together
         * with the image.
         */

        setPrevCenterTitle();


        // Start image movement
        track.style.transition =
            "transform 0.65s cubic-bezier(0.25, 1, 0.35, 1)";

        track.style.transform = "translateX(0)";


        const handleTransitionEnd = () => {

            track.removeEventListener(
                "transitionend",
                handleTransitionEnd
            );


            // Update pagination
            updateActiveDot();


            /*
             * Make sure center title stays correct
             * after animation finishes.
             */
            updateCenterTitle();


            isAnimating = false;
        };


        track.addEventListener(
            "transitionend",
            handleTransitionEnd,
            { once: true }
        );


        // Fallback
        setTimeout(() => {

            if (isAnimating) {

                handleTransitionEnd();

            }

        }, 700);
    }


    /* =====================================================
       SLIDE TO A SPECIFIC DOT INDEX
       ===================================================== */

    function goToIndex(targetIndex) {

        if (!track || isAnimating) return;

        const centerIndex = isMobileSlider() ? 0 : 1;
        const currentActiveCard =
            track.children[centerIndex];

        const currentIdx =
            parseInt(
                currentActiveCard.dataset.index,
                10
            );


        if (currentIdx === targetIndex) return;


        const total =
            track.children.length;


        let diff =
            (targetIndex - currentIdx + total) % total;


        if (diff <= total / 2) {

            nextSlide();

        } else {

            prevSlide();

        }
    }


    /* =====================================================
       INITIAL SLIDER ARRANGEMENT
       ===================================================== */

    function initSlider() {

        if (!track) return;


        /*
         * Start with Slide 1
         * data-index="0"
         */

        while (
            track.children[0] &&
            track.children[0].dataset.index !== "0"
        ) {

            track.appendChild(
                track.firstElementChild
            );

        }


        updateActiveDot();

        updateCenterTitle();
    }


    /* =====================================================
       ARROW BUTTON CLICK HANDLERS
       ===================================================== */

    if (nextButton) {

        nextButton.addEventListener(
            "click",
            () => {

                nextSlide();

                restartAutoplay();

            }
        );

    }


    if (prevButton) {

        prevButton.addEventListener(
            "click",
            () => {

                prevSlide();

                restartAutoplay();

            }
        );

    }


    /* =====================================================
       DOTS NAVIGATION
       ===================================================== */

    dots.forEach((dot, index) => {

        dot.addEventListener(
            "click",
            () => {

                goToIndex(index);

                restartAutoplay();

            }
        );

    });


    /* =====================================================
       KEYBOARD ARROW CONTROLS
       ===================================================== */

    document.addEventListener(
        "keydown",
        (e) => {

            if (e.key === "ArrowLeft") {

                prevSlide();

                restartAutoplay();

            } else if (e.key === "ArrowRight") {

                nextSlide();

                restartAutoplay();

            }

        }
    );


    /* =====================================================
       TOUCH SWIPE CONTROLS
       ===================================================== */

    const sliderContainer =
        document.getElementById("heroSlider");


    if (sliderContainer) {

        let touchStartX = 0;
        let touchEndX = 0;


        sliderContainer.addEventListener(
            "touchstart",
            (e) => {

                touchStartX =
                    e.changedTouches[0].screenX;

            },
            { passive: true }
        );


        sliderContainer.addEventListener(
            "touchend",
            (e) => {

                touchEndX =
                    e.changedTouches[0].screenX;


                const distance =
                    touchEndX - touchStartX;


                if (Math.abs(distance) > 40) {

                    if (distance < 0) {

                        // Swipe left
                        nextSlide();

                    } else {

                        // Swipe right
                        prevSlide();

                    }


                    restartAutoplay();

                }

            },
            { passive: true }
        );


        // Pause autoplay on mouse hover
        sliderContainer.addEventListener(
            "mouseenter",
            stopAutoplay
        );


        sliderContainer.addEventListener(
            "mouseleave",
            startAutoplay
        );
    }


    /* =====================================================
       AUTOPLAY CONTROLS
       ===================================================== */

    function startAutoplay() {

        stopAutoplay();


        autoplayTimer =
            setInterval(() => {

                nextSlide();

            }, autoplaySpeed);
    }


    function stopAutoplay() {

        if (autoplayTimer) {

            clearInterval(autoplayTimer);

            autoplayTimer = null;

        }
    }


    function restartAutoplay() {

        stopAutoplay();

        startAutoplay();

    }


    /* =====================================================
       WINDOW RESIZE
       Keep center title correct when switching
       between desktop and mobile.
       ===================================================== */

    window.addEventListener(
        "resize",
        () => {

            if (!isAnimating) {

                updateCenterTitle();

            }

        }
    );


    /* =====================================================
       START SLIDER
       ===================================================== */

    initSlider();

    startAutoplay();



    /* =====================================================
       3. NEWSLETTER SUBSCRIPTION FORM
       ===================================================== */

    const newsletterForm =
        document.getElementById(
            "newsletterForm"
        );

    const newsletterMsg =
        document.getElementById(
            "newsletterMsg"
        );


    if (newsletterForm) {

        newsletterForm.addEventListener(
            "submit",
            (e) => {

                e.preventDefault();


                const input =
                    newsletterForm.querySelector(
                        ".newsletter-input"
                    );


                const email =
                    input
                        ? input.value.trim()
                        : "";


                if (
                    email &&
                    newsletterMsg
                ) {

                    newsletterMsg.style.display =
                        "block";


                    newsletterMsg.textContent =
                        `Thank you! You are now subscribed with ${email}.`;


                    newsletterMsg.style.color =
                        "#0A373B";


                    newsletterMsg.style.fontWeight =
                        "600";


                    newsletterForm.reset();


                    setTimeout(
                        () => {

                            newsletterMsg.style.display =
                                "none";

                        },
                        5000
                    );

                }

            }
        );

    }

});


/* =====================================================
   OPENING ENVELOPE INTRO
===================================================== */

const introScreen =
    document.getElementById(
        "introScreen"
    );

const envelopeIntroKey = "firqui_envelope_intro_shown";

let hasSeenIntro = false;
try {
    hasSeenIntro = sessionStorage.getItem(envelopeIntroKey) === "true";
} catch (e) {
    hasSeenIntro = false;
}

if (hasSeenIntro) {

    if (introScreen) {
        introScreen.remove();
    }

} else {

    try {
        sessionStorage.setItem(envelopeIntroKey, "true");
    } catch (e) {
        // Fallback if sessionStorage is not accessible
    }

    window.addEventListener(
        "load",
        () => {

            const currentIntroScreen =
                document.getElementById(
                    "introScreen"
                );

            setTimeout(
                () => {

                    if (currentIntroScreen) {

                        currentIntroScreen.remove();

                    }

                },
                3400
            );

        }
    );

}


/* =====================================================
   FIRQUI JEWELS - LOGIN MODAL
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const openLoginModal =
            document.getElementById(
                "openLoginModal"
            );


        const authModalOverlay =
            document.getElementById(
                "authModalOverlay"
            );


        const authModalFrame =
            document.getElementById(
                "authModalFrame"
            );


        const authModalClose =
            document.getElementById(
                "authModalClose"
            );


        /* Check elements */

        if (!openLoginModal) {

            console.error(
                "openLoginModal not found"
            );

            return;

        }


        if (!authModalOverlay) {

            console.error(
                "authModalOverlay not found"
            );

            return;

        }


        if (!authModalFrame) {

            console.error(
                "authModalFrame not found"
            );

            return;

        }


        if (!authModalClose) {

            console.error(
                "authModalClose not found"
            );

            return;

        }



        /* =================================================
           OPEN LOGIN
        ================================================= */

        openLoginModal.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                const token = localStorage.getItem("firqui_token");

                // If already logged in, navigate directly to profile
                if (token) {
                    window.location.href = "authentication/profile.html";
                    return;
                }

                // If not logged in, open login modal
                authModalFrame.src =
                    "authentication/login.html?modal=true";

                authModalOverlay.classList.add(
                    "active"
                );

                document.body.style.overflow =
                    "hidden";

            }
        );



        /* =================================================
           CLOSE LOGIN
        ================================================= */

        authModalClose.addEventListener(
            "click",
            function () {

                authModalOverlay.classList.remove(
                    "active"
                );


                document.body.style.overflow =
                    "";


                setTimeout(
                    function () {

                        authModalFrame.src = "";

                    },
                    300
                );

            }
        );



        /* =================================================
           CLICK OUTSIDE
        ================================================= */

        authModalOverlay.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    authModalOverlay
                ) {

                    authModalOverlay.classList.remove(
                        "active"
                    );


                    document.body.style.overflow =
                        "";


                    setTimeout(
                        function () {

                            authModalFrame.src =
                                "";

                        },
                        300
                    );

                }

            }
        );



        /* =================================================
           ESC KEY
        ================================================= */

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Escape" &&
                    authModalOverlay.classList.contains(
                        "active"
                    )
                ) {

                    authModalOverlay.classList.remove(
                        "active"
                    );


                    document.body.style.overflow =
                        "";


                    setTimeout(
                        function () {

                            authModalFrame.src =
                                "";

                        },
                        300
                    );

                }

            }
        );

        /* =====================================================
           CART & WISHLIST NAVIGATION & BADGE
        ====================================================== */
        const headerWishlistBtn = document.querySelector('.header-icons [aria-label="Wishlist"]');
        if (headerWishlistBtn) {
            headerWishlistBtn.addEventListener('click', () => {
                window.location.href = 'products/wishlist.html';
            });
        }

        const headerCartBtn = document.querySelector('.header-icons [aria-label="Shopping Cart"]');
        if (headerCartBtn) {
            headerCartBtn.addEventListener('click', () => {
                window.location.href = 'products/cart.html';
            });
        }

        function updateCartBadge() {
            let count = 0;
            try {
                const localC = JSON.parse(localStorage.getItem("firquiCart") || "[]");
                if (Array.isArray(localC)) {
                    count = localC.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 1), 0);
                }
            } catch (e) {
                count = 0;
            }

            const cartLink =
                document.getElementById("cartHeaderButton") ||
                document.querySelector('.header-icons [aria-label="Shopping Cart"]') ||
                document.querySelector('.header-icon-btn[aria-label="Shopping Cart"]') ||
                document.querySelector('.header-icon-btn[href*="cart.html"]');

            if (!cartLink) return;

            let badge = cartLink.querySelector(".cart-count-badge");
            if (!badge) {
                badge = document.createElement("span");
                badge.className = "cart-count-badge";
                badge.id = "cartCountBadge";
                cartLink.appendChild(badge);
            }

            if (count > 0) {
                badge.textContent = count > 99 ? "99+" : String(count);
                badge.style.display = "flex";
            } else {
                badge.style.display = "none";
            }
        }

        async function syncCartBadge() {
            updateCartBadge();
            const token = localStorage.getItem("firqui_token");
            if (!token) return;

            const API_BASE = window.location.port === "8080" ? "" : "http://localhost:8080";
            try {
                const res = await fetch(`${API_BASE}/api/cart`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data && Array.isArray(data.items)) {
                        try {
                            localStorage.setItem("firquiCart", JSON.stringify(data.items));
                        } catch (e) {}
                        updateCartBadge();
                    }
                }
            } catch (e) {
                console.error("Cart sync error:", e);
            }
        }

        updateCartBadge();
        syncCartBadge();

        window.addEventListener("storage", (e) => {
            if (e.key === "firquiCart") {
                updateCartBadge();
            }
        });

    }
);


/* =================================================
   REGISTER → LOGIN
================================================= */

window.addEventListener(
    "message",
    function (event) {

        if (
            event.data &&
            event.data.type === "openLogin"
        ) {

            const authModalFrame =
                document.getElementById(
                    "authModalFrame"
                );


            if (authModalFrame) {

                authModalFrame.src =
                    "authentication/login.html?modal=true";

            }

        }

    }
);


/* =================================================
   LOGIN → REGISTER
================================================= */

window.addEventListener(
    "message",
    function (event) {

        if (
            event.data &&
            event.data.type === "openRegister"
        ) {

            const authModalFrame =
                document.getElementById(
                    "authModalFrame"
                );


            if (authModalFrame) {

                authModalFrame.src =
                    "authentication/register.html?modal=true";

            }

        }

    }
);