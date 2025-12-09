/* =========================================================
   Globale Datenstruktur
   ========================================================= */

let D = {
    settings: {
        art: "",
        startdatum: "",
        enddatum: "",
        jahre: [],
        zuschussAktiv: false,
        zuschussBetrag: 0
    },
    trainingstage: [],
    abos: [],
    trainer: [],
    spieler: [],
    trainingsplan: []
};

/* =========================================================
   Formatierungsfunktionen
   ========================================================= */

function formatDateDE(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
}

function formatTimeDE(t) {
    return t ? `${t} Uhr` : "";
}

function formatCurrencyDE(v) {
    return Number(v).toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + " €";
}

function timeToMin(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}

function isDateInRange(dateISO, startISO, endISO) {
    return dateISO >= startISO && dateISO <= endISO;
}


/* =========================================================
   Hilfsfunktionen
   ========================================================= */

function isoToDate(s) {
    const [y, m, d] = s.split("-");
    return new Date(Number(y), Number(m) - 1, Number(d));
}

function dateToISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function makeId(prefix) {
    return prefix + "_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
}

/* =========================================================
   Startdialog öffnen
   ========================================================= */

function openStartDialog() {
    const overlay = document.getElementById("overlay");
    const dlg = document.getElementById("dialog");

    overlay.classList.add("show");

    dlg.innerHTML = `
        <h3>Neues Projekt starten</h3>

        <label>Trainingsart:<br>
            <select id="dlg_art">
                <option value="">-- bitte wählen --</option>
                <option>Wintertraining</option>
                <option>Sommertraining</option>
            </select>
        </label><br>

        <label>Datum:<br>
            von&nbsp;&nbsp;&nbsp;<input id="dlg_start" type="date">&nbsp;&nbsp;&nbsp;bis&nbsp;&nbsp;&nbsp;<input id="dlg_ende" type="date">
        </label><br>

        <hr style="margin: 20px 0;">

        <label>Zuschuss zum Training berücksichtigen:<br>
            <input id="dlg_zuschussAktiv" type="checkbox">
        </label><br>

        <label>Betrag (€):<br>
            <input id="dlg_zuschussBetrag" type="number" min="0" step="1" value="0">
        </label><br><br>

        <button id="dlg_ok">OK</button>
        <button id="dlg_cancel">Abbrechen</button>
    `;

    dlg.querySelector("#dlg_cancel").onclick = () => {
        overlay.classList.remove("show");
        dlg.innerHTML = "";
    };

    dlg.querySelector("#dlg_ok").onclick = () => {
        const art    = dlg.querySelector("#dlg_art").value;
        const start  = dlg.querySelector("#dlg_start").value;
        const ende   = dlg.querySelector("#dlg_ende").value;

        const zusAktiv  = dlg.querySelector("#dlg_zuschussAktiv").checked;
        const zusBetrag = Number(dlg.querySelector("#dlg_zuschussBetrag").value) || 0;

        if (!art || !start || !ende) {
            showDialogMessage("Eingaben prüfen", "Bitte alle Felder ausfüllen.");
            return;
        }
        if (zusBetrag < 0) {
            showDialogMessage("Eingaben prüfen", "Zuschussbetrag darf nicht negativ sein.");
            return;
        }

        const sy = Number(start.slice(0, 4));
        const ey = Number(ende.slice(0, 4));
        if (art === "Wintertraining" && sy === ey) {
            showDialogConfirm(
                "Hinweis",
                "Das Wintertraining endet im selben Jahr. Ist das korrekt?",
                () => initProject(art, start, ende, zusAktiv, zusBetrag)
            );
            return;
        }

        // Werte an initProject übergeben
        D.settings.zuschussAktiv  = zusAktiv;
        D.settings.zuschussBetrag = zusBetrag;

        initProject(art, start, ende, zusAktiv, zusBetrag);

        overlay.classList.remove("show");
        dlg.innerHTML = "";
    };
}

/* =========================================================
   Projekt initialisieren
   ========================================================= */

function initProject(art, start, ende, zusAktiv, zusBetrag) {

    const jahre = [];
    let s = isoToDate(start);
    let e = isoToDate(ende);
    for (let y = s.getFullYear(); y <= e.getFullYear(); y++) jahre.push(y);

    D = {
        settings: { 
            art, 
            startdatum: start, 
            enddatum: ende, 
            jahre,
            zuschussAktiv: zusAktiv,
            zuschussBetrag: zusBetrag
        },
        trainingstage: [],
        abos: [],
        trainer: [],
        spieler: [],
        trainingsplan: []
    };

    modul2_berechneTrainingstage();
    renderAll();
}

/* =========================================================
   Modul 2 – Trainingstage automatisiert
   ========================================================= */

function modul2_berechneTrainingstage() {

    const start = isoToDate(D.settings.startdatum);
    const ende  = isoToDate(D.settings.enddatum);
    const jahre = D.settings.jahre;

    const wotagNamen = [
        "Sonntag",
        "Montag",
        "Dienstag",
        "Mittwoch",
        "Donnerstag",
        "Freitag",
        "Samstag"
    ];

    // Struktur für alle Wochentage und Jahre anlegen
    const tageNamen = ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"];
    D.trainingstage = tageNamen.map(tag => {
        const j = {};
        jahre.forEach(y => j[y] = { max: 0, tage: 0 });
        return { tag, jahre: j };
    });

    const alleFeiertage = DE_DATES["Hessen"].feiertage || {};
    const alleFerien    = DE_DATES["Hessen"].ferien    || {};

    // Alle Tage im Projektzeitraum durchlaufen
    for (let d = new Date(start); d <= ende; d.setDate(d.getDate() + 1)) {

        const iso  = dateToISO(d);       // z.B. "2025-12-29"
        const year = d.getFullYear();    // z.B. 2025

        if (!jahre.includes(year)) continue;

        const wochentag = wotagNamen[d.getDay()];
        const row = D.trainingstage.find(r => r.tag === wochentag);
        if (!row) continue;

        const jahrObj = row.jahre[year];

        // max. Tage immer erhöhen
        jahrObj.max++;

        // Feiertag (jahresspezifisch)
        const istFeiertag = (alleFeiertage[year] || []).some(f => f.datum === iso);

        // Ferien (jahresübergreifend!)
        let istFerien = false;
        for (const jahrKey of Object.keys(alleFerien)) {
            const liste = alleFerien[jahrKey] || [];
            for (const f of liste) {
                if (iso >= f.von && iso <= f.bis) {
                    istFerien = true;
                    break;
                }
            }
            if (istFerien) break;
        }

        // Trainingstag nur, wenn weder Feiertag noch Ferien
        if (!istFeiertag && !istFerien) {
            jahrObj.tage++;
        }
    }
}


/* =========================================================
   Rendering
   ========================================================= */

function renderAll() {
    const app = document.getElementById("app");
    app.innerHTML = "";

    renderModul1(app);
    renderModul2(app);
    renderModul3(app);
    renderModul4(app);
    renderModul5(app);
    renderModul6(app);
    berechneKosten();
    renderModul7(app);
    renderModul8(app);
}

/* =========================================================
   Modul 1 – Basisdaten
   ========================================================= */

function renderModul1(app) {
    const div = document.createElement("div");
    div.className = "section-card";

    div.innerHTML = `
        <h2>1. Projektstart</h2>

        <label>Trainingsart:<br>
            <input type="text" value="${D.settings.art}" readonly>
        </label><br>

        <label>Datum:<br>
            von&nbsp;&nbsp;&nbsp;<input id="m1_start" type="date" value="${D.settings.startdatum}">&nbsp;&nbsp;&nbsp;bis&nbsp;&nbsp;&nbsp;<input id="m1_ende" type="date" value="${D.settings.enddatum}">
        </label>

        <hr style="margin: 20px 0;">

        <label>Zuschuss zum Training berücksichtigen:<br>
            <input id="m1_zuschussAktiv" type="checkbox" ${D.settings.zuschussAktiv ? "checked" : ""}>
        </label><br>

        <label>Betrag (€):<br>
            <input 
                id="m1_zuschussBetrag" 
                type="number" 
                min="0" 
                step="1" 
                value="${D.settings.zuschussBetrag}"
                ${!D.settings.zuschussAktiv ? "disabled" : ""}
            >
        </label><br><br>

        <button id="m1_save">Daten sichern</button>
    `;

    app.appendChild(div);

    div.querySelector("#m1_start").onchange = updateDates;
    div.querySelector("#m1_ende").onchange = updateDates;
    div.querySelector("#m1_save").onclick = saveJSON;

    // Zuschuss aktiv ändern
    div.querySelector("#m1_zuschussAktiv").onchange = (e) => {
        D.settings.zuschussAktiv = e.target.checked;

        // Betragseingabe ein/ausblenden
        const field = div.querySelector("#m1_zuschussBetrag");
        field.disabled = !D.settings.zuschussAktiv;

        renderAll(); // UI neu zeichnen
    };

    // Zuschussbetrag ändern
    div.querySelector("#m1_zuschussBetrag").onchange = (e) => {
        const v = Number(e.target.value);
        D.settings.zuschussBetrag = v >= 0 ? v : 0;

        renderAll(); // UI neu zeichnen
    };
}

function updateDates() {
    const start = document.getElementById("m1_start").value;
    const ende = document.getElementById("m1_ende").value;

    if (!start || !ende) return;

    const jahre = [];
    let s = isoToDate(start);
    let e = isoToDate(ende);
    for (let y = s.getFullYear(); y <= e.getFullYear(); y++) jahre.push(y);

    D.settings.startdatum = start;
    D.settings.enddatum = ende;
    D.settings.jahre = jahre;

    modul2_berechneTrainingstage();
    renderAll();
}

/* =========================================================
   JSON speichern & laden
   ========================================================= */

function saveJSON() {
    const data = JSON.stringify(D, null, 2);
    const blob = new Blob([data], { type: "application/json" });

    const now = new Date();
    const ts = now.toISOString().replace(/[:]/g,'-').slice(0,16);
    const art = (D.settings && D.settings.art)
    const periodenStr = (D.settings && D.settings.jahre) ? D.settings.jahre.join('-') : "jahre";
    const filename = `${art}_${periodenStr}_${ts}.json`;

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename
    //a.download = "projekt.json";
    a.click();
}

function handleJSONFile(evt) {
    const file = evt.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            loadJSON(data);
        } catch (err) {
            showDialogMessage("Fehler", "Die Datei konnte nicht gelesen werden.");
        }
    };

    reader.readAsText(file);
}

function loadJSON(data) {
    D = data;

    if (!D.abos) D.abos = [];
    if (!D.trainer) D.trainer = [];
    if (!D.spieler) D.spieler = [];

    // Migration: fehlende Jahresfelder bei Spielern ergänzen
    D.spieler.forEach(sp => {
        if (!sp.jahre) {
            sp.jahre = {};
            D.settings.jahre.forEach(j => sp.jahre[j] = true);
        } else {
            D.settings.jahre.forEach(j => {
                if (typeof sp.jahre[j] === "undefined") sp.jahre[j] = true;
            });
        }
    });

    // Migration: Kostenfaktor ergänzen
    D.spieler.forEach(sp => {
        if (typeof sp.kostenfaktor === "undefined" || isNaN(sp.kostenfaktor)) {
            sp.kostenfaktor = 1.0;
        }
    });

    // Migration: Zuschussfelder ergänzen
    if (typeof D.settings.zuschussAktiv === "undefined") {
        D.settings.zuschussAktiv = false;
    }
    if (typeof D.settings.zuschussBetrag === "undefined") {
        D.settings.zuschussBetrag = 0;
    }

    D.spieler.forEach(sp => {
        if (typeof sp.zuschuss === "undefined") {
            sp.zuschuss = false;
        }
    });

    modul2_berechneTrainingstage();

    // Trainingsplan neu berechnen
    if (D.trainingsplan) {
        D.trainingsplan.forEach(tp => berechneTPJahresdaten(tp));
    }

    renderAll();

    showDialogMessage("Projekt geladen", "Projekt wurde erfolgreich geladen.");
}

/* =========================================================
   Modul 2 – Tabellenanzeige
   ========================================================= */

function renderModul2(app) {
    const div = document.createElement("div");
    div.className = "section-card";

    div.innerHTML = `<h2>2. Trainingstage (automatisch)</h2>`;

    const table = document.createElement("table");
    table.classList.add("table-bordered");

    let thead = `<tr><th>Wochentag</th>`;
    for (const y of D.settings.jahre) {
        thead += `<th>max. Tage ${y}</th><th>Trainingstage ${y}</th>`;
    }
    thead += `</tr>`;

    table.innerHTML = thead;

    // Tabelle füllen
    D.trainingstage.forEach(row => {
        let tr = `<tr><td>${row.tag}</td>`;
        for (const y of D.settings.jahre) {
            const j = row.jahre[String(y)];
            tr += `<td>${j.max}</td><td>${j.tage}</td>`;
        }
        tr += `</tr>`;
        table.innerHTML += tr;
    });

    div.appendChild(table);

    //
    // 🔽 Zusatzbereich: Feiertage & Ferien je Jahr
    //

    const infoBox = document.createElement("div");
    infoBox.style.marginTop = "15px";

    let infoHTML = `<h4 style="color:#57A41B; margin-bottom:10px;">Feiertage & Ferien (Info)</h4>`;

    const feiertageData = DE_DATES["Hessen"].feiertage || {};
    const ferienData = DE_DATES["Hessen"].ferien || {};

    D.settings.jahre.forEach(year => {

        // Listen formatieren
        const feiertageList = (feiertageData[year] || [])
            .map(f => {
                const [y, m, d] = f.datum.split("-");
                return `<li>${d}.${m}.${y} (${f.name})</li>`;
            }).join("");

        const ferienList = (ferienData[year] || [])
            .map(f => {
                const [yv, mv, dv] = f.von.split("-");
                const [yb, mb, db] = f.bis.split("-");
                return `<li>${dv}.${mv}.${yv} – ${db}.${mb}.${yb} (${f.name})</li>`;
            }).join("");

        infoHTML += `
            <div class="accordion-year">
                <div class="accordion-header">
                    <span>${year}</span>
                    <span class="accordion-arrow">▶</span>
                </div>
                <div class="accordion-content">
                    <b>Feiertage:</b>
                    <ul>${feiertageList}</ul>
                    <b>Ferien:</b>
                    <ul>${ferienList}</ul>
                </div>
            </div>
        `;
    });

    infoBox.innerHTML = infoHTML;
    div.appendChild(infoBox);

    // Akkordeon interaktive Logik
    setTimeout(() => {
        document.querySelectorAll(".accordion-header").forEach(head => {
            head.addEventListener("click", () => {
                const content = head.nextElementSibling;
                const arrow = head.querySelector(".accordion-arrow");

                const visible = content.style.display === "block";
                content.style.display = visible ? "none" : "block";

                if (arrow) arrow.classList.toggle("open", !visible);
            });
        });
    }, 50);

    app.appendChild(div);
}

/* =========================================================
   Modul 3 – Abo-Verwaltung
   ========================================================= */

function renderModul3(app) {

    const div = document.createElement("div");
    div.className = "section-card";

    div.innerHTML = `
        <h2>3. Platz-Abos</h2>
        <button id="btnAboNeu">+ Neues Abo</button>
        <div id="aboListe"></div>
    `;

    app.appendChild(div);

    div.querySelector("#btnAboNeu").onclick = () => openAboDialog();

    renderAboListe(div.querySelector("#aboListe"));
}

function renderAboListe(container) {

    if (!D.abos || D.abos.length === 0) {
        container.innerHTML = "<p>Es wurden noch keine Abos angelegt.</p>";
        return;
    }

    let html = `
        <table class="table-bordered">
            <tr>
                <th>Wochentag</th>
                <th>Platz</th>
                <th>Datum</th>
                <th>Zeit</th>
                <th>Kosten</th>
                <th style="width:120px;">Aktion</th>
            </tr>
    `;

    D.abos.forEach(abo => {
        html += `
            <tr>
                <td>${abo.wochentag}</td>
                <td>${abo.platz}</td>
                <td>${formatDateDE(abo.startdatum)} – ${formatDateDE(abo.enddatum)}</td>
                <td>${formatTimeDE(abo.startzeit)} – ${formatTimeDE(abo.endzeit)}</td>
                <td>${formatCurrencyDE(abo.platzkosten)}</td>
                <td>
                    <button onclick="openAboDialog('${abo.id}')">✎</button>
                    <button class="btnDelete" onclick="deleteAbo('${abo.id}')">🗑</button>
                </td>
            </tr>
        `;
    });

    html += "</table>";
    container.innerHTML = html;
}

function openAboDialog(id = null) {

    const overlay = document.getElementById("overlay");
    const dlg = document.getElementById("dialog");
    overlay.classList.add("show");

    let abo = id ? D.abos.find(a => a.id === id) : null;

    const wochentage = ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"];

    dlg.innerHTML = `
        <h3>${id ? "Abo bearbeiten" : "Neues Abo"}</h3>

        <label>Wochentag:<br>
            <select id="abo_tag">
                <option value="">-- bitte wählen --</option>
                ${wochentage.map(t => `<option ${abo?.wochentag === t ? "selected":""}>${t}</option>`).join("")}
            </select>
        </label><br>

        <label>Platz:<br>
            <input id="abo_platz" type="text" value="${abo?.platz || ""}" placeholder="z.B. Platz 1">
        </label><br>

        <label>Datum:<br>
            von&nbsp;&nbsp;&nbsp;<input id="abo_startdatum" type="date" value="${abo?.startdatum || ""}">&nbsp;&nbsp;&nbsp;bis&nbsp;&nbsp;&nbsp;<input id="abo_enddatum" type="date" value="${abo?.enddatum || ""}">
        </label><br>

        <label>Zeit:<br>
            von&nbsp;&nbsp;&nbsp;<input id="abo_startzeit" type="time" value="${abo?.startzeit || "12:00"}">&nbsp;&nbsp;&nbsp;bis&nbsp;&nbsp;&nbsp;<input id="abo_endzeit" type="time" value="${abo?.endzeit || "12:00"}">
        </label><br>

        <label>Platzkosten (€):<br>
            <input id="abo_kosten" type="number" min="0" step="0.5" value="${abo?.platzkosten || ""}">
        </label><br><br>

        <button id="abo_ok">OK</button>
        <button id="abo_cancel">Abbrechen</button>
    `;

    dlg.querySelector("#abo_cancel").onclick = () => {
        overlay.classList.remove("show");
        dlg.innerHTML = "";
    };

    dlg.querySelector("#abo_ok").onclick = () => saveAbo(id);
}

function saveAbo(id) {

    const tag        = document.getElementById("abo_tag").value;
    const platz      = document.getElementById("abo_platz").value.trim();
    const startdatum = document.getElementById("abo_startdatum").value;
    const enddatum   = document.getElementById("abo_enddatum").value;
    const startzeit  = document.getElementById("abo_startzeit").value;
    const endzeit    = document.getElementById("abo_endzeit").value;
    const kosten     = Number(document.getElementById("abo_kosten").value);

    // --- Validierung ---
    if (!tag || !platz || !startdatum || !enddatum || !startzeit || !endzeit) {
        showDialogMessage("Abo prüfen", "Bitte alle Felder ausfüllen.");
        return;
    }
    if (isNaN(kosten) || kosten < 0) {
        showDialogMessage("Abo prüfen", "Kosten müssen 0 oder größer sein.");
        return;
    }
    if (startdatum > enddatum) {
        showDialogMessage("Abo prüfen", "Enddatum muss nach dem Startdatum liegen.");
        return;
    }
    if (startzeit >= endzeit) {
        showDialogMessage("Abo prüfen", "Endzeit muss nach Startzeit liegen.");
        return;
    }

    // --- Abo aktualisieren oder neu anlegen ---
    if (id) {
        const abo = D.abos.find(a => a.id === id);
        abo.wochentag = tag;
        abo.platz = platz;
        abo.startdatum = startdatum;
        abo.enddatum = enddatum;
        abo.startzeit = startzeit;
        abo.endzeit = endzeit;
        abo.platzkosten = kosten;

    } else {
        D.abos.push({
            id: makeId("abo"),
            wochentag: tag,
            platz,
            startdatum,
            enddatum,
            startzeit,
            endzeit,
            platzkosten: kosten
        });
    }

    // --- 🔽 Sortierung der Abos ---
    const wtagOrder = {
        "Montag": 1,
        "Dienstag": 2,
        "Mittwoch": 3,
        "Donnerstag": 4,
        "Freitag": 5,
        "Samstag": 6,
        "Sonntag": 7
    };

    function extractPlatzNum(platz) {
        const m = platz.match(/\d+/);
        return m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER;
    }

    D.abos.sort((a, b) => {

        // 1) Wochentag
        const cmpTag = wtagOrder[a.wochentag] - wtagOrder[b.wochentag];
        if (cmpTag !== 0) return cmpTag;

        // 2) numerische Platzsortierung
        const cmpPlatz = extractPlatzNum(a.platz) - extractPlatzNum(b.platz);
        if (cmpPlatz !== 0) return cmpPlatz;

        // 3) Startdatum
        const cmpDatum = a.startdatum.localeCompare(b.startdatum);
        if (cmpDatum !== 0) return cmpDatum;

        // 4) Startzeit
        return a.startzeit.localeCompare(b.startzeit);
    });

    // Dialog schließen & Oberfläche neu aufbauen
    document.getElementById("overlay").classList.remove("show");
    document.getElementById("dialog").innerHTML = "";
    renderAll();
}

function deleteAbo(id) {

    const abo = D.abos.find(a => a.id === id);
    if (!abo) {
        showDialogMessage("Fehler", "Das ausgewählte Abo wurde nicht gefunden.");
        return;
    }

    // Prüfen: wird das Abo in Trainingsplänen verwendet?
    const verwendung = D.trainingsplan.filter(tp => tp.aboId === id);

    if (verwendung.length > 0) {

        let msg = `Dieses Abo wird noch in folgenden Trainingsplänen verwendet:\n\n`;

        verwendung.forEach(tp => {
            const tag      = abo.wochentag;
            const platz    = abo.platz;
            const zeit     = `${formatTimeDE(tp.vonZeit)} – ${formatTimeDE(tp.bisZeit)}`;
            const zeitraum = `${formatDateDE(tp.vonDatum)} – ${formatDateDE(tp.bisDatum)}`;

            msg += `• ${tag}, ${platz}, ${zeit}, ${zeitraum}\n`;
        });

        msg += `\nBitte entferne das Abo zuerst aus diesen Trainingsplänen.`;

        showDialogMessage("Abo kann nicht gelöscht werden", msg);
        return;
    }

    // Wenn keine Verwendung → sicher löschen
    showDialogConfirm(
        "Abo löschen",
        `Möchtest du das Abo "${abo.platz}" (${abo.wochentag}) wirklich löschen?`,
        () => {
            D.abos = D.abos.filter(a => a.id !== id);
            renderAll();
        }
    );
}


/* =========================================================
   Modul 4 – Trainerverwaltung
   ========================================================= */

function renderModul4(app) {
    const div = document.createElement("div");
    div.className = "section-card";

    div.innerHTML = `
        <h2>4. Trainer</h2>
        <button id="btnTrainerNeu">+ Trainer hinzufügen</button>
        <div id="trainerListe"></div>
    `;

    app.appendChild(div);

    div.querySelector("#btnTrainerNeu").onclick = () => openTrainerDialog();

    renderTrainerListe(div.querySelector("#trainerListe"));
}

function renderTrainerListe(container) {

    if (!D.trainer || D.trainer.length === 0) {
        container.innerHTML = "<p>Es wurden noch keine Trainer angelegt.</p>";
        return;
    }

    let html = `
        <table class="table-bordered">
            <tr>
                <th>Name</th>
                <th>Telefon</th>
                <th>Email</th>
                <th>Stundenlohn</th>
                <th style="width:120px;">Aktion</th>
            </tr>
    `;

    D.trainer.forEach(t => {
        html += `
            <tr>
                <td>${t.name}</td>
                <td>${t.telefon || "-"}</td>
                <td>${t.email || "-"}</td>
                <td>${formatCurrencyDE(t.kosten)}</td>
                <td>
                    <button onclick="openTrainerDialog('${t.id}')">✎</button>
                    <button class="btnDelete" onclick="deleteTrainer('${t.id}')">🗑</button>
                </td>
            </tr>
        `;
    });

    html += "</table>";
    container.innerHTML = html;
}

function openTrainerDialog(id = null) {

    const overlay = document.getElementById("overlay");
    const dlg = document.getElementById("dialog");
    overlay.classList.add("show");

    let tr = id ? D.trainer.find(t => t.id === id) : null;

    dlg.innerHTML = `
        <h3>${id ? "Trainer bearbeiten" : "Trainer hinzufügen"}</h3>

        <label>Name:<br>
            <input id="tr_name" type="text" value="${tr?.name || ""}">
        </label><br>

        <label>Telefon:<br>
            <input id="tr_tel" type="text" value="${tr?.telefon || ""}">
        </label><br>

        <label>Email:<br>
            <input id="tr_email" type="email" value="${tr?.email || ""}">
        </label><br><br>

        <label>Stundenlohn (€):<br>
            <input id="tr_kosten" type="number" min="0" step="0.5" value="${tr?.kosten || ""}">
        </label><br><br>

        <button id="tr_ok">OK</button>
        <button id="tr_cancel">Abbrechen</button>
    `;

    dlg.querySelector("#tr_cancel").onclick = () => {
        overlay.classList.remove("show");
        dlg.innerHTML = "";
    };

    dlg.querySelector("#tr_ok").onclick = () => saveTrainer(id);
}

function saveTrainer(id) {

    const name = document.getElementById("tr_name").value.trim();
    const tel = document.getElementById("tr_tel").value.trim();
    const email = document.getElementById("tr_email").value.trim();
    const kosten = Number(document.getElementById("tr_kosten").value);

    // --- Validierung ---
    if (!name || !kosten) {
        showDialogMessage("Eingaben prüfen", "Bitte mindestens Name und Stundenlohn ausfüllen.");
        return;
    }

    // --- Trainer aktualisieren oder neu anlegen ---
    if (id) {
        const tr = D.trainer.find(t => t.id === id);
        tr.name = name;
        tr.telefon = tel || "";
        tr.email = email || "";
        tr.kosten = kosten;
   } else {
        D.trainer.push({
            id: makeId("trainer"),
            name,
            telefon: tel || "",
            email: email || "",
            kosten
        });
    }

    // --- 🔽 Trainer alphabetisch sortieren ---
    D.trainer.sort((a, b) => a.name.localeCompare(b.name));

    // Dialog schließen
    document.getElementById("overlay").classList.remove("show");
    document.getElementById("dialog").innerHTML = "";

    // Oberfläche neu aufbauen
    renderAll();
}

function deleteTrainer(id) {

    const tr = D.trainer.find(t => t.id === id);
    if (!tr) {
        showDialogMessage("Fehler", "Trainer wurde nicht gefunden.");
        return;
    }

    // Prüfen: wird der Trainer in Trainingsplänen verwendet?
    const verwendung = D.trainingsplan.filter(tp => tp.trainerId === id);

    if (verwendung.length > 0) {

        let msg = `Der Trainer "${tr.name}" ist noch in folgenden Trainingsplänen eingeteilt:\n\n`;

        verwendung.forEach(tp => {
            const abo      = D.abos.find(a => a.id === tp.aboId);
            const tag      = abo ? abo.wochentag : "?";
            const platz    = abo ? abo.platz : "?";
            const zeit     = `${formatTimeDE(tp.vonZeit)} – ${formatTimeDE(tp.bisZeit)}`;
            const zeitraum = `${formatDateDE(tp.vonDatum)} – ${formatDateDE(tp.bisDatum)}`;

            msg += `• ${tag}, ${platz}, ${zeit}, ${zeitraum}\n`;
        });

        msg += `\nBitte entferne den Trainer zuerst aus diesen Trainingsplänen.`;

        showDialogMessage("Trainer kann nicht gelöscht werden", msg);
        return;
    }

    // Wenn nicht verwendet → sicher löschen
    showDialogConfirm(
        "Trainer löschen",
        `Möchtest du den Trainer "${tr.name}" wirklich löschen?`,
        () => {
            D.trainer = D.trainer.filter(t => t.id !== id);
            renderAll();
        }
    );
}


/* =========================================================
   Modul 5 – Spielerverwaltung (mit Jahreslogik)
   ========================================================= */

function renderModul5(app) {
    const div = document.createElement("div");
    div.className = "section-card";

    div.innerHTML = `
        <h2>5. Spieler</h2>
        <button id="btnSpielerNeu">+ Spieler hinzufügen</button>
        <div id="spielerListe"></div>
    `;

    app.appendChild(div);

    div.querySelector("#btnSpielerNeu").onclick = () => openSpielerDialog();

    renderSpielerListe(div.querySelector("#spielerListe"));
}

function renderSpielerListe(container) {

    if (!D.spieler || D.spieler.length === 0) {
        container.innerHTML = "<p>Es wurden noch keine Spieler angelegt.</p>";
        return;
    }

    // Soll die Spalte angezeigt werden?
    const showZuschussSpalte =
        D.settings.zuschussAktiv &&
        D.spieler.some(sp => sp.zuschuss);

    let html = `
        <table class="table-bordered">
            <tr>
                <th>Name</th>
                <th>Telefon</th>
                <th>Email</th>
                <th>Kostenfaktor</th>
                ${showZuschussSpalte ? `<th>Zuschuss</th>` : ""}
    `;

    // Dynamische Jahr-Spalten
    D.settings.jahre.forEach(j => {
        html += `<th>${j}</th>`;
    });

    html += `<th style="width:120px;">Aktion</th></tr>`;

    D.spieler.forEach(sp => {

        html += `
            <tr>
                <td>${sp.name}</td>
                <td>${sp.telefon || "-"}</td>
                <td>${sp.email || "-"}</td>
                <td>${sp.kostenfaktor}</td>
                ${
                    showZuschussSpalte
                        ? `<td>${sp.zuschuss ? "ja" : "nein"}</td>`
                        : ""
                }
        `;

        D.settings.jahre.forEach(j => {
            html += `<td>${sp.jahre?.[j] !== false ? "✔" : "✖"}</td>`;
        });

        html += `
                <td>
                    <button onclick="openSpielerDialog('${sp.id}')">✎</button>
                    <button class="btnDelete" onclick="deleteSpieler('${sp.id}')">🗑</button>
                </td>
            </tr>
        `;
    });

    html += "</table>";
    container.innerHTML = html;
}

function openSpielerDialog(id = null) {

    const overlay = document.getElementById("overlay");
    const dlg = document.getElementById("dialog");
    overlay.classList.add("show");

    const sp = id ? D.spieler.find(x => x.id === id) : null;

    dlg.innerHTML = `
        <h3>${id ? "Spieler bearbeiten" : "Spieler anlegen"}</h3>

        <label>Name:<br>
            <input id="sp_name" type="text" value="${sp?.name || ""}">
        </label><br>

        <label>Telefon:<br>
            <input id="sp_tel" type="text" value="${sp?.telefon || ""}">
        </label><br>

        <label>Email:<br>
            <input id="sp_email" type="email" value="${sp?.email || ""}">
        </label><br><br>

        <label>Kostenfaktor:<br>
            <input id="sp_kostenfaktor" type="number" step="0.1" min="0" max="1"
                value="${sp?.kostenfaktor ?? 1.0}"><br>
            <small>Hinweis:<br>
                1 = voller Spieler<br>
                0.5 = zwei Spieler teilen sich den Platz.</small>
        </label><br><br>

        ${D.settings.zuschussAktiv ? `
            <label>Zuschuss zum Training:<br>
                <input 
                    id="sp_zuschuss" 
                    type="checkbox" 
                    ${sp?.zuschuss ? "checked" : ""}
                >
            </label><br><br>
        ` : ""}

        <label>Aktiv in Jahren:</label><br>
        ${D.settings.jahre.map(y => {
            const checked = sp?.jahre && sp.jahre[y] ? "checked" : "";
            return `<label>${y}: 
                        <input type="checkbox" id="sp_j_${y}" ${checked}>
                    </label><br>`;
        }).join("")}
        <br>

        <button id="sp_ok">OK</button>
        <button id="sp_cancel">Abbrechen</button>
    `;

    dlg.querySelector("#sp_cancel").onclick = () => {
        overlay.classList.remove("show");
        dlg.innerHTML = "";
    };

    // 🔽 Statt Inline-Speicherlogik jetzt nur noch:
    dlg.querySelector("#sp_ok").onclick = () => saveSpieler(id);
}

function saveSpieler(id) {

    const overlay = document.getElementById("overlay");
    const dlg = document.getElementById("dialog");

    const name = dlg.querySelector("#sp_name").value.trim();
    const tel  = dlg.querySelector("#sp_tel").value.trim();
    const email = dlg.querySelector("#sp_email").value.trim();
    const kostenfaktor = Number(dlg.querySelector("#sp_kostenfaktor").value) || 1.0;
    const zuschuss = D.settings.zuschussAktiv
        ? dlg.querySelector("#sp_zuschuss")?.checked || false
        : false;

    // --- Validierung ---
    if (!name) {
        showDialogMessage("Eingaben prüfen", "Bitte Name eingeben.");
        return;
    }
    if (kostenfaktor <= 0) {
        showDialogMessage("Eingaben prüfen", "Kostenfaktor muss größer als 0 sein.");
        return;
    }

    // --- Jahres-Häkchen lesen ---
    const jahre = {};
    D.settings.jahre.forEach(y => {
        const cb = dlg.querySelector("#sp_j_" + y);
        jahre[y] = cb ? cb.checked : true;
    });

    // --- Datensatz bauen ---
    if (id) {
        const sp = D.spieler.find(s => s.id === id);
        if (!sp) {
            showDialogMessage("Eingaben prüfen", "Spieler nicht gefunden.");
            return;
        }
        sp.name = name;
        sp.telefon = tel || "";
        sp.email = email || "";
        sp.jahre = jahre;
        sp.kostenfaktor = kostenfaktor;

        if (D.settings.zuschussAktiv) {
            sp.zuschuss = zuschuss;
        }

    } else {
        D.spieler.push({
            id: makeId("sp"),
            name,
            telefon: tel || "",
            email: email || "",
            jahre,
            kostenfaktor,
            zuschuss: D.settings.zuschussAktiv ? zuschuss : false
        });
    }

    // --- 🔽 Spieler alphabetisch sortieren ---
    D.spieler.sort((a, b) => a.name.localeCompare(b.name));

    // Dialog schließen & UI neu zeichnen
    overlay.classList.remove("show");
    dlg.innerHTML = "";
    renderAll();
}

function deleteSpieler(id) {

    const sp = D.spieler.find(s => s.id === id);
    if (!sp) {
        showDialogMessage("Fehler", "Spieler wurde nicht gefunden.");
        return;
    }

    // Prüfen: wird der Spieler in Trainingsplänen verwendet?
    const verwendung = D.trainingsplan.filter(tp =>
        tp.spielerIds.includes(id)
    );

    if (verwendung.length > 0) {

        let msg = `Der Spieler "${sp.name}" ist noch in folgenden Trainingsplänen eingeteilt:\n\n`;

        verwendung.forEach(tp => {

            const abo      = D.abos.find(a => a.id === tp.aboId);
            const tag      = abo ? abo.wochentag : "?";
            const platz    = abo ? abo.platz : "?";
            const zeit     = `${formatTimeDE(tp.vonZeit)} – ${formatTimeDE(tp.bisZeit)}`;
            const zeitraum = `${formatDateDE(tp.vonDatum)} – ${formatDateDE(tp.bisDatum)}`;

            msg += `• ${tag}, ${platz}, ${zeit}, ${zeitraum}\n`;
        });

        msg += `\nBitte entferne den Spieler zuerst aus diesen Trainingsplänen.`;

        showDialogMessage("Spieler kann nicht gelöscht werden", msg);
        return;
    }

    // Wenn nicht verwendet → sicher löschen
    showDialogConfirm(
        "Spieler löschen",
        `Möchtest du den Spieler "${sp.name}" wirklich löschen?`,
        () => {
            D.spieler = D.spieler.filter(s => s.id !== id);
            renderAll();
        }
    );
}



/* =========================================================
   Modul 6 – Trainingspläne
   ========================================================= */

function renderModul6(app) {
    const div = document.createElement("div");
    div.className = "section-card";

    div.innerHTML = `
        <h2>6. Trainingspläne</h2>
        <button id="btnTPNeu">+ Trainingsplan hinzufügen</button>
        <div id="tpListe"></div>
    `;

    app.appendChild(div);

    div.querySelector("#btnTPNeu").onclick = () => openTPDialog();

    renderTrainingsplanListe(div.querySelector("#tpListe"));
}

function renderTrainingsplanListe(container) {

    if (!D.trainingsplan || D.trainingsplan.length === 0) {
        container.innerHTML = "<p>Es wurden noch keine Trainingspläne angelegt.</p>";
        return;
    }

    let html = `
        <table class="table-bordered">
            <tr>
                <th>Wochentag</th>
                <th>Platz</th>
                <th>Zeit</th>
                <th>Zeitraum</th>
                <th>Trainer</th>
                <th>Spieler</th>
                <th style="width:120px;">Aktion</th>
            </tr>
    `;

    D.trainingsplan.forEach(tp => {

        const abo = D.abos.find(a => a.id === tp.aboId);
        const trainer = D.trainer.find(t => t.id === tp.trainerId);

        html += `
            <tr>
                <td>${abo ? abo.wochentag : "-"}</td>
                <td>${abo ? abo.platz : "-"}</td>

                <td>${formatTimeDE(tp.vonZeit)} – ${formatTimeDE(tp.bisZeit)}</td>

                <td>${formatDateDE(tp.vonDatum)} – ${formatDateDE(tp.bisDatum)}</td>

                <td>${
                    tp.trainerId === "__NONE__"
                        ? "ohne Trainer"
                        : (trainer ? trainer.name : "-")
                }</td>

                <td>${tp.spielerIds
                    .map(id => {
                        const sp = D.spieler.find(s => s.id === id);
                        return sp ? sp.name : "Unbekannt";
                    })
                    .join(", ")
                }</td>

                <td>
                    <button onclick="openTPDialog('${tp.id}')">✎</button>
                    <button class="btnDelete" onclick="deleteTP('${tp.id}')">🗑</button>
                </td>
            </tr>
        `;
    });

    html += "</table>";

    container.innerHTML = html;
}

function deleteTP(id) {

    const tp = D.trainingsplan.find(t => t.id === id);
    if (!tp) {
        showDialogMessage("Fehler", "Trainingsplan wurde nicht gefunden.");
        return;
    }

    showDialogConfirm(
        "Trainingsplan löschen",
        "Möchtest du diesen Trainingsplan wirklich löschen?",
        () => {
            D.trainingsplan = D.trainingsplan.filter(t => t.id !== id);
            renderAll();
        }
    );
}

function openTPDialog(id = null) {

    const overlay = document.getElementById("overlay");
    const dlg = document.getElementById("dialog");
    overlay.classList.add("show");

    let tp = id ? D.trainingsplan.find(t => t.id === id) : null;

    // --- Abos laden ---
    let aboOptions = `<option value="">-- bitte wählen --</option>`;
    D.abos.forEach(a => {
        const selected = tp?.aboId === a.id ? "selected" : "";
        aboOptions += `
            <option value="${a.id}" ${selected}>
                ${a.wochentag}, ${a.platz}, ${formatTimeDE(a.startzeit)} – ${formatTimeDE(a.endzeit)}, ${formatDateDE(a.startdatum)} - ${formatDateDE(a.enddatum)}
            </option>`;
    });

    // --- Trainer laden ---
    let trainerOptions = `
        <option value="">-- bitte wählen --</option>
        <option value="__NONE__" ${tp?.trainerId === "__NONE__" ? "selected" : ""}>
            – ohne Trainer –
        </option>
    `;

    D.trainer.forEach(t => {
        const sel = tp?.trainerId === t.id ? "selected" : "";
        trainerOptions += `<option value="${t.id}" ${sel}>${t.name}</option>`;
    });

    // --- Spieler laden ---
    let spielerCheckboxes = "";
    D.spieler.forEach(sp => {
        const checked = tp?.spielerIds?.includes(sp.id) ? "checked" : "";
        spielerCheckboxes += `
            <label>
                <input type="checkbox" class="tp_spieler" value="${sp.id}" ${checked}>
                ${sp.name}
            </label><br>
        `;
    });

    // --- Defaultwerte bei neuem TP ---
    const vonDatum = tp?.vonDatum || "";
    const bisDatum = tp?.bisDatum || "";
    const vonZeit  = tp?.vonZeit  || "";
    const bisZeit  = tp?.bisZeit  || "";

    dlg.innerHTML = `
        <h3>${id ? "Trainingsplan bearbeiten" : "Trainingsplan anlegen"}</h3>

        <label>Abo auswählen:<br>
            <select id="tp_abo">${aboOptions}</select>
        </label><br>

        <label>Datum:<br>
            von&nbsp;&nbsp;&nbsp;<input id="tp_vonDatum" type="date" value="${vonDatum}">&nbsp;&nbsp;&nbsp;bis&nbsp;&nbsp;&nbsp;<input id="tp_bisDatum" type="date" value="${bisDatum}">
        </label><br>

        <label>Zeit:<br>
            von&nbsp;&nbsp;&nbsp;<input id="tp_vonZeit" type="time" value="${vonZeit}">&nbsp;&nbsp;&nbsp;bis&nbsp;&nbsp;&nbsp;<input id="tp_bisZeit" type="time" value="${bisZeit}">
        </label><br>

        <label>Trainer:<br>
            <select id="tp_trainer">${trainerOptions}</select>
        </label><br>

        <label>Spieler:</label><br>
        <div id="tpSpielerBox" style="max-height:150px; overflow:auto; border:1px solid #ccc; padding:6px; border-radius: 4px;">
            ${spielerCheckboxes}
        </div><br><br>

        <button id="tp_ok">OK</button>
        <button id="tp_cancel">Abbrechen</button>
    `;

    // --- Event Listener ---
    dlg.querySelector("#tp_cancel").onclick = () => {
        overlay.classList.remove("show");
        dlg.innerHTML = "";
    };

    dlg.querySelector("#tp_abo").onchange = onTPAboChanged;

    dlg.querySelector("#tp_ok").onclick = () => saveTP(id);
}

function onTPAboChanged() {
    const aboId = document.getElementById("tp_abo").value;
    const info = document.getElementById("tpAboInfo");

    if (!aboId) {
        info.innerHTML = "";
        return;
    }

    const a = D.abos.find(x => x.id === aboId);
    if (!a) {
        info.innerHTML = "";
        return;
    }

    info.innerHTML = `
        <div style="
            background:#f3f1f9; 
            padding:8px; 
            border-radius:6px; 
            margin-bottom:10px;
            border:1px solid #ccc;
        ">
            <b>Abo-Informationen:</b><br>
            Wochentag: ${a.wochentag}<br>
            Zeitraum: ${formatDateDE(a.startdatum)} – ${formatDateDE(a.enddatum)}<br>
            Zeit: ${formatTimeDE(a.startzeit)} – ${formatTimeDE(a.endzeit)}
        </div>
    `;

    // Zeit- und Datumsfelder automatisch einschränken? → folgt in Block 6.5
}

function saveTP(id) {

    const aboId     = document.getElementById("tp_abo").value;
    const vonDatum  = document.getElementById("tp_vonDatum").value;
    const bisDatum  = document.getElementById("tp_bisDatum").value;
    const vonZeit   = document.getElementById("tp_vonZeit").value;
    const bisZeit   = document.getElementById("tp_bisZeit").value;
    const trainerId = document.getElementById("tp_trainer").value;

    const spielerIds = [...document.querySelectorAll(".tp_spieler:checked")]
        .map(cb => cb.value);

    // --- Temporäres Objekt ---
    const tpTemp = {
        id: id || makeId("tp"),
        aboId,
        trainerId,
        spielerIds,
        vonDatum,
        bisDatum,
        vonZeit,
        bisZeit
    };

    // --- Validieren ---
    const err = validateTP(tpTemp, id);
    if (err) {
        showDialogMessage("Trainingsplan prüfen", err);
        return;
    }

    // --- Speichern oder aktualisieren ---
    if (id) {
        const tp = D.trainingsplan.find(t => t.id === id);
        Object.assign(tp, tpTemp);
    } else {
        D.trainingsplan.push(tpTemp);
    }

    // --- Jahresdaten berechnen ---
    const tpFinal = D.trainingsplan.find(t => t.id === tpTemp.id);
    berechneTPJahresdaten(tpFinal);

    // --- 🔽 SORTIERUNG DER TRAININGSPLÄNE ---
    const wtagOrder = {
        "Montag": 1,
        "Dienstag": 2,
        "Mittwoch": 3,
        "Donnerstag": 4,
        "Freitag": 5,
        "Samstag": 6,
        "Sonntag": 7
    };

    function extractPlatzNum(platz) {
        const m = platz.match(/\d+/);
        return m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER;
    }

    D.trainingsplan.sort((a, b) => {

        const aboA = D.abos.find(x => x.id === a.aboId);
        const aboB = D.abos.find(x => x.id === b.aboId);

        // 1) Wochentag
        const cmpTag = wtagOrder[aboA.wochentag] - wtagOrder[aboB.wochentag];
        if (cmpTag !== 0) return cmpTag;

        // 2) numerische Platzsortierung
        const cmpPlatz = extractPlatzNum(aboA.platz) - extractPlatzNum(aboB.platz);
        if (cmpPlatz !== 0) return cmpPlatz;

        // 3) Abo-Startdatum
        const cmpDatum = aboA.startdatum.localeCompare(aboB.startdatum);
        if (cmpDatum !== 0) return cmpDatum;

        // 4) Trainingsplan-Zeit
        return a.vonZeit.localeCompare(b.vonZeit);
    });

    // --- Dialog schließen ---
    document.getElementById("overlay").classList.remove("show");
    document.getElementById("dialog").innerHTML = "";

    // --- Oberfläche neu aufbauen ---
    renderAll();
}

function validateTP(tp, editId = null) {

    // --- Pflichtfelder prüfen ---
    if (!tp.aboId)     return "Bitte ein Abo auswählen.";
    if (!tp.vonDatum)  return "Bitte ein Startdatum eingeben.";
    if (!tp.bisDatum)  return "Bitte ein Enddatum eingeben.";
    if (!tp.vonZeit)   return "Bitte eine Startzeit eingeben.";
    if (!tp.bisZeit)   return "Bitte eine Endzeit eingeben.";
    if (!tp.trainerId) return "Bitte einen Trainer auswählen.";
    if (!tp.spielerIds || tp.spielerIds.length === 0)
        return "Bitte mindestens einen Spieler auswählen.";

    // --- Abo laden ---
    const abo = D.abos.find(a => a.id === tp.aboId);
    if (!abo) return "Das ausgewählte Abo existiert nicht.";

    // --- Datumsbereich prüfen ---
    if (!isDateInRange(tp.vonDatum, abo.startdatum, abo.enddatum))
        return `Startdatum muss innerhalb des Abos liegen: ${formatDateDE(abo.startdatum)} – ${formatDateDE(abo.enddatum)}.`;

    if (!isDateInRange(tp.bisDatum, abo.startdatum, abo.enddatum))
        return `Enddatum muss innerhalb des Abos liegen: ${formatDateDE(abo.startdatum)} – ${formatDateDE(abo.enddatum)}.`;

    // --- Logischer Datumsbereich ---
    if (tp.vonDatum > tp.bisDatum)
        return "Enddatum muss nach dem Startdatum liegen.";

    // --- Zeiten prüfen ---
    const minVon = timeToMin(tp.vonZeit);
    const minBis = timeToMin(tp.bisZeit);
    const aboVon = timeToMin(abo.startzeit);
    const aboBis = timeToMin(abo.endzeit);

    if (minVon >= minBis)
        return "Die Endzeit muss später als die Startzeit sein.";

    if (minVon < aboVon || minBis > aboBis)
        return `Zeit muss im Abo liegen: ${formatTimeDE(abo.startzeit)} – ${formatTimeDE(abo.endzeit)}.`;

    // --- Überschneidungsprüfung ---
    const overlapErr = checkOverlap(tp, editId);
    if (overlapErr) return overlapErr;

    return null; // alles ok
}

function checkOverlap(tp, editId) {

    const minVon = timeToMin(tp.vonZeit);
    const minBis = timeToMin(tp.bisZeit);

    for (const other of D.trainingsplan) {

        if (other.id === editId) continue; // bei Bearbeiten ignorieren
        if (other.aboId !== tp.aboId) continue; // anderes Abo → egal

        // Datum überlappt?
        if (tp.vonDatum > other.bisDatum) continue;
        if (tp.bisDatum < other.vonDatum) continue;

        // Zeit überlappt?
        const oVon = timeToMin(other.vonZeit);
        const oBis = timeToMin(other.bisZeit);

        const zeitÜberlappt =
            !(minBis <= oVon || minVon >= oBis);

        if (zeitÜberlappt) {
            return `Der Trainingsplan überschneidet sich mit einem bestehenden Plan 
                    (${formatTimeDE(other.vonZeit)} – ${formatTimeDE(other.bisZeit)}).`;
        }
    }

    return null;
}

function berechneTPJahresdaten(tp) {

    const abo = D.abos.find(a => a.id === tp.aboId);
    if (!abo) return;

    const wotagJS = ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];

    const start = isoToDate(tp.vonDatum);
    const ende  = isoToDate(tp.bisDatum);

    // Minuten pro Einheit
    tp.minuten = timeToMin(tp.bisZeit) - timeToMin(tp.vonZeit);

    // Jahresstruktur initialisieren
    tp.jahre = {};
    D.settings.jahre.forEach(y => {
        tp.jahre[y] = {
            tage: 0,
            tageTrainer: 0
        };
    });

    for (let d = new Date(start); d <= ende; d.setDate(d.getDate() + 1)) {

        const iso = dateToISO(d);
        const y = d.getFullYear();
        if (!D.settings.jahre.includes(y)) continue;

        const wtag = wotagJS[d.getDay()];
        if (wtag !== abo.wochentag) continue;

        // Feiertag?
        const istFeiertag =
            (DE_DATES["Hessen"].feiertage[y] || []).includes(iso);

        let istFerien = false;

        // Alle Ferien aller Jahre prüfen (wegen Jahresübergang!)
        for (const jahr of Object.keys(DE_DATES["Hessen"].ferien)) {
            for (const f of DE_DATES["Hessen"].ferien[jahr]) {
                if (iso >= f.von && iso <= f.bis) {
                    istFerien = true;
                    break;
                }
            }
            if (istFerien) break;
        }

        // Immer: Trainingstag für Platzkosten
        tp.jahre[y].tage++;

        // Nur wenn kein Feiertag & keine Ferien: Trainingstag für Trainer
        if (!istFeiertag && !istFerien) {
            tp.jahre[y].tageTrainer++;
        }
    }
}

function berechnePlatzkostenProMinute(abo) {

    let gesamtMin = 0;
    const minProEinheit = timeToMin(abo.endzeit) - timeToMin(abo.startzeit);

    D.settings.jahre.forEach(y => {
        // Abo-Tage neu berechnen (identisch zu TP, aber ohne TP-Beschränkung)
        const start = isoToDate(abo.startdatum);
        const ende  = isoToDate(abo.enddatum);

        let tage = 0;
        const wotagJS = ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];

        for (let d = new Date(start); d <= ende; d.setDate(d.getDate() + 1)) {
            const iso = dateToISO(d);
            if (d.getFullYear() !== y) continue;
            if (wotagJS[d.getDay()] !== abo.wochentag) continue;
            tage++;
        }

        gesamtMin += tage * minProEinheit;
    });

    if (gesamtMin === 0) return 0;
    return abo.platzkosten / gesamtMin;
}

function berechneKosten() {

    const kosten = { jahre: {} };

    // Grundstruktur pro Jahr anlegen
    D.settings.jahre.forEach(y => {
        kosten.jahre[y] = {
            platz: {},            // Platzkosten pro TP
            trainer: {},          // Trainerkosten pro TP
            spieler: {},          // Summe pro Spieler (alle TPs)
            tpSpieler: {},        // NEU: Kosten pro TP und Spieler
            gesamtProSpieler: {}  // Summe pro Spieler (für Ausgabe)
        };
    });

    // 1) Platzkosten pro Minute je Abo vorberechnen
    const aboKostenProMin = {};
    D.abos.forEach(abo => {
        aboKostenProMin[abo.id] = berechnePlatzkostenProMinute(abo);
    });

    // 2) Trainingspläne durchgehen
    D.trainingsplan.forEach(tp => {
        const abo = D.abos.find(a => a.id === tp.aboId);
        if (!abo) return;

        // Trainer ermitteln
        let trainer;
        if (tp.trainerId === "__NONE__") {
            trainer = { kosten: 0, name: "ohne Trainer" };
        } else {
            trainer = D.trainer.find(t => t.id === tp.trainerId) || { kosten: 0, name: "unbekannt" };
        }

        const platzMinCost = aboKostenProMin[tp.aboId] || 0;
        const trainerCostPerMinute = (trainer.kosten || 0) / 60;

        D.settings.jahre.forEach(y => {
            const jahr = kosten.jahre[y];

            const tage        = tp.jahre?.[y]?.tage ?? 0;
            const tageTrainer = tp.jahre?.[y]?.tageTrainer ?? 0;
            const minuten     = tp.minuten ?? 0;

            // Platzkosten & Trainerkosten für diesen TP in diesem Jahr
            const platzKosten   = tage        * minuten * platzMinCost;
            const trainerKosten = tageTrainer * minuten * trainerCostPerMinute;

            // aufsummieren (falls ein TP theoretisch mehrfach reinlaufen würde)
            jahr.platz[tp.id]   = (jahr.platz[tp.id]   || 0) + platzKosten;
            jahr.trainer[tp.id] = (jahr.trainer[tp.id] || 0) + trainerKosten;

            // aktive Spieler für dieses Jahr
            const aktiveSpieler = (tp.spielerIds || []).filter(id => {
                const sp = D.spieler.find(s => s.id === id);
                return sp && sp.jahre && sp.jahre[y];
            });

            if (aktiveSpieler.length === 0) {
                return;
            }

            // 1. Summe der Gewichte (Kostenfaktoren)
            let summeGewichte = 0;
            aktiveSpieler.forEach(id => {
                const sp = D.spieler.find(s => s.id === id);
                const faktor = sp && sp.kostenfaktor != null ? sp.kostenfaktor : 1.0;
                summeGewichte += faktor;
            });

            if (summeGewichte <= 0) {
                return;
            }

            // 2. Kosten pro Gewichtseinheit
            const gesamtKostenTP = platzKosten + trainerKosten;
            const kostenProEinheit = gesamtKostenTP / summeGewichte;

            // 3. Auf Spieler verteilen
            aktiveSpieler.forEach(id => {
                const sp = D.spieler.find(s => s.id === id);
                const faktor = sp && sp.kostenfaktor != null ? sp.kostenfaktor : 1.0;
                const k = kostenProEinheit * faktor;

                // Summe pro Spieler
                jahr.spieler[id] = (jahr.spieler[id] || 0) + k;

                // NEU: Kosten pro TP + Spieler
                if (!jahr.tpSpieler[tp.id]) {
                    jahr.tpSpieler[tp.id] = {};
                }
                jahr.tpSpieler[tp.id][id] = (jahr.tpSpieler[tp.id][id] || 0) + k;
            });
        });
    });

    // 3) Summen pro Spieler bilden (ggf. später erweiterbar)
    D.settings.jahre.forEach(y => {
        const jahr = kosten.jahre[y];
        Object.keys(jahr.spieler).forEach(spid => {
            jahr.gesamtProSpieler[spid] = jahr.spieler[spid];
        });
    });

    // Globale Ablage
    D.kosten = kosten;
}


/* =========================================================
   Modul 7 – Kostenübersicht
   ========================================================= */

function renderModul7(app) {

    const div = document.createElement("div");
    div.className = "section-card";
    div.innerHTML = `
        <h2>7. Kosten</h2>
        <div id="kostenOutput"></div>
    `;

    app.appendChild(div);

    // Kosten sind durch renderAll() bereits berechnet
    renderKostenOutput(div.querySelector("#kostenOutput"));
}

function renderKostenOutput(container) {

    if (!D.kosten || !D.kosten.jahre) {
        container.innerHTML = "<p>Noch nicht berechnet.</p>";
        return;
    }

    const jahre = D.settings.jahre || [];
    let html = `<table class="table-bordered"><tr><th>Spieler</th>`;

    // Kopfzeile: alle Jahre + Gesamt
    jahre.forEach(y => {
        html += `<th>${y}</th>`;
    });

    // Zuschuss-Spalte nur anzeigen, wenn global aktiv
    if (D.settings.zuschussAktiv) {
        html += `<th>Zuschuss</th>`;
    }

    html += `<th>Gesamt</th></tr>`;

    // Alle Spieler alphabetisch sortiert (defensiv, falls D.spieler nicht existiert)
    const alleSpieler = (D.spieler || [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "de"));

    alleSpieler.forEach(sp => {

        html += `<tr><td>${sp.name}</td>`;

        let jahreSumme = 0;

        jahre.forEach(y => {
            const jahr = D.kosten.jahre[y];
            const wert = jahr && jahr.gesamtProSpieler[sp.id]
                ? jahr.gesamtProSpieler[sp.id]
                : 0;

            html += `<td>${wert ? formatCurrencyDE(wert) : "-"}</td>`;
            jahreSumme += wert;
        });

        // Zuschuss (nur wenn global aktiv)
        let zus = 0;
        if (D.settings.zuschussAktiv) {
            zus = sp.zuschuss ? D.settings.zuschussBetrag : 0;

            html += `<td>${zus > 0 ? "-" + formatCurrencyDE(zus) : "0,00 €"}</td>`;
        }

        const endsumme = Math.max(0, jahreSumme - zus);

        html += `<td><b>${formatCurrencyDE(endsumme)}</b></td></tr>`;

    });

    html += `</table>`;
    container.innerHTML = html;
}


/* ============================================================
   Modul 8 – Hilfsfunktionen
   ============================================================ */

/* Zeitstring "HH:MM" → Minuten */
function mod8_timeToMin(t) {
    if (!t) return 0;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}

/* Minuten → Zeitstring "HH:MM" */
function mod8_minToTime(m) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    return `${hh}:${mm}`;
}

/* 30-Minuten-Slots zwischen Start und Ende */
function mod8_slotsBetween(startMin, endMin) {
    const out = [];
    for (let t = startMin; t < endMin; t += 30) {
        out.push(t);
    }
    return out;
}

/* Alle verwendeten Slots eines Trainingsplans */
function mod8_getTpSlots(tp, abo) {
    // bevorzugt die Zeiten aus dem Trainingsplan,
    // fällt ggf. auf die Abo-Zeiten zurück
    const start = mod8_timeToMin(tp.vonZeit || abo.startzeit);
    const end   = mod8_timeToMin(tp.bisZeit  || abo.endzeit);
    return mod8_slotsBetween(start, end);
}

/* Spieler alphabetisch holen */
function mod8_getSortedPlayers(tp, D) {
    return (tp.spielerIds || [])
        .map(id => D.spieler.find(s => s.id === id))
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name));
}

/* Verteilung der Spieler auf die Slots nach maxZeilen
   → chunks[slotIndex] = [spieler…] */
function mod8_distributePlayers(players, slotCount, maxZeilen) {
    const chunks = [];
    let idx = 0;

    for (let s = 0; s < slotCount; s++) {
        chunks[s] = [];
        for (let z = 0; z < maxZeilen; z++) {
            if (players[idx]) {
                chunks[s].push(players[idx]);
                idx++;
            } else {
                break;
            }
        }
    }

    return chunks;
}

/* Jahr-Label für Spieler: "", " (nur 2025)", " (nur 2026)" */
function mod8_getSpielerJahresLabel(sp, tp) {
    if (!sp || !sp.jahre || !tp || !tp.jahre) return "";

    const tpJahre = Object.keys(tp.jahre);
    if (tpJahre.length <= 1) return "";  // bei nur einem Jahr keine Markierung

    const aktive = Object.entries(sp.jahre)
        .filter(([jahr, aktiv]) => !!aktiv)
        .map(([jahr]) => jahr);

    if (aktive.length === 1) {
        return ` (nur ${aktive[0]})`;
    }

    return "";
}

/* Kosten pro Spieler und Trainingsplan (über alle Jahre) */
function mod8_kostenProSpielerTP(tp, sp) {

    if (!tp || !sp) return 0;
    if (!D || !D.settings || !Array.isArray(D.settings.jahre)) return 0;

    // Abo & Trainer besorgen
    const abo = D.abos.find(a => a.id === tp.aboId);
    if (!abo) return 0;

    const platzMinCost = berechnePlatzkostenProMinute(abo);

    let trainer;
    if (tp.trainerId === "__NONE__") {
        trainer = { kosten: 0 };
    } else {
        trainer = D.trainer.find(t => t.id === tp.trainerId) || { kosten: 0 };
    }
    const trainerCostPerMinute = (trainer.kosten || 0) / 60;

    const minuten = tp.minuten || (timeToMin(tp.bisZeit) - timeToMin(tp.vonZeit));
    if (!minuten || minuten <= 0) return 0;

    let summe = 0;

    D.settings.jahre.forEach(y => {

        const jahrData = tp.jahre && tp.jahre[y];
        if (!jahrData) return;

        const tage        = jahrData.tage        || 0;
        const tageTrainer = jahrData.tageTrainer || 0;

        if (tage === 0 && tageTrainer === 0) return;

        const platzKosten   = tage        * minuten * platzMinCost;
        const trainerKosten = tageTrainer * minuten * trainerCostPerMinute;
        const gesamtTP      = platzKosten + trainerKosten;

        // Aktive Spieler in diesem Jahr
        const aktiveSpielerIds = (tp.spielerIds || []).filter(id => {
            const s = D.spieler.find(sp2 => sp2.id === id);
            return s && s.jahre && s.jahre[y];
        });

        if (!aktiveSpielerIds.includes(sp.id)) return;
        if (aktiveSpielerIds.length === 0) return;

        let summeGewichte = 0;
        aktiveSpielerIds.forEach(id => {
            const s2 = D.spieler.find(xx => xx.id === id);
            summeGewichte += (s2?.kostenfaktor ?? 1.0);
        });

        if (summeGewichte <= 0) return;

        const faktorSp = sp.kostenfaktor ?? 1.0;
        const kostenProEinheit = gesamtTP / summeGewichte;

        summe += faktorSp * kostenProEinheit;
    });

    return summe;
}


/* =========================================================
   MODUL 8 – Trainingsübersicht (Tabellenansicht)
   ========================================================= */

function renderModul8(app) {

    // globale Daten
    const tps     = D.trainingsplan || [];
    const abos    = D.abos || [];
    const spieler = D.spieler || [];

    const div = document.createElement("div");
    div.className = "section-card";

    div.innerHTML = `
        <h2>8. Trainingsübersicht</h2>
        <button id="btnTPExportXLSX">XLSX exportieren</button>
    `;

    if (tps.length === 0) {
        div.innerHTML += `<p>Keine Trainingspläne vorhanden.</p>`;
        app.appendChild(div);
        return;
    }


    /* ---------------------------------------------------------
       1) früheste / späteste Zeit finden
       --------------------------------------------------------- */
    let earliest = Infinity;
    let latest   = -Infinity;

    tps.forEach(tp => {
        const abo = abos.find(a => a.id === tp.aboId);
        if (!abo) return;

        const s = mod8_timeToMin(tp.vonZeit || abo.startzeit);
        const e = mod8_timeToMin(tp.bisZeit  || abo.endzeit);

        if (!isNaN(s) && s < earliest) earliest = s;
        if (!isNaN(e) && e > latest)   latest   = e;
    });

    if (earliest === Infinity || latest === -Infinity) {
        div.innerHTML += `<p>Fehlerhafte Zeitdaten.</p>`;
        app.appendChild(div);
        return;
    }

    const slots = mod8_slotsBetween(earliest, latest);


    /* ---------------------------------------------------------
       2) Wochentage
       --------------------------------------------------------- */
    const tage = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];
    //const tage = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];


    /* ---------------------------------------------------------
       3) Globales Raster: maxZeilen pro Slot
       --------------------------------------------------------- */
    let maxZeilen = 1;

    tps.forEach(tp => {
        const abo = abos.find(a => a.id === tp.aboId);
        if (!abo) return;

        const tpSlots   = mod8_getTpSlots(tp, abo);
        const players   = mod8_getSortedPlayers(tp, D);
        const n         = players.length;
        const slotCount = tpSlots.length || 1;

        const z = Math.ceil(n / slotCount);
        if (z > maxZeilen) maxZeilen = z;
    });


    /* ---------------------------------------------------------
       4) Matrix aufbauen
       matrix[slot][tag] = { tp, players[], isStart, isEnd, blockIndex }
       --------------------------------------------------------- */
    const matrix = {};
    slots.forEach(slot => {
        matrix[slot] = {};
        tage.forEach(tag => matrix[slot][tag] = null);
    });


    /* ---------------------------------------------------------
       5) Traininspläne in Matrix eintragen
       --------------------------------------------------------- */
    tps.forEach(tp => {
        const abo = abos.find(a => a.id === tp.aboId);
        if (!abo) return;

        const tag = abo.wochentag;
        if (!tage.includes(tag)) return;

        const slotList = mod8_getTpSlots(tp, abo);
        const playersBase = mod8_getSortedPlayers(tp, D);

        // Spieler erweitern
        const enriched = playersBase.map(sp => ({
            id: sp.id,
            name: sp.name + mod8_getSpielerJahresLabel(sp, tp),
            kosten: mod8_kostenProSpielerTP(tp, sp)
        }));

        const slotCount = slotList.length;
        const chunks = mod8_distributePlayers(enriched, slotCount, maxZeilen);

        slotList.forEach((slot, idx) => {
            matrix[slot][tag] = {
                tp,
                players: chunks[idx] || [],
                isStart: idx === 0,
                isEnd:   idx === slotCount - 1,
                blockIndex: idx
            };
        });
    });


    /* ---------------------------------------------------------
       6) Tabelle rendern
       --------------------------------------------------------- */

    let html = `
        <table id="tp_table" class="mod8-table">
            <colgroup>
                <col class="mod8-col-time">
                ${tage.map(() => `
                    <col style="width:13%;">
                    <col style="width:7%;">
                    <!--
                    <col style="width:10%;">
                    <col style="width:4.28%;">
                    -->
                `).join("")}
            </colgroup>

            <thead>
                <tr>
                    <th rowspan="2" class="mod8-col-time">Zeit</th>
                    ${tage.map(t => `<th colspan="2" style="text-align:center;">${t}</th>`).join("")}
                </tr>
                <tr>
                    ${tage.map(() => `<th style="text-align:center;">Spieler</th><th style="text-align:center;">Kosten</th>`).join("")}
                </tr>
            </thead>
            <tbody>
    `;


    slots.forEach(slot => {

        for (let r = 0; r < maxZeilen; r++) {
            html += `<tr>`;

            if (r === 0) {
                html += `<td class="mod8-time" rowspan="${maxZeilen}">${mod8_minToTime(slot)}</td>`;
            }

            tage.forEach(tag => {
                const cell = matrix[slot][tag];

                if (!cell) {
                    html += `<td class="mod8-empty"></td><td class="mod8-empty"></td>`;
                    return;
                }

                const p = cell.players[r];

                // Block-Klassen (führen wir gleich im CSS aus)
                const nameClasses  = ["mod8-blockcell", "mod8-block-left"];
                const costClasses  = ["mod8-blockcell", "mod8-block-right"];

                if (cell.isStart && r === 0) {
                    nameClasses.push("mod8-block-top");
                    costClasses.push("mod8-block-top");
                }

                if (cell.isEnd && r === maxZeilen - 1) {
                    nameClasses.push("mod8-block-bottom");
                    costClasses.push("mod8-block-bottom");
                }

                if (!p) {
                    html += `<td class="${nameClasses.join(" ")}"></td>`;
                    html += `<td class="${costClasses.join(" ")}"></td>`;
                } else {
                    html += `<td class="${nameClasses.join(" ")}">${p.name}</td>`;
                    html += `<td class="${costClasses.join(" ")}">${formatCurrencyDE(p.kosten || 0)}</td>`;
                }
            });

            html += `</tr>`;
        }

    });


    html += `
            </tbody>
        </table>

        <!--
        <div class="mod8-period-info">
            <b>Hinweis:</b> Durchgehende Trainingsblöcke werden ohne sichtbare Gitternetzlinien dargestellt.
            Leere Zeilen dienen der einheitlichen Höhe.
        </div>
        -->
    `;

    div.innerHTML += html;
    app.appendChild(div);

    div.querySelector("#btnTPExportXLSX").onclick = () => exportTrainingsplanXLSX();

}

function exportTrainingsplanXLSX() {

    // --------------------------------------------------------
    // 1) Grunddaten wie in renderModul8
    // --------------------------------------------------------
    const tps  = D.trainingsplan || [];
    const abos = D.abos || [];
    const tage = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];
    //const tage = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

    if (tps.length === 0) {
        alert("Keine Trainingspläne vorhanden.");
        return;
    }

    // früheste / späteste Zeit bestimmen
    let earliest = Infinity;
    let latest   = -Infinity;

    tps.forEach(tp => {
        const abo = abos.find(a => a.id === tp.aboId);
        if (!abo) return;
        const s = mod8_timeToMin(tp.vonZeit || abo.startzeit);
        const e = mod8_timeToMin(tp.bisZeit  || abo.endzeit);
        if (!isNaN(s) && s < earliest) earliest = s;
        if (!isNaN(e) && e > latest)   latest   = e;
    });

    if (!isFinite(earliest) || !isFinite(latest)) {
        alert("Fehlerhafte Zeitdaten.");
        return;
    }

    const slots = mod8_slotsBetween(earliest, latest); // z.B. 15:00, 15:30, ...

    // maximale Zeilenzahl pro Slot (wie in renderModul8)
    let maxZeilen = 1;
    tps.forEach(tp => {
        const abo = abos.find(a => a.id === tp.aboId);
        if (!abo) return;
        const tpSlots   = mod8_getTpSlots(tp, abo);
        const players   = mod8_getSortedPlayers(tp, D);
        const n         = players.length;
        const slotCount = tpSlots.length || 1;
        const z         = Math.ceil(n / slotCount);
        if (z > maxZeilen) maxZeilen = z;
    });

    // Matrix wie in renderModul8
    const matrix = {};
    slots.forEach(slot => {
        matrix[slot] = {};
        tage.forEach(tag => matrix[slot][tag] = null);
    });

    tps.forEach(tp => {
        const abo = abos.find(a => a.id === tp.aboId);
        if (!abo) return;
        const tag = abo.wochentag;
        if (!tage.includes(tag)) return;

        const slotList   = mod8_getTpSlots(tp, abo);
        const playersBase = mod8_getSortedPlayers(tp, D);

        const enriched = playersBase.map(sp => ({
            id: sp.id,
            name: sp.name + mod8_getSpielerJahresLabel(sp, tp),
            kosten: mod8_kostenProSpielerTP(tp, sp)
        }));

        const slotCount = slotList.length;
        const chunks    = mod8_distributePlayers(enriched, slotCount, maxZeilen);

        slotList.forEach((slot, idx) => {
            matrix[slot][tag] = {
                tp,
                players: chunks[idx] || [],
                isStart: idx === 0,
                isEnd:   idx === slotCount - 1,
                blockIndex: idx
            };
        });
    });

    // --------------------------------------------------------
    // 2) Excel-Matrix aufbauen (Werte, noch ohne Styles)
    //    Struktur: 2 Kopfzeilen + (slots * maxZeilen) Datenzeilen
    // --------------------------------------------------------
    const excelMatrix = [];

    // Kopfzeile 1
    const head1 = ["Zeit"];
    tage.forEach(tag => head1.push(tag, ""));
    excelMatrix.push(head1);

    // Kopfzeile 2
    const head2 = [""];
    tage.forEach(() => head2.push("Spieler", "Kosten"));
    excelMatrix.push(head2);

    // Hilfstruktur, um für jede Excel-Zelle zu wissen,
    // ob sie zu einem Block gehört und ob sie Blockober-/unterkante ist
    const rowCount = 2 + slots.length * maxZeilen;
    const colCount = 1 + tage.length * 2;
    const blockInfo = Array.from({ length: rowCount }, () =>
        Array.from({ length: colCount }, () => null)
    );

    // Datenzeilen
    slots.forEach((slot, slotIdx) => {
        for (let r = 0; r < maxZeilen; r++) {
            const row = [];

            // Zeitspalte
            if (r === 0) {
                row.push(mod8_minToTime(slot));
            } else {
                row.push("");
            }

            // Tages-Spalten
            tage.forEach((tag, ti) => {
                const cell = matrix[slot][tag];
                const colName = 1 + ti * 2;
                const colCost = colName + 1;
                const excelRowIndex = 2 + slotIdx * maxZeilen + r;

                if (!cell) {
                    row.push("", "");
                    // blockInfo bleibt null
                } else {
                    const p = cell.players[r] || null;

                    const isTop    = cell.isStart && r === 0;
                    const isBottom = cell.isEnd   && r === (maxZeilen - 1);

                    // Spieler
                    if (p) {
                        row.push(p.name, formatCurrencyDE(p.kosten || 0));
                    } else {
                        row.push("", "");
                    }

                    // merken: dies ist eine Blockzeile (auch wenn p leer ist!)
                    blockInfo[excelRowIndex][colName] = {
                        isBlock: true,
                        isTop,
                        isBottom
                    };
                    blockInfo[excelRowIndex][colCost] = {
                        isBlock: true,
                        isTop,
                        isBottom
                    };
                }
            });

            excelMatrix.push(row);
        }
    });

    // --------------------------------------------------------
    // 3) Sheet erzeugen
    // --------------------------------------------------------
    const ws = XLSX.utils.aoa_to_sheet(excelMatrix);

    // --------------------------------------------------------
    // 4) Hilfsfunktion ensureCell
    // --------------------------------------------------------
    function ensureCell(r, c) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (!ws[ref]) ws[ref] = { t: "s", v: "" };
        return ws[ref];
    }

    // --------------------------------------------------------
    // 5) Spaltenbreiten
    // --------------------------------------------------------
    ws["!cols"] = Array(colCount).fill({ wch: 20 });

    // --------------------------------------------------------
    // 6) Kopf-Merges
    // --------------------------------------------------------
    ws["!merges"] = [];

    // Zeitspalte über 2 Zeilen
    ws["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });

    // Tagesköpfe über 2 Spalten
    tage.forEach((tag, ti) => {
        const col = 1 + ti * 2;
        ws["!merges"].push({ s: { r: 0, c: col }, e: { r: 0, c: col + 1 } });
    });

    // --------------------------------------------------------
    // 7) Styles definieren
    // --------------------------------------------------------
    const COLOR_HEAD_TOP = "FFDEDEDE";   // Wochentag
    const COLOR_HEAD_SUB = "FFE9E9E9";   // Spieler/Kosten Kopf
    const COLOR_TIME_COL = "FFE9E9E9";   // Zeitspalte
    const COLOR_BLOCK_BG = "FFF4F4F4";   // Block-Hintergrund

    const BORDER_THICK = { style: "medium", color: { rgb: "FF999999" } }; // außen
    const BORDER_THIN  = { style: "thin",   color: { rgb: "FFCCCCCC" } }; // innen

    // Kopfzeilen stylen
    tage.forEach((tag, ti) => {
        const colName = 1 + ti * 2;
        const colCost = colName + 1;

        // Zeile 0: Wochentag
        const c0  = ensureCell(0, colName);
        const c0b = ensureCell(0, colCost);
        c0.s = c0b.s = {
            fill: { fgColor: { rgb: COLOR_HEAD_TOP } },
            font: { bold: true },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
                top:    BORDER_THIN,
                bottom: BORDER_THIN,
                left:   BORDER_THIN,
                right:  BORDER_THIN
            }
        };

        // Zeile 1: Spieler/Kosten
        const c1  = ensureCell(1, colName);
        const c1b = ensureCell(1, colCost);
        c1.s = c1b.s = {
            fill: { fgColor: { rgb: COLOR_HEAD_SUB } },
            font: { bold: true },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
                top:    BORDER_THIN,
                bottom: BORDER_THIN,
                left:   BORDER_THIN,
                right:  BORDER_THIN
            }
        };
    });

    //
    // A1 Kopfzelle stylen
    //
    const a1 = ensureCell(0, 0);
    a1.s = {
        fill: { fgColor: { rgb: COLOR_HEAD_TOP } },
        font: { bold: true },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
            top:    BORDER_THIN,
            bottom: BORDER_THIN,
            left:   BORDER_THIN,
            right:  BORDER_THIN
        }
    };

    //
    // Zeitspalte (Spalte A) stylen mit Blockrahmen wie HTML
    //
    for (let si = 0; si < slots.length; si++) {
        
        const baseRow = 2 + si * maxZeilen;      // erste Zeile dieses Slots
        const endRow  = baseRow + maxZeilen - 1; // letzte Zeile dieses Slots

        for (let r = baseRow; r <= endRow; r++) {
            const cell = ensureCell(r, 0);

            cell.s = {
                fill: { fgColor: { rgb: COLOR_TIME_COL } },
                font: { bold: r === baseRow },  // Uhrzeit fett nur in oberster Slot-Zeile
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    left:  BORDER_THIN,
                    right: BORDER_THIN,
                    top:   (r === baseRow ? BORDER_THIN : undefined),
                    bottom:(r === endRow  ? BORDER_THIN : undefined)
                }
            };
        }
    }


    // --------------------------------------------------------
    // 8) Trainingsblöcke stylen wie HTML
    // --------------------------------------------------------
    for (let r = 2; r < rowCount; r++) {
        for (let ti = 0; ti < tage.length; ti++) {

            const colName = 1 + ti * 2;
            const colCost = colName + 1;

            const infoN = blockInfo[r][colName];
            const infoC = blockInfo[r][colCost];

            if (!infoN || !infoN.isBlock) continue;

            // Spielerzelle
            const cN = ensureCell(r, colName);
            cN.s = cN.s || {};
            cN.s.fill = { fgColor: { rgb: COLOR_BLOCK_BG } };
            cN.s.border = cN.s.border || {};
            cN.s.alignment = { horizontal: "left", vertical: "center"};

            // Kostenzelle
            const cC = ensureCell(r, colCost);
            cC.s = cC.s || {};
            cC.s.fill = { fgColor: { rgb: COLOR_BLOCK_BG } };
            cC.s.border = cC.s.border || {};
            cC.s.alignment = { horizontal: "right", vertical: "center", indent: 1 };

            // Außen links/rechts immer dick
            cN.s.border.left  = BORDER_THICK;
            cC.s.border.right = BORDER_THICK;

            // Oben/Unten nur an Blockgrenze dick, sonst keine Linie
            if (infoN.isTop) {
                cN.s.border.top = BORDER_THICK;
                cC.s.border.top = BORDER_THICK;
            }
            if (infoN.isBottom) {
                cN.s.border.bottom = BORDER_THICK;
                cC.s.border.bottom = BORDER_THICK;
            }
        }
    }

    // --------------------------------------------------------
    // 9) Dünnen Außenrahmen um die gesamte Tabelle
    // --------------------------------------------------------
    for (let r = 0; r < rowCount; r++) {
        for (let c = 0; c < colCount; c++) {

            const cell = ensureCell(r, c);
            if (!cell.s) cell.s = {};
            if (!cell.s.border) cell.s.border = {};

            // Links
            if (c === 0) {
                if (!cell.s.border.left) cell.s.border.left = BORDER_THIN;
            }

            // Rechts
            if (c === colCount - 1) {
                if (!cell.s.border.right) cell.s.border.right = BORDER_THIN;
            }

            // Oben
            if (r === 0) {
                if (!cell.s.border.top) cell.s.border.top = BORDER_THIN;
            }

            // Unten
            if (r === rowCount - 1) {
                if (!cell.s.border.bottom) cell.s.border.bottom = BORDER_THIN;
            }
        }
    }

    // --------------------------------------------------------
    // 10) Workbook erstellen und speichern (DEIN alter Code)
    // --------------------------------------------------------
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Trainingsplan");

    const now = new Date();
    const ts  = now.toISOString().replace(/[:]/g,"-").slice(0,16);
    const art = (D.settings?.art ?? "plan");
    const periodenStr = (D.settings?.jahre?.join("-") ?? "jahre");

    const filename = `${art}_${periodenStr}_${ts}.xlsx`;
    XLSX.writeFile(wb, filename);
}

function exportTrainingsplanPDF() {
    const element = document.querySelector("#tp_table");

    if (!element) {
        alert("Trainingsansicht nicht gefunden.");
        return;
    }

    // 1. DIN A4 Maße in Pixeln (bei 96 DPI)
    // A4 Landscape ist ca. 1123px breit und 794px hoch
    // Wir ziehen etwas Puffer für die Ränder ab (20px an jeder Seite)
    const pdfPageWidth = 1123 - 40; 
    const pdfPageHeight = 794 - 40;

    // 2. Größe deiner Tabelle messen
    const elementWidth = element.scrollWidth;
    const elementHeight = element.scrollHeight;

    // 3. Zoom-Faktor berechnen
    // Wir prüfen, wie stark wir verkleinern müssen, damit Breite UND Höhe passen
    const widthRatio = pdfPageWidth / elementWidth;
    const heightRatio = pdfPageHeight / elementHeight;

    // Nimm den kleineren Wert, damit sicher beides passt. 
    // Maximal 1 (nicht vergrößern, falls die Tabelle eh klein ist)
    const zoomFactor = Math.min(widthRatio, heightRatio, 1);

    // Dateiname generieren
    const now = new Date();
    const ts = now.toISOString().replace(/[:]/g, "-").slice(0, 16);
    const art = (D.settings?.art ?? "plan");
    const periodenStr = (D.settings?.jahre?.join("-") ?? "jahre");
    const filename = `${art}_${periodenStr}_${ts}.pdf`;

    const opt = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 3, // Hohe Auflösung für scharfen Text
            useCORS: true,
            // Hier wenden wir den berechneten Zoom an
            onclone: (clonedDoc) => {
                const el = clonedDoc.querySelector("#tp_table");
                el.style.transform = `scale(${zoomFactor})`;
                el.style.transformOrigin = 'top left';
                
                // WICHTIG: Container verbreitern, damit rechts kein weißer Rand entsteht
                el.style.width = `${100 / zoomFactor}%`;
                
                // Optional: Höhe korrigieren, falls der Zoom sehr stark ist
                // el.style.height = `${100 / zoomFactor}%`; 
            }
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save();
}

/* =========================================================
   Dialog
   ========================================================= */

function showDialogMessage(title, text) {
    const overlay = document.getElementById("overlay");
    const dialog = document.getElementById("dialog");

    overlay.classList.add("show");

    dialog.innerHTML = `
        <h3>${title}</h3>
        <div style="margin: 15px 0; white-space: pre-line;">${text}</div>
        <button id="dlg_ok">OK</button>
    `;

    document.getElementById("dlg_ok").onclick = () => {
        overlay.classList.remove("show");
        dialog.innerHTML = "";
    };
}

function showDialogConfirm(title, text, onYes) {
    const overlay = document.getElementById("overlay");
    const dialog = document.getElementById("dialog");

    overlay.classList.add("show");

    dialog.innerHTML = `
        <h3>${title}</h3>
        <div style="margin: 15px 0; white-space: pre-line;">${text}</div>
        <button id="dlg_yes">OK</button>
        <button id="dlg_no">Abbrechen</button>
    `;

    document.getElementById("dlg_no").onclick = () => {
        overlay.classList.remove("show");
        dialog.innerHTML = "";
    };

    document.getElementById("dlg_yes").onclick = () => {
        overlay.classList.remove("show");
        dialog.innerHTML = "";
        onYes();
    };
}


/* =========================================================
   Initialisierung
   ========================================================= */

window.onload = () => {
    const btn = document.getElementById("btnNeuesProjekt");
    if (btn) btn.onclick = openStartDialog;

    const loader = document.getElementById("jsonLoader");
    if (loader) loader.onchange = handleJSONFile;
};
