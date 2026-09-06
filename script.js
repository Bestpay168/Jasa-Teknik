/* =========================================================
   JASA TEKNIK
   script.js
   Customer App • Supabase • Booking • Orders
========================================================= */


/* =========================================================
   1. SUPABASE CONFIG
========================================================= */

const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


/* =========================================================
   2. GLOBAL STATE
========================================================= */

let services = [];
let technicians = [];

let selectedService = null;

let currentCustomer = {
    id: null,
    name: "",
    phone: "",
    address: ""
};

let searchTimer = null;


/* =========================================================
   3. DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    initNavigation();
    initModals();
    initBookingForm();
    initSearch();
    initCategories();
    initProfile();
    initNotification();

    await loadServices();
    await loadTechnicians();

    restoreCustomer();

});


/* =========================================================
   4. LOAD SERVICES
========================================================= */

async function loadServices() {

    const serviceList = document.getElementById("serviceList");

    if (!serviceList) return;

    showLoading(serviceList);

    try {

        const { data, error } = await supabaseClient
            .from("technician_services")
            .select(`
                id,
                technician_id,
                service_name,
                price,
                unit,
                description,
                active
            `)
            .eq("active", true)
            .order("created_at", {
                ascending: false
            });

        if (error) {
            console.error("Gagal mengambil layanan:", error);
            loadFallbackServices();
            return;
        }

        services = data || [];

        /*
         * Jika database masih kosong,
         * tampilkan layanan bawaan.
         */
        if (services.length === 0) {
            loadFallbackServices();
            return;
        }

        renderServices(services);

    } catch (error) {

        console.error(error);

        loadFallbackServices();
    }
}


/* =========================================================
   5. FALLBACK SERVICES
========================================================= */

function loadFallbackServices() {

    services = [
        {
            id: "fallback-1",
            service_name: "Perbaikan Listrik",
            price: 50000,
            unit: "kunjungan",
            description: "Perbaikan instalasi listrik rumah.",
            category: "Listrik"
        },
        {
            id: "fallback-2",
            service_name: "Service AC",
            price: 75000,
            unit: "unit",
            description: "Cuci dan pemeriksaan AC rumah.",
            category: "AC"
        },
        {
            id: "fallback-3",
            service_name: "Service Pompa Air",
            price: 50000,
            unit: "kunjungan",
            description: "Pemeriksaan dan perbaikan pompa air.",
            category: "Pompa Air"
        },
        {
            id: "fallback-4",
            service_name: "Plumbing",
            price: 50000,
            unit: "kunjungan",
            description: "Perbaikan pipa dan saluran air.",
            category: "Plumbing"
        },
        {
            id: "fallback-5",
            service_name: "Perbaikan Rumah",
            price: 75000,
            unit: "kunjungan",
            description: "Perbaikan ringan rumah.",
            category: "Perbaikan Rumah"
        }
    ];

    renderServices(services);
}


/* =========================================================
   6. RENDER SERVICES
========================================================= */

function renderServices(list) {

    const serviceList = document.getElementById("serviceList");
    const emptyState = document.getElementById("serviceEmptyState");

    if (!serviceList) return;

    serviceList.innerHTML = "";

    if (!list || list.length === 0) {

        if (emptyState) {
            emptyState.classList.remove("hidden");
        }

        return;
    }

    if (emptyState) {
        emptyState.classList.add("hidden");
    }

    list.forEach(service => {

        const card = document.createElement("article");

        card.className = "service-card";

        const icon = getServiceIcon(service.service_name);

        card.innerHTML = `
            <div class="service-top">

                <div class="service-icon">
                    ${icon}
                </div>

                <div class="service-info">

                    <h3 class="service-name">
                        ${escapeHTML(service.service_name)}
                    </h3>

                    <p class="service-description">
                        ${escapeHTML(
                            service.description ||
                            "Layanan teknisi profesional."
                        )}
                    </p>

                </div>

            </div>

            <div class="service-price">

                <div>
                    <span class="price-label">
                        Mulai dari
                    </span>

                    <strong class="price">
                        ${formatRupiah(service.price)}
                    </strong>
                </div>

                <button
                    class="service-btn"
                    type="button"
                    data-book-service="${escapeAttribute(
                        service.service_name
                    )}"
                    data-service-price="${Number(service.price) || 0}"
                    data-service-id="${escapeAttribute(
                        String(service.id)
                    )}"
                >
                    Pesan
                </button>

            </div>
        `;

        serviceList.appendChild(card);
    });

    attachBookingButtons();
}


/* =========================================================
   7. BOOKING BUTTONS
========================================================= */

function attachBookingButtons() {

    const buttons = document.querySelectorAll(
        "[data-book-service]"
    );

    buttons.forEach(button => {

        button.addEventListener("click", () => {

            const serviceName =
                button.dataset.bookService;

            const servicePrice =
                Number(button.dataset.servicePrice || 0);

            const serviceId =
                button.dataset.serviceId || null;

            openBookingModal({
                id: serviceId,
                service_name: serviceName,
                price: servicePrice
            });

        });

    });
}


/* =========================================================
   8. OPEN BOOKING MODAL
========================================================= */

function openBookingModal(service) {

    selectedService = service;

    const modal =
        document.getElementById("bookingModal");

    const selectedServiceInput =
        document.getElementById("selectedService");

    const estimatedPrice =
        document.getElementById("estimatedPrice");

    if (selectedServiceInput) {

        selectedServiceInput.value =
            service.service_name;
    }

    if (estimatedPrice) {

        estimatedPrice.value =
            formatRupiah(service.price);
    }

    /*
     * Isi data customer jika sudah tersimpan.
     */

    const nameInput =
        document.getElementById("customerName");

    const phoneInput =
        document.getElementById("customerPhone");

    const addressInput =
        document.getElementById("customerAddress");

    if (nameInput && currentCustomer.name) {
        nameInput.value = currentCustomer.name;
    }

    if (phoneInput && currentCustomer.phone) {
        phoneInput.value = currentCustomer.phone;
    }

    if (addressInput && currentCustomer.address) {
        addressInput.value = currentCustomer.address;
    }

    if (modal) {
        showModal(modal);
    }
}


/* =========================================================
   9. BOOKING FORM
========================================================= */

function initBookingForm() {

    const form =
        document.getElementById("bookingForm");

    if (!form) return;

    form.addEventListener("submit", async event => {

        event.preventDefault();

        await submitBooking(form);

    });
}


/* =========================================================
   10. SUBMIT BOOKING
========================================================= */

async function submitBooking(form) {

    if (!selectedService) {

        showToast(
            "Pilih layanan terlebih dahulu."
        );

        return;
    }

    const name =
        document.getElementById("customerName")
            ?.value.trim();

    const phone =
        document.getElementById("customerPhone")
            ?.value.trim();

    const problem =
        document.getElementById("problemDescription")
            ?.value.trim();

    const address =
        document.getElementById("customerAddress")
            ?.value.trim();

    const schedule =
        document.getElementById("scheduleDate")
            ?.value;

    const photo =
        document.getElementById("problemPhoto")
            ?.files?.[0] || null;

    if (!name) {

        showToast("Nama pelanggan wajib diisi.");

        return;
    }

    if (!phone) {

        showToast("Nomor WhatsApp wajib diisi.");

        return;
    }

    if (!problem) {

        showToast(
            "Jelaskan masalah teknis yang terjadi."
        );

        return;
    }

    if (!address) {

        showToast("Alamat wajib diisi.");

        return;
    }

    if (!schedule) {

        showToast(
            "Pilih jadwal kunjungan."
        );

        return;
    }

    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );

    const originalText =
        submitButton?.textContent;

    if (submitButton) {

        submitButton.disabled = true;

        submitButton.textContent =
            "Mengirim...";
    }

    try {

        /*
         * 1. Simpan / cari customer
         */

        const customer =
            await findOrCreateCustomer(
                name,
                phone,
                address
            );

        if (!customer) {

            throw new Error(
                "Customer gagal dibuat."
            );
        }

        currentCustomer = {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            address: customer.address || address
        };

        saveCustomer();

        /*
         * 2. Upload foto jika tersedia
         */

        let photoUrl = null;

        if (photo) {

            photoUrl =
                await uploadProblemPhoto(
                    photo,
                    phone
                );
        }

        /*
         * 3. Buat order code
         */

        const orderCode =
            generateOrderCode();

        /*
         * 4. Hitung biaya
         */

        const serviceFee =
            Number(selectedService.price) || 0;

        const visitFee = 0;

        const materialFee = 0;

        const commission = 0;

        const total =
            serviceFee +
            visitFee +
            materialFee;

        /*
         * 5. Insert order
         */

        const { data, error } =
            await supabaseClient
                .from("technical_orders")
                .insert({
                    order_code: orderCode,
                    customer_id: customer.id,
                    service_name:
                        selectedService.service_name,
                    problem_description: problem,
                    photo_url: photoUrl,
                    address: address,
                    scheduled_at:
                        new Date(schedule).toISOString(),
                    service_fee: serviceFee,
                    visit_fee: visitFee,
                    material_fee: materialFee,
                    commission: commission,
                    total: total,
                    payment_method: "COD",
                    status: "Menunggu",
                    customer_note:
                        "Pesanan dibuat melalui aplikasi JASA TEKNIK."
                })
                .select()
                .single();

        if (error) {

            console.error(error);

            throw new Error(
                error.message ||
                "Pesanan gagal disimpan."
            );
        }

        /*
         * 6. Tutup modal
         */

        closeAllModals();

        form.reset();

        selectedService = null;

        /*
         * 7. Tampilkan sukses
         */

        showToast(
            `Pesanan ${orderCode} berhasil dibuat.`
        );

        /*
         * 8. Simpan order terakhir
         */

        localStorage.setItem(
            "jasa_teknik_last_order",
            JSON.stringify(data)
        );

        /*
         * 9. Refresh order list
         */

        await loadOrders();

        /*
         * 10. Scroll ke orders
         */

        setTimeout(() => {

            openOrdersModal();

        }, 600);

    } catch (error) {

        console.error(
            "Booking error:",
            error
        );

        showToast(
            "Pesanan gagal dibuat. Silakan coba lagi."
        );

    } finally {

        if (submitButton) {

            submitButton.disabled = false;

            submitButton.textContent =
                originalText || "Pesan Sekarang";
        }
    }
}


/* =========================================================
   11. CUSTOMER
========================================================= */

async function findOrCreateCustomer(
    name,
    phone,
    address
) {

    /*
     * Cari berdasarkan nomor telepon.
     */

    const {
        data: existing,
        error: findError
    } = await supabaseClient
        .from("customers")
        .select("*")
        .eq("phone", phone)
        .limit(1)
        .maybeSingle();

    if (findError) {

        console.warn(
            "Customer lookup:",
            findError
        );
    }

    if (existing) {

        /*
         * Update data terbaru.
         */

        const {
            data: updated,
            error: updateError
        } = await supabaseClient
            .from("customers")
            .update({
                name: name,
                address: address
            })
            .eq("id", existing.id)
            .select()
            .single();

        if (updateError) {

            console.warn(
                "Customer update:",
                updateError
            );

            return existing;
        }

        return updated;
    }

    /*
     * Buat customer baru.
     */

    const {
        data,
        error
    } = await supabaseClient
        .from("customers")
        .insert({
            name: name,
            phone: phone,
            address: address
        })
        .select()
        .single();

    if (error) {

        console.error(
            "Customer insert:",
            error
        );

        throw error;
    }

    return data;
}


/* =========================================================
   12. PHOTO UPLOAD
========================================================= */

async function uploadProblemPhoto(
    file,
    phone
) {

    try {

        const extension =
            getFileExtension(file.name);

        const safePhone =
            String(phone)
                .replace(/\D/g, "");

        const fileName =
            `kerusakan-${safePhone}-${Date.now()}.${extension}`;

        const filePath =
            `orders/${fileName}`;

        /*
         * Bucket yang digunakan:
         *
         * technical-photos
         *
         * Buat bucket tersebut di:
         * Supabase > Storage
         */

        const {
            error: uploadError
        } = await supabaseClient
            .storage
            .from("technical-photos")
            .upload(
                filePath,
                file,
                {
                    cacheControl: "3600",
                    upsert: false
                }
            );

        if (uploadError) {

            console.warn(
                "Upload foto gagal:",
                uploadError
            );

            showToast(
                "Foto tidak berhasil diupload, tetapi pesanan tetap diproses."
            );

            return null;
        }

        /*
         * Jika bucket PUBLIC.
         */

        const {
            data
        } = supabaseClient
            .storage
            .from("technical-photos")
            .getPublicUrl(filePath);

        return data?.publicUrl || null;

    } catch (error) {

        console.error(
            "Photo upload error:",
            error
        );

        return null;
    }
}


/* =========================================================
   13. LOAD TECHNICIANS
========================================================= */

async function loadTechnicians() {

    const technicianList =
        document.getElementById(
            "technicianList"
        );

    if (!technicianList) return;

    showLoading(technicianList);

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("technicians")
            .select(`
                id,
                name,
                phone,
                address,
                photo_url,
                bio,
                category,
                experience,
                rating,
                total_jobs,
                status,
                active
            `)
            .eq("status", "verified")
            .eq("active", true)
            .order("rating", {
                ascending: false
            })
            .limit(12);

        if (error) {

            console.error(
                "Gagal mengambil teknisi:",
                error
            );

            renderTechnicianEmpty();

            return;
        }

        technicians = data || [];

        renderTechnicians(technicians);

    } catch (error) {

        console.error(error);

        renderTechnicianEmpty();
    }
}


/* =========================================================
   14. RENDER TECHNICIANS
========================================================= */

function renderTechnicians(list) {

    const technicianList =
        document.getElementById(
            "technicianList"
        );

    if (!technicianList) return;

    technicianList.innerHTML = "";

    if (!list || list.length === 0) {

        renderTechnicianEmpty();

        return;
    }

    list.forEach(technician => {

        const card =
            document.createElement("article");

        card.className =
            "technician-card";

        const photo =
            technician.photo_url ||
            "assets/icon.png";

        const rating =
            Number(technician.rating || 0)
                .toFixed(1);

        card.innerHTML = `

            <img
                class="technician-photo"
                src="${escapeAttribute(photo)}"
                alt="Foto ${escapeAttribute(
                    technician.name
                )}"
                onerror="this.src='assets/icon.png'"
            >

            <div class="technician-info">

                <h3 class="technician-name">
                    ${escapeHTML(
                        technician.name
                    )}
                </h3>

                <div class="technician-category">
                    ${escapeHTML(
                        technician.category ||
                        "Teknisi Profesional"
                    )}
                </div>

                <div class="technician-rating">
                    ⭐ ${rating}
                    · ${Number(
                        technician.total_jobs || 0
                    )} pekerjaan
                </div>

            </div>

            <span class="technician-status">
                Aktif
            </span>

        `;

        technicianList.appendChild(card);
    });
}


/* =========================================================
   15. EMPTY TECHNICIANS
========================================================= */

function renderTechnicianEmpty() {

    const technicianList =
        document.getElementById(
            "technicianList"
        );

    if (!technicianList) return;

    technicianList.innerHTML = `

        <div class="technician-placeholder">

            <div class="technician-placeholder-icon">
                🛠️
            </div>

            <h3>
                Teknisi sedang disiapkan
            </h3>

            <p>
                Kami sedang menambah teknisi
                profesional di area Anda.
            </p>

        </div>

    `;
}


/* =========================================================
   16. SEARCH
========================================================= */

function initSearch() {

    const searchInput =
        document.getElementById(
            "serviceSearch"
        );

    if (!searchInput) return;

    searchInput.addEventListener(
        "input",
        event => {

            clearTimeout(searchTimer);

            searchTimer = setTimeout(() => {

                const keyword =
                    event.target.value
                        .toLowerCase()
                        .trim();

                if (!keyword) {

                    renderServices(services);

                    return;
                }

                const filtered =
                    services.filter(service => {

                        const name =
                            String(
                                service.service_name ||
                                ""
                            ).toLowerCase();

                        const description =
                            String(
                                service.description ||
                                ""
                            ).toLowerCase();

                        const category =
                            String(
                                service.category ||
                                ""
                            ).toLowerCase();

                        return (
                            name.includes(keyword) ||
                            description.includes(keyword) ||
                            category.includes(keyword)
                        );

                    });

                renderServices(filtered);

            }, 150);

        }
    );
}


/* =========================================================
   17. CATEGORY FILTER
========================================================= */

function initCategories() {

    const buttons =
        document.querySelectorAll(
            "[data-category]"
        );

    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                buttons.forEach(item => {
                    item.classList.remove(
                        "active"
                    );
                });

                button.classList.add("active");

                const category =
                    button.dataset.category;

                filterCategory(category);

            }
        );

    });
}


function filterCategory(category) {

    if (!category || category === "Semua") {

        renderServices(services);

        return;
    }

    const filtered =
        services.filter(service => {

            const name =
                String(
                    service.service_name || ""
                ).toLowerCase();

            const serviceCategory =
                String(
                    service.category || ""
                ).toLowerCase();

            const target =
                category.toLowerCase();

            /*
             * Cocokkan category atau
             * nama layanan.
             */

            return (
                serviceCategory.includes(target) ||
                name.includes(target)
            );

        });

    renderServices(filtered);

    const servicesSection =
        document.getElementById("services");

    if (servicesSection) {

        servicesSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }
}


/* =========================================================
   18. ORDERS
========================================================= */

async function loadOrders() {

    const ordersList =
        document.getElementById(
            "ordersList"
        );

    if (!ordersList) return;

    if (!currentCustomer.id) {

        ordersList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>

                <h3>
                    Belum ada pesanan
                </h3>

                <p>
                    Pesanan Anda akan muncul
                    di sini.
                </p>
            </div>
        `;

        return;
    }

    showLoading(ordersList);

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("technical_orders")
            .select(`
                id,
                order_code,
                service_name,
                total,
                status,
                scheduled_at,
                created_at
            `)
            .eq(
                "customer_id",
                currentCustomer.id
            )
            .order("created_at", {
                ascending: false
            })
            .limit(20);

        if (error) {

            console.error(
                "Order error:",
                error
            );

            ordersList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        ⚠️
                    </div>

                    <h3>
                        Pesanan belum dapat dimuat
                    </h3>

                    <p>
                        Silakan coba lagi.
                    </p>
                </div>
            `;

            return;
        }

        renderOrders(data || []);

    } catch (error) {

        console.error(error);
    }
}


/* =========================================================
   19. RENDER ORDERS
========================================================= */

function renderOrders(orders) {

    const ordersList =
        document.getElementById(
            "ordersList"
        );

    if (!ordersList) return;

    ordersList.innerHTML = "";

    if (!orders.length) {

        ordersList.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    📋
                </div>

                <h3>
                    Belum ada pesanan
                </h3>

                <p>
                    Yuk pesan jasa teknisi
                    sekarang.
                </p>

            </div>
        `;

        return;
    }

    orders.forEach(order => {

        const card =
            document.createElement("div");

        card.className =
            "order-card";

        const date =
            formatDate(order.created_at);

        const schedule =
            order.scheduled_at
                ? formatDate(
                    order.scheduled_at
                )
                : "-";

        card.innerHTML = `

            <div class="order-header">

                <div>

                    <div class="order-code">
                        ${escapeHTML(
                            order.order_code
                        )}
                    </div>

                    <div class="order-date">
                        ${date}
                    </div>

                </div>

                <span class="order-status">
                    ${escapeHTML(
                        order.status ||
                        "Menunggu"
                    )}
                </span>

            </div>

            <div class="order-service">
                ${escapeHTML(
                    order.service_name
                )}
            </div>

            <div class="order-date">
                Jadwal: ${schedule}
            </div>

            <div class="order-total">
                ${formatRupiah(
                    order.total
                )}
            </div>

        `;

        ordersList.appendChild(card);
    });
}


/* =========================================================
   20. OPEN ORDERS
========================================================= */

function openOrdersModal() {

    const modal =
        document.getElementById(
            "ordersModal"
        );

    if (!modal) return;

    showModal(modal);

    loadOrders();
}


/* =========================================================
   21. PROFILE
========================================================= */

function initProfile() {

    const nameInput =
        document.getElementById(
            "profileName"
        );

    const phoneInput =
        document.getElementById(
            "profilePhone"
        );

    if (nameInput) {
        nameInput.value =
            currentCustomer.name || "";
    }

    if (phoneInput) {
        phoneInput.value =
            currentCustomer.phone || "";
    }
}


/* =========================================================
   22. NOTIFICATION
========================================================= */

function initNotification() {

    const button =
        document.querySelector(
            ".notification-btn"
        );

    if (!button) return;

    button.addEventListener(
        "click",
        () => {

            const modal =
                document.getElementById(
                    "notificationModal"
                );

            if (modal) {
                showModal(modal);
            }

        }
    );
}


/* =========================================================
   23. NAVIGATION
========================================================= */

function initNavigation() {

    const navButtons =
        document.querySelectorAll(
            ".bottom-nav button"
        );

    navButtons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const target =
                    button.dataset.target;

                /*
                 * Active state
                 */

                navButtons.forEach(item => {

                    item.classList.remove(
                        "active"
                    );

                });

                button.classList.add(
                    "active"
                );

                /*
                 * Actions
                 */

                if (target === "orders") {

                    openOrdersModal();

                    return;
                }

                if (target === "profile") {

                    const modal =
                        document.getElementById(
                            "profileModal"
                        );

                    if (modal) {
                        showModal(modal);
                    }

                    return;
                }

                const section =
                    document.getElementById(
                        target
                    );

                if (section) {

                    section.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }

            }
        );

    });
}


/* =========================================================
   24. MODALS
========================================================= */

function initModals() {

    /*
     * Semua tombol close.
     */

    const closeButtons =
        document.querySelectorAll(
            ".modal-close"
        );

    closeButtons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const modal =
                    button.closest(".modal");

                if (modal) {
                    hideModal(modal);
                }

            }
        );

    });

    /*
     * Klik area luar modal.
     */

    document.querySelectorAll(
        ".modal"
    ).forEach(modal => {

        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target === modal
                ) {
                    hideModal(modal);
                }

            }
        );

    });

    /*
     * ESC untuk desktop.
     */

    document.addEventListener(
        "keydown",
        event => {

            if (event.key === "Escape") {
                closeAllModals();
            }

        }
    );
}


/* =========================================================
   25. SHOW MODAL
========================================================= */

function showModal(modal) {

    if (!modal) return;

    modal.classList.add("show");
    modal.classList.add("active");

    document.body.style.overflow =
        "hidden";
}


/* =========================================================
   26. HIDE MODAL
========================================================= */

function hideModal(modal) {

    if (!modal) return;

    modal.classList.remove("show");
    modal.classList.remove("active");

    const visibleModal =
        document.querySelector(
            ".modal.show, .modal.active"
        );

    if (!visibleModal) {

        document.body.style.overflow =
            "";
    }
}


/* =========================================================
   27. CLOSE ALL MODALS
========================================================= */

function closeAllModals() {

    document.querySelectorAll(
        ".modal"
    ).forEach(modal => {

        modal.classList.remove("show");
        modal.classList.remove("active");

    });

    document.body.style.overflow = "";
}


/* =========================================================
   28. CUSTOMER LOCAL STORAGE
========================================================= */

function saveCustomer() {

    localStorage.setItem(
        "jasa_teknik_customer",
        JSON.stringify(
            currentCustomer
        )
    );
}


function restoreCustomer() {

    try {

        const saved =
            localStorage.getItem(
                "jasa_teknik_customer"
            );

        if (!saved) return;

        const customer =
            JSON.parse(saved);

        if (!customer) return;

        currentCustomer = {
            id: customer.id || null,
            name: customer.name || "",
            phone: customer.phone || "",
            address: customer.address || ""
        };

        /*
         * Isi profile
         */

        const nameInput =
            document.getElementById(
                "profileName"
            );

        const phoneInput =
            document.getElementById(
                "profilePhone"
            );

        if (nameInput) {
            nameInput.value =
                currentCustomer.name;
        }

        if (phoneInput) {
            phoneInput.value =
                currentCustomer.phone;
        }

    } catch (error) {

        console.error(
            "Restore customer:",
            error
        );
    }
}


/* =========================================================
   29. SERVICE ICON
========================================================= */

function getServiceIcon(name) {

    const value =
        String(name || "")
            .toLowerCase();

    if (
        value.includes("listrik") ||
        value.includes("electric")
    ) {
        return "⚡";
    }

    if (
        value.includes("ac") ||
        value.includes("air conditioner")
    ) {
        return "❄️";
    }

    if (
        value.includes("pompa")
    ) {
        return "💧";
    }

    if (
        value.includes("plumbing") ||
        value.includes("pipa")
    ) {
        return "🚿";
    }

    if (
        value.includes("rumah")
    ) {
        return "🏠";
    }

    if (
        value.includes("cat") ||
        value.includes("painting")
    ) {
        return "🎨";
    }

    return "🛠️";
}


/* =========================================================
   30. ORDER CODE
========================================================= */

function generateOrderCode() {

    const date =
        new Date();

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    const random =
        Math.floor(
            1000 +
            Math.random() * 9000
        );

    return `JT-${year}${month}${day}-${random}`;
}


/* =========================================================
   31. RUPIAH
========================================================= */

function formatRupiah(value) {

    const number =
        Number(value) || 0;

    return new Intl.NumberFormat(
        "id-ID",
        {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0
        }
    ).format(number);
}


/* =========================================================
   32. DATE
========================================================= */

function formatDate(value) {

    if (!value) return "-";

    const date =
        new Date(value);

    if (Number.isNaN(
        date.getTime()
    )) {
        return "-";
    }

    return date.toLocaleString(
        "id-ID",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


/* =========================================================
   33. FILE EXTENSION
========================================================= */

function getFileExtension(
    filename
) {

    const parts =
        String(filename)
            .split(".");

    return (
        parts.length > 1
            ? parts.pop()
            : "jpg"
    ).toLowerCase();
}


/* =========================================================
   34. LOADING
========================================================= */

function showLoading(container) {

    if (!container) return;

    container.innerHTML = `
        <div class="loading">

            <span class="spinner"></span>

            <span>
                Memuat data...
            </span>

        </div>
    `;
}


/* =========================================================
   35. TOAST
========================================================= */

let toastTimer = null;

function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );

    if (!toast) {

        alert(message);

        return;
    }

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {

        toast.classList.remove(
            "show"
        );

    }, 3500);
}


/* =========================================================
   36. ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


function escapeAttribute(value) {

    return escapeHTML(value);
}


/* =========================================================
   37. GLOBAL FUNCTIONS
========================================================= */

window.JasaTeknik = {

    openBookingModal,
    openOrdersModal,
    loadServices,
    loadTechnicians,
    loadOrders,
    showToast,
    formatRupiah

};