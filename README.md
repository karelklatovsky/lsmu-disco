# LŠMU Disco

Audio-reaktivní projekční vizualizace pro galavečer s veřejnými vzkazy od hostů.

## Spuštění

Otevřete veřejnou GitHub Pages adresu v aktuálním Chrome nebo Edge, povolte přístup k mikrofonu a použijte tlačítko celé obrazovky. Hosté načtou QR kód a odešlou vzkaz z mobilní stránky.

Demo režim funguje i bez mikrofonu. Vzkazy využívají veřejný MQTT WebSocket kanál nakonfigurovaný v `config.js` a po krátké prodlevě se zobrazí přes vizualizaci.

## GitHub Pages

1. Nahrajte obsah repozitáře na GitHub.
2. V nastavení repozitáře otevřete **Pages**.
3. Jako zdroj zvolte větev `main` a složku `/ (root)`.
4. Otevřete zveřejněnou adresu. QR kód se automaticky přizpůsobí její URL.

## Ovládání

- Šipky vlevo/vpravo: změna efektu
- `L`: laserový nápis LŠMU
- `F`: celá obrazovka
- Kruhové šipky: automatické střídání efektů
- QR tlačítko: zobrazení nebo skrytí odkazu pro hosty
- Ovládací panel se po 5 sekundách nečinnosti skryje a vrátí se při pohybu, dotyku nebo stisku klávesy