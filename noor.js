// ============================================
// 🌙 NOOR - نور قلبي
// ============================================

// API
const API = "https://api.alquran.cloud/v1";
const MUSHAF_API = "https://api.islamic.app/v1/mushaf/page/";
const PRAYER_API = "https://api.aladhan.com/v1";

// ============================================
// 1. VARIABLES
// ============================================

let allSurahs = [];
let currentAyahs = [];
let currentAyahIndex = 0;

let currentAudio = null;
let currentRepeat = 1;
let currentRepeatCount = 0;

let currentContentType = "surah";
let currentContentName = "";

let favorites = JSON.parse(localStorage.getItem("noorFavorites") || "[]");

let tasbihCount = Number(localStorage.getItem("noorTasbih") || 0);

let currentMushafPage = Number(
    localStorage.getItem("noorMushafPage") || 1
);

let prayerTimings = null;
let prayerCheckInterval = null;

// ============================================
// 2. GENERAL FUNCTIONS
// ============================================

async function fetchData(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("حدث خطأ أثناء تحميل البيانات");
    }

    const result = await response.json();

    if (result.code && result.code !== 200) {
        throw new Error("تعذّر تحميل البيانات");
    }

    return result.data;
}

function saveLastReading() {
    const data = {
        type: currentContentType,
        name: currentContentName,
        index: currentAyahIndex,
        surahNumber:
            currentAyahs[currentAyahIndex]?.surah?.number || null
    };

    localStorage.setItem("noorLastReading", JSON.stringify(data));

    const lastSurah = document.getElementById("lastSurah");

    if (lastSurah && currentContentName) {
        lastSurah.textContent = currentContentName;
    }
}

function showError(message) {
    alert(message);
}

// ============================================
// 3. LOAD SURAH LIST
// ============================================

async function loadSurahs() {
    const list = document.getElementById("surahList");

    if (!list) return;

    list.textContent = "جاري تحميل السور...";

    try {
        allSurahs = await fetchData(`${API}/surah`);

        displaySurahs(allSurahs);

    } catch (error) {
        list.textContent = "تعذّر تحميل السور. تحقّقي من الإنترنت.";
        console.error(error);
    }
}

function displaySurahs(surahs) {
    const list = document.getElementById("surahList");
    if (!list) return;

    list.innerHTML = "";

    if (!Array.isArray(surahs) || surahs.length === 0) {
        const empty = document.createElement("p");
        empty.className = "surah-empty";
        empty.textContent = "لم يتم العثور على سورة بهذا الاسم 🌸";
        list.appendChild(empty);
        return;
    }

    surahs.forEach(surah => {
        const button = document.createElement("button");
        button.className = "surah-card";
        button.type = "button";
        button.setAttribute("aria-label", `افتح سورة ${surah.name}`);

        const name = document.createElement("strong");
        name.className = "surah-name";
        name.textContent = `${surah.number}. ${surah.name}`;

        const details = document.createElement("small");
        const revelation = surah.revelationType === "Meccan" ? "مكيّة" : "مدنيّة";
        details.textContent = `${revelation} • ${surah.numberOfAyahs} آية`;

        button.append(name, details);
        button.addEventListener("click", () => {
            loadSurah(surah.number);
        });
        list.appendChild(button);
    });
}

// ============================================
// 4. SEARCH SURAH
// ============================================

function searchSurahs() {
    const input = document.getElementById("searchSurah");

    if (!input) return;

    const value = input.value.trim().toLowerCase();

    const filtered = allSurahs.filter(surah =>
        surah.name.includes(value) ||
        surah.englishName.toLowerCase().includes(value) ||
        String(surah.number).includes(value)
    );

    displaySurahs(filtered);
}

// ============================================
// 5. LOAD SURAH
// ============================================

async function loadSurah(number) {
    const title = document.getElementById("surahTitle");
    const verses = document.getElementById("verses");

    if (!title || !verses) return;

    stopQuranAudio();

    title.textContent = "جاري تحميل السورة...";
    verses.innerHTML = "";

    try {
        const data = await fetchData(
            `${API}/surah/${number}/quran-uthmani`
        );

        currentAyahs = data.ayahs;
        currentAyahIndex = 0;

        currentContentType = "surah";
        currentContentName = data.name;

        title.textContent =
            `${data.name} - ${data.numberOfAyahs} آية`;

        displayAyahs(currentAyahs);

        saveLastReading();

        document.getElementById("reader")?.scrollIntoView({
            behavior: "smooth"
        });

    } catch (error) {
        title.textContent = "تعذّر تحميل السورة";
        showError("تحقّقي من اتصال الإنترنت وحاولي مجدداً.");
        console.error(error);
    }
}

// ============================================
// 6. DISPLAY AYAHS
// ============================================

function displayAyahs(ayahs) {
    const verses = document.getElementById("verses");

    if (!verses) return;

    verses.innerHTML = "";

    ayahs.forEach((ayah, index) => {
        const card = document.createElement("div");

        card.className = "ayah-card";
        card.dataset.index = index;

        const text = document.createElement("p");
        text.className = "ayah-text";
        text.textContent = ayah.text;

        const number = document.createElement("span");
        number.className = "ayah-number";
        number.textContent = `﴿ ${ayah.numberInSurah || index + 1} ﴾`;

        const controls = document.createElement("div");
        controls.className = "ayah-controls";

        const playButton = document.createElement("button");
        playButton.type = "button";
        playButton.textContent = "▶️ استماع";

        playButton.addEventListener("click", () => {
            currentAyahIndex = index;
            playCurrentAyah();
        });

        const favoriteButton = document.createElement("button");
        favoriteButton.type = "button";
        favoriteButton.textContent = isFavorite(ayah)
            ? "⭐ إزالة من المفضلة"
            : "☆ أضيفي للمفضلة";

        favoriteButton.addEventListener("click", () => {
            toggleFavorite(ayah);
            favoriteButton.textContent = isFavorite(ayah)
                ? "⭐ إزالة من المفضلة"
                : "☆ أضيفي للمفضلة";
        });

        controls.appendChild(playButton);
        controls.appendChild(favoriteButton);

        card.appendChild(text);
        card.appendChild(number);
        card.appendChild(controls);

        verses.appendChild(card);
    });

    highlightCurrentAyah();
}

// ============================================
// 7. HIGHLIGHT CURRENT AYAH
// ============================================

function highlightCurrentAyah() {
    document.querySelectorAll(".ayah-card").forEach(card => {
        card.classList.remove("active-ayah");
    });

    const active = document.querySelector(
        `.ayah-card[data-index="${currentAyahIndex}"]`
    );

    if (active) {
        active.classList.add("active-ayah");

        active.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}

// ============================================
// 8. QURAN AUDIO - NOOR ONLY
// ============================================

function playCurrentAyah() {
    if (!currentAyahs.length) {
        showError("اختاري سورة أو جزءاً أولاً.");
        return;
    }

    const repeatSelect = document.getElementById("repeatCount");

    currentRepeat = Number(repeatSelect?.value || 1);
    currentRepeatCount = 0;

    playAudioFile();
}

function playAudioFile() {
    if (currentAyahIndex >= currentAyahs.length) {
        currentAudio = null;
        showCompletionMessage();
        return;
    }

    const ayah = currentAyahs[currentAyahIndex];

    if (!ayah || !ayah.number) {
        currentAudio = null;
        return;
    }

    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }

    const audio = new Audio(
        `https://cdn.islamic.network/quran/audio/128/ar.husary/${ayah.number}.mp3`
    );

    currentAudio = audio;

    highlightCurrentAyah();

    audio.onended = function () {
        if (currentAudio !== audio) return;

        currentRepeatCount++;

        if (currentRepeatCount < currentRepeat) {
            playAudioFile();
        } else {
            currentRepeatCount = 0;
            currentAyahIndex++;

            saveLastReading();

            if (currentAyahIndex < currentAyahs.length) {
                playAudioFile();
            } else {
                currentAudio = null;
                showCompletionMessage();
            }
        }
    };

    audio.onerror = function () {
        if (currentAudio !== audio) return;

        currentAudio = null;
        showError("تعذّر تشغيل التلاوة. تحقّقي من الإنترنت.");
    };

    audio.play().catch(error => {
        console.error(error);
        showError("اضغطي على زر التشغيل مرة أخرى.");
    });
}

function stopQuranAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio.onended = null;
        currentAudio.onerror = null;
        currentAudio = null;
    }
}

function playNextAyah() {
    if (currentAyahIndex < currentAyahs.length - 1) {
        currentAyahIndex++;
        currentRepeatCount = 0;
        playAudioFile();
    }
}

function playPreviousAyah() {
    if (currentAyahIndex > 0) {
        currentAyahIndex--;
        currentRepeatCount = 0;
        playAudioFile();
    }
}

// ============================================
// 9. COMPLETION MESSAGE
// ============================================

function showCompletionMessage() {
    const message = "جزاكِ الله خيراً، وتقبّل الله منكِ 🤍";

    const box = document.getElementById("completionMessage");

    if (box) {
        box.textContent = message;
        box.classList.add("show");

        setTimeout(() => {
            box.classList.remove("show");
        }, 6000);
    }

    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();

        const speech = new SpeechSynthesisUtterance(
            "جزاك الله خيرا، وتقبل الله منك"
        );

        speech.lang = "ar-SA";
        speech.rate = 0.85;

        window.speechSynthesis.speak(speech);
    }
}

// ============================================
// 10. LOAD JUZ
// ============================================

async function loadJuz(number) {
    const title = document.getElementById("surahTitle");
    const verses = document.getElementById("verses");

    stopQuranAudio();

    if (title) title.textContent = `جاري تحميل الجزء ${number}...`;
    if (verses) verses.innerHTML = "";

    try {
        const data = await fetchData(
            `${API}/juz/${number}/quran-uthmani`
        );

        currentAyahs = data.ayahs;
        currentAyahIndex = 0;

        currentContentType = "juz";
        currentContentName = `الجزء ${number}`;

        if (title) title.textContent = `📚 الجزء ${number}`;

        displayAyahs(currentAyahs);
        saveLastReading();

        document.getElementById("reader")?.scrollIntoView({
            behavior: "smooth"
        });

    } catch (error) {
        showError("تعذّر تحميل الجزء.");
        console.error(error);
    }
}

// ============================================
// 11. LOAD HIZB
// ============================================

async function loadHizb(number) {
    const title = document.getElementById("surahTitle");
    const verses = document.getElementById("verses");

    stopQuranAudio();

    if (title) title.textContent = `جاري تحميل الحزب ${number}...`;
    if (verses) verses.innerHTML = "";

    try {
        const firstQuarter = (number - 1) * 4 + 1;

        const requests = [];

        for (let i = 0; i < 4; i++) {
            requests.push(
                fetchData(
                    `${API}/hizbQuarter/${firstQuarter + i}/quran-uthmani`
                )
            );
        }

        const results = await Promise.all(requests);

        currentAyahs = results.flatMap(result => result.ayahs);
        currentAyahIndex = 0;

        currentContentType = "hizb";
        currentContentName = `الحزب ${number}`;

        if (title) title.textContent = `🌿 الحزب ${number}`;

        displayAyahs(currentAyahs);
        saveLastReading();

        document.getElementById("reader")?.scrollIntoView({
            behavior: "smooth"
        });

    } catch (error) {
        showError("تعذّر تحميل الحزب.");
        console.error(error);
    }
}
// ============================================
// 12. MUSHAF PAGES
// ============================================

function loadMushafPage(page) {
    if (page < 1 || page > 604) return;

    currentMushafPage = page;

    const image = document.getElementById("mushafPageImage");
    const input = document.getElementById("mushafPageNumber");

    if (image) {
        image.src = `${MUSHAF_API}${page}.svg`;
    }

    if (input) {
        input.value = page;
    }

    localStorage.setItem("noorMushafPage", page);
}

function nextMushafPage() {
    if (currentMushafPage < 604) {
        loadMushafPage(currentMushafPage + 1);
    }
}

function previousMushafPage() {
    if (currentMushafPage > 1) {
        loadMushafPage(currentMushafPage - 1);
    }
}

function goToMushafPage() {
    const input = document.getElementById("mushafPageNumber");

    if (!input) return;

    const page = Number(input.value);

    if (!Number.isInteger(page) || page < 1 || page > 604) {
        alert("اختاري صفحة من 1 إلى 604.");
        input.value = currentMushafPage;
        return;
    }

    loadMushafPage(page);
}

// ============================================
// 13. CONTINUE LAST READING
// ============================================

async function continueReading() {
    const saved = localStorage.getItem("noorLastReading");

    if (!saved) {
        alert("لم تبدئي القراءة بعد 🌷");
        return;
    }

    try {
        const data = JSON.parse(saved);

        if (data.type === "surah" && data.surahNumber) {
            await loadSurah(data.surahNumber);
        } else if (data.type === "juz") {
            const number = Number(data.name.replace("الجزء ", ""));
            await loadJuz(number);
        } else if (data.type === "hizb") {
            const number = Number(data.name.replace("الحزب ", ""));
            await loadHizb(number);
        }

        currentAyahIndex = Math.min(
            Number(data.index || 0),
            Math.max(0, currentAyahs.length - 1)
        );

        highlightCurrentAyah();

    } catch (error) {
        console.error(error);
        alert("تعذّرت استعادة آخر قراءة.");
    }
}

// ============================================
// 14. FAVORITES
// ============================================

function isFavorite(ayah) {
    return favorites.some(item =>
        item.number === ayah.number
    );
}

function toggleFavorite(ayah) {
    if (isFavorite(ayah)) {
        favorites = favorites.filter(
            item => item.number !== ayah.number
        );
    } else {
        favorites.push({
            number: ayah.number,
            text: ayah.text,
            numberInSurah: ayah.numberInSurah,
            surah: {
                name: ayah.surah?.name || "القرآن الكريم",
                number: ayah.surah?.number || 0
            }
        });
    }

    localStorage.setItem(
        "noorFavorites",
        JSON.stringify(favorites)
    );

    displayFavorites();
    updateFavoriteCount();
}

function displayFavorites() {
    const list = document.getElementById("favoritesList");

    if (!list) return;

    list.innerHTML = "";

    if (favorites.length === 0) {
        list.textContent = "لا توجد آيات مفضلة حالياً.";
        return;
    }

    favorites.forEach(ayah => {
        const card = document.createElement("div");
        card.className = "ayah-card";

        const text = document.createElement("p");
        text.className = "ayah-text";
        text.textContent = ayah.text;

        const info = document.createElement("p");
        info.textContent =
            `${ayah.surah.name} - الآية ${ayah.numberInSurah}`;

        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "إزالة ⭐";

        remove.addEventListener("click", () => {
            favorites = favorites.filter(
                item => item.number !== ayah.number
            );

            localStorage.setItem(
                "noorFavorites",
                JSON.stringify(favorites)
            );

            displayFavorites();
            updateFavoriteCount();
        });

        card.append(text, info, remove);
        list.appendChild(card);
    });
}

function updateFavoriteCount() {
    const count = document.getElementById("favoriteCount");

    if (count) {
        count.textContent = favorites.length;
    }
}

// ============================================
// 15. DAILY VERSE
// ============================================

async function loadDailyVerse() {
    const element = document.getElementById("dailyVerse");

    if (!element) return;

    try {
        const data = await fetchData(`${API}/ayah/random`);

        element.textContent =
            `${data.text} ﴿ ${data.surah.name} ﴾`;

    } catch (error) {
        element.textContent = "اللهم اجعل القرآن نور قلوبنا 🤍";
        console.error(error);
    }
}

// ============================================
// 16. ADHKAR - NOOR
// ============================================

const adhkarData = {
    morning: [
        "أصبحنا وأصبح الملك لله، والحمد لله.",
        "اللهم بك أصبحنا وبك أمسينا وبك نحيا وبك نموت وإليك النشور.",
        "رضيت بالله رباً، وبالإسلام ديناً، وبمحمد ﷺ نبياً.",
        "سبحان الله وبحمده."
    ],

    evening: [
        "أمسينا وأمسى الملك لله، والحمد لله.",
        "اللهم بك أمسينا وبك أصبحنا وبك نحيا وبك نموت وإليك المصير.",
        "رضيت بالله رباً، وبالإسلام ديناً، وبمحمد ﷺ نبياً.",
        "أستغفر الله وأتوب إليه."
    ],

    sleep: [
        "باسمك اللهم أموت وأحيا.",
        "اللهم قني عذابك يوم تبعث عبادك.",
        "سبحان الله.",
        "الحمد لله.",
        "الله أكبر."
    ],

    wake: [
        "الحمد لله الذي أحيانا بعدما أماتنا وإليه النشور.",
        "الحمد لله الذي عافاني في جسدي وردّ عليّ روحي وأذن لي بذكره."
    ]
};

function showAdhkar(type) {
    const content = document.getElementById("adhkarContent");

    if (!content || !adhkarData[type]) return;

    content.innerHTML = "";

    adhkarData[type].forEach((dhikr, index) => {
        const card = document.createElement("div");

        card.className = "dhikr-card";

        const text = document.createElement("p");
        text.textContent = dhikr;

        const number = document.createElement("span");
        number.textContent = `ذكر ${index + 1}`;

        card.append(number, text);
        content.appendChild(card);
    });
}

// ============================================
// 17. TASBIH
// ============================================

function updateTasbih() {
    const counter = document.getElementById("counter");

    if (counter) {
        counter.textContent = tasbihCount;
    }

    localStorage.setItem("noorTasbih", tasbihCount);
}

function countTasbih() {
    tasbihCount++;
    updateTasbih();
}

function resetTasbih() {
    tasbihCount = 0;
    updateTasbih();
}

// ============================================
// 18. DARK MODE
// ============================================

function toggleTheme() {
    document.body.classList.toggle("dark-mode");

    const dark = document.body.classList.contains("dark-mode");

    localStorage.setItem("noorDarkMode", dark);

    const button = document.getElementById("themeBtn");

    if (button) {
        button.textContent = dark ? "☀️" : "🌙";
    }
}

function loadTheme() {
    const dark = localStorage.getItem("noorDarkMode") === "true";

    document.body.classList.toggle("dark-mode", dark);

    const button = document.getElementById("themeBtn");

    if (button) {
        button.textContent = dark ? "☀️" : "🌙";
    }
}

// ============================================
// 19. DAILY TRACKER
// ============================================

function loadDailyTracker() {
    const today = new Date().toLocaleDateString("en-CA");

    let saved = JSON.parse(
        localStorage.getItem("noorDailyTracker") || "{}"
    );

    if (saved.date !== today) {
        saved = {
            date: today,
            tasks: {}
        };
    }

    document.querySelectorAll("[data-task]").forEach(input => {
        const task = input.dataset.task;

        input.checked = Boolean(saved.tasks[task]);

        input.addEventListener("change", () => {
            saved.tasks[task] = input.checked;

            localStorage.setItem(
                "noorDailyTracker",
                JSON.stringify(saved)
            );

            updateProgress();
        });
    });

    updateProgress();
}

function updateProgress() {
    const tasks = document.querySelectorAll("[data-task]");

    const checked = [...tasks].filter(task => task.checked).length;

    const percentage = tasks.length
        ? Math.round((checked / tasks.length) * 100)
        : 0;

    const fill = document.getElementById("progressFill");
    const text = document.getElementById("progressText");

    if (fill) {
        fill.style.width = `${percentage}%`;
    }

    if (text) {
        text.textContent = `إنجازك اليومي: ${percentage}%`;
    }
}

// ============================================
// 20. PRAYER TIMES - TUNIS
// ============================================


const prayerNames = {
    Fajr: "الفجر",
    Sunrise: "الشروق",
    Dhuhr: "الظهر",
    Asr: "العصر",
    Maghrib: "المغرب",
    Isha: "العشاء"
};

async function loadPrayerTimes() {
    const loading = document.getElementById("prayerLoading");
    const list = document.getElementById("prayerList");

    if (!list) return;

    if (loading) loading.textContent = "جاري تحميل أوقات الصلاة...";

    try {
        const today = new Date();

        const date =
            `${String(today.getDate()).padStart(2, "0")}-` +
            `${String(today.getMonth() + 1).padStart(2, "0")}-` +
            today.getFullYear();

        const url =
            `${PRAYER_API}/timingsByCity/${date}` +
            `?city=Tunis&country=Tunisia&method=3`;

        const data = await fetchData(url);

        prayerTimings = data.timings;

        const dateElement = document.getElementById("prayerDate");

        if (dateElement) {
            dateElement.textContent =
                data.date.readable + " | " + data.date.hijri.date;
        }

        if (loading) loading.textContent = "";

        displayPrayerTimes();

        updateNextPrayer();

        if (prayerCheckInterval) {
            clearInterval(prayerCheckInterval);
        }

        prayerCheckInterval = setInterval(() => {
            updateNextPrayer();
            checkPrayerAlert();
        }, 1000);

    } catch (error) {
        if (loading) {
            loading.textContent =
                "تعذّر تحميل أوقات الصلاة. تحقّقي من الإنترنت.";
        }

        console.error(error);
    }
}

function displayPrayerTimes() {
    const list = document.getElementById("prayerList");

    if (!list || !prayerTimings) return;

    list.innerHTML = "";

    Object.entries(prayerNames).forEach(([key, name]) => {
        const time = prayerTimings[key];

        if (!time) return;

        const card = document.createElement("div");
        card.className = "prayer-card";

        const title = document.createElement("h3");
        title.textContent = name;

        const timeText = document.createElement("p");
        timeText.textContent = cleanPrayerTime(time);

        card.append(title, timeText);
        list.appendChild(card);
    });
}

function cleanPrayerTime(time) {
    return String(time).split(" ")[0];
}

function getPrayerDateTime(time) {
    const [hours, minutes] = cleanPrayerTime(time)
        .split(":")
        .map(Number);

    const date = new Date();

    date.setHours(hours, minutes, 0, 0);

    return date;
}

function updateNextPrayer() {
    if (!prayerTimings) return;

    const now = new Date();

    const prayers = [
        "Fajr",
        "Dhuhr",
        "Asr",
        "Maghrib",
        "Isha"
    ];

    let next = null;

    for (const key of prayers) {
        const prayerTime = getPrayerDateTime(prayerTimings[key]);

        if (prayerTime > now) {
            next = {
                key,
                time: prayerTime
            };

            break;
        }
    }

    if (!next) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [hours, minutes] = cleanPrayerTime(
            prayerTimings.Fajr
        ).split(":").map(Number);

        tomorrow.setHours(hours, minutes, 0, 0);

        next = {
            key: "Fajr",
            time: tomorrow
        };
    }

    const difference = next.time - now;

    const hours = Math.floor(difference / 3600000);
    const minutes = Math.floor((difference % 3600000) / 60000);
    const seconds = Math.floor((difference % 60000) / 1000);

    const name = document.getElementById("nextPrayerName");
    const countdown = document.getElementById("nextPrayerCountdown");

    if (name) {
        name.textContent = `الصلاة القادمة: ${prayerNames[next.key]}`;
    }

    if (countdown) {
        countdown.textContent =
            `${String(hours).padStart(2, "0")}:` +
            `${String(minutes).padStart(2, "0")}:` +
            `${String(seconds).padStart(2, "0")}`;
    }
}

// ============================================
// 21. PRAYER NOTIFICATIONS AND ALERT
// ============================================

async function enablePrayerNotifications() {
    if (!("Notification" in window)) {
        alert("المتصفح لا يدعم الإشعارات.");
        return;
    }

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
        alert("تم تفعيل إشعارات المتصفح 🤍");
    } else {
        alert("لم يتم السماح بالإشعارات.");
    }
}

function checkPrayerAlert() {
    if (!prayerTimings) return;

    const adhanEnabled =
        document.getElementById("adhanEnabled")?.checked;

    const notificationsEnabled =
        document.getElementById("notificationsEnabled")?.checked;

    if (!adhanEnabled && !notificationsEnabled) return;

    const now = new Date();

    const currentTime =
        `${String(now.getHours()).padStart(2, "0")}:` +
        `${String(now.getMinutes()).padStart(2, "0")}`;

    const today = now.toLocaleDateString("en-CA");

    Object.entries(prayerNames).forEach(([key, name]) => {
        if (key === "Sunrise") return;

        const prayerTime = cleanPrayerTime(prayerTimings[key]);

        if (currentTime !== prayerTime) return;

        const alertKey = `noorPrayerAlert-${today}-${key}`;

        if (localStorage.getItem(alertKey)) return;

        localStorage.setItem(alertKey, "true");

        showPrayerAlert(name, adhanEnabled, notificationsEnabled);
    });
}

function showPrayerAlert(name, adhanEnabled, notificationsEnabled) {
    const message = `حان الآن وقت صلاة ${name}. حيّ على الصلاة 🤍`;

    const prayerMessage = document.getElementById("prayerMessage");

    if (prayerMessage) {
        prayerMessage.textContent = message;
    }

    if (
        notificationsEnabled &&
        "Notification" in window &&
        Notification.permission === "granted"
    ) {
        new Notification("🌙 نور قلبي", {
            body: message
        });
    }

    if (adhanEnabled && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();

        const speech = new SpeechSynthesisUtterance(message);

        speech.lang = "ar-SA";
        speech.rate = 0.85;

        window.speechSynthesis.speak(speech);
    }
}

function stopAdhan() {
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }
}

// ============================================
// 22. EVENT LISTENERS
// ============================================

function setupEvents() {
    document.getElementById("searchSurah")
        ?.addEventListener("input", searchSurahs);

    document.getElementById("themeBtn")
        ?.addEventListener("click", toggleTheme);

    document.getElementById("playVerse")
        ?.addEventListener("click", playCurrentAyah);

    document.getElementById("stopAudio")
        ?.addEventListener("click", stopQuranAudio);

    document.getElementById("countBtn")
        ?.addEventListener("click", countTasbih);

    document.getElementById("resetBtn")
        ?.addEventListener("click", resetTasbih);

    document.getElementById("stopAdhan")
        ?.addEventListener("click", stopAdhan);

    document.getElementById("enablePrayerNotifications")
        ?.addEventListener("click", enablePrayerNotifications);
}

// ============================================
// 23. START NOOR
// ============================================

async function startNoor() {
    setupEvents();

    loadTheme();

    updateTasbih();

    displayFavorites();
    updateFavoriteCount();

    loadDailyTracker();

    loadMushafPage(currentMushafPage);

    loadDailyVerse();

    await loadSurahs();

    await loadPrayerTimes();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startNoor, { once: true });
} else {
    startNoor();
}
// ==========================================
// 🌸 PART 3 - DOUAA | دعاء
// بدون صوت نهائياً
// ==========================================

window.DouaaApp = (() => {

    const content = document.getElementById("douaaContent");

    // ======================================
    // 1. حفظ البيانات
    // ======================================

    function getSavedData(key, defaultValue) {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : defaultValue;
        } catch (error) {
            return defaultValue;
        }
    }

    function saveData(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    let favorites = getSavedData("douaaFavorites", []);
    let learnedLetters = getSavedData("douaaLearnedLetters", []);
    let dailyEntries = getSavedData("douaaDailyEntries", []);
    let athkarCounts = getSavedData("douaaAthkarCounts", {});

    // ======================================
    // 2. مكتبة الأدعية
    // ======================================

    const duas = [
        {
            title: "دعاء الصباح",
            category: "الصباح",
            text: "أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له."
        },
        {
            title: "دعاء المساء",
            category: "المساء",
            text: "أمسينا وأمسى الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له."
        },
        {
            title: "دعاء العلم",
            category: "العلم",
            text: "رَبِّ زِدْنِي عِلْمًا."
        },
        {
            title: "دعاء التوفيق",
            category: "الدراسة",
            text: "اللهم وفّقني في دراستي، ويسّر لي أمري، وافتح عليّ أبواب العلم."
        },
        {
            title: "دعاء قبل الدراسة",
            category: "الدراسة",
            text: "اللهم انفعني بما علّمتني وعلّمني ما ينفعني وزدني علماً."
        },
        {
            title: "دعاء قبل الامتحان",
            category: "الدراسة",
            text: "اللهم لا سهل إلا ما جعلته سهلاً، وأنت تجعل الحزن إذا شئت سهلاً."
        },
        {
            title: "دعاء الطمأنينة",
            category: "الطمأنينة",
            text: "اللهم أنزل على قلبي السكينة والطمأنينة، واملأ حياتي بالخير."
        },
        {
            title: "دعاء الهم",
            category: "الطمأنينة",
            text: "اللهم إني أعوذ بك من الهم والحزن، وأسألك راحة القلب."
        },
        {
            title: "دعاء المغفرة",
            category: "المغفرة",
            text: "رب اغفر لي وتب عليّ إنك أنت التواب الرحيم."
        },
        {
            title: "دعاء الوالدين",
            category: "العائلة",
            text: "رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا."
        },
        {
            title: "دعاء الرزق",
            category: "الرزق",
            text: "اللهم ارزقني رزقاً طيباً مباركاً فيه."
        },
        {
            title: "دعاء الشكر",
            category: "الشكر",
            text: "اللهم أعنّي على ذكرك وشكرك وحسن عبادتك."
        },
        {
            title: "دعاء الهداية",
            category: "الهداية",
            text: "اللهم اهدني وسدّدني، واجعلني من عبادك الصالحين."
        },
        {
            title: "دعاء الحفظ",
            category: "الحفظ",
            text: "اللهم احفظني واحفظ أهلي ومن أحب من كل سوء."
        },
        {
            title: "دعاء دخول المنزل",
            category: "أدعية يومية",
            text: "بسم الله ولجنا، وبسم الله خرجنا، وعلى ربنا توكلنا."
        },
        {
            title: "دعاء الخروج من المنزل",
            category: "أدعية يومية",
            text: "بسم الله، توكلت على الله، ولا حول ولا قوة إلا بالله."
        },
        {
            title: "دعاء النوم",
            category: "أدعية يومية",
            text: "باسمك اللهم أموت وأحيا."
        },
        {
            title: "دعاء الاستيقاظ",
            category: "أدعية يومية",
            text: "الحمد لله الذي أحيانا بعدما أماتنا وإليه النشور."
        },
        {
            title: "دعاء الخير",
            category: "الخير",
            text: "اللهم إني أسألك من الخير كله عاجله وآجله."
        },
        {
            title: "دعاء الجنة",
            category: "الآخرة",
            text: "اللهم إني أسألك الجنة وأعوذ بك من النار."
        },
        {
            title: "دعاء حسن الخاتمة",
            category: "الآخرة",
            text: "اللهم ارزقني حسن الخاتمة واجعل خير أعمالي خواتيمها."
        },
        {
            title: "دعاء بعد الصلاة",
            category: "الصلاة",
            text: "اللهم أعنّي على ذكرك وشكرك وحسن عبادتك."
        },
        {
            title: "دعاء جامع",
            category: "أدعية متنوعة",
            text: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ."
        }
    ];

    // ======================================
    // 3. الأذكار
    // ======================================

    const athkar = {
        morning: {
            title: "أذكار الصباح",
            items: [
                { text: "أصبحنا وأصبح الملك لله والحمد لله.", count: 1 },
                { text: "سبحان الله وبحمده.", count: 100 },
                { text: "أستغفر الله وأتوب إليه.", count: 100 },
                { text: "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.", count: 10 },
                { text: "اللهم صل وسلم على نبينا محمد.", count: 10 }
            ]
        },

        evening: {
            title: "أذكار المساء",
            items: [
                { text: "أمسينا وأمسى الملك لله والحمد لله.", count: 1 },
                { text: "سبحان الله وبحمده.", count: 100 },
                { text: "أستغفر الله وأتوب إليه.", count: 100 },
                { text: "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.", count: 10 },
                { text: "اللهم صل وسلم على نبينا محمد.", count: 10 }
            ]
        },

        prayer: {
            title: "أذكار بعد الصلاة",
            items: [
                { text: "أستغفر الله.", count: 3 },
                { text: "اللهم أنت السلام ومنك السلام تباركت يا ذا الجلال والإكرام.", count: 1 },
                { text: "سبحان الله.", count: 33 },
                { text: "الحمد لله.", count: 33 },
                { text: "الله أكبر.", count: 33 }
            ]
        }
    };

    // ======================================
    // 4. الحروف العربية ومخارجها
    // ======================================

    const letters = [
        { letter: "ء", name: "الهمزة", makhraj: "أقصى الحلق" },
        { letter: "ا", name: "الألف", makhraj: "الجوف" },
        { letter: "ب", name: "الباء", makhraj: "الشفتان" },
        { letter: "ت", name: "التاء", makhraj: "طرف اللسان مع أصول الثنايا العليا" },
        { letter: "ث", name: "الثاء", makhraj: "طرف اللسان مع أطراف الثنايا العليا" },
        { letter: "ج", name: "الجيم", makhraj: "وسط اللسان" },
        { letter: "ح", name: "الحاء", makhraj: "وسط الحلق" },
        { letter: "خ", name: "الخاء", makhraj: "أدنى الحلق" },
        { letter: "د", name: "الدال", makhraj: "طرف اللسان مع أصول الثنايا العليا" },
        { letter: "ذ", name: "الذال", makhraj: "طرف اللسان مع أطراف الثنايا العليا" },
        { letter: "ر", name: "الراء", makhraj: "طرف اللسان" },
        { letter: "ز", name: "الزاي", makhraj: "طرف اللسان مع ما بين الثنايا" },
        { letter: "س", name: "السين", makhraj: "طرف اللسان مع ما بين الثنايا" },
        { letter: "ش", name: "الشين", makhraj: "وسط اللسان" },
        { letter: "ص", name: "الصاد", makhraj: "طرف اللسان مع ما بين الثنايا" },
        { letter: "ض", name: "الضاد", makhraj: "حافة اللسان" },
        { letter: "ط", name: "الطاء", makhraj: "طرف اللسان مع أصول الثنايا العليا" },
        { letter: "ظ", name: "الظاء", makhraj: "طرف اللسان مع أطراف الثنايا العليا" },
        { letter: "ع", name: "العين", makhraj: "وسط الحلق" },
        { letter: "غ", name: "الغين", makhraj: "أدنى الحلق" },
        { letter: "ف", name: "الفاء", makhraj: "باطن الشفة السفلى مع أطراف الثنايا العليا" },
        { letter: "ق", name: "القاف", makhraj: "أقصى اللسان" },
        { letter: "ك", name: "الكاف", makhraj: "أقصى اللسان أسفل من القاف" },
        { letter: "ل", name: "اللام", makhraj: "حافة اللسان" },
        { letter: "م", name: "الميم", makhraj: "الشفتان" },
        { letter: "ن", name: "النون", makhraj: "طرف اللسان" },
        { letter: "ه", name: "الهاء", makhraj: "أقصى الحلق" },
        { letter: "و", name: "الواو", makhraj: "الشفتان والجوف في المد" },
        { letter: "ي", name: "الياء", makhraj: "وسط اللسان والجوف في المد" }
    ];

    // ======================================
    // 5. قواعد التجويد - شرح نصّي فقط
    // ======================================

    const tajweedRules = [
        {
            title: "الإظهار",
            description: "نطق النون الساكنة أو التنوين بوضوح دون غنة زائدة.",
            letters: "ء، هـ، ع، ح، غ، خ"
        },
        {
            title: "الإدغام",
            description: "إدخال النون الساكنة أو التنوين في الحرف الذي يأتي بعدها.",
            letters: "ي، ر، م، ل، و، ن"
        },
        {
            title: "الإقلاب",
            description: "قلب النون الساكنة أو التنوين ميماً مخفاة عند حرف الباء.",
            letters: "ب"
        },
        {
            title: "الإخفاء",
            description: "النطق بالنون الساكنة أو التنوين بين الإظهار والإدغام مع الغنة.",
            letters: "ص، ذ، ث، ك، ج، ش، ق، س، د، ط، ز، ف، ت، ض، ظ"
        },
        {
            title: "المد",
            description: "إطالة الصوت بحرف من حروف المد عند تحقق شروطه.",
            letters: "ا، و، ي"
        },
        {
            title: "القلقلة",
            description: "اضطراب الصوت عند النطق بحرف القلقلة الساكن.",
            letters: "ق، ط، ب، ج، د"
        },
        {
            title: "الغنة",
            description: "صوت يخرج من الخيشوم، ويكون واضحاً في النون والميم المشددتين."
        }
    ];

    // ======================================
    // 6. رسالة الترحيب
    // ======================================

    function showWelcome() {
        if (!content) return;

        content.innerHTML = `
            <div class="douaa-welcome">
                <div class="welcome-icon">🌸</div>
                <h2>مرحباً بكِ في Douaa</h2>
                <p>مساحتك الصغيرة للذكر والطمأنينة 🤍</p>
                <p>اجعلي يومك مليئاً بذكر الله.</p>

                <div class="welcome-decoration">🤍 🌷 🤍</div>

                <button class="main-button"
                    onclick="DouaaApp.showSection('duas')">
                    اكتشفي الأدعية
                </button>
            </div>
        `;
    }

    // ======================================
    // 7. عرض الأدعية
    // ======================================

    function showDuas() {
        content.innerHTML = `
            <div class="douaa-section">
                <h2>🤲 مكتبة الأدعية</h2>
                <p>مجموعة من الأدعية لترافق يومك.</p>

                <div class="cards-grid">
                    ${duas.map((dua, index) => `
                        <div class="dua-card">
                            <h3>${dua.title}</h3>
                            <span class="category">${dua.category}</span>
                            <p class="dua-text">${dua.text}</p>

                            <button onclick="DouaaApp.toggleFavorite(${index})">
                                ${isFavorite("dua", index) ? "💗 إزالة من المفضلة" : "♡ أضف للمفضلة"}
                            </button>
                        </div>
                    `).join("")}
                </div>
            </div>
        `;
    }

    // ======================================
    // 8. عرض الأذكار
    // ======================================

    function showAthkar() {
        content.innerHTML = `
            <div class="douaa-section">
                <h2>📿 الأذكار</h2>
                <p>اختاري مجموعة الأذكار التي تريدين قراءتها.</p>

                <div class="cards-grid">
                    <button class="main-button"
                        onclick="DouaaApp.showAthkarGroup('morning')">
                        🌅 أذكار الصباح
                    </button>

                    <button class="main-button"
                        onclick="DouaaApp.showAthkarGroup('evening')">
                        🌙 أذكار المساء
                    </button>

                    <button class="main-button"
                        onclick="DouaaApp.showAthkarGroup('prayer')">
                        🤍 أذكار بعد الصلاة
                    </button>
                </div>
            </div>
        `;
    }

    function showAthkarGroup(group) {
        const selected = athkar[group];

        if (!selected) return;

        content.innerHTML = `
            <div class="douaa-section">
                <button class="back-button"
                    onclick="DouaaApp.showSection('athkar')">
                    ← رجوع
                </button>

                <h2>📿 ${selected.title}</h2>

                <div class="cards-grid">
                    ${selected.items.map((item, index) => {
                        const key = group + "_" + index;
                        const current = athkarCounts[key] || 0;

                        return `
                            <div class="dua-card">
                                <p class="dua-text">${item.text}</p>
                                <p>العدد المطلوب: ${item.count}</p>
                                <p>عدد مرات القراءة: <strong id="count-${key}">${current}</strong></p>

                                <button onclick="DouaaApp.countAthkar('${key}', ${item.count})">
                                    📿 تسبيح
                                </button>

                                <button onclick="DouaaApp.resetAthkar('${key}')">
                                    إعادة
                                </button>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>
        `;
    }

    function countAthkar(key, maximum) {
        athkarCounts[key] = (athkarCounts[key] || 0) + 1;

        if (athkarCounts[key] > maximum) {
            athkarCounts[key] = maximum;
        }

        saveData("douaaAthkarCounts", athkarCounts);

        const counter = document.getElementById("count-" + key);

        if (counter) {
            counter.textContent = athkarCounts[key];
        }
    }

    function resetAthkar(key) {
        athkarCounts[key] = 0;
        saveData("douaaAthkarCounts", athkarCounts);

        const counter = document.getElementById("count-" + key);

        if (counter) {
            counter.textContent = "0";
        }
    }

    // ======================================
    // 9. عرض الحروف ومخارجها
    // ======================================

    function showLetters() {
        content.innerHTML = `
            <div class="douaa-section">
                <h2>🔤 الحروف العربية ومخارجها</h2>
                <p>اختاري حرفاً للتعرّف على مخرجه.</p>

                <div class="letters-grid">
                    ${letters.map((item, index) => `
                        <button class="letter-card"
                            onclick="DouaaApp.showLetterDetails(${index})">
                            <span>${item.letter}</span>
                            <small>${item.name}</small>
                            ${learnedLetters.includes(index) ? "✓" : ""}
                        </button>
                    `).join("")}
                </div>

                <p class="progress-information">
                    الحروف التي تعلّمتها:
                    ${learnedLetters.length} / ${letters.length}
                </p>

                <div class="progress-bar">
                    <div class="progress-fill"
                        style="width:${learnedLetters.length / letters.length * 100}%">
                    </div>
                </div>

                <h3>صورة مخارج الحروف</h3>
                <img
                    src="makharij.png"
                    alt="صورة توضيحية لمخارج الحروف العربية"
                    class="makharij-image">
            </div>
        `;
    }

    function showLetterDetails(index) {
        const item = letters[index];

        if (!item) return;

        content.innerHTML = `
            <div class="douaa-section letter-details">
                <button class="back-button"
                    onclick="DouaaApp.showSection('letters')">
                    ← رجوع للحروف
                </button>

                <div class="letter-big">${item.letter}</div>
                <h2>حرف ${item.name}</h2>

                <div class="dua-card">
                    <h3>مخرج الحرف</h3>
                    <p>${item.makhraj}</p>
                </div>

                <button class="main-button"
                    onclick="DouaaApp.markLetterLearned(${index})">
                    ${learnedLetters.includes(index) ? "✓ تعلّمت هذا الحرف" : "علّمت هذا الحرف"}
                </button>
            </div>
        `;
    }

    function markLetterLearned(index) {
        if (!learnedLetters.includes(index)) {
            learnedLetters.push(index);
            saveData("douaaLearnedLetters", learnedLetters);
        }

        showLetterDetails(index);
    }

    // ======================================
    // 10. عرض التجويد
    // ======================================

    function showTajweed() {
        content.innerHTML = `
            <div class="douaa-section">
                <h2>📖 قواعد التجويد</h2>
                <p>تعرّفي على أهم قواعد التجويد بطريقة مبسطة.</p>

                <div class="cards-grid">
                    ${tajweedRules.map(rule => `
                        <div class="dua-card">
                            <h3>${rule.title}</h3>
                            <p>${rule.description}</p>
                            ${rule.letters ? `<p><strong>الحروف:</strong> ${rule.letters}</p>` : ""}
                        </div>
                    `).join("")}
                </div>
            </div>
        `;
    }

    // ======================================
    // 11. وردي اليومي
    // ======================================

    function showDaily() {
        content.innerHTML = `
            <div class="douaa-section">
                <h2>🌷 وردي اليومي</h2>
                <p>اكتبي الذكر أو الدعاء الذي تريدين المحافظة عليه.</p>

                <textarea
                    id="dailyText"
                    placeholder="اكتبي وردك اليومي هنا..."></textarea>

                <button class="main-button"
                    onclick="DouaaApp.saveDailyEntry()">
                    💗 حفظ الورْد
                </button>

                <h3>أورادي المحفوظة</h3>

                <div class="cards-grid">
                    ${dailyEntries.map((entry, index) => `
                        <div class="daily-card">
                            <p>${entry.text}</p>
                            <small>${entry.date}</small>
                            <button onclick="DouaaApp.deleteDailyEntry(${index})">
                                حذف
                            </button>
                        </div>
                    `).join("")}
                </div>
            </div>
        `;
    }

    function saveDailyEntry() {
        const input = document.getElementById("dailyText");

        if (!input || !input.value.trim()) {
            alert("اكتبي الورد اليومي أولاً 🌸");
            return;
        }

        dailyEntries.unshift({
            text: input.value.trim(),
            date: new Date().toLocaleDateString("ar-TN")
        });

        saveData("douaaDailyEntries", dailyEntries);
        showDaily();
    }

    function deleteDailyEntry(index) {
        dailyEntries.splice(index, 1);
        saveData("douaaDailyEntries", dailyEntries);
        showDaily();
    }

    // ======================================
    // 12. المفضلة
    // ======================================

    function isFavorite(type, index) {
        return favorites.some(item =>
            item.type === type && item.index === index
        );
    }

    function toggleFavorite(index) {
        const existing = favorites.findIndex(item =>
            item.type === "dua" && item.index === index
        );

        if (existing >= 0) {
            favorites.splice(existing, 1);
        } else {
            favorites.push({
                type: "dua",
                index: index
            });
        }

        saveData("douaaFavorites", favorites);
        showDuas();
    }

    function showFavorites() {
        const savedDuas = favorites.filter(item =>
            item.type === "dua" && duas[item.index]
        );

        content.innerHTML = `
            <div class="douaa-section">
                <h2>💗 مفضلتي</h2>

                ${savedDuas.length === 0
                    ? "<p>لم تضيفي أي دعاء إلى المفضلة بعد.</p>"
                    : `
                        <div class="cards-grid">
                            ${savedDuas.map(item => {
                                const dua = duas[item.index];

                                return `
                                    <div class="dua-card">
                                        <h3>${dua.title}</h3>
                                        <p class="dua-text">${dua.text}</p>
                                        <button onclick="DouaaApp.toggleFavorite(${item.index})">
                                            إزالة من المفضلة
                                        </button>
                                    </div>
                                `;
                            }).join("")}
                        </div>
                    `
                }
            </div>
        `;
    }

    // ======================================
    // 13. التنقل بين أقسام Douaa
    // ======================================

    function showSection(section) {
        if (!content) return;

        switch (section) {
            case "duas":
                showDuas();
                break;

            case "athkar":
                showAthkar();
                break;

            case "letters":
                showLetters();
                break;

            case "tajweed":
                showTajweed();
                break;

            case "daily":
                showDaily();
                break;

            case "favorites":
                showFavorites();
                break;

            default:
                showWelcome();
        }
    }

    // ======================================
    // 14. الدوال المتاحة للصفحة
    // ======================================

    return {
        showWelcome,
        showSection,
        showAthkarGroup,
        countAthkar,
        resetAthkar,
        showLetterDetails,
        markLetterLearned,
        saveDailyEntry,
        deleteDailyEntry,
        toggleFavorite
    };

})();
// ==========================================
// 🌸 PART 4 - FINAL INITIALIZATION
// تشغيل تطبيق Noor و Douaa
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    // تشغيل Douaa
    if (window.DouaaApp) {
        window.DouaaApp.showWelcome();
    }

    // تشغيل Noor
    if (typeof startNoor === "function") {
        startNoor();
    }

    console.log("🌸 Noor & Douaa application started successfully!");
});


// ==========================================
// التنقل بين Noor و Douaa
// ==========================================

function showMainApp(section) {

    document.querySelectorAll(".main-section").forEach(element => {
        element.classList.remove("active");
    });

    const selectedSection = document.getElementById(section);

    if (selectedSection) {
        selectedSection.classList.add("active");
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ==========================================
// إظهار رسالة الترحيب في Douaa
// ==========================================

function openDouaa() {
    showMainApp("douaa");

    if (window.DouaaApp) {
        window.DouaaApp.showWelcome();
    }
}


// ==========================================
// الرجوع إلى Noor
// ==========================================

function openNoor() {
    showMainApp("home");
}