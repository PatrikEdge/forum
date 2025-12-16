🌍 Global Chat – Funkciók összefoglaló
💬 Alap chat funkciók

Valós idejű globális üzenetküldés WebSocketen keresztül

Local echo: az üzenet azonnal megjelenik küldéskor

Automatikus deduplikáció (tempId → végleges ID csere)

Hibás küldés kezelése:

„Küldés…” státusz

„Sikertelen küldés” + Újraküldés gomb

Automatikus görgetés az aljára, ha ott vagy

„Ugrás az aljára” gomb új üzeneteknél

Új üzenetek számlálója, ha nem alul vagy

⏰ Időkezelés

Üzenetek dátum/idő formázása:

aznapi üzenet → csak idő

régebbi → dátum + idő

Üzenetre ugrás értesítésből (highlight + scroll)

✏️ Üzenetszerkesztés

Saját üzenetek szerkeszthetők

Szerkesztett státusz megjelenítése

WebSocketen szinkronizált szerkesztés

Szerkesztés UI modalban

😀 Reakciók

Emoji reakciók (❤️ 😆 👍 😡 😢 😮)

Reakció hozzáadás / eltávolítás

Optimistic UI (azonnali visszajelzés)

Reakciók számlálóval

Tooltipben látszik, kik reagáltak

Saját reakció kiemelve

🧑‍🤝‍🧑 Felhasználói interakciók
@Mention rendszer

@username felismerés üzenetben

Kattintható mention kiemeléssel

Mention autocomplete gépelés közben

Mention beszúrás billentyűzettel / kattintással

Mini profil popup (hover)

Felhasználónévre rámutatva:

Avatar

Username

Szerepkör (User / Moderator / Admin)

Utolsó aktivitás szövegesen

„Profil megnyitása” gomb:

Saját név → Profil oldal

Más → Nagy profil popup

Nagy profil popup

Teljes felhasználói kártya:

Avatar

Szerepkör

„X napja tag”

Utolsó aktivitás

Üzenet küldése gomb → DM-re ugrás

⌨️ Gépelési visszajelzés

„XY éppen ír…” jelzés

Debounce-olt typing event

Csak más felhasználókra jelenik meg

🔔 Értesítések integráció

Mention → értesítés

Értesítésből:

automatikus váltás Global Chatre

üzenetre ugrás + kiemelés

Olvasott / olvasatlan állapot kezelése

🛡️ Stabilitás & UX

WebSocket reconnect kompatibilis logika

Scroll-pozíció megtartása

UI animációk (fade, highlight)

Mobile / desktop kompatibilis layout

Hibatűrő fetch + WS kezelés

🔒 Jogosultságok

Csak saját üzenet:

szerkeszthető

Más üzenete:

reakciózható

Admin / Moderátor szerep vizuálisan jelölve

🧠 Architektúra szempontból

REST + WebSocket hibrid modell

Skálázható szerkezet (DM, Notification, Presence már integrálva)

Frontend oldalon elkülönített:

hover logic

popup logic

mention logic

chat state