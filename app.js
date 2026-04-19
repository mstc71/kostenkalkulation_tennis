//  =========================================================
//  Globale Datenstruktur
//  =========================================================
let D = {
    settings: {
        art: "",
        startdatum: "",
        enddatum: "",
        jahre: [],
        zuschussAktiv: false,
        zuschussBetrag: 0,
    },
    trainingstage: [],
    abos: [],
    trainer: [],
    spieler: [],
    trainingsplan: [],
    plaetze: [],
};

//  =========================================================
//  Rendering / Header
//  =========================================================
ui_boot = () => {
    const btnNew = document.getElementById("btnNeuesProjekt");
    if (btnNew) btnNew.onclick = proj_dialogOpenStart;

    const loader = document.getElementById("jsonLoader");
    if (loader) loader.onchange = proj_handleJsonFile;

    const btnSave = document.getElementById("btnSaveProject");
    if (btnSave) btnSave.onclick = () => export_saveJson();

    const btnExport = document.getElementById("btnExportAll");
    if (btnExport) btnExport.onclick = () => export_runAllWithDialog();

    if (typeof ui_updateHeaderButtons === "function") ui_updateHeaderButtons();
};

window.onload = ui_boot;

function ui_renderAll() {
    const app = document.getElementById("app");
    app.innerHTML = "";

    proj_renderStart(app);
    proj_renderTrainingdays(app);
    plaetze_renderSection(app);
    abo_renderSection(app);
    trainer_renderSection(app);
    spieler_renderSection(app);
    tp_renderSection(app);
    kosten_calcAll();
    kosten_renderSection(app);
    overview_renderSection(app);

    // Header-Buttons (Speichern/Export) dynamisch aktualisieren
    ui_updateHeaderButtons();
}

function ui_updateHeaderButtons() {
    const btnSave = document.getElementById("btnSaveProject");
    const btnExport = document.getElementById("btnExportAll");

    const hasProject = !!(D && D.settings && D.settings.art);

    if (btnSave) {
        btnSave.disabled = !hasProject;
    }

    if (btnExport) {
        if (!hasProject) {
            btnExport.style.display = "none";
            btnExport.disabled = true;
            return;
        }

        // Export-Button nur anzeigen, wenn mind. ein XLSX-Export möglich ist.
        // (JSON ist immer möglich, wenn Projekt existiert.)
        const plan = export_buildPlan();
        const anyXlsx = plan.items.some((x) => x.possible && x.key !== "json");

        btnExport.style.display = anyXlsx ? "" : "none";
        btnExport.disabled = !anyXlsx;
    }
}

//  =========================================================
//  Dialog
//  =========================================================
function ui_dialogSetType(type) {
    const dlg = document.getElementById("dialog");
    if (!dlg) return;

    dlg.classList.remove("dialog--message", "dialog--form", "dialog--wide");
    if (type === "message") dlg.classList.add("dialog--message");
    else if (type === "wide") dlg.classList.add("dialog--wide");
    else dlg.classList.add("dialog--form"); // default
}

function ui_dialogClose() {
    const overlay = document.getElementById("overlay");
    const dlg = document.getElementById("dialog");
    if (overlay) overlay.classList.remove("show");
    if (dlg) {
        dlg.classList.remove("dialog--message", "dialog--form", "dialog--wide");
        const layer = dlg.querySelector(".dlg-layer");
        if (layer) layer.remove();
        dlg.innerHTML = "";
    }
}

function ui_dialogMessage(title, text) {
    const overlay = document.getElementById("overlay");
    const dialog = document.getElementById("dialog");

    const safeTitle = String(title)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const safeText = String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");

    // Wenn bereits ein Dialog offen ist (Form-Dialog im Hintergrund),
    // soll die Meldung als Layer darüber angezeigt werden, ohne den Inhalt zu ersetzen.
    const hasBaseDialog =
        overlay.classList.contains("show") &&
        dialog.innerHTML.trim() !== "" &&
        !dialog.querySelector(".dlg-layer");

    overlay.classList.add("show");

    if (hasBaseDialog) {
        dialog.style.position = dialog.style.position || "relative";

        const layer = document.createElement("div");
        layer.className = "dlg-layer";

        layer.innerHTML = `
            <div class="dlg-layer-box">
                <h3>${safeTitle}</h3>
                <div class="dlg-text">${safeText}</div>
                <button class="dlg-layer-ok">OK</button>
            </div>
        `;

        dialog.appendChild(layer);

        layer.querySelector(".dlg-layer-ok").onclick = () => {
            layer.remove();
        };

        return;
    }

    // Fallback: kein Dialog im Hintergrund → normaler Message-Dialog
    ui_dialogSetType("message");
    dialog.innerHTML = `
        <h3>${safeTitle}</h3>
        <div class="dlg-text">${safeText}</div>
        <button id="dlg_ok">OK</button>
    `;

    document.getElementById("dlg_ok").onclick = () => {
        ui_dialogClose();
    };
}

function ui_dialogConfirm(title, text, onYes) {
    const overlay = document.getElementById("overlay");
    const dialog = document.getElementById("dialog");

    const safeTitle = String(title)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const safeText = String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");

    const hasBaseDialog =
        overlay.classList.contains("show") &&
        dialog.innerHTML.trim() !== "" &&
        !dialog.querySelector(".dlg-layer");

    overlay.classList.add("show");

    if (hasBaseDialog) {
        dialog.style.position = dialog.style.position || "relative";

        const layer = document.createElement("div");
        layer.className = "dlg-layer";

        layer.innerHTML = `
            <div class="dlg-layer-box">
                <h3>${safeTitle}</h3>
                <div class="dlg-text">${safeText}</div>
                <button class="dlg-layer-yes">OK</button>
                <button class="dlg-layer-no">Abbrechen</button>
            </div>
        `;

        dialog.appendChild(layer);

        layer.querySelector(".dlg-layer-no").onclick = () => {
            layer.remove();
        };

        layer.querySelector(".dlg-layer-yes").onclick = () => {
            layer.remove();
            onYes();
        };

        return;
    }

    // Fallback: normaler Confirm-Dialog
    ui_dialogSetType("message");
    dialog.innerHTML = `
        <h3>${safeTitle}</h3>
        <div class="dlg-text">${safeText}</div>
        <button id="dlg_yes">OK</button>
        <button id="dlg_no">Abbrechen</button>
    `;

    document.getElementById("dlg_no").onclick = () => {
        ui_dialogClose();
    };

    document.getElementById("dlg_yes").onclick = () => {
        ui_dialogClose();
        onYes();
    };
}

//  =========================================================
//  Projekt / Laden / Speichern / Zeitraum
//  =========================================================
function proj_dialogOpenStart() {
    const overlay = document.getElementById("overlay");
    const dlg = document.getElementById("dialog");

    // Formular-Dialog
    ui_dialogSetType("form");

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

        <label>Zeitraum:<br>
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

    dlg.querySelector("#dlg_cancel").onclick = () => ui_dialogClose();

    dlg.querySelector("#dlg_ok").onclick = () => {
        const art = dlg.querySelector("#dlg_art").value.trim();
        const start = dlg.querySelector("#dlg_start").value.trim();
        const ende = dlg.querySelector("#dlg_ende").value.trim();

        const zusAktiv = dlg.querySelector("#dlg_zuschussAktiv").checked;
        const zusRaw = dlg.querySelector("#dlg_zuschussBetrag").value;
        const zusBetragParsed = Number(zusRaw);

        const errors = [];

        let platzHinweisNoetig = false;
        if (!art) errors.push("• Bitte Trainingsart auswählen.");
        if (!start) errors.push("• Bitte Startdatum angeben.");
        if (!ende) errors.push("• Bitte Enddatum angeben.");

        if (start && ende && start > ende) {
            errors.push("• Startdatum darf nicht nach dem Enddatum liegen.");
        }

        if (zusAktiv) {
            if (zusRaw === "" || Number.isNaN(zusBetragParsed)) {
                errors.push("• Bitte einen gültigen Zuschussbetrag angeben.");
            } else if (zusBetragParsed < 0) {
                errors.push("• Zuschussbetrag darf nicht negativ sein.");
            }
        }

        if (art === "Wintertraining" && start && ende) {
            const sy = Number(start.slice(0, 4));
            const ey = Number(ende.slice(0, 4));
            if (sy === ey) {
                errors.push(
                    "• Beim Wintertraining müssen Start- und Enddatum in unterschiedlichen Jahren liegen.",
                );
            }
        }

        if (art === "Sommertraining" && start && ende) {
            const sy = Number(start.slice(0, 4));
            const ey = Number(ende.slice(0, 4));
            if (sy !== ey) {
                errors.push(
                    "• Beim Sommertraining müssen Start- und Enddatum im selben Jahr liegen.",
                );
            }
        }

        if (val_showErrors("Projektstart prüfen", errors)) return;

        const zusBetrag = zusAktiv ? zusBetragParsed : 0;

        // Werte an proj_init übergeben
        D.settings.zuschussAktiv = zusAktiv;
        D.settings.zuschussBetrag = zusBetrag;

        proj_init(art, start, ende, zusAktiv, zusBetrag);

        ui_dialogClose();
    };
}

function proj_init(art, start, ende, zusAktiv, zusBetrag) {
    const jahre = [];
    let s = util_isoToDate(start);
    let e = util_isoToDate(ende);
    for (let y = s.getFullYear(); y <= e.getFullYear(); y++) jahre.push(y);

    D = {
        settings: {
            art,
            startdatum: start,
            enddatum: ende,
            jahre,
            zuschussAktiv: zusAktiv,
            zuschussBetrag: zusBetrag,
        },
        trainingstage: [],
        abos: [],
        trainer: [],
        spieler: [],
        trainingsplan: [],
        plaetze: [],
    };

    proj_calcTrainingdays();
    ui_renderAll();
}

function proj_renderStart(app) {
    const div = document.createElement("div");
    div.className = "section-card";

    div.innerHTML = `
        <h2>1. Projektstart</h2>

        <label>Trainingsart:<br>
            <input type="text" value="${D.settings.art}" readonly>
        </label><br>

        <label>Zeitraum:<br>
            von&nbsp;&nbsp;&nbsp;<input id="proj_start" type="date" value="${D.settings.startdatum}">&nbsp;&nbsp;&nbsp;bis&nbsp;&nbsp;&nbsp;<input id="proj_ende" type="date" value="${D.settings.enddatum}">
        </label>

        <hr style="margin: 20px 0;">

        <label>Zuschuss zum Training berücksichtigen:<br>
            <input id="proj_zuschussAktiv" type="checkbox" ${D.settings.zuschussAktiv ? "checked" : ""}>
        </label><br>

        <label>Betrag (€):<br>
            <input 
                id="proj_zuschussBetrag" 
                type="number" 
                min="0" 
                step="1" 
                value="${D.settings.zuschussBetrag}"
                ${!D.settings.zuschussAktiv ? "disabled" : ""}
            >
        </label><br><br>
    `;

    app.appendChild(div);

    // Datum: vorherigen Wert merken und erst bei Verlassen (blur) prüfen/übernehmen.
    // Dadurch wird die Eingabe nicht durch ein sofortiges Re-Rendering unterbrochen.
    const elStart = div.querySelector("#proj_start");
    const elEnde = div.querySelector("#proj_ende");

    const storePrev = (e) => {
        e.target.dataset.prev = e.target.value || "";
    };

    const onDateBlur = (e) => {
        const prev = e.target.dataset.prev || "";
        const curr = e.target.value || "";

        if (prev === curr) return; // nichts geändert

        const start = elStart.value;
        const ende = elEnde.value;

        // Wir übernehmen erst, wenn beide Daten gesetzt sind
        if (!start || !ende) return;

        const errors = [];

        // Start <= Ende
        if (start > ende) {
            errors.push("• Startdatum darf nicht nach dem Enddatum liegen.");
        }

        // Trainingsart-spezifische Jahreslogik
        const sy = Number(start.slice(0, 4));
        const ey = Number(ende.slice(0, 4));

        if (D.settings.art === "Wintertraining" && sy === ey) {
            errors.push(
                "• Beim Wintertraining müssen Start- und Enddatum in unterschiedlichen Jahren liegen.",
            );
        }

        if (D.settings.art === "Sommertraining" && sy !== ey) {
            errors.push(
                "• Beim Sommertraining müssen Start- und Enddatum im selben Jahr liegen.",
            );
        }

        if (val_showErrors("Projektstart prüfen", errors)) {
            // Wert zurücksetzen und Fokus wieder ins Feld
            e.target.value = prev;
            setTimeout(() => e.target.focus(), 0);
            return;
        }

        // gültig -> übernehmen
        const ok = proj_updateDates(start, ende);
        if (!ok) {
            // beide Felder auf den aktuellen Projektstand zurücksetzen
            elStart.value = D.settings.startdatum;
            elEnde.value = D.settings.enddatum;

            // prev-Werte ebenfalls aktualisieren, damit der nächste Blur nicht „sofort wieder“ feuert
            elStart.dataset.prev = elStart.value || "";
            elEnde.dataset.prev = elEnde.value || "";

            // Fokus zurück ins geänderte Feld
            setTimeout(() => e.target.focus(), 0);
        }
    };

    elStart.onfocus = storePrev;
    elEnde.onfocus = storePrev;
    elStart.onblur = onDateBlur;
    elEnde.onblur = onDateBlur;

    // Speichern/Export erfolgt über den Sticky-Header.

    // Zuschuss aktiv ändern
    div.querySelector("#proj_zuschussAktiv").onchange = (e) => {
        D.settings.zuschussAktiv = e.target.checked;

        // Betragseingabe ein/ausblenden
        const field = div.querySelector("#proj_zuschussBetrag");
        field.disabled = !D.settings.zuschussAktiv;

        ui_renderAll(); // UI neu zeichnen
    };

    // Zuschussbetrag ändern
    div.querySelector("#proj_zuschussBetrag").onchange = (e) => {
        const v = Number(e.target.value);
        D.settings.zuschussBetrag = v >= 0 ? v : 0;

        ui_renderAll(); // UI neu zeichnen
    };
}

function proj_renderTrainingdays(app) {
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
    D.trainingstage.forEach((row) => {
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

    D.settings.jahre.forEach((year) => {
        // Listen formatieren
        const feiertageList = (feiertageData[year] || [])
            .map((f) => {
                const [y, m, d] = f.datum.split("-");
                return `<li>${d}.${m}.${y} (${f.name})</li>`;
            })
            .join("");

        const ferienList = (ferienData[year] || [])
            .map((f) => {
                const [yv, mv, dv] = f.von.split("-");
                const [yb, mb, db] = f.bis.split("-");
                return `<li>${dv}.${mv}.${yv} – ${db}.${mb}.${yb} (${f.name})</li>`;
            })
            .join("");

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
        document.querySelectorAll(".accordion-header").forEach((head) => {
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

function proj_calcTrainingdays() {
    const start = util_isoToDate(D.settings.startdatum);
    const ende = util_isoToDate(D.settings.enddatum);
    const jahre = D.settings.jahre;

    const wotagNamen = [
        "Sonntag",
        "Montag",
        "Dienstag",
        "Mittwoch",
        "Donnerstag",
        "Freitag",
        "Samstag",
    ];

    // Struktur für alle Wochentage und Jahre anlegen
    const tageNamen = [
        "Montag",
        "Dienstag",
        "Mittwoch",
        "Donnerstag",
        "Freitag",
        "Samstag",
        "Sonntag",
    ];
    D.trainingstage = tageNamen.map((tag) => {
        const j = {};
        jahre.forEach((y) => (j[y] = { max: 0, tage: 0 }));
        return { tag, jahre: j };
    });

    const alleFeiertage = DE_DATES["Hessen"].feiertage || {};
    const alleFerien = DE_DATES["Hessen"].ferien || {};

    // Alle Tage im Projektzeitraum durchlaufen
    for (let d = new Date(start); d <= ende; d.setDate(d.getDate() + 1)) {
        const iso = util_dateToISO(d); // z.B. "2025-12-29"
        const year = d.getFullYear(); // z.B. 2025

        if (!jahre.includes(year)) continue;

        const wochentag = wotagNamen[d.getDay()];
        const row = D.trainingstage.find((r) => r.tag === wochentag);
        if (!row) continue;

        const jahrObj = row.jahre[year];

        // max. Tage immer erhöhen
        jahrObj.max++;

        // Feiertag (jahresspezifisch)
        const istFeiertag = (alleFeiertage[year] || []).some(
            (f) => f.datum === iso,
        );

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

function proj_updateDates(start, ende) {
    if (!start || !ende) return false;

    const jahre = [];
    let s = util_isoToDate(start);
    let e = util_isoToDate(ende);
    for (let y = s.getFullYear(); y <= e.getFullYear(); y++) jahre.push(y);

    const conflicts = proj_getRangeConflicts(start, ende);
    if (conflicts.abos.length || conflicts.tps.length) {
        ui_dialogMessage(
            "Zeitraum nicht möglich",
            proj_buildRangeConflictMessage(conflicts, start, ende),
        );
        return false;
    }

    D.settings.startdatum = start;
    D.settings.enddatum = ende;
    D.settings.jahre = jahre;

    proj_calcTrainingdays();
    ui_renderAll();
    return true;
}

function proj_handleJsonFile(evt) {
    const file = evt.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            proj_loadJson(data);
            try {
                evt.target.value = "";
            } catch (_) {}
        } catch (err) {
            ui_dialogMessage(
                "Fehler",
                "Die Datei konnte nicht gelesen werden.\nDetails: " +
                    (err && err.message ? err.message : String(err)),
            );
            try {
                evt.target.value = "";
            } catch (_) {}
        }
    };

    reader.readAsText(file);
}

function proj_loadJson(data) {
    D = data;

    if (!D.abos) D.abos = [];
    if (!D.trainer) D.trainer = [];
    if (!D.spieler) D.spieler = [];

    // Migration: Plätze ergänzen (Stammdaten) + Abos auf platzId mappen
    if (!D.plaetze) D.plaetze = [];

    // Falls Abos noch Freitext-Plätze besitzen, daraus Platz-Stammdaten erzeugen
    const platzByName = new Map(D.plaetze.map((p) => [p.name, p]));
    D.abos.forEach((abo) => {
        // Migration: Platz-Freitext (abo.platz) -> platzId (Stammdaten)
        if (!abo.platzId) {
            const name = (abo.platz || "").trim();
            if (name) {
                let p = platzByName.get(name);
                if (!p) {
                    p = { id: util_makeId("platz"), name, art: "Hallenplatz" };
                    D.plaetze.push(p);
                    platzByName.set(name, p);
                }
                abo.platzId = p.id;
            }
        }

        // Freitext-Feld entfernen, sobald platzId existiert
        if (abo.platzId && abo.platz) delete abo.platz;
    });

    // Plätze sortieren
    D.plaetze.sort((a, b) => (a.name || "").localeCompare(b.name || "", "de"));
    // Migration: fehlende Jahresfelder bei Spielern ergänzen
    D.spieler.forEach((sp) => {
        if (!sp.jahre) {
            sp.jahre = {};
            D.settings.jahre.forEach((j) => (sp.jahre[j] = true));
        } else {
            D.settings.jahre.forEach((j) => {
                if (typeof sp.jahre[j] === "undefined") sp.jahre[j] = true;
            });
        }
    });

    // Migration: Kostenfaktor ergänzen
    D.spieler.forEach((sp) => {
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

    D.spieler.forEach((sp) => {
        if (typeof sp.zuschuss === "undefined") {
            sp.zuschuss = false;
        }
    });

    proj_calcTrainingdays();

    // Trainingsplan neu berechnen
    if (D.trainingsplan) {
        D.trainingsplan.forEach((tp) => tp_calcYearData(tp));
    }

    ui_renderAll();
    if (typeof ui_updateHeaderButtons === "function") ui_updateHeaderButtons();

    ui_dialogMessage("Projekt geladen", "Projekt wurde erfolgreich geladen.");
}

function proj_getRangeConflicts(projStartISO, projEndISO) {
    const conflicts = { abos: [], tps: [] };
    const aboById = new Map((D.abos || []).map((a) => [a.id, a]));

    // Abos
    (D.abos || []).forEach((abo) => {
        if (!abo?.startdatum || !abo?.enddatum) return;

        if (abo.startdatum < projStartISO || abo.enddatum > projEndISO) {
            conflicts.abos.push({
                id: abo.id,
                wochentag: abo.wochentag,
                platzId: abo.platzId,
                startdatum: abo.startdatum,
                enddatum: abo.enddatum,
                startzeit: abo.startzeit,
                endzeit: abo.endzeit,
            });
        }
    });

    // Trainingspläne (eigene Datumsfelder)
    (D.trainingsplan || []).forEach((tp) => {
        const abo = aboById.get(tp.aboId);

        if (!tp?.vonDatum || !tp?.bisDatum) return;

        if (tp.vonDatum < projStartISO || tp.bisDatum > projEndISO) {
            conflicts.tps.push({
                id: tp.id,
                aboId: tp.aboId,
                wochentag: abo?.wochentag || "unbekannt",
                platzId: abo?.platzId || "",
                startdatum: tp.vonDatum,
                enddatum: tp.bisDatum,
                startzeit: tp.vonZeit,
                endzeit: tp.bisZeit,
            });
        }
    });

    return conflicts;
}

function proj_buildRangeConflictMessage(conflicts, projStartISO, projEndISO) {
    const errors = [];
    errors.push(
        `Der neue Projektzeitraum vom ${util_formatDateDE(projStartISO)} bis ${util_formatDateDE(projEndISO)} passt nicht zu bestehenden Daten.`,
    );

    if (conflicts.abos.length) {
        errors.push("");
        errors.push("Betroffene Abos:");
        const max = 6;
        conflicts.abos.slice(0, max).forEach((a) => {
            errors.push(
                `• ${a.wochentag}, ${plaetze_getLabelWithArt(a.platzId)}, ${util_formatTimeDE(a.startzeit)} – ${util_formatTimeDE(a.endzeit)}, ${util_formatDateDE(a.startdatum)} – ${util_formatDateDE(a.enddatum)}`,
            );
        });
        if (conflicts.abos.length > max) {
            errors.push(`• … und ${conflicts.abos.length - max} weitere`);
        }
    }

    if (conflicts.tps.length) {
        errors.push("");
        errors.push("Betroffene Trainingspläne:");
        const max = 6;
        conflicts.tps.slice(0, max).forEach((t) => {
            errors.push(
                `• ${t.wochentag}, ${plaetze_getLabelWithArt(t.platzId)}, ${util_formatTimeDE(t.startzeit)} – ${util_formatTimeDE(t.endzeit)}, ${util_formatDateDE(t.startdatum)} – ${util_formatDateDE(t.enddatum)}`,
            );
        });
        if (conflicts.tps.length > max) {
            errors.push(`• … und ${conflicts.tps.length - max} weitere`);
        }
    }

    errors.push("");
    errors.push("Bitte passe zuerst die betroffenen Abos/Trainingspläne an.");

    return errors.join("\n");
}

//  =========================================================
//  Validierung / Utility
//  =========================================================
function val_showErrors(title, errors) {
    if (!errors || errors.length === 0) return false;

    ui_dialogMessage(
        title,
        "Bitte korrigieren Sie folgende Eingaben:\n\n" + errors.join("\n"),
    );
    return true;
}

function val_addRequired(errors, value, message) {
    if (!value) errors.push("• " + message);
}

function val_addNumber(errors, raw, value, messageInvalid, opts = {}) {
    // opts: { min, minMessage, allowEmpty }
    const allowEmpty = opts.allowEmpty === true;

    if ((raw === "" || raw === null || raw === undefined) && allowEmpty) return;

    if (raw === "" || Number.isNaN(value)) {
        errors.push("• " + messageInvalid);
        return;
    }

    if (opts.min !== undefined && value < opts.min) {
        errors.push("• " + opts.minMessage);
    }
}

function util_formatDateDE(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
}

function util_formatTimeDE(t) {
    return t ? `${t} Uhr` : "";
}

function util_formatCurrencyDE(v) {
    return (
        Number(v).toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }) + " €"
    );
}

function util_timeToMin(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}

function util_isoToDate(s) {
    const [y, m, d] = s.split("-");
    return new Date(Number(y), Number(m) - 1, Number(d));
}

function util_dateToISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function util_makeId(prefix) {
    return prefix + "_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
}

function util_isDateInRange(dateISO, startISO, endISO) {
    return dateISO >= startISO && dateISO <= endISO;
}

//  =========================================================
//  Plätze
//  =========================================================
function plaetze_renderSection(app) {
    const div = document.createElement("div");
    div.className = "section-card";

    div.innerHTML = `
        <h2>3. Plätze</h2>
        <button id="btnPlatzNeu">+ Neuer Platz</button>
        <div id="plaetzeListe"></div>
    `;

    app.appendChild(div);

    div.querySelector("#btnPlatzNeu").onclick = () => plaetze_dialogOpen();

    plaetze_renderList(div.querySelector("#plaetzeListe"));
}

function plaetze_renderList(container) {
    if (!D.plaetze || D.plaetze.length === 0) {
        container.innerHTML = "<p><em>Noch keine Plätze angelegt.</em></p>";
        return;
    }

    const rows = [...D.plaetze].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", "de"),
    );

    let html = `
        <table class="table-bordered">
            <tr>
                <th>Name</th>
                <th>Art</th>
                <th style="width:120px;">Aktion</th>
            </tr>
    `;

    rows.forEach((p) => {
        html += `
            <tr>
                <td>${p.name}</td>
                <td>${p.art}</td>
                <td>
                    <button onclick="plaetze_dialogOpen('${p.id}')">✎</button>
                    <button class="btnDelete" onclick="plaetze_delete('${p.id}')">🗑</button>
                </td>
            </tr>
        `;
    });

    html += "</table>";
    container.innerHTML = html;
}

function plaetze_dialogOpen(id = null) {
    const overlay = document.getElementById("overlay");
    const dlg = document.getElementById("dialog");

    ui_dialogSetType("form");
    overlay.classList.add("show");

    const platz = id ? (D.plaetze || []).find((p) => p.id === id) : null;

    const arts = ["Hallenplatz", "Außenplatz"];

    dlg.innerHTML = `
        <h3>${id ? "Platz bearbeiten" : "Neuer Platz"}</h3>

        <label>Name:<br>
            <input id="platz_name" type="text" value="${platz ? platz.name : ""}">
        </label><br>

        <label>Platzart:<br>
            <select id="platz_art">
                <option value="" ${!platz ? "selected" : ""}>-- bitte wählen --</option>
                ${arts.map((a) => `<option value="${a}" ${platz && platz.art === a ? "selected" : ""}>${a}</option>`).join("")}
            </select>
        </label><br>

        <button id="platz_ok">OK</button>
        <button id="platz_cancel">Abbrechen</button>

    `;

    dlg.querySelector("#platz_cancel").onclick = () => ui_dialogClose();

    dlg.querySelector("#platz_ok").onclick = () => plaetze_save(id);
}

function plaetze_save(id = null) {
    const name = (document.getElementById("platz_name").value || "").trim();
    const art = document.getElementById("platz_art").value;

    const errors = [];
    val_addRequired(errors, name, "Bitte einen Namen für den Platz angeben.");
    val_addRequired(errors, art, "Bitte eine Platzart auswählen.");

    // Name + Art eindeutig (Name case-insensitiv)
    const nameNorm = name.toLowerCase();
    const artNorm = String(art || "").trim();
    const exists = (D.plaetze || []).some((p) => {
        if (id && p.id === id) return false;
        const pNameNorm = (p.name || "").trim().toLowerCase();
        const pArtNorm = String(p.art || "").trim();
        return pNameNorm === nameNorm && pArtNorm === artNorm;
    });
    if (name && art && exists) {
        errors.push(
            "• Ein Platz mit diesem Namen und dieser Platzart ist bereits vorhanden.",
        );
    }

    if (val_showErrors("Platz prüfen", errors)) return;

    if (!D.plaetze) D.plaetze = [];

    if (id) {
        const p = D.plaetze.find((x) => x.id === id);
        if (!p) {
            ui_dialogMessage("Fehler", "Platz wurde nicht gefunden.");
            return;
        }
        p.name = name;
        p.art = art;
    } else {
        D.plaetze.push({
            id: util_makeId("platz"),
            name,
            art,
        });
    }

    // Sortierung
    D.plaetze.sort((a, b) => (a.name || "").localeCompare(b.name || "", "de"));

    ui_dialogClose();
    ui_renderAll();
}

function plaetze_delete(id) {
    const p = (D.plaetze || []).find((x) => x.id === id);
    if (!p) return;

    const platzLabel = `${p.name} (${p.art})`;

    // Abos, die diesen Platz verwenden
    const verwendeteAbos = (D.abos || []).filter((a) => a.platzId === id);

    if (verwendeteAbos.length > 0) {
        let msg = `Der Platz "${platzLabel}" wird noch in folgenden Abos verwendet:\n\n`;

        verwendeteAbos.forEach((abo) => {
            msg +=
                `• ${abo.wochentag}, ${platzLabel}, ` +
                `${util_formatTimeDE(abo.startzeit)} – ${util_formatTimeDE(abo.endzeit)}, ` +
                `${util_formatDateDE(abo.startdatum)} – ${util_formatDateDE(abo.enddatum)}\n`;
        });

        msg += "\nBitte entfernen Sie den Platz zuerst aus diesen Abos.";

        ui_dialogMessage("Platz kann nicht gelöscht werden", msg);
        return;
    }

    // kein Konflikt → normal löschen
    ui_dialogConfirm(
        "Platz löschen",
        `Soll der Platz "${platzLabel}" wirklich gelöscht werden?`,
        () => {
            D.plaetze = (D.plaetze || []).filter((x) => x.id !== id);
            ui_renderAll();
        },
    );
}

function plaetze_getById(id) {
    if (!id) return null;
    return (D.plaetze || []).find((p) => p.id === id) || null;
}

function plaetze_getLabel(id) {
    const p = plaetze_getById(id);
    return p ? p.name : "unbekannt";
}

function plaetze_getLabelWithArt(id) {
    const p = plaetze_getById(id);
    if (!p) return "unbekannt";
    return `${p.name} (${p.art})`;
}

//  =========================================================
//  Abos
//  =========================================================
function abo_renderSection(app) {
    const div = document.createElement("div");
    div.className = "section-card";

    div.innerHTML = `
        <h2>4. Platz-Abos</h2>
        <button id="btnAboNeu">+ Neues Abo</button>
        <div id="aboListe"></div>
    `;

    app.appendChild(div);

    div.querySelector("#btnAboNeu").onclick = () => abo_dialogOpen();

    abo_renderList(div.querySelector("#aboListe"));
}

function abo_getPlatzLabel(abo) {
    return abo ? plaetze_getLabelWithArt(abo.platzId) : "unbekannt";
}

function abo_renderList(container) {
    if (!D.abos || D.abos.length === 0) {
        container.innerHTML = "<p>Es wurden noch keine Abos angelegt.</p>";
        return;
    }

    let html = `
        <table class="table-bordered">
            <tr>
                <th>Wochentag</th>
                <th>Platz</th>
                <th>Zeit</th>
                <th>Zeitraum</th>
                <th>Platzkosten</th>
                <th style="width:120px;">Aktion</th>
            </tr>
    `;

    D.abos.forEach((abo) => {
        html += `
            <tr>
                <td>${abo.wochentag}</td>
                <td>${abo_getPlatzLabel(abo)}</td>
                <td>${util_formatTimeDE(abo.startzeit)} – ${util_formatTimeDE(abo.endzeit)}</td>
                <td>${util_formatDateDE(abo.startdatum)} – ${util_formatDateDE(abo.enddatum)}</td>
                <td>${util_formatCurrencyDE(abo.platzkosten)}</td>
                <td>
                    <button onclick="abo_dialogOpen('${abo.id}')">✎</button>
                    <button class="btnDelete" onclick="abo_delete('${abo.id}')">🗑</button>
                </td>
            </tr>
        `;
    });

    html += "</table>";
    container.innerHTML = html;
}

function abo_dialogOpen(id = null) {
    const overlay = document.getElementById("overlay");
    const dlg = document.getElementById("dialog");

    // Formular-Dialog
    ui_dialogSetType("form");
    overlay.classList.add("show");

    let abo = id ? D.abos.find((a) => a.id === id) : null;

    const wochentage = [
        "Montag",
        "Dienstag",
        "Mittwoch",
        "Donnerstag",
        "Freitag",
        "Samstag",
        "Sonntag",
    ];

    const plaetze = [...(D.plaetze || [])].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", "de"),
    );

    const platzOptions = plaetze.length
        ? plaetze
              .map((p) => {
                  const selected = abo && abo.platzId === p.id;
                  return `<option value="${p.id}" ${selected ? "selected" : ""}>${p.name} (${p.art})</option>`;
              })
              .join("")
        : `<option value="">-- keine Plätze vorhanden --</option>`;

    dlg.innerHTML = `
        <h3>${id ? "Abo bearbeiten" : "Neues Abo"}</h3>

        <label>Wochentag:<br>
            <select id="abo_tag">
                <option value="">-- bitte wählen --</option>
                ${wochentage.map((t) => `<option ${abo?.wochentag === t ? "selected" : ""}>${t}</option>`).join("")}
            </select>
        </label><br>

        <label>Platz:<br>
            <select id="abo_platzId">
                <option value="">-- bitte wählen --</option>
                ${platzOptions}
            </select>
        </label><br>
        
        <label>Zeit:<br>
            von&nbsp;&nbsp;&nbsp;<input id="abo_startzeit" type="time" value="${abo?.startzeit || "12:00"}">&nbsp;&nbsp;&nbsp;bis&nbsp;&nbsp;&nbsp;<input id="abo_endzeit" type="time" value="${abo?.endzeit || "12:00"}">
        </label><br>

        <label>Zeitraum:<br>
            von&nbsp;&nbsp;&nbsp;<input id="abo_startdatum" type="date" value="${abo?.startdatum || ""}">&nbsp;&nbsp;&nbsp;bis&nbsp;&nbsp;&nbsp;<input id="abo_enddatum" type="date" value="${abo?.enddatum || ""}">
        </label><br>

        <label>Platzkosten (€):<br>
            <input id="abo_kosten" type="number" min="0" step="0.5" value="${abo?.platzkosten || ""}">
        </label><br><br>

        <button id="abo_ok">OK</button>
        <button id="abo_cancel">Abbrechen</button>
    `;

    dlg.querySelector("#abo_cancel").onclick = () => ui_dialogClose();

    dlg.querySelector("#abo_ok").onclick = () => abo_save(id);
}

function abo_save(id) {
    const tag = document.getElementById("abo_tag").value;
    const platzId = document.getElementById("abo_platzId").value;
    const platzLabel = plaetze_getLabelWithArt(platzId);

    const startdatum = document.getElementById("abo_startdatum").value;
    const enddatum = document.getElementById("abo_enddatum").value;
    const startzeit = document.getElementById("abo_startzeit").value;
    const endzeit = document.getElementById("abo_endzeit").value;

    const kostenRaw = document.getElementById("abo_kosten").value;
    const kosten = Number(kostenRaw);

    const errors = [];

    // --- Pflichtfelder ---
    val_addRequired(errors, tag, "Bitte einen Wochentag auswählen.");
    val_addRequired(errors, platzId, "Bitte einen Platz auswählen.");
    val_addRequired(errors, startdatum, "Bitte Startdatum angeben.");
    val_addRequired(errors, enddatum, "Bitte Enddatum angeben.");
    val_addRequired(errors, startzeit, "Bitte Startzeit angeben.");
    val_addRequired(errors, endzeit, "Bitte Endzeit angeben.");
    // --- Kosten ---
    val_addNumber(
        errors,
        kostenRaw,
        kosten,
        "Bitte gültige Platzkosten angeben.",
        {
            min: 0,
            minMessage: "Platzkosten dürfen nicht negativ sein.",
        },
    );
    // --- Datumslogik ---
    if (startdatum && enddatum && startdatum > enddatum) {
        errors.push("• Enddatum muss nach dem Startdatum liegen.");
    }

    // --- Zeitlogik ---
    if (startzeit && endzeit && startzeit >= endzeit) {
        errors.push("• Endzeit muss nach Startzeit liegen.");
    }

    if (val_showErrors("Abo prüfen", errors)) return;

    // =========================================================
    // Abo-Zeitraum muss im Projektzeitraum liegen
    // =========================================================
    const projStart = D.settings?.startdatum;
    const projEnde = D.settings?.enddatum;

    if (projStart && projEnde) {
        if (startdatum < projStart || enddatum > projEnde) {
            ui_dialogMessage(
                "Abo prüfen",
                "Der Abo-Zeitraum muss innerhalb des Projektzeitraums liegen:\n\n" +
                    `• Projekt: ${util_formatDateDE(projStart)} – ${util_formatDateDE(projEnde)}\n` +
                    `• Abo: ${util_formatDateDE(startdatum)} – ${util_formatDateDE(enddatum)}`,
            );
            return;
        }
    }

    // =========================================================
    // Platzkollision prüfen (Abo gegen andere Abos)
    // =========================================================
    // Regel: gleicher Wochentag + gleicher Platz (platzId) darf sich weder im Zeitraum
    //        noch in der Uhrzeit überschneiden.
    const placeConflicts = (D.abos || []).filter((a) => {
        if (!a) return false;
        if (id && a.id === id) return false; // eigenes Abo ignorieren
        if (!a.platzId || !a.wochentag) return false;
        if (a.wochentag !== tag) return false;
        if (a.platzId !== platzId) return false;

        // Datumsbereich überschneidet?
        const dateOverlap =
            startdatum <= a.enddatum && enddatum >= a.startdatum;

        if (!dateOverlap) return false;

        // Zeitbereich überschneidet? (echte Überschneidung)
        const timeOverlap = startzeit < a.endzeit && endzeit > a.startzeit;

        return timeOverlap;
    });

    if (placeConflicts.length > 0) {
        let msg =
            "Dieses Abo kollidiert mit bereits vorhandenen Abos auf demselben Platz:\n\n";

        placeConflicts.forEach((a) => {
            const pLabel = plaetze_getLabelWithArt(a.platzId);
            msg +=
                `• ${a.wochentag}, ${pLabel}, ${util_formatTimeDE(a.startzeit)} – ${util_formatTimeDE(a.endzeit)}, ` +
                `${util_formatDateDE(a.startdatum)} – ${util_formatDateDE(a.enddatum)}\n`;
        });

        msg +=
            "\nBitte passen Sie Zeitraum oder Zeit an, oder wählen Sie einen anderen Platz.";

        ui_dialogMessage("Abo prüfen", msg);
        return;
    }

    // =========================================================
    // Konfliktprüfung: Abo wird in Trainingsplänen verwendet
    // =========================================================
    if (id) {
        const aboObj = D.abos.find((a) => a.id === id);
        if (!aboObj) {
            ui_dialogMessage("Fehler", "Abo wurde nicht gefunden.");
            return;
        }

        const usedTPs = (D.trainingsplan || []).filter((tp) => tp.aboId === id);

        const oldPlatzId = aboObj.platzId;
        const includeOverlap = usedTPs.length > 0 && oldPlatzId !== platzId;

        // Nur prüfen, wenn es tatsächlich betroffene Trainingspläne gibt
        if (usedTPs.length > 0) {
            // --- Wochentag darf nicht geändert werden, solange Trainingspläne existieren ---
            if (usedTPs.length > 0 && aboObj.wochentag !== tag) {
                ui_dialogMessage(
                    "Abo prüfen",
                    "Die Änderung kann nicht gespeichert werden, da dadurch Trainingspläne ungültig werden:\n\n" +
                        usedTPs
                            .map(
                                (tp) =>
                                    `• Trainingsplan (${util_formatDateDE(tp.vonDatum)} – ${util_formatDateDE(tp.bisDatum)}, ${util_formatTimeDE(tp.vonZeit)} – ${util_formatTimeDE(tp.bisZeit)})`,
                            )
                            .join("\n") +
                        "\n\nBitte korrigieren Sie folgende Angaben:\n\n" +
                        "• Wochentag kann nicht geändert werden, solange Trainingspläne dieses Abos existieren.",
                );
                return;
            }

            // Original sichern
            const original = { ...aboObj };

            // Abo temporär mit neuen Werten überschreiben
            aboObj.wochentag = tag;
            aboObj.platzId = platzId;
            aboObj.startdatum = startdatum;
            aboObj.enddatum = enddatum;
            aboObj.startzeit = startzeit;
            aboObj.endzeit = endzeit;
            aboObj.platzkosten = kosten;

            // Benötigte Zeitspanne aller TPs zu diesem Abo ermitteln
            const minVonZeit = usedTPs.reduce(
                (min, tp) => (tp.vonZeit < min ? tp.vonZeit : min),
                usedTPs[0].vonZeit,
            );
            const maxBisZeit = usedTPs.reduce(
                (max, tp) => (tp.bisZeit > max ? tp.bisZeit : max),
                usedTPs[0].bisZeit,
            );
            const requiredZeitText = `${util_formatTimeDE(minVonZeit)} – ${util_formatTimeDE(maxBisZeit)}`;

            // Benötigten Datumsbereich aller TPs zu diesem Abo ermitteln
            const minVonDatum = usedTPs.reduce(
                (min, tp) => (tp.vonDatum < min ? tp.vonDatum : min),
                usedTPs[0].vonDatum,
            );
            const maxBisDatum = usedTPs.reduce(
                (max, tp) => (tp.bisDatum > max ? tp.bisDatum : max),
                usedTPs[0].bisDatum,
            );
            const requiredDatumText = `${util_formatDateDE(minVonDatum)} – ${util_formatDateDE(maxBisDatum)}`;

            // 🔽 NEU: gesammelt statt pro Trainingsplan wiederholt
            const affectedPlans = [];
            const issueSet = new Set();

            usedTPs.forEach((tp) => {
                // tp_validate nutzt D.abos → deshalb reicht es, das Abo temporär zu setzen
                const err = tp_validate({ ...tp }, tp.id, { includeOverlap });
                if (!err) return;

                // 1) betroffene Trainingspläne sammeln
                const label = `${util_formatDateDE(tp.vonDatum)} – ${util_formatDateDE(tp.bisDatum)}, ${util_formatTimeDE(tp.vonZeit)} – ${util_formatTimeDE(tp.bisZeit)}`;
                affectedPlans.push(`• Trainingsplan (${label})`);

                // 2) Probleme extrahieren (aus "Bitte korrigieren Sie folgende Eingaben: ...")
                //    Wir übernehmen NUR die eigentlichen Bullet-Zeilen.
                const lines = String(err)
                    .split("\n")
                    .map((l) => l.trim())
                    .filter((l) => l.startsWith("• "))
                    .map((l) => l.replace(/^•\s*/, ""));

                lines.forEach((line) => {
                    let out = line;

                    // Zeitspanne auf benötigte Zeit aller TPs normalisieren
                    if (out.startsWith("Zeit muss im Abo liegen:")) {
                        out = `Zeit muss im Abo liegen: ${requiredZeitText}.`;
                    }

                    // Datumsbereich auf benötigten Zeitraum aller TPs normalisieren
                    if (
                        out.startsWith(
                            "Startdatum muss innerhalb des Abos liegen:",
                        ) ||
                        out.startsWith(
                            "Enddatum muss innerhalb des Abos liegen:",
                        )
                    ) {
                        out = `Zeitraum muss im Abo liegen: ${requiredDatumText}.`;
                    }

                    issueSet.add(`• ${out}`);
                });
            });

            if (affectedPlans.length > 0) {
                // Abo zurücksetzen
                Object.assign(aboObj, original);

                const issues = Array.from(issueSet);

                ui_dialogMessage(
                    "Abo prüfen",
                    "Die Änderung kann nicht gespeichert werden, da dadurch Trainingspläne ungültig werden:\n\n" +
                        affectedPlans.join("\n") +
                        "\n\nBitte korrigieren Sie folgende Angaben:\n\n" +
                        (issues.length > 0
                            ? issues.join("\n")
                            : "• Unbekannter Validierungsfehler."),
                );
                return;
            }
            // Wenn keine Konflikte: Abo bleibt bereits mit neuen Werten gesetzt
            // und wir machen unten normal weiter (Sortierung, Recalc, Dialog schließen).
        }
    }

    // --- Abo aktualisieren oder neu anlegen ---
    if (id) {
        // Falls Konfliktprüfung gelaufen ist, sind Werte schon gesetzt.
        // Falls keine TPs betroffen waren: hier setzen.
        const abo = D.abos.find((a) => a.id === id);
        abo.wochentag = tag;
        abo.platzId = platzId;
        abo.startdatum = startdatum;
        abo.enddatum = enddatum;
        abo.startzeit = startzeit;
        abo.endzeit = endzeit;
        abo.platzkosten = kosten;
    } else {
        D.abos.push({
            id: util_makeId("abo"),
            wochentag: tag,
            platzId,
            startdatum,
            enddatum,
            startzeit,
            endzeit,
            platzkosten: kosten,
        });
    }

    // --- betroffene Trainingspläne neu berechnen (Jahresdaten) ---
    if (id) {
        (D.trainingsplan || [])
            .filter((tp) => tp.aboId === id)
            .forEach((tp) => tp_calcYearData(tp));
    }

    // --- 🔽 Sortierung der Abos ---
    const wtagOrder = {
        Montag: 1,
        Dienstag: 2,
        Mittwoch: 3,
        Donnerstag: 4,
        Freitag: 5,
        Samstag: 6,
        Sonntag: 7,
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
        const cmpPlatz =
            extractPlatzNum(abo_getPlatzLabel(a)) -
            extractPlatzNum(abo_getPlatzLabel(b));
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
    ui_renderAll();
}

function abo_delete(id) {
    const abo = D.abos.find((a) => a.id === id);
    if (!abo) {
        ui_dialogMessage("Fehler", "Das ausgewählte Abo wurde nicht gefunden.");
        return;
    }

    // Prüfen: wird das Abo in Trainingsplänen verwendet?
    const verwendung = D.trainingsplan.filter((tp) => tp.aboId === id);

    if (verwendung.length > 0) {
        let msg =
            "Dieses Abo wird noch in folgenden Trainingsplänen verwendet:\n\n";

        verwendung.forEach((tp) => {
            const tag = abo.wochentag;
            const platz = plaetze_getLabelWithArt(abo.platzId);
            const zeit = `${util_formatTimeDE(tp.vonZeit)} – ${util_formatTimeDE(tp.bisZeit)}`;
            const zeitraum = `${util_formatDateDE(tp.vonDatum)} – ${util_formatDateDE(tp.bisDatum)}`;

            msg += `• ${tag}, ${platz}, ${zeit}, ${zeitraum}\n`;
        });

        msg +=
            "\nBitte entfernen Sie das Abo zuerst aus diesen Trainingsplänen.";

        ui_dialogMessage("Abo kann nicht gelöscht werden", msg);
        return;
    }

    // Wenn keine Verwendung → sicher löschen
    ui_dialogConfirm(
        "Abo löschen",
        `Möchten Sie das Abo "${plaetze_getLabelWithArt(abo.platzId)}" (${abo.wochentag}) wirklich löschen?`,
        () => {
            D.abos = D.abos.filter((a) => a.id !== id);
            ui_renderAll();
        },
    );
}

function abo_getLabel(abo) {
    if (!abo) return "unbekannt";
    return (
        `${abo.wochentag}, ${plaetze_getLabelWithArt(abo.platzId)}, ` +
        `${util_formatTimeDE(abo.startzeit)} – ${util_formatTimeDE(abo.endzeit)}, ` +
        `${util_formatDateDE(abo.startdatum)} – ${util_formatDateDE(abo.enddatum)}`
    );
}

//  =========================================================
//  Trainer
//  =========================================================
function trainer_renderSection(app) {
    const div = document.createElement("div");
    div.className = "section-card";

    div.innerHTML = `
        <h2>5. Trainer</h2>
        <button id="btnTrainerNeu">+ Trainer hinzufügen</button>
        <div id="trainerListe"></div>
    `;

    app.appendChild(div);

    div.querySelector("#btnTrainerNeu").onclick = () => trainer_dialogOpen();

    trainer_renderList(div.querySelector("#trainerListe"));
}

function trainer_renderList(container) {
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

    D.trainer.forEach((t) => {
        html += `
            <tr>
                <td>${t.name}</td>
                <td>${t.telefon || "-"}</td>
                <td>${t.email || "-"}</td>
                <td>${util_formatCurrencyDE(t.kosten)}</td>
                <td>
                    <button onclick="trainer_dialogOpen('${t.id}')">✎</button>
                    <button class="btnDelete" onclick="trainer_delete('${t.id}')">🗑</button>
                </td>
            </tr>
        `;
    });

    html += "</table>";
    container.innerHTML = html;
}

function trainer_dialogOpen(id = null) {
    const overlay = document.getElementById("overlay");
    const dlg = document.getElementById("dialog");

    // Formular-Dialog
    ui_dialogSetType("form");
    overlay.classList.add("show");

    let tr = id ? D.trainer.find((t) => t.id === id) : null;

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

    dlg.querySelector("#tr_cancel").onclick = () => ui_dialogClose();

    dlg.querySelector("#tr_ok").onclick = () => trainer_save(id);
}

function trainer_save(id) {
    const name = document.getElementById("tr_name").value.trim();
    const tel = document.getElementById("tr_tel").value.trim();
    const email = document.getElementById("tr_email").value.trim();

    const kostenRaw = document.getElementById("tr_kosten").value;
    const kosten = Number(kostenRaw);

    const errors = [];

    // --- Pflichtfelder ---
    val_addRequired(errors, name, "Bitte Name eingeben.");

    // --- Email (optional, aber wenn angegeben: prüfen) ---
    if (email) {
        // bewusst einfache Plausibilitätsprüfung (kein RFC-Validator)
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!emailOk) {
            errors.push("• Bitte eine gültige Email-Adresse angeben.");
        }
    }

    // --- Werteprüfung Stundenlohn ---
    val_addNumber(
        errors,
        kostenRaw,
        kosten,
        "Bitte einen gültigen Stundenlohn angeben.",
        { min: 0, minMessage: "Stundenlohn darf nicht negativ sein." },
    );
    if (val_showErrors("Trainer prüfen", errors)) return;

    // --- Trainer aktualisieren oder neu anlegen ---
    if (id) {
        const tr = D.trainer.find((t) => t.id === id);
        tr.name = name;
        tr.telefon = tel || "";
        tr.email = email || "";
        tr.kosten = kosten;
    } else {
        D.trainer.push({
            id: util_makeId("trainer"),
            name,
            telefon: tel || "",
            email: email || "",
            kosten,
        });
    }

    // --- 🔽 Trainer alphabetisch sortieren ---
    D.trainer.sort((a, b) => a.name.localeCompare(b.name));

    // Dialog schließen
    document.getElementById("overlay").classList.remove("show");
    document.getElementById("dialog").innerHTML = "";

    // Oberfläche neu aufbauen
    ui_renderAll();
}

function trainer_delete(id) {
    const tr = D.trainer.find((t) => t.id === id);
    if (!tr) {
        ui_dialogMessage(
            "Fehler",
            "Der ausgewählte Trainer wurde nicht gefunden.",
        );
        return;
    }

    // Prüfen: wird der Trainer in Trainingsplänen verwendet?
    const verwendung = D.trainingsplan.filter((tp) => tp.trainerId === id);

    if (verwendung.length > 0) {
        let msg = `Der Trainer "${tr.name}" ist noch in folgenden Trainingsplänen eingeteilt:\n\n`;

        verwendung.forEach((tp) => {
            const abo = D.abos.find((a) => a.id === tp.aboId);
            const tag = abo ? abo.wochentag : "?";
            const platz = abo ? abo_getPlatzLabel(abo) : "?";
            const zeit = `${util_formatTimeDE(tp.vonZeit)} – ${util_formatTimeDE(tp.bisZeit)}`;
            const zeitraum = `${util_formatDateDE(tp.vonDatum)} – ${util_formatDateDE(tp.bisDatum)}`;

            msg += `• ${tag}, ${platz}, ${zeit}, ${zeitraum}\n`;
        });

        msg +=
            "\nBitte entfernen Sie den Trainer zuerst aus diesen Trainingsplänen.";

        ui_dialogMessage("Trainer kann nicht gelöscht werden", msg);
        return;
    }

    // Wenn nicht verwendet → sicher löschen
    ui_dialogConfirm(
        "Trainer löschen",
        `Möchten Sie den Trainer "${tr.name}" wirklich löschen?`,
        () => {
            D.trainer = D.trainer.filter((t) => t.id !== id);
            ui_renderAll();
        },
    );
}

//  =========================================================
//  Spieler
//  =========================================================
function spieler_renderSection(app) {
    const div = document.createElement("div");
    div.className = "section-card";

    div.innerHTML = `
        <h2>6. Spieler</h2>
        <button id="btnSpielerNeu">+ Spieler hinzufügen</button>
        <div id="spielerListe"></div>
    `;

    app.appendChild(div);

    div.querySelector("#btnSpielerNeu").onclick = () => spieler_dialogOpen();

    spieler_renderList(div.querySelector("#spielerListe"));
}

function spieler_renderList(container) {
    if (!D.spieler || D.spieler.length === 0) {
        container.innerHTML = "<p>Es wurden noch keine Spieler angelegt.</p>";
        return;
    }

    // Soll die Spalte angezeigt werden?
    const showZuschussSpalte =
        D.settings.zuschussAktiv && D.spieler.some((sp) => sp.zuschuss);

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
    D.settings.jahre.forEach((j) => {
        html += `<th>${j}</th>`;
    });

    html += `<th style="width:120px;">Aktion</th></tr>`;

    D.spieler.forEach((sp) => {
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

        D.settings.jahre.forEach((j) => {
            html += `<td>${sp.jahre?.[j] !== false ? "✔" : "✖"}</td>`;
        });

        html += `
                <td>
                    <button onclick="spieler_dialogOpen('${sp.id}')">✎</button>
                    <button class="btnDelete" onclick="spieler_delete('${sp.id}')">🗑</button>
                </td>
            </tr>
        `;
    });

    html += "</table>";
    container.innerHTML = html;
}

function spieler_dialogOpen(id = null) {
    const overlay = document.getElementById("overlay");
    const dlg = document.getElementById("dialog");

    // Formular-Dialog
    ui_dialogSetType("form");
    overlay.classList.add("show");

    const sp = id ? D.spieler.find((x) => x.id === id) : null;

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

        ${
            D.settings.zuschussAktiv
                ? `
            <label>Zuschuss zum Training:<br>
                <input 
                    id="sp_zuschuss" 
                    type="checkbox" 
                    ${sp?.zuschuss ? "checked" : ""}
                >
            </label><br><br>
        `
                : ""
        }

        <label>Aktiv in Jahren:</label><br>
        ${D.settings.jahre
            .map((y) => {
                const checked = sp?.jahre && sp.jahre[y] ? "checked" : "";
                return `<label>${y}: 
                        <input type="checkbox" id="sp_j_${y}" ${checked}>
                    </label><br>`;
            })
            .join("")}
        <br>

        <button id="sp_ok">OK</button>
        <button id="sp_cancel">Abbrechen</button>
    `;

    dlg.querySelector("#sp_cancel").onclick = () => ui_dialogClose();

    // 🔽 Statt Inline-Speicherlogik jetzt nur noch:
    dlg.querySelector("#sp_ok").onclick = () => spieler_save(id);
}

function spieler_save(id) {
    const overlay = document.getElementById("overlay");
    const dlg = document.getElementById("dialog");

    let jahreHinweisNoetig = false;
    let jahreHinweisTPs = [];

    const name = dlg.querySelector("#sp_name").value.trim();
    const tel = dlg.querySelector("#sp_tel").value.trim();
    const email = dlg.querySelector("#sp_email").value.trim();

    const kostenRaw = dlg.querySelector("#sp_kostenfaktor").value.trim();
    const kostenfaktor = kostenRaw === "" ? 1.0 : Number(kostenRaw);

    const zuschuss = D.settings.zuschussAktiv
        ? dlg.querySelector("#sp_zuschuss")?.checked || false
        : false;

    // --- Jahres-Häkchen lesen ---
    const jahre = {};
    D.settings.jahre.forEach((y) => {
        const cb = dlg.querySelector("#sp_j_" + y);
        jahre[y] = cb ? cb.checked : true;
    });

    const aktiveJahreCount = Object.values(jahre).filter(Boolean).length;

    // --- Validierung (vereinheitlicht) ---
    const errors = [];

    // --- Pflichtfelder ---
    val_addRequired(errors, name, "Bitte Name eingeben.");

    // --- Email (optional, aber wenn angegeben: prüfen) ---
    if (email) {
        // bewusst einfache Plausibilitätsprüfung (kein RFC-Validator)
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (!emailOk) {
            errors.push("• Bitte eine gültige Email-Adresse angeben.");
        }
    }

    // Kostenfaktor prüfen (leer = Default 1.0)
    val_addNumber(
        errors,
        kostenRaw,
        kostenfaktor,
        "Bitte einen gültigen Kostenfaktor angeben.",
        {
            min: 0.0000001,
            minMessage: "Kostenfaktor muss größer als 0 sein.",
            allowEmpty: true,
        },
    );
    // Jahre: Neu -> mindestens ein Jahr aktiv
    if (!id && aktiveJahreCount === 0) {
        errors.push("• Mindestens ein Jahr muss als aktiv markiert sein.");
    }

    if (val_showErrors("Spieler prüfen", errors)) return;

    // Jahre: Ändern -> wenn alle Jahre deaktiviert UND Spieler in TP verwendet -> Hinweis
    if (id && aktiveJahreCount === 0) {
        jahreHinweisTPs = (D.trainingsplan || []).filter((tp) =>
            (tp.spielerIds || []).includes(id),
        );

        if (jahreHinweisTPs.length > 0) {
            jahreHinweisNoetig = true;
        }
    }

    // --- Datensatz bauen / aktualisieren ---
    if (id) {
        const sp = D.spieler.find((s) => s.id === id);
        if (!sp) {
            ui_dialogMessage("Spieler prüfen", "Spieler wurde nicht gefunden.");
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
            id: util_makeId("sp"),
            name,
            telefon: tel || "",
            email: email || "",
            jahre,
            kostenfaktor,
            zuschuss: D.settings.zuschussAktiv ? zuschuss : false,
        });
    }

    // --- 🔽 Spieler alphabetisch sortieren ---
    D.spieler.sort((a, b) => a.name.localeCompare(b.name));

    // Dialog schließen & UI neu zeichnen
    overlay.classList.remove("show");
    dlg.innerHTML = "";
    ui_renderAll();

    // --- Hinweis nach erfolgreichem Speichern ---
    if (jahreHinweisNoetig) {
        let msg =
            "Für diesen Spieler wurden alle Jahre deaktiviert.\n" +
            "Das hat Auswirkungen auf Kostenberechnung und Anzeige in den Trainingsplänen.\n\n" +
            "Der Spieler ist noch in folgenden Trainingsplänen eingeteilt:\n\n";

        jahreHinweisTPs.forEach((tp) => {
            const abo = D.abos.find((a) => a.id === tp.aboId);
            const tag = abo ? abo.wochentag : "?";
            const platz = abo ? abo_getPlatzLabel(abo) : "?";
            const zeit = `${util_formatTimeDE(tp.vonZeit)} – ${util_formatTimeDE(tp.bisZeit)}`;
            const zeitraum = `${util_formatDateDE(tp.vonDatum)} – ${util_formatDateDE(tp.bisDatum)}`;

            msg += `• ${tag}, ${platz}, ${zeit}, ${zeitraum}\n`;
        });

        ui_dialogMessage("Hinweis", msg);
    }
}

function spieler_delete(id) {
    const sp = D.spieler.find((s) => s.id === id);
    if (!sp) {
        ui_dialogMessage(
            "Fehler",
            "Der ausgewählte Spieler wurde nicht gefunden.",
        );
        return;
    }

    // Prüfen: wird der Spieler in Trainingsplänen verwendet?
    const verwendung = D.trainingsplan.filter((tp) =>
        tp.spielerIds.includes(id),
    );

    if (verwendung.length > 0) {
        let msg = `Der Spieler "${sp.name}" ist noch in folgenden Trainingsplänen eingeteilt:\n\n`;

        verwendung.forEach((tp) => {
            const abo = D.abos.find((a) => a.id === tp.aboId);
            const tag = abo ? abo.wochentag : "?";
            const platz = abo ? abo_getPlatzLabel(abo) : "?";
            const zeit = `${util_formatTimeDE(tp.vonZeit)} – ${util_formatTimeDE(tp.bisZeit)}`;
            const zeitraum = `${util_formatDateDE(tp.vonDatum)} – ${util_formatDateDE(tp.bisDatum)}`;

            msg += `• ${tag}, ${platz}, ${zeit}, ${zeitraum}\n`;
        });

        msg +=
            "\nBitte entfernen Sie den Spieler zuerst aus diesen Trainingsplänen.";

        ui_dialogMessage("Spieler kann nicht gelöscht werden", msg);
        return;
    }

    // Wenn nicht verwendet → sicher löschen
    ui_dialogConfirm(
        "Spieler löschen",
        `Möchten Sie den Spieler "${sp.name}" wirklich löschen?`,
        () => {
            D.spieler = D.spieler.filter((s) => s.id !== id);
            ui_renderAll();
        },
    );
}

//  =========================================================
//  Trainingspläne
//  ========================================================= */
function tp_renderSection(app) {
    const div = document.createElement("div");
    div.className = "section-card";

    div.innerHTML = `
        <h2>7. Trainingspläne</h2>
        <button id="btnTPNeu">+ Trainingsplan hinzufügen</button>
        <div id="tpListe"></div>
    `;

    app.appendChild(div);

    div.querySelector("#btnTPNeu").onclick = () => {
        // Trainingsplan kann nur angelegt werden, wenn mind. ein Abo und ein Spieler existieren.
        // (Trainer ist optional, da "ohne Trainer" möglich ist.)
        if (!tp_checkPrerequisites(true)) return;

        tp_dialogOpen(null);
    };

    tp_renderList(div.querySelector("#tpListe"));
}

function tp_renderList(container) {
    if (!D.trainingsplan || D.trainingsplan.length === 0) {
        container.innerHTML =
            "<p>Es wurden noch keine Trainingspläne angelegt.</p>";
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

    D.trainingsplan.forEach((tp) => {
        const abo = D.abos.find((a) => a.id === tp.aboId);
        const trainer = D.trainer.find((t) => t.id === tp.trainerId);

        html += `
            <tr>
                <td>${abo ? abo.wochentag : "-"}</td>
                <td>${abo ? abo_getPlatzLabel(abo) : "-"}</td>

                <td>${util_formatTimeDE(tp.vonZeit)} – ${util_formatTimeDE(tp.bisZeit)}</td>

                <td>${util_formatDateDE(tp.vonDatum)} – ${util_formatDateDE(tp.bisDatum)}</td>

                <td>${
                    tp.trainerId === "__NONE__"
                        ? "ohne Trainer"
                        : trainer
                          ? trainer.name
                          : "-"
                }</td>

                <td>${tp.spielerIds
                    .map((id) => {
                        const sp = D.spieler.find((s) => s.id === id);
                        return sp ? sp.name : "Unbekannt";
                    })
                    .join(" | ")}</td>

                <td>
                    <button onclick="tp_dialogOpen('${tp.id}')">✎</button>
                    <button class="btnDelete" onclick="tp_delete('${tp.id}')">🗑</button>
                </td>
            </tr>
        `;
    });

    html += "</table>";

    container.innerHTML = html;
}

function tp_dialogOpen(id = null) {
    // Beim Anlegen (nicht beim Bearbeiten) Voraussetzungen prüfen –
    // WICHTIG: vor dem Öffnen des Dialogs, damit er bei Fehler nicht „verschwindet“.
    if (!id && !tp_checkPrerequisites(true)) return;

    const overlay = document.getElementById("overlay");
    const dlg = document.getElementById("dialog");

    // Formular-Dialog
    ui_dialogSetType("form");
    overlay.classList.add("show");

    let tp = id ? D.trainingsplan.find((t) => t.id === id) : null;

    // --- Abos laden ---
    let aboOptions = `<option value="">-- bitte wählen --</option>`;
    D.abos.forEach((a) => {
        const selected = tp?.aboId === a.id ? "selected" : "";
        aboOptions += `
            <option value="${a.id}" ${selected}>
                ${abo_getLabel(a)}
            </option>`;
    });

    // --- Trainer laden ---
    let trainerOptions = `
        <option value="">-- bitte wählen --</option>
        <option value="__NONE__" ${tp?.trainerId === "__NONE__" ? "selected" : ""}>
            – ohne Trainer –
        </option>
    `;

    D.trainer.forEach((t) => {
        const sel = tp?.trainerId === t.id ? "selected" : "";
        trainerOptions += `<option value="${t.id}" ${sel}>${t.name}</option>`;
    });

    // --- Spieler laden ---
    let spielerCheckboxes = "";
    D.spieler.forEach((sp) => {
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
    const vonZeit = tp?.vonZeit || "";
    const bisZeit = tp?.bisZeit || "";

    dlg.innerHTML = `
        <h3>${id ? "Trainingsplan bearbeiten" : "Trainingsplan anlegen"}</h3>

        <label>Abo auswählen:<br>
            <select id="tp_abo">${aboOptions}</select>
        </label><br>

        <div id="tpAboInfo"></div>

        <label>Zeit:<br>
            von&nbsp;&nbsp;&nbsp;<input id="tp_vonZeit" type="time" value="${vonZeit}">&nbsp;&nbsp;&nbsp;bis&nbsp;&nbsp;&nbsp;<input id="tp_bisZeit" type="time" value="${bisZeit}">
        </label><br>

        <label>Zeitraum:<br>
            von&nbsp;&nbsp;&nbsp;<input id="tp_vonDatum" type="date" value="${vonDatum}">&nbsp;&nbsp;&nbsp;bis&nbsp;&nbsp;&nbsp;<input id="tp_bisDatum" type="date" value="${bisDatum}">
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
    dlg.querySelector("#tp_cancel").onclick = () => ui_dialogClose();

    dlg.querySelector("#tp_abo").onchange = tp_onAboChanged;

    dlg.querySelector("#tp_ok").onclick = () => tp_save(id);
}

function tp_save(id) {
    const aboId = document.getElementById("tp_abo").value;
    const vonDatum = document.getElementById("tp_vonDatum").value;
    const bisDatum = document.getElementById("tp_bisDatum").value;
    const vonZeit = document.getElementById("tp_vonZeit").value;
    const bisZeit = document.getElementById("tp_bisZeit").value;
    const trainerId = document.getElementById("tp_trainer").value;

    const spielerIds = [
        ...document.querySelectorAll(".tp_spieler:checked"),
    ].map((cb) => cb.value);

    // --- Temporäres Objekt ---
    const tpTemp = {
        id: id || util_makeId("tp"),
        aboId,
        trainerId,
        spielerIds,
        vonDatum,
        bisDatum,
        vonZeit,
        bisZeit,
    };

    // --- Validieren (Pflichtfelder etc.) ---
    const err = tp_validate(tpTemp, id, { includeOverlap: false });
    if (err) {
        ui_dialogMessage("Trainingsplan prüfen", err);
        return;
    }

    // --- Überschneidung / Platzkollision prüfen (separater Dialog) ---
    const overlapErr = tp_checkOverlap(tpTemp, id);
    if (overlapErr) {
        ui_dialogMessage("Trainingsplan kollidiert", overlapErr);
        return;
    }

    // --- Speichern oder aktualisieren ---
    if (id) {
        const tp = D.trainingsplan.find((t) => t.id === id);
        Object.assign(tp, tpTemp);
    } else {
        D.trainingsplan.push(tpTemp);
    }

    // --- Jahresdaten berechnen ---
    const tpFinal = D.trainingsplan.find((t) => t.id === tpTemp.id);
    tp_calcYearData(tpFinal);

    // --- 🔽 SORTIERUNG DER TRAININGSPLÄNE ---
    const wtagOrder = {
        Montag: 1,
        Dienstag: 2,
        Mittwoch: 3,
        Donnerstag: 4,
        Freitag: 5,
        Samstag: 6,
        Sonntag: 7,
    };

    function extractPlatzNum(platz) {
        const m = platz.match(/\d+/);
        return m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER;
    }

    D.trainingsplan.sort((a, b) => {
        const aboA = D.abos.find((x) => x.id === a.aboId);
        const aboB = D.abos.find((x) => x.id === b.aboId);

        // 1) Wochentag
        const cmpTag = wtagOrder[aboA.wochentag] - wtagOrder[aboB.wochentag];
        if (cmpTag !== 0) return cmpTag;

        // 2) numerische Platzsortierung
        const cmpPlatz =
            extractPlatzNum(plaetze_getLabel(aboA.platzId)) -
            extractPlatzNum(plaetze_getLabel(aboB.platzId));
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
    ui_renderAll();
}

function tp_delete(id) {
    const tp = D.trainingsplan.find((t) => t.id === id);
    if (!tp) {
        ui_dialogMessage("Fehler", "Trainingsplan wurde nicht gefunden.");
        return;
    }

    ui_dialogConfirm(
        "Trainingsplan löschen",
        "Möchtest du diesen Trainingsplan wirklich löschen?",
        () => {
            D.trainingsplan = D.trainingsplan.filter((t) => t.id !== id);
            ui_renderAll();
        },
    );
}

function tp_validate(tp, editId = null, opts = {}) {
    const errors = [];
    const includeOverlap = opts.includeOverlap === true;
    // --- Pflichtfelder prüfen (alle sammeln) ---
    if (!tp.aboId) errors.push("Bitte ein Abo auswählen.");
    if (!tp.vonDatum) errors.push("Bitte ein Startdatum eingeben.");
    if (!tp.bisDatum) errors.push("Bitte ein Enddatum eingeben.");
    if (!tp.vonZeit) errors.push("Bitte eine Startzeit eingeben.");
    if (!tp.bisZeit) errors.push("Bitte eine Endzeit eingeben.");
    if (!tp.trainerId) errors.push("Bitte einen Trainer auswählen.");
    if (!tp.spielerIds || tp.spielerIds.length === 0)
        errors.push("Bitte mindestens einen Spieler auswählen.");

    // --- Abo laden (nur wenn ausgewählt) ---
    const abo = tp.aboId ? D.abos.find((a) => a.id === tp.aboId) : null;
    if (tp.aboId && !abo) errors.push("Das ausgewählte Abo existiert nicht.");

    // --- Logikprüfungen nur, wenn die nötigen Werte vorhanden sind ---
    if (abo && tp.vonDatum && tp.bisDatum) {
        if (!util_isDateInRange(tp.vonDatum, abo.startdatum, abo.enddatum)) {
            errors.push(
                `Startdatum muss innerhalb des Abos liegen: ${util_formatDateDE(abo.startdatum)} – ${util_formatDateDE(abo.enddatum)}.`,
            );
        }
        if (!util_isDateInRange(tp.bisDatum, abo.startdatum, abo.enddatum)) {
            errors.push(
                `Enddatum muss innerhalb des Abos liegen: ${util_formatDateDE(abo.startdatum)} – ${util_formatDateDE(abo.enddatum)}.`,
            );
        }
        if (tp.vonDatum > tp.bisDatum) {
            errors.push("Enddatum muss nach dem Startdatum liegen.");
        }
    } else if (tp.vonDatum && tp.bisDatum) {
        if (tp.vonDatum > tp.bisDatum) {
            errors.push("Enddatum muss nach dem Startdatum liegen.");
        }
    }

    if (abo && tp.vonZeit && tp.bisZeit) {
        const minVon = util_timeToMin(tp.vonZeit);
        const minBis = util_timeToMin(tp.bisZeit);
        const aboVon = util_timeToMin(abo.startzeit);
        const aboBis = util_timeToMin(abo.endzeit);

        if (minVon >= minBis) {
            errors.push("Die Endzeit muss später als die Startzeit sein.");
        }

        if (minVon < minBis && (minVon < aboVon || minBis > aboBis)) {
            errors.push(
                `Zeit muss im Abo liegen: ${util_formatTimeDE(abo.startzeit)} – ${util_formatTimeDE(abo.endzeit)}.`,
            );
        }
    } else if (tp.vonZeit && tp.bisZeit) {
        const minVon = util_timeToMin(tp.vonZeit);
        const minBis = util_timeToMin(tp.bisZeit);
        if (minVon >= minBis) {
            errors.push("Die Endzeit muss später als die Startzeit sein.");
        }
    }
    // --- Überschneidung/Platzkollision optional prüfen ---
    const canCheckOverlap =
        !!tp.aboId &&
        !!tp.vonDatum &&
        !!tp.bisDatum &&
        !!tp.vonZeit &&
        !!tp.bisZeit;

    if (includeOverlap && canCheckOverlap) {
        const overlapErr = tp_checkOverlap(tp, editId);
        if (overlapErr) errors.push(overlapErr.trim());
    }

    if (errors.length === 0) return null;
    return (
        "Bitte korrigieren Sie folgende Eingaben:\n\n• " + errors.join("\n• ")
    );
}

function tp_checkOverlap(tp, editId) {
    const minVon = util_timeToMin(tp.vonZeit);
    const minBis = util_timeToMin(tp.bisZeit);

    // Abo/Platzdaten des zu prüfenden Trainingsplans
    const abo = (D.abos || []).find((a) => a.id === tp.aboId);
    const platzId = abo ? abo.platzId : null;
    const wochentag = abo ? abo.wochentag : null;

    const overlaps = [];

    for (const other of D.trainingsplan || []) {
        if (other.id === editId) continue; // bei Bearbeiten ignorieren

        const otherAbo = (D.abos || []).find((a) => a.id === other.aboId);
        if (!otherAbo) continue;

        // 1) Überschneidung innerhalb desselben Abos (bestehende Logik)
        // 2) Platzkollision – gleicher Platz + gleicher Wochentag (auch über verschiedene Abos hinweg)
        const sameAbo = other.aboId === tp.aboId;
        const samePlatzAndTag =
            platzId &&
            wochentag &&
            otherAbo.platzId === platzId &&
            otherAbo.wochentag === wochentag;

        if (!sameAbo && !samePlatzAndTag) continue;

        // Datum überlappt?
        if (tp.vonDatum > other.bisDatum) continue;
        if (tp.bisDatum < other.vonDatum) continue;

        // Zeit überlappt?
        const oVon = util_timeToMin(other.vonZeit);
        const oBis = util_timeToMin(other.bisZeit);
        const zeitÜberlappt = !(minBis <= oVon || minVon >= oBis);
        if (!zeitÜberlappt) continue;

        const platzLabel = otherAbo.platzId
            ? plaetze_getLabelWithArt(otherAbo.platzId)
            : "unbekannt";

        overlaps.push(
            `${otherAbo.wochentag}, ${platzLabel}, ` +
                `${util_formatTimeDE(other.vonZeit)} – ${util_formatTimeDE(other.bisZeit)}, ` +
                `${util_formatDateDE(other.vonDatum)} – ${util_formatDateDE(other.bisDatum)}`,
        );
    }

    if (overlaps.length === 0) return null;

    return (
        "Der Trainingsplan überschneidet sich mit bestehenden Trainingsplänen:\n\n" +
        "• " +
        overlaps.join("\n• ") +
        "\n\nBitte ändern Sie die Zeit oder den Zeitraum."
    );
}

function tp_calcYearData(tp) {
    const abo = D.abos.find((a) => a.id === tp.aboId);
    if (!abo) return;

    const wotagJS = [
        "Sonntag",
        "Montag",
        "Dienstag",
        "Mittwoch",
        "Donnerstag",
        "Freitag",
        "Samstag",
    ];

    const projStartISO = D.settings?.startdatum;
    const projEndeISO = D.settings?.enddatum;

    let effStartISO = tp.vonDatum;
    let effEndeISO = tp.bisDatum;

    if (projStartISO && effStartISO < projStartISO) effStartISO = projStartISO;
    if (projEndeISO && effEndeISO > projEndeISO) effEndeISO = projEndeISO;

    // Wenn nach dem Clippen kein gültiger Zeitraum bleibt
    if (effEndeISO < effStartISO) {
        tp.minuten = util_timeToMin(tp.bisZeit) - util_timeToMin(tp.vonZeit);
        tp.jahre = {};
        D.settings.jahre.forEach((y) => {
            tp.jahre[y] = { tage: 0, tageTrainer: 0 };
        });
        return;
    }

    const start = util_isoToDate(effStartISO);
    const ende = util_isoToDate(effEndeISO);

    // Minuten pro Einheit
    tp.minuten = util_timeToMin(tp.bisZeit) - util_timeToMin(tp.vonZeit);

    // Jahresstruktur initialisieren
    tp.jahre = {};
    D.settings.jahre.forEach((y) => {
        tp.jahre[y] = {
            tage: 0,
            tageTrainer: 0,
        };
    });

    for (let d = new Date(start); d <= ende; d.setDate(d.getDate() + 1)) {
        const iso = util_dateToISO(d);
        const y = d.getFullYear();
        if (!D.settings.jahre.includes(y)) continue;

        const wtag = wotagJS[d.getDay()];
        if (wtag !== abo.wochentag) continue;

        // Feiertag?
        const istFeiertag = (DE_DATES["Hessen"].feiertage[y] || []).some(
            (f) => f.datum === iso,
        );

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

function tp_checkPrerequisites(showMessage = true) {
    const errors = [];

    const hasAbo = Array.isArray(D.abos) && D.abos.length > 0;
    const hasSpieler = Array.isArray(D.spieler) && D.spieler.length > 0;

    if (!hasAbo) {
        errors.push("• Bitte zuerst mindestens ein Platz-Abo anlegen.");
    }

    if (!hasSpieler) {
        errors.push("• Bitte zuerst mindestens einen Spieler anlegen.");
    }

    if (errors.length === 0) {
        return true;
    }

    if (showMessage) {
        ui_dialogMessage(
            "Trainingsplan anlegen",
            "Folgende Voraussetzungen sind noch nicht erfüllt:\n\n" +
                errors.join("\n"),
        );
    }

    return false;
}

function tp_onAboChanged() {
    const aboId = document.getElementById("tp_abo").value;
    const info = document.getElementById("tpAboInfo");

    // Defensive: falls der Container im Dialog (z.B. nach Refactor) nicht vorhanden ist,
    // soll kein Fehler entstehen.
    if (!info) return;

    // Defensive: falls das Info-Element (z.B. durch zukünftige Änderungen) nicht existiert,
    // soll die Funktion ohne Fehler abbrechen.
    if (!info) return;

    if (!aboId) {
        info.innerHTML = "";
        return;
    }

    const a = D.abos.find((x) => x.id === aboId);
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
            Zeitraum: ${util_formatDateDE(a.startdatum)} – ${util_formatDateDE(a.enddatum)}<br>
            Zeit: ${util_formatTimeDE(a.startzeit)} – ${util_formatTimeDE(a.endzeit)}
        </div>
    `;

    // Zeit- und Datumsfelder automatisch einschränken? → folgt in Block 6.5
}

function tp_getAboLabelById(aboId) {
    const abo = (D.abos || []).find((a) => a.id === aboId);
    return abo ? abo_getLabel(abo) : "unbekannt";
}

//  =========================================================
//  Kosten
//  =========================================================
function kosten_calcAll() {
    const kosten = { jahre: {} };

    // Grundstruktur pro Jahr anlegen
    D.settings.jahre.forEach((y) => {
        kosten.jahre[y] = {
            platz: {}, // Platzkosten pro TP
            trainer: {}, // Trainerkosten pro TP
            spieler: {}, // Summe pro Spieler (alle TPs)
            tpSpieler: {}, // NEU: Kosten pro TP und Spieler
            gesamtProSpieler: {}, // Summe pro Spieler (für Ausgabe)
        };
    });

    // 1) Platzkosten pro Minute je Abo vorberechnen
    const aboKostenProMin = {};
    D.abos.forEach((abo) => {
        aboKostenProMin[abo.id] = kosten_calcPlatzMinCost(abo);
    });

    // 2) Trainingspläne durchgehen
    D.trainingsplan.forEach((tp) => {
        const abo = D.abos.find((a) => a.id === tp.aboId);
        if (!abo) return;

        // Trainer ermitteln
        let trainer;
        if (tp.trainerId === "__NONE__") {
            trainer = { kosten: 0, name: "ohne Trainer" };
        } else {
            trainer = D.trainer.find((t) => t.id === tp.trainerId) || {
                kosten: 0,
                name: "unbekannt",
            };
        }

        const platzMinCost = aboKostenProMin[tp.aboId] || 0;
        const trainerCostPerMinute = (trainer.kosten || 0) / 60;

        D.settings.jahre.forEach((y) => {
            const jahr = kosten.jahre[y];

            const tage = tp.jahre?.[y]?.tage ?? 0;
            const tageTrainer = tp.jahre?.[y]?.tageTrainer ?? 0;
            const minuten = tp.minuten ?? 0;

            // Platzkosten & Trainerkosten für diesen TP in diesem Jahr
            const platzKosten = tage * minuten * platzMinCost;
            const trainerKosten = tageTrainer * minuten * trainerCostPerMinute;

            // aufsummieren (falls ein TP theoretisch mehrfach reinlaufen würde)
            jahr.platz[tp.id] = (jahr.platz[tp.id] || 0) + platzKosten;
            jahr.trainer[tp.id] = (jahr.trainer[tp.id] || 0) + trainerKosten;

            // aktive Spieler für dieses Jahr
            const aktiveSpieler = (tp.spielerIds || []).filter((id) => {
                const sp = D.spieler.find((s) => s.id === id);
                return sp && sp.jahre && sp.jahre[y];
            });

            if (aktiveSpieler.length === 0) {
                return;
            }

            // 1. Summe der Gewichte (Kostenfaktoren)
            let summeGewichte = 0;
            aktiveSpieler.forEach((id) => {
                const sp = D.spieler.find((s) => s.id === id);
                const faktor =
                    sp && sp.kostenfaktor != null ? sp.kostenfaktor : 1.0;
                summeGewichte += faktor;
            });

            if (summeGewichte <= 0) {
                return;
            }

            // 2. Kosten pro Gewichtseinheit
            const gesamtKostenTP = platzKosten + trainerKosten;
            const kostenProEinheit = gesamtKostenTP / summeGewichte;

            // 3. Auf Spieler verteilen
            aktiveSpieler.forEach((id) => {
                const sp = D.spieler.find((s) => s.id === id);
                const faktor =
                    sp && sp.kostenfaktor != null ? sp.kostenfaktor : 1.0;
                const k = kostenProEinheit * faktor;

                // Summe pro Spieler
                jahr.spieler[id] = (jahr.spieler[id] || 0) + k;

                // NEU: Kosten pro TP + Spieler
                if (!jahr.tpSpieler[tp.id]) {
                    jahr.tpSpieler[tp.id] = {};
                }
                jahr.tpSpieler[tp.id][id] =
                    (jahr.tpSpieler[tp.id][id] || 0) + k;
            });
        });
    });

    // 3) Summen pro Spieler bilden (ggf. später erweiterbar)
    D.settings.jahre.forEach((y) => {
        const jahr = kosten.jahre[y];
        Object.keys(jahr.spieler).forEach((spid) => {
            jahr.gesamtProSpieler[spid] = jahr.spieler[spid];
        });
    });

    // Globale Ablage
    D.kosten = kosten;
}

function kosten_calcPlatzMinCost(abo) {
    let gesamtMin = 0;
    const minProEinheit =
        util_timeToMin(abo.endzeit) - util_timeToMin(abo.startzeit);

    D.settings.jahre.forEach((y) => {
        // Abo-Tage neu berechnen (identisch zu TP, aber ohne TP-Beschränkung)
        const start = util_isoToDate(abo.startdatum);
        const ende = util_isoToDate(abo.enddatum);

        let tage = 0;
        const wotagJS = [
            "Sonntag",
            "Montag",
            "Dienstag",
            "Mittwoch",
            "Donnerstag",
            "Freitag",
            "Samstag",
        ];

        for (let d = new Date(start); d <= ende; d.setDate(d.getDate() + 1)) {
            const iso = util_dateToISO(d);
            if (d.getFullYear() !== y) continue;
            if (wotagJS[d.getDay()] !== abo.wochentag) continue;
            tage++;
        }

        gesamtMin += tage * minProEinheit;
    });

    if (gesamtMin === 0) return 0;
    return abo.platzkosten / gesamtMin;
}

function kosten_hasAny() {
    if (!D?.kosten?.jahre) return false;

    const jahre = D.settings?.jahre || [];
    for (const y of jahre) {
        const jahr = D.kosten.jahre?.[y];
        const gpp = jahr?.gesamtProSpieler;
        if (!gpp) continue;

        // Sobald irgendein Spieler in irgendeinem Jahr Kosten > 0 hat,
        // gelten "Kosten vorhanden".
        if (Object.values(gpp).some((v) => (Number(v) || 0) > 0)) {
            return true;
        }
    }

    return false;
}

function kosten_renderSection(app) {
    const div = document.createElement("div");
    div.className = "section-card";
    if (!kosten_hasAny()) {
        div.innerHTML = `
            <h2>8. Kosten</h2>
            <p>Es sind noch keine Kosten vorhanden.</p>
        `;
        app.appendChild(div);
        return;
    }

    div.innerHTML = `
            <h2>8. Kosten</h2>
            <div id="kostenOutput"></div>
        `;

    app.appendChild(div);

    // Kosten sind durch ui_renderAll() bereits berechnet
    kosten_renderTable(div.querySelector("#kostenOutput"));
}

function kosten_renderTable(container) {
    if (!D.kosten || !D.kosten.jahre) {
        container.innerHTML = "<p>Noch nicht berechnet.</p>";
        return;
    }

    if (!kosten_hasAny()) {
        container.innerHTML = "<p>Es sind noch keine Kosten vorhanden.</p>";
        return;
    }

    const jahre = D.settings.jahre || [];
    let html = `<table class="table-bordered"><tr><th>Spieler</th>`;

    // Kopfzeile: alle Jahre + Gesamt
    jahre.forEach((y) => {
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

    alleSpieler.forEach((sp) => {
        html += `<tr><td>${sp.name}</td>`;

        let jahreSumme = 0;

        jahre.forEach((y) => {
            const jahr = D.kosten.jahre[y];
            const wert =
                jahr && jahr.gesamtProSpieler[sp.id]
                    ? jahr.gesamtProSpieler[sp.id]
                    : 0;

            html += `<td>${wert ? util_formatCurrencyDE(wert) : "-"}</td>`;
            jahreSumme += wert;
        });

        // Zuschuss (nur wenn global aktiv)
        let zus = 0;
        if (D.settings.zuschussAktiv) {
            zus = sp.zuschuss ? D.settings.zuschussBetrag : 0;

            html += `<td>${zus > 0 ? "-" + util_formatCurrencyDE(zus) : "0,00 €"}</td>`;
        }

        const endsumme = Math.max(0, jahreSumme - zus);

        html += `<td><b>${util_formatCurrencyDE(endsumme)}</b></td></tr>`;
    });

    html += `</table>`;
    container.innerHTML = html;
}

//  =========================================================
//  Trainingsübersicht
//  =========================================================
function overview_renderSection(app) {
    // globale Daten
    const tpsAll = D.trainingsplan || [];
    const abos = D.abos || [];
    const spieler = D.spieler || [];
    const plaetze = D.plaetze || [];

    const div = document.createElement("div");
    div.className = "section-card";

    div.innerHTML = `
        <h2>9. Trainingsübersicht</h2>
    `;

    if (tpsAll.length === 0) {
        div.innerHTML += `<p>Es sind noch keine Trainingspläne vorhanden.</p>`;
        app.appendChild(div);
        return;
    }

    // ---------------------------------------------------------
    // 0) Trainingspläne nach Platz splitten (nur dieser Schritt ist neu!)
    // ---------------------------------------------------------
    const byPlatzId = new Map();
    tpsAll.forEach((tp) => {
        const abo = abos.find((a) => a.id === tp.aboId);
        const platzId = abo?.platzId || "__UNKNOWN__";
        if (!byPlatzId.has(platzId)) byPlatzId.set(platzId, []);
        byPlatzId.get(platzId).push(tp);
    });

    // Reihenfolge: nach Platzliste, dann ggf. unbekannt
    const orderedPlatzIds = [];
    plaetze.forEach((p) => {
        if (byPlatzId.has(p.id)) orderedPlatzIds.push(p.id);
    });
    if (byPlatzId.has("__UNKNOWN__")) orderedPlatzIds.push("__UNKNOWN__");

    // ---------------------------------------------------------
    // Helper: exakt dein bisheriges Rendering, nur mit tps-Subset
    // ---------------------------------------------------------
    function renderOne(platzId, tps) {
        const platzObj = plaetze.find((p) => p.id === platzId);
        const platzName = platzObj ? platzObj.name : "Unbekannter Platzname";
        const platzArt = platzObj ? platzObj.art : "Unbekannte Platzart";

        // Überschrift pro Platz (wie von dir gefordert: nur „Platz 1“, „Platz 2“)
        //div.innerHTML += `<h3 style="margin-top:18px;">${platzTitle}</h3>`;
        div.innerHTML += `<h3 style="margin-top:18px;">${platzName} (${platzArt})</h3>`;

        /* ---------------------------------------------------------
           1) früheste / späteste Zeit finden
           --------------------------------------------------------- */
        let earliest = Infinity;
        let latest = -Infinity;

        tps.forEach((tp) => {
            const abo = abos.find((a) => a.id === tp.aboId);
            if (!abo) return;

            const s = overview_timeToMin(tp.vonZeit || abo.startzeit);
            const e = overview_timeToMin(tp.bisZeit || abo.endzeit);

            if (!isNaN(s) && s < earliest) earliest = s;
            if (!isNaN(e) && e > latest) latest = e;
        });

        if (earliest === Infinity || latest === -Infinity) {
            div.innerHTML += `<p>Fehlerhafte Zeitdaten.</p>`;
            return;
        }

        const slots = overview_slotsBetween(earliest, latest);

        /* ---------------------------------------------------------
           2) Wochentage
           --------------------------------------------------------- */
        const tage = [
            "Montag",
            "Dienstag",
            "Mittwoch",
            "Donnerstag",
            "Freitag",
        ];
        //const tage = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

        /* ---------------------------------------------------------
           3) Globales Raster: maxZeilen pro Slot
           --------------------------------------------------------- */
        let maxZeilen = 1;

        tps.forEach((tp) => {
            const abo = abos.find((a) => a.id === tp.aboId);
            if (!abo) return;

            const tpSlots = overview_getTpSlots(tp, abo);
            const players = overview_getSortedPlayers(tp, D);
            const n = players.length;
            const slotCount = tpSlots.length || 1;

            const z = Math.ceil(n / slotCount);
            if (z > maxZeilen) maxZeilen = z;
        });

        /* ---------------------------------------------------------
           4) Matrix aufbauen
           matrix[slot][tag] = { tp, players[], isStart, isEnd, blockIndex }
           --------------------------------------------------------- */
        const matrix = {};
        slots.forEach((slot) => {
            matrix[slot] = {};
            tage.forEach((tag) => (matrix[slot][tag] = null));
        });

        /* ---------------------------------------------------------
           5) Traininspläne in Matrix eintragen
           --------------------------------------------------------- */
        tps.forEach((tp) => {
            const abo = abos.find((a) => a.id === tp.aboId);
            if (!abo) return;

            const tag = abo.wochentag;
            if (!tage.includes(tag)) return;

            const slotList = overview_getTpSlots(tp, abo);
            const playersBase = overview_getSortedPlayers(tp, D);

            // Spieler erweitern
            const enriched = playersBase.map((sp) => ({
                id: sp.id,
                name: sp.name + overview_getSpielerJahresLabel(sp, tp),
                kosten: overview_kostenProSpielerTP(tp, sp),
            }));

            const slotCount = slotList.length;
            const chunks = overview_distributePlayers(
                enriched,
                slotCount,
                maxZeilen,
            );

            slotList.forEach((slot, idx) => {
                matrix[slot][tag] = {
                    tp,
                    players: chunks[idx] || [],
                    isStart: idx === 0,
                    isEnd: idx === slotCount - 1,
                    blockIndex: idx,
                };
            });
        });

        /* ---------------------------------------------------------
           6) Tabelle rendern
           --------------------------------------------------------- */
        const tableId = platzId ? `tp_table_${platzId}` : "tp_table";

        let html = `
            <table id="${tableId}" class="tp-overview-table">
                <colgroup>
                    <col class="tp-overview-col-time">
                    ${tage
                        .map(
                            () => `
                        <col style="width:13%;">
                        <col style="width:7%;">
                        <!--
                        <col style="width:10%;">
                        <col style="width:4.28%;">
                        -->
                    `,
                        )
                        .join("")}
                </colgroup>

                <thead>
                    <tr>
                        <th rowspan="2" class="tp-overview-col-time">Zeit</th>
                        ${tage.map((t) => `<th colspan="2" style="text-align:center;">${t}</th>`).join("")}
                    </tr>
                    <tr>
                        ${tage.map(() => `<th style="text-align:center;">Spieler</th><th style="text-align:center;">Kosten</th>`).join("")}
                    </tr>
                </thead>
                <tbody>
        `;

        slots.forEach((slot) => {
            for (let r = 0; r < maxZeilen; r++) {
                html += `<tr>`;

                if (r === 0) {
                    html += `<td class="tp-overview-time" rowspan="${maxZeilen}">${overview_minToTime(slot)}</td>`;
                }

                tage.forEach((tag) => {
                    const cell = matrix[slot][tag];

                    if (!cell) {
                        html += `<td class="tp-overview-empty"></td><td class="tp-overview-empty"></td>`;
                        return;
                    }

                    const p = cell.players[r];

                    // Block-Klassen
                    const nameClasses = [
                        "tp-overview-blockcell",
                        "tp-overview-block-left",
                    ];
                    const costClasses = [
                        "tp-overview-blockcell",
                        "tp-overview-block-right",
                    ];

                    if (cell.isStart && r === 0) {
                        nameClasses.push("tp-overview-block-top");
                        costClasses.push("tp-overview-block-top");
                    }

                    if (cell.isEnd && r === maxZeilen - 1) {
                        nameClasses.push("tp-overview-block-bottom");
                        costClasses.push("tp-overview-block-bottom");
                    }

                    if (!p) {
                        html += `<td class="${nameClasses.join(" ")}"></td>`;
                        html += `<td class="${costClasses.join(" ")}"></td>`;
                    } else {
                        html += `<td class="${nameClasses.join(" ")}">${p.name}</td>`;
                        html += `<td class="${costClasses.join(" ")}">${util_formatCurrencyDE(p.kosten || 0)}</td>`;
                    }
                });

                html += `</tr>`;
            }
        });

        html += `
                </tbody>
            </table>
        `;

        div.innerHTML += html;
    }

    // ---------------------------------------------------------
    // 1) Alle Plätze rendern (je Platz: exakt gleiche Tabelle wie vorher)
    // ---------------------------------------------------------
    orderedPlatzIds.forEach((pid) => {
        renderOne(pid, byPlatzId.get(pid) || []);
    });

    app.appendChild(div);
}

function overview_timeToMin(t) {
    if (!t) return 0;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}

function overview_minToTime(m) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    return `${hh}:${mm}`;
}

function overview_slotsBetween(startMin, endMin) {
    const out = [];
    for (let t = startMin; t < endMin; t += 30) {
        out.push(t);
    }
    return out;
}

function overview_getTpSlots(tp, abo) {
    // bevorzugt die Zeiten aus dem Trainingsplan,
    // fällt ggf. auf die Abo-Zeiten zurück
    const start = overview_timeToMin(tp.vonZeit || abo.startzeit);
    const end = overview_timeToMin(tp.bisZeit || abo.endzeit);
    return overview_slotsBetween(start, end);
}

function overview_getSortedPlayers(tp, D) {
    return (tp.spielerIds || [])
        .map((id) => D.spieler.find((s) => s.id === id))
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name));
}

function overview_distributePlayers(players, slotCount, maxZeilen) {
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

function overview_getSpielerJahresLabel(sp, tp) {
    if (!sp || !sp.jahre || !tp || !tp.jahre) return "";

    const tpJahre = Object.keys(tp.jahre);
    if (tpJahre.length <= 1) return ""; // bei nur einem Jahr keine Markierung

    const aktive = Object.entries(sp.jahre)
        .filter(([jahr, aktiv]) => !!aktiv)
        .map(([jahr]) => jahr);

    if (aktive.length === 1) {
        return ` (nur ${aktive[0]})`;
    }

    return "";
}

function overview_kostenProSpielerTP(tp, sp) {
    if (!tp || !sp) return 0;
    if (!D || !D.settings || !Array.isArray(D.settings.jahre)) return 0;

    // Abo & Trainer besorgen
    const abo = D.abos.find((a) => a.id === tp.aboId);
    if (!abo) return 0;

    const platzMinCost = kosten_calcPlatzMinCost(abo);

    let trainer;
    if (tp.trainerId === "__NONE__") {
        trainer = { kosten: 0 };
    } else {
        trainer = D.trainer.find((t) => t.id === tp.trainerId) || { kosten: 0 };
    }
    const trainerCostPerMinute = (trainer.kosten || 0) / 60;

    const minuten =
        tp.minuten || util_timeToMin(tp.bisZeit) - util_timeToMin(tp.vonZeit);
    if (!minuten || minuten <= 0) return 0;

    let summe = 0;

    D.settings.jahre.forEach((y) => {
        const jahrData = tp.jahre && tp.jahre[y];
        if (!jahrData) return;

        const tage = jahrData.tage || 0;
        const tageTrainer = jahrData.tageTrainer || 0;

        if (tage === 0 && tageTrainer === 0) return;

        const platzKosten = tage * minuten * platzMinCost;
        const trainerKosten = tageTrainer * minuten * trainerCostPerMinute;
        const gesamtTP = platzKosten + trainerKosten;

        // Aktive Spieler in diesem Jahr
        const aktiveSpielerIds = (tp.spielerIds || []).filter((id) => {
            const s = D.spieler.find((sp2) => sp2.id === id);
            return s && s.jahre && s.jahre[y];
        });

        if (!aktiveSpielerIds.includes(sp.id)) return;
        if (aktiveSpielerIds.length === 0) return;

        let summeGewichte = 0;
        aktiveSpielerIds.forEach((id) => {
            const s2 = D.spieler.find((xx) => xx.id === id);
            summeGewichte += s2?.kostenfaktor ?? 1.0;
        });

        if (summeGewichte <= 0) return;

        const faktorSp = sp.kostenfaktor ?? 1.0;
        const kostenProEinheit = gesamtTP / summeGewichte;

        summe += faktorSp * kostenProEinheit;
    });

    return summe;
}

//  =========================================================
//  Export
//  =========================================================
function export_saveJson(exportCtx = null) {
    const data = JSON.stringify(D, null, 2);
    const blob = new Blob([data], { type: "application/json" });

    // Optional: Dateiname von außen vorgeben (Export-Zentralisierung)
    const filename =
        exportCtx && exportCtx.filename
            ? exportCtx.filename
            : (() => {
                  const ts = export_createTimestamp();
                  const art = D.settings && D.settings.art;
                  const periodenStr =
                      D.settings && D.settings.jahre
                          ? D.settings.jahre.join("-")
                          : "jahre";
                  return `${art}_${periodenStr}_${ts}.json`;
              })();

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    return true;
}

function export_createTimestamp() {
    const now = new Date();
    const pad2 = (n) => String(n).padStart(2, "0");

    const yyyy = now.getFullYear();
    const mm = pad2(now.getMonth() + 1);
    const dd = pad2(now.getDate());
    const hh = pad2(now.getHours());
    const min = pad2(now.getMinutes());

    return `${yyyy}-${mm}-${dd}T${hh}-${min}`;
}

function export_createBase(ts) {
    const art = D?.settings?.art ?? "projekt";
    const periodenStr = D?.settings?.jahre?.join("-") ?? "jahre";
    return { ts, art, periodenStr, base: `${art}_${periodenStr}_${ts}` };
}

function export_makeFilenames(baseObj) {
    return {
        json: `${baseObj.base}.json`,
        kosten: `${baseObj.base}_Kosten.xlsx`,
        trainingsplan: `${baseObj.base}_Trainingsplan.xlsx`,
    };
}

function export_buildPlan() {
    // Sicherstellen, dass Kosten möglichst aktuell sind
    if (typeof kosten_calcAll === "function") {
        kosten_calcAll();
    }

    const baseObj = export_createBase(export_createTimestamp());
    const fns = export_makeFilenames(baseObj);

    const plan = {
        base: baseObj,
        filenames: fns,
        items: [],
    };

    // JSON: immer, sobald ein Projekt existiert
    plan.items.push({
        key: "json",
        label: "JSON (Projektstand)",
        possible: true,
        filename: fns.json,
        reason: "",
    });

    // Kosten
    const kostenOk = export_canKostenXlsx();
    plan.items.push({
        key: "kosten",
        label: "XLSX Kosten",
        possible: kostenOk,
        filename: fns.kosten,
        reason: kostenOk
            ? ""
            : "Keine Kosten vorhanden (Kostenberechnung/Trainingspläne fehlen oder ergeben 0).",
    });

    // Trainingsplan
    const tpOk = export_canTrainingsplanXlsx();
    plan.items.push({
        key: "trainingsplan",
        label: "XLSX Trainingsplan",
        possible: tpOk,
        filename: fns.trainingsplan,
        reason: tpOk ? "" : "Keine exportierbaren Trainingspläne vorhanden.",
    });

    return plan;
}

function export_showDialog(plan, onConfirm) {
    const will = plan.items.filter((x) => x.possible);
    const wont = plan.items.filter((x) => !x.possible);

    let msg = "Folgende Dateien werden exportiert:\n\n";
    will.forEach((x) => {
        msg += `✅ ${x.label}: ${x.filename}\n`;
    });

    if (wont.length > 0) {
        msg += "\nNicht möglich:\n\n";
        wont.forEach((x) => {
            msg += `⚠️ ${x.label}: ${x.reason}\n`;
        });
    }

    ui_dialogConfirm("Export", msg, onConfirm);
}

function export_runAllWithDialog() {
    if (!D || !D.settings) {
        ui_dialogMessage("Export", "Kein Projekt geladen.");
        return;
    }

    const plan = export_buildPlan();

    export_showDialog(plan, () => {
        // JSON
        export_saveJson({ filename: plan.filenames.json });

        // Kosten (nur wenn möglich)
        if (plan.items.find((x) => x.key === "kosten")?.possible) {
            export_kostenXlsx({
                filename: plan.filenames.kosten,
                silent: true,
            });
        }

        // Trainingsplan (nur wenn möglich)
        if (plan.items.find((x) => x.key === "trainingsplan")?.possible) {
            export_trainingsplanXlsx({
                filename: plan.filenames.trainingsplan,
                silent: true,
            });
        }
    });
}

function export_canKostenXlsx() {
    return !!(
        D?.kosten?.jahre &&
        typeof kosten_hasAny === "function" &&
        kosten_hasAny()
    );
}

function export_canTrainingsplanXlsx() {
    const tps = D?.trainingsplan || [];
    const abos = D?.abos || [];
    if (!Array.isArray(tps) || tps.length === 0) return false;

    // Logik analog zum Export: earliest/latest müssen ermittelbar sein
    let earliest = Infinity;
    let latest = -Infinity;

    tps.forEach((tp) => {
        const abo = abos.find((a) => a.id === tp.aboId);
        if (!abo) return;

        const s = overview_timeToMin(tp.vonZeit || abo.startzeit);
        const e = overview_timeToMin(tp.bisZeit || abo.endzeit);

        if (!isNaN(s) && s < earliest) earliest = s;
        if (!isNaN(e) && e > latest) latest = e;
    });

    return !(earliest === Infinity || latest === -Infinity);
}

function export_kostenXlsx(exportCtx = null) {
    if (!D?.kosten?.jahre || !kosten_hasAny()) {
        if (!(exportCtx && exportCtx.silent)) {
            alert("Keine Kosten vorhanden.");
        }
        return false;
    }

    const wb = XLSX.utils.book_new();

    const jahre = D.settings?.jahre || [];
    const showZuschuss = !!D.settings?.zuschussAktiv;

    // --------------------------------------------------------
    // 1) Excel-Matrix (Werte, noch ohne Styles)
    //    Struktur wie kosten_renderTable() – nur ohne ID
    // --------------------------------------------------------
    const head = ["Spieler", ...jahre.map((y) => String(y))];
    if (showZuschuss) head.push("Zuschuss");
    head.push("Gesamt");

    const excelMatrix = [head];

    const alleSpieler = (D.spieler || [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "de"));

    alleSpieler.forEach((sp) => {
        let jahreSumme = 0;

        const row = [sp.name];

        // Jahrsspalten
        jahre.forEach((y) => {
            const jahr = D.kosten.jahre[y];
            const wert = jahr?.gesamtProSpieler?.[sp.id] || 0;
            row.push(Number(wert));
            jahreSumme += Number(wert);
        });

        // Zuschuss-Spalte (nur wenn global aktiv)
        let zus = 0;
        if (showZuschuss) {
            zus = sp.zuschuss ? Number(D.settings.zuschussBetrag || 0) : 0;

            // UI zeigt "-<Betrag>" → Excel: negative Zahl
            row.push(-Number(zus));
        }

        const endsumme = Math.max(0, jahreSumme - zus);
        row.push(Number(endsumme));

        excelMatrix.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(excelMatrix);

    // --------------------------------------------------------
    // 2) ensureCell (wie im Trainingsplan-Export)
    // --------------------------------------------------------
    function ensureCell(r, c) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (!ws[ref]) ws[ref] = { t: "s", v: "" };
        return ws[ref];
    }

    // --------------------------------------------------------
    // 3) Spaltenbreiten (ähnlich UI)
    // --------------------------------------------------------
    const colCount = head.length;
    ws["!cols"] = [
        { wch: 28 }, // Spieler
        ...Array(colCount - 1).fill({ wch: 14 }),
    ];

    // --------------------------------------------------------
    // 4) Styles (orientiert an UI .table-bordered + Trainingsplan-Export)
    // UI:
    //  - th background: #dedede, border: 1px solid #ddd
    //  - td border:     1px solid #ddd
    // --------------------------------------------------------
    const COLOR_HEAD = "FFDEDEDE"; // wie mod8 head top + .table-bordered th
    const BORDER_THIN = { style: "thin", color: { rgb: "FFDDDDDD" } };

    const styleHeader = {
        fill: { fgColor: { rgb: COLOR_HEAD } },
        font: { bold: true },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
            top: BORDER_THIN,
            bottom: BORDER_THIN,
            left: BORDER_THIN,
            right: BORDER_THIN,
        },
    };

    const styleBodyLeft = {
        alignment: { horizontal: "left", vertical: "center" },
        border: {
            top: BORDER_THIN,
            bottom: BORDER_THIN,
            left: BORDER_THIN,
            right: BORDER_THIN,
        },
    };

    const styleBodyRight = {
        alignment: { horizontal: "right", vertical: "center" },
        border: {
            top: BORDER_THIN,
            bottom: BORDER_THIN,
            left: BORDER_THIN,
            right: BORDER_THIN,
        },
    };

    const styleBodyRightBold = {
        font: { bold: true },
        alignment: { horizontal: "right", vertical: "center" },
        border: {
            top: BORDER_THIN,
            bottom: BORDER_THIN,
            left: BORDER_THIN,
            right: BORDER_THIN,
        },
    };

    // --------------------------------------------------------
    // 5) Zahlenformate
    // - Jahr: "-" bei 0 wie UI (kosten_renderTable() zeigt "-" bei 0) :contentReference[oaicite:5]{index=5}
    // - Zuschuss: normale Währung (0 bleibt 0,00 € wie UI)
    // - Gesamt: normale Währung, aber fett
    // --------------------------------------------------------
    const Z_CUR_EUR = '#,##0.00 "€"';
    const Z_CUR_EUR_DASH_ZERO = '#,##0.00 "€";-#,##0.00 "€";"-";@';

    const rowCount = excelMatrix.length;

    // Headerzeile stylen
    for (let c = 0; c < colCount; c++) {
        ensureCell(0, c).s = styleHeader;
    }

    // Body stylen + Formate
    for (let r = 1; r < rowCount; r++) {
        // Spielername (links)
        const cName = ensureCell(r, 0);
        cName.s = styleBodyLeft;

        // Jahrsspalten (rechts, "-" bei 0)
        let col = 1;
        for (let i = 0; i < jahre.length; i++) {
            const cell = ensureCell(r, col + i);
            cell.t = "n";
            cell.z = Z_CUR_EUR_DASH_ZERO;
            cell.s = styleBodyRight;
        }
        col += jahre.length;

        // Zuschuss (falls aktiv) (rechts, normale Währung)
        if (showZuschuss) {
            const cell = ensureCell(r, col);
            cell.t = "n";
            cell.z = Z_CUR_EUR;
            cell.s = styleBodyRight;
            col++;
        }

        // Gesamt (rechts + fett)
        const cGes = ensureCell(r, col);
        cGes.t = "n";
        cGes.z = Z_CUR_EUR;
        cGes.s = styleBodyRightBold;
    }

    XLSX.utils.book_append_sheet(wb, ws, "Kosten");

    // Dateiname (zentral vorgebbar)
    const filename =
        exportCtx && exportCtx.filename
            ? exportCtx.filename
            : (() => {
                  const ts = export_createTimestamp();
                  const art = D.settings?.art ?? "kosten";
                  const periodenStr = D.settings?.jahre?.join("-") ?? "jahre";
                  return `${art}_${periodenStr}_${ts}_Kosten.xlsx`;
              })();

    XLSX.writeFile(wb, filename);
    return true;
}

function export_trainingsplanXlsx_old(exportCtx = null) {
    // --------------------------------------------------------
    // 1) Grunddaten wie in overview_renderSection
    // --------------------------------------------------------
    const tps = D.trainingsplan || [];
    const abos = D.abos || [];
    const tage = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];
    //const tage = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

    // Zentraler Export: wenn keine Trainingspläne vorhanden sind, still abbrechen
    if (
        exportCtx &&
        exportCtx.silent &&
        (!Array.isArray(tps) || tps.length === 0)
    ) {
        return false;
    }

    // früheste / späteste Zeit bestimmen
    let earliest = Infinity;
    let latest = -Infinity;

    tps.forEach((tp) => {
        const abo = abos.find((a) => a.id === tp.aboId);
        if (!abo) return;
        const s = overview_timeToMin(tp.vonZeit || abo.startzeit);
        const e = overview_timeToMin(tp.bisZeit || abo.endzeit);
        if (!isNaN(s) && s < earliest) earliest = s;
        if (!isNaN(e) && e > latest) latest = e;
    });

    if (!isFinite(earliest) || !isFinite(latest)) {
        if (!(exportCtx && exportCtx.silent)) {
            alert("Fehlerhafte Zeitdaten.");
        }
        return false;
    }

    const slots = overview_slotsBetween(earliest, latest); // z.B. 15:00, 15:30, ...

    // maximale Zeilenzahl pro Slot (wie in overview_renderSection)
    let maxZeilen = 1;
    tps.forEach((tp) => {
        const abo = abos.find((a) => a.id === tp.aboId);
        if (!abo) return;
        const tpSlots = overview_getTpSlots(tp, abo);
        const players = overview_getSortedPlayers(tp, D);
        const n = players.length;
        const slotCount = tpSlots.length || 1;
        const z = Math.ceil(n / slotCount);
        if (z > maxZeilen) maxZeilen = z;
    });

    // Matrix wie in overview_renderSection
    const matrix = {};
    slots.forEach((slot) => {
        matrix[slot] = {};
        tage.forEach((tag) => (matrix[slot][tag] = null));
    });

    tps.forEach((tp) => {
        const abo = abos.find((a) => a.id === tp.aboId);
        if (!abo) return;
        const tag = abo.wochentag;
        if (!tage.includes(tag)) return;

        const slotList = overview_getTpSlots(tp, abo);
        const playersBase = overview_getSortedPlayers(tp, D);

        const enriched = playersBase.map((sp) => ({
            id: sp.id,
            name: sp.name + overview_getSpielerJahresLabel(sp, tp),
            kosten: overview_kostenProSpielerTP(tp, sp),
        }));

        const slotCount = slotList.length;
        const chunks = overview_distributePlayers(
            enriched,
            slotCount,
            maxZeilen,
        );

        slotList.forEach((slot, idx) => {
            matrix[slot][tag] = {
                tp,
                players: chunks[idx] || [],
                isStart: idx === 0,
                isEnd: idx === slotCount - 1,
                blockIndex: idx,
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
    tage.forEach((tag) => head1.push(tag, ""));
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
        Array.from({ length: colCount }, () => null),
    );

    // Datenzeilen
    slots.forEach((slot, slotIdx) => {
        for (let r = 0; r < maxZeilen; r++) {
            const row = [];

            // Zeitspalte
            if (r === 0) {
                row.push(overview_minToTime(slot));
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

                    const isTop = cell.isStart && r === 0;
                    const isBottom = cell.isEnd && r === maxZeilen - 1;

                    // Spieler
                    if (p) {
                        row.push(p.name, util_formatCurrencyDE(p.kosten || 0));
                    } else {
                        row.push("", "");
                    }

                    // merken: dies ist eine Blockzeile (auch wenn p leer ist!)
                    blockInfo[excelRowIndex][colName] = {
                        isBlock: true,
                        isTop,
                        isBottom,
                    };
                    blockInfo[excelRowIndex][colCost] = {
                        isBlock: true,
                        isTop,
                        isBottom,
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
    const COLOR_HEAD_TOP = "FFDEDEDE"; // Wochentag
    const COLOR_HEAD_SUB = "FFE9E9E9"; // Spieler/Kosten Kopf
    const COLOR_TIME_COL = "FFE9E9E9"; // Zeitspalte
    const COLOR_BLOCK_BG = "FFF4F4F4"; // Block-Hintergrund

    const BORDER_THICK = { style: "medium", color: { rgb: "FF999999" } }; // außen
    const BORDER_THIN = { style: "thin", color: { rgb: "FFCCCCCC" } }; // innen

    // Kopfzeilen stylen
    tage.forEach((tag, ti) => {
        const colName = 1 + ti * 2;
        const colCost = colName + 1;

        // Zeile 0: Wochentag
        const c0 = ensureCell(0, colName);
        const c0b = ensureCell(0, colCost);
        c0.s = c0b.s = {
            fill: { fgColor: { rgb: COLOR_HEAD_TOP } },
            font: { bold: true },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
                top: BORDER_THIN,
                bottom: BORDER_THIN,
                left: BORDER_THIN,
                right: BORDER_THIN,
            },
        };

        // Zeile 1: Spieler/Kosten
        const c1 = ensureCell(1, colName);
        const c1b = ensureCell(1, colCost);
        c1.s = c1b.s = {
            fill: { fgColor: { rgb: COLOR_HEAD_SUB } },
            font: { bold: true },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
                top: BORDER_THIN,
                bottom: BORDER_THIN,
                left: BORDER_THIN,
                right: BORDER_THIN,
            },
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
            top: BORDER_THIN,
            bottom: BORDER_THIN,
            left: BORDER_THIN,
            right: BORDER_THIN,
        },
    };

    //
    // Zeitspalte (Spalte A) stylen mit Blockrahmen wie HTML
    //
    for (let si = 0; si < slots.length; si++) {
        const baseRow = 2 + si * maxZeilen; // erste Zeile dieses Slots
        const endRow = baseRow + maxZeilen - 1; // letzte Zeile dieses Slots

        for (let r = baseRow; r <= endRow; r++) {
            const cell = ensureCell(r, 0);

            cell.s = {
                fill: { fgColor: { rgb: COLOR_TIME_COL } },
                font: { bold: r === baseRow }, // Uhrzeit fett nur in oberster Slot-Zeile
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    left: BORDER_THIN,
                    right: BORDER_THIN,
                    top: r === baseRow ? BORDER_THIN : undefined,
                    bottom: r === endRow ? BORDER_THIN : undefined,
                },
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
            cN.s.alignment = { horizontal: "left", vertical: "center" };

            // Kostenzelle
            const cC = ensureCell(r, colCost);
            cC.s = cC.s || {};
            cC.s.fill = { fgColor: { rgb: COLOR_BLOCK_BG } };
            cC.s.border = cC.s.border || {};
            cC.s.alignment = {
                horizontal: "right",
                vertical: "center",
                indent: 1,
            };

            // Außen links/rechts immer dick
            cN.s.border.left = BORDER_THICK;
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

    const filename =
        exportCtx && exportCtx.filename
            ? exportCtx.filename
            : (() => {
                  const ts = export_createTimestamp();
                  const art = D.settings?.art ?? "plan";
                  const periodenStr = D.settings?.jahre?.join("-") ?? "jahre";
                  return `${art}_${periodenStr}_${ts}_Trainingsplan.xlsx`;
              })();
    XLSX.writeFile(wb, filename);
    return true;
}

function export_trainingsplanXlsx_new(exportCtx = null) {
    // --------------------------------------------------------
    // 1) Grunddaten (wie bisher)
    // --------------------------------------------------------
    const tpsAll = D.trainingsplan || [];
    const abos = D.abos || [];
    const plaetze = D.plaetze || [];
    const tage = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];
    //const tage = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

    // Zentraler Export: wenn keine Trainingspläne vorhanden sind, still abbrechen
    if (
        exportCtx &&
        exportCtx.silent &&
        (!Array.isArray(tpsAll) || tpsAll.length === 0)
    ) {
        return false;
    }

    if (!Array.isArray(tpsAll) || tpsAll.length === 0) {
        if (!(exportCtx && exportCtx.silent)) {
            alert("Keine Trainingspläne vorhanden.");
        }
        return false;
    }

    // --------------------------------------------------------
    // 2) Trainingspläne nach Platz gruppieren (NEU: nur der Schritt davor)
    //    Platz kommt aus dem Abo (abo.platzId)
    // --------------------------------------------------------
    const mapByPlatzId = new Map(); // platzId -> tps[]
    tpsAll.forEach((tp) => {
        const abo = abos.find((a) => a.id === tp.aboId);
        if (!abo || !abo.platzId) return;

        const pid = abo.platzId;
        if (!mapByPlatzId.has(pid)) mapByPlatzId.set(pid, []);
        mapByPlatzId.get(pid).push(tp);
    });

    if (mapByPlatzId.size === 0) {
        if (!(exportCtx && exportCtx.silent)) {
            alert(
                "Keine exportierbaren Trainingspläne vorhanden (Platz fehlt).",
            );
        }
        return false;
    }

    // Reihenfolge stabil nach Platzliste (wie UI), nur Plätze die auch TPs haben
    const platzIds = (plaetze || [])
        .map((p) => p.id)
        .filter((pid) => mapByPlatzId.has(pid));

    // Fallback: falls mapByPlatzId Plätze enthält, die nicht (mehr) in D.plaetze sind
    mapByPlatzId.forEach((_, pid) => {
        if (!platzIds.includes(pid)) platzIds.push(pid);
    });

    // --------------------------------------------------------
    // 3) Workbook einmal erstellen (NEU)
    // --------------------------------------------------------
    const wb = XLSX.utils.book_new();

    // --------------------------------------------------------
    // 4) Helper: DEIN bisheriger Export-Algorithmus 1:1,
    //    nur mit tps-Subset + Sheetname
    // --------------------------------------------------------
    function exportOneSheet(tps, sheetName) {
        // früheste / späteste Zeit bestimmen
        let earliest = Infinity;
        let latest = -Infinity;

        tps.forEach((tp) => {
            const abo = abos.find((a) => a.id === tp.aboId);
            if (!abo) return;
            const s = overview_timeToMin(tp.vonZeit || abo.startzeit);
            const e = overview_timeToMin(tp.bisZeit || abo.endzeit);
            if (!isNaN(s) && s < earliest) earliest = s;
            if (!isNaN(e) && e > latest) latest = e;
        });

        if (!isFinite(earliest) || !isFinite(latest)) {
            // Im Multi-Sheet-Export: dieses Sheet überspringen
            return;
        }

        const slots = overview_slotsBetween(earliest, latest); // z.B. 15:00, 15:30, ...

        // maximale Zeilenzahl pro Slot (wie in overview_renderSection)
        let maxZeilen = 1;
        tps.forEach((tp) => {
            const abo = abos.find((a) => a.id === tp.aboId);
            if (!abo) return;
            const tpSlots = overview_getTpSlots(tp, abo);
            const players = overview_getSortedPlayers(tp, D);
            const n = players.length;
            const slotCount = tpSlots.length || 1;
            const z = Math.ceil(n / slotCount);
            if (z > maxZeilen) maxZeilen = z;
        });

        // Matrix wie in overview_renderSection
        const matrix = {};
        slots.forEach((slot) => {
            matrix[slot] = {};
            tage.forEach((tag) => (matrix[slot][tag] = null));
        });

        // Trainingspläne in Matrix eintragen (wie bisher)
        tps.forEach((tp) => {
            const abo = abos.find((a) => a.id === tp.aboId);
            if (!abo) return;

            const tpSlots = overview_getTpSlots(tp, abo);
            const playersBase = overview_getSortedPlayers(tp, D);

            // Spieler erweitern (wie in Overview)
            const enriched = playersBase.map((sp) => ({
                id: sp.id,
                name: sp.name + overview_getSpielerJahresLabel(sp, tp),
                kosten: overview_kostenProSpielerTP(tp, sp),
            }));

            const slotCount = tpSlots.length || 1;
            const chunks = overview_distributePlayers(
                enriched,
                slotCount,
                maxZeilen,
            );

            tpSlots.forEach((slot, idx) => {
                const tag = abo.wochentag;
                if (!tage.includes(tag)) return;

                matrix[slot][tag] = {
                    tp,
                    players: chunks[idx] || [],
                    isStart: idx === 0,
                    isEnd: idx === slotCount - 1,
                    blockIndex: idx,
                };
            });
        });

        // --------------------------------------------------------
        // Ab hier: Sheet-Aufbau + Styling (DEIN bisheriger Code, 1:1)
        // --------------------------------------------------------

        // 1) AOA-Matrix bauen
        const aoa = [];

        // Header Zeile 0
        const headerRow1 = ["Zeit"];
        tage.forEach((tag) => {
            headerRow1.push(tag, "");
        });
        aoa.push(headerRow1);

        // Header Zeile 1
        const headerRow2 = [""];
        tage.forEach(() => headerRow2.push("Spieler", "Kosten"));
        aoa.push(headerRow2);

        // Datenzeilen pro Slot * maxZeilen
        slots.forEach((slot) => {
            for (let r = 0; r < maxZeilen; r++) {
                const row = [];
                if (r === 0) row.push(util_formatTimeDE(slot));
                else row.push("");

                tage.forEach((tag) => {
                    const cell = matrix[slot][tag];
                    if (!cell) {
                        row.push("", "");
                        return;
                    }

                    const p = cell.players[r] || null;
                    if (!p) {
                        row.push("", "");
                        return;
                    }

                    row.push(p.name || "");
                    row.push(util_formatCurrencyDE(p.kosten || 0));
                });

                aoa.push(row);
            }
        });

        const ws = XLSX.utils.aoa_to_sheet(aoa);

        // --------------------------------------------------------
        // 2) Hilfsfunktion: Zelle sicherstellen
        // --------------------------------------------------------
        function ensureCell(r, c) {
            const ref = XLSX.utils.encode_cell({ r, c });
            if (!ws[ref]) ws[ref] = { t: "s", v: "" };
            return ws[ref];
        }

        // --------------------------------------------------------
        // 3) Farben/Styles (wie bisher)
        // --------------------------------------------------------
        const COLOR_HEAD_TOP = "D9D9D9";
        const COLOR_HEAD_SUB = "EDEDED";
        const COLOR_TIME_COL = "EDEDED";
        const COLOR_BLOCK_BG = "F2F2F2";

        const BORDER_THIN = { style: "thin", color: { rgb: "BFBFBF" } };

        // Spaltenbreiten (wie bisher)
        const colWidths = [{ wch: 8 }];
        tage.forEach(() => {
            colWidths.push({ wch: 22 }, { wch: 12 });
        });
        ws["!cols"] = colWidths;

        // --------------------------------------------------------
        // 4) Merges (wie bisher)
        // --------------------------------------------------------
        ws["!merges"] = ws["!merges"] || [];

        // Header Tag-Merges (Zeile 0)
        let c = 1;
        tage.forEach(() => {
            ws["!merges"].push({ s: { r: 0, c }, e: { r: 0, c: c + 1 } });
            c += 2;
        });

        // Zeitspalte pro Slot vertikal mergen (ab Zeile 2)
        let baseRow = 2;
        slots.forEach(() => {
            if (maxZeilen > 1) {
                ws["!merges"].push({
                    s: { r: baseRow, c: 0 },
                    e: { r: baseRow + maxZeilen - 1, c: 0 },
                });
            }
            baseRow += maxZeilen;
        });

        // --------------------------------------------------------
        // 5) Header stylen (wie bisher)
        // --------------------------------------------------------
        // A1 Kopfzelle
        const a1 = ensureCell(0, 0);
        a1.s = {
            fill: { fgColor: { rgb: COLOR_HEAD_TOP } },
            font: { bold: true },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
                top: BORDER_THIN,
                left: BORDER_THIN,
                right: BORDER_THIN,
                bottom: BORDER_THIN,
            },
        };

        // Header Zeile 0 (Tage)
        let col = 1;
        tage.forEach(() => {
            const colName = col;
            const colCost = col + 1;

            const c0 = ensureCell(0, colName);
            const c0b = ensureCell(0, colCost);
            c0.s = c0b.s = {
                fill: { fgColor: { rgb: COLOR_HEAD_TOP } },
                font: { bold: true },
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: BORDER_THIN,
                    left: BORDER_THIN,
                    right: BORDER_THIN,
                    bottom: BORDER_THIN,
                },
            };

            col += 2;
        });

        // Header Zeile 1 (Spieler/Kosten)
        col = 1;
        tage.forEach(() => {
            const colName = col;
            const colCost = col + 1;

            const c1 = ensureCell(1, colName);
            const c1b = ensureCell(1, colCost);
            c1.s = c1b.s = {
                fill: { fgColor: { rgb: COLOR_HEAD_SUB } },
                font: { bold: true },
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: BORDER_THIN,
                    left: BORDER_THIN,
                    right: BORDER_THIN,
                    bottom: BORDER_THIN,
                },
            };

            col += 2;
        });

        // --------------------------------------------------------
        // 6) Zeitspalte stylen (wie bisher)
        // --------------------------------------------------------
        const rowCount = aoa.length;
        const colCount = 1 + tage.length * 2;

        baseRow = 2;
        slots.forEach((slot) => {
            const startRow = baseRow;
            const endRow = baseRow + maxZeilen - 1;

            for (let r = startRow; r <= endRow; r++) {
                const cell = ensureCell(r, 0);
                cell.s = {
                    fill: { fgColor: { rgb: COLOR_TIME_COL } },
                    font: { bold: r === startRow },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                        top: BORDER_THIN,
                        left: BORDER_THIN,
                        right: BORDER_THIN,
                        bottom: BORDER_THIN,
                    },
                };
            }

            baseRow += maxZeilen;
        });

        // --------------------------------------------------------
        // 7) Trainingsblöcke grau + Rahmen (wie bisher)
        // --------------------------------------------------------
        // Wir laufen über alle Slot/Tag-Zellen und setzen Hintergrund/Borders
        baseRow = 2;
        slots.forEach((slot) => {
            for (let rInSlot = 0; rInSlot < maxZeilen; rInSlot++) {
                const r = baseRow + rInSlot;

                tage.forEach((tag, tIdx) => {
                    const colName = 1 + tIdx * 2;
                    const colCost = colName + 1;

                    const cell = matrix[slot][tag];
                    if (!cell) return;

                    // Spielerzelle
                    const cN = ensureCell(r, colName);
                    cN.s = cN.s || {};
                    cN.s.fill = { fgColor: { rgb: COLOR_BLOCK_BG } };
                    cN.s.border = cN.s.border || {};
                    cN.s.border.left = BORDER_THIN;
                    cN.s.border.right = BORDER_THIN;

                    // Kostenzelle
                    const cC = ensureCell(r, colCost);
                    cC.s = cC.s || {};
                    cC.s.fill = { fgColor: { rgb: COLOR_BLOCK_BG } };
                    cC.s.border = cC.s.border || {};
                    cC.s.border.left = BORDER_THIN;
                    cC.s.border.right = BORDER_THIN;

                    // Rahmen oben/unten für Block (wie in deiner Overview-Logik)
                    if (cell.isStart && rInSlot === 0) {
                        cN.s.border.top = BORDER_THIN;
                        cC.s.border.top = BORDER_THIN;
                    }
                    if (cell.isEnd && rInSlot === maxZeilen - 1) {
                        cN.s.border.bottom = BORDER_THIN;
                        cC.s.border.bottom = BORDER_THIN;
                    }
                });
            }

            baseRow += maxZeilen;
        });

        // --------------------------------------------------------
        // 8) Außenrahmen/Rest-Borders (wie bisher)
        // --------------------------------------------------------
        for (let r = 0; r < rowCount; r++) {
            for (let c = 0; c < colCount; c++) {
                const cell = ensureCell(r, c);
                if (!cell.s) cell.s = {};
                if (!cell.s.border) cell.s.border = {};

                // Links außen
                if (c === 0) {
                    if (!cell.s.border.left) cell.s.border.left = BORDER_THIN;
                }
                // Rechts außen
                if (c === colCount - 1) {
                    if (!cell.s.border.right) cell.s.border.right = BORDER_THIN;
                }
                // Oben außen
                if (r === 0) {
                    if (!cell.s.border.top) cell.s.border.top = BORDER_THIN;
                }
                // Unten außen
                if (r === rowCount - 1) {
                    if (!cell.s.border.bottom)
                        cell.s.border.bottom = BORDER_THIN;
                }
            }
        }

        // --------------------------------------------------------
        // 9) Sheet anhängen (NEU: Name pro Platz)
        // --------------------------------------------------------
        // Excel Limits: 31 Zeichen, keine Sonderzeichen : \ / ? * [ ]
        // Wir halten den Namen so nah wie möglich an deiner Vorgabe.
        let safeName = String(sheetName || "Platz");
        safeName = safeName.replace(/[:\\\/\?\*\[\]]/g, "-");
        if (safeName.length > 31) safeName = safeName.substring(0, 31);

        // Einzigartig machen, falls doppelt
        let finalName = safeName;
        let n = 2;
        while (wb.Sheets && wb.Sheets[finalName]) {
            const suffix = ` (${n++})`;
            finalName = safeName.substring(0, 31 - suffix.length) + suffix;
        }

        XLSX.utils.book_append_sheet(wb, ws, finalName);
    }

    // --------------------------------------------------------
    // 5) Pro Platz ein Sheet erzeugen (NEU)
    // --------------------------------------------------------
    platzIds.forEach((pid) => {
        const subset = mapByPlatzId.get(pid) || [];
        if (subset.length === 0) return;

        // Sheet-Name: "Platz 1 (Hallenplatz)"
        const sheetName = plaetze_getLabelWithArt(pid) || "Platz";
        exportOneSheet(subset, sheetName);
    });

    // --------------------------------------------------------
    // 6) Speichern (wie bisher)
    // --------------------------------------------------------
    const filename =
        exportCtx && exportCtx.filename
            ? exportCtx.filename
            : (() => {
                  const ts = export_createTimestamp();
                  const art = D.settings?.art ?? "plan";
                  const periodenStr = D.settings?.jahre?.join("-") ?? "jahre";
                  return `${art}_${periodenStr}_${ts}_Trainingsplan.xlsx`;
              })();

    XLSX.writeFile(wb, filename);
    return true;
}

function export_trainingsplanXlsx(exportCtx = null) {
    // --------------------------------------------------------
    // Multi-Sheet Export: pro Platz ein Sheet (minimal: nur Split davor)
    // --------------------------------------------------------
    const tpsAll = D.trainingsplan || [];
    const abos = D.abos || [];
    const plaetze = D.plaetze || [];

    // Zentraler Export: wenn keine Trainingspläne vorhanden sind, still abbrechen
    if (
        exportCtx &&
        exportCtx.silent &&
        (!Array.isArray(tpsAll) || tpsAll.length === 0)
    ) {
        return false;
    }
    if (!Array.isArray(tpsAll) || tpsAll.length === 0) {
        if (!(exportCtx && exportCtx.silent)) {
            alert("Keine Trainingspläne vorhanden.");
        }
        return false;
    }

    // Workbook einmal anlegen
    const wb = XLSX.utils.book_new();

    // Trainingspläne nach platzId gruppieren (platzId kommt aus dem Abo)
    const mapByPlatzId = new Map(); // platzId -> tps[]
    tpsAll.forEach((tp) => {
        const abo = abos.find((a) => a.id === tp.aboId);
        if (!abo || !abo.platzId) return;
        const pid = abo.platzId;
        if (!mapByPlatzId.has(pid)) mapByPlatzId.set(pid, []);
        mapByPlatzId.get(pid).push(tp);
    });

    if (mapByPlatzId.size === 0) {
        if (!(exportCtx && exportCtx.silent)) {
            alert(
                "Keine exportierbaren Trainingspläne vorhanden (Platz fehlt).",
            );
        }
        return false;
    }

    // Reihenfolge: Platzliste (wie UI), danach evtl. unbekannte/alte Plätze
    const platzIds = [];
    (plaetze || []).forEach((p) => {
        if (mapByPlatzId.has(p.id)) platzIds.push(p.id);
    });
    mapByPlatzId.forEach((_, pid) => {
        if (!platzIds.includes(pid)) platzIds.push(pid);
    });

    // Helper: 1:1 dein bisheriger Export, nur mit tps-Subset -> liefert Worksheet zurück
    function exportOneSheet(tpsSubset) {
        // --------------------------------------------------------
        // 1) Grunddaten wie in overview_renderSection
        // --------------------------------------------------------
        const tps = tpsSubset || [];
        const abos = D.abos || [];
        const tage = [
            "Montag",
            "Dienstag",
            "Mittwoch",
            "Donnerstag",
            "Freitag",
        ];
        //const tage = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

        // Zentraler Export: wenn keine Trainingspläne vorhanden sind, still abbrechen
        if (
            exportCtx &&
            exportCtx.silent &&
            (!Array.isArray(tps) || tps.length === 0)
        ) {
            return false;
        }

        // früheste / späteste Zeit bestimmen
        let earliest = Infinity;
        let latest = -Infinity;

        tps.forEach((tp) => {
            const abo = abos.find((a) => a.id === tp.aboId);
            if (!abo) return;
            const s = overview_timeToMin(tp.vonZeit || abo.startzeit);
            const e = overview_timeToMin(tp.bisZeit || abo.endzeit);
            if (!isNaN(s) && s < earliest) earliest = s;
            if (!isNaN(e) && e > latest) latest = e;
        });

        if (!isFinite(earliest) || !isFinite(latest)) {
            if (!(exportCtx && exportCtx.silent)) {
                alert("Fehlerhafte Zeitdaten.");
            }
            return false;
        }

        const slots = overview_slotsBetween(earliest, latest); // z.B. 15:00, 15:30, ...

        // maximale Zeilenzahl pro Slot (wie in overview_renderSection)
        let maxZeilen = 1;
        tps.forEach((tp) => {
            const abo = abos.find((a) => a.id === tp.aboId);
            if (!abo) return;
            const tpSlots = overview_getTpSlots(tp, abo);
            const players = overview_getSortedPlayers(tp, D);
            const n = players.length;
            const slotCount = tpSlots.length || 1;
            const z = Math.ceil(n / slotCount);
            if (z > maxZeilen) maxZeilen = z;
        });

        // Matrix wie in overview_renderSection
        const matrix = {};
        slots.forEach((slot) => {
            matrix[slot] = {};
            tage.forEach((tag) => (matrix[slot][tag] = null));
        });

        tps.forEach((tp) => {
            const abo = abos.find((a) => a.id === tp.aboId);
            if (!abo) return;
            const tag = abo.wochentag;
            if (!tage.includes(tag)) return;

            const slotList = overview_getTpSlots(tp, abo);
            const playersBase = overview_getSortedPlayers(tp, D);

            const enriched = playersBase.map((sp) => ({
                id: sp.id,
                name: sp.name + overview_getSpielerJahresLabel(sp, tp),
                kosten: overview_kostenProSpielerTP(tp, sp),
            }));

            const slotCount = slotList.length;
            const chunks = overview_distributePlayers(
                enriched,
                slotCount,
                maxZeilen,
            );

            slotList.forEach((slot, idx) => {
                matrix[slot][tag] = {
                    tp,
                    players: chunks[idx] || [],
                    isStart: idx === 0,
                    isEnd: idx === slotCount - 1,
                    blockIndex: idx,
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
        tage.forEach((tag) => head1.push(tag, ""));
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
            Array.from({ length: colCount }, () => null),
        );

        // Datenzeilen
        slots.forEach((slot, slotIdx) => {
            for (let r = 0; r < maxZeilen; r++) {
                const row = [];

                // Zeitspalte
                if (r === 0) {
                    row.push(overview_minToTime(slot));
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

                        const isTop = cell.isStart && r === 0;
                        const isBottom = cell.isEnd && r === maxZeilen - 1;

                        // Spieler
                        if (p) {
                            row.push(
                                p.name,
                                util_formatCurrencyDE(p.kosten || 0),
                            );
                        } else {
                            row.push("", "");
                        }

                        // merken: dies ist eine Blockzeile (auch wenn p leer ist!)
                        blockInfo[excelRowIndex][colName] = {
                            isBlock: true,
                            isTop,
                            isBottom,
                        };
                        blockInfo[excelRowIndex][colCost] = {
                            isBlock: true,
                            isTop,
                            isBottom,
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
            ws["!merges"].push({
                s: { r: 0, c: col },
                e: { r: 0, c: col + 1 },
            });
        });

        // --------------------------------------------------------
        // 7) Styles definieren
        // --------------------------------------------------------
        const COLOR_HEAD_TOP = "FFDEDEDE"; // Wochentag
        const COLOR_HEAD_SUB = "FFE9E9E9"; // Spieler/Kosten Kopf
        const COLOR_TIME_COL = "FFE9E9E9"; // Zeitspalte
        const COLOR_BLOCK_BG = "FFF4F4F4"; // Block-Hintergrund

        const BORDER_THICK = { style: "medium", color: { rgb: "FF999999" } }; // außen
        const BORDER_THIN = { style: "thin", color: { rgb: "FFCCCCCC" } }; // innen

        // Kopfzeilen stylen
        tage.forEach((tag, ti) => {
            const colName = 1 + ti * 2;
            const colCost = colName + 1;

            // Zeile 0: Wochentag
            const c0 = ensureCell(0, colName);
            const c0b = ensureCell(0, colCost);
            c0.s = c0b.s = {
                fill: { fgColor: { rgb: COLOR_HEAD_TOP } },
                font: { bold: true },
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: BORDER_THIN,
                    bottom: BORDER_THIN,
                    left: BORDER_THIN,
                    right: BORDER_THIN,
                },
            };

            // Zeile 1: Spieler/Kosten
            const c1 = ensureCell(1, colName);
            const c1b = ensureCell(1, colCost);
            c1.s = c1b.s = {
                fill: { fgColor: { rgb: COLOR_HEAD_SUB } },
                font: { bold: true },
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: BORDER_THIN,
                    bottom: BORDER_THIN,
                    left: BORDER_THIN,
                    right: BORDER_THIN,
                },
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
                top: BORDER_THIN,
                bottom: BORDER_THIN,
                left: BORDER_THIN,
                right: BORDER_THIN,
            },
        };

        //
        // Zeitspalte (Spalte A) stylen mit Blockrahmen wie HTML
        //
        for (let si = 0; si < slots.length; si++) {
            const baseRow = 2 + si * maxZeilen; // erste Zeile dieses Slots
            const endRow = baseRow + maxZeilen - 1; // letzte Zeile dieses Slots

            for (let r = baseRow; r <= endRow; r++) {
                const cell = ensureCell(r, 0);

                cell.s = {
                    fill: { fgColor: { rgb: COLOR_TIME_COL } },
                    font: { bold: r === baseRow }, // Uhrzeit fett nur in oberster Slot-Zeile
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                        left: BORDER_THIN,
                        right: BORDER_THIN,
                        top: r === baseRow ? BORDER_THIN : undefined,
                        bottom: r === endRow ? BORDER_THIN : undefined,
                    },
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
                cN.s.alignment = { horizontal: "left", vertical: "center" };

                // Kostenzelle
                const cC = ensureCell(r, colCost);
                cC.s = cC.s || {};
                cC.s.fill = { fgColor: { rgb: COLOR_BLOCK_BG } };
                cC.s.border = cC.s.border || {};
                cC.s.alignment = {
                    horizontal: "right",
                    vertical: "center",
                    indent: 1,
                };

                // Außen links/rechts immer dick
                cN.s.border.left = BORDER_THICK;
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
                    if (!cell.s.border.bottom)
                        cell.s.border.bottom = BORDER_THIN;
                }
            }
        }

        // --------------------------------------------------------
        // 10) Workbook erstellen und speichern (DEIN alter Code)
        // --------------------------------------------------------
        return ws;
    }

    // Pro Platz ein Sheet erzeugen
    platzIds.forEach((pid) => {
        const subset = mapByPlatzId.get(pid) || [];
        if (subset.length === 0) return;

        const sheetNameRaw = plaetze_getLabelWithArt(pid) || "Platz";
        // Excel Limits: 31 Zeichen, keine Sonderzeichen : \ / ? * [ ]
        let safeName = String(sheetNameRaw).replace(/[:\\\/\?\*\[\]]/g, "-");
        if (safeName.length > 31) safeName = safeName.substring(0, 31);

        // Einzigartig machen, falls doppelt
        let finalName = safeName;
        let n = 2;
        while (wb.Sheets && wb.Sheets[finalName]) {
            const suffix = ` (${n++})`;
            finalName = safeName.substring(0, 31 - suffix.length) + suffix;
        }

        const ws = exportOneSheet(subset);
        if (!ws) return;
        XLSX.utils.book_append_sheet(wb, ws, finalName);
    });

    const filename =
        exportCtx && exportCtx.filename
            ? exportCtx.filename
            : (() => {
                  const ts = export_createTimestamp();
                  const art = D.settings?.art ?? "plan";
                  const periodenStr = D.settings?.jahre?.join("-") ?? "jahre";
                  return `${art}_${periodenStr}_${ts}_Trainingsplan.xlsx`;
              })();

    XLSX.writeFile(wb, filename);
    return true;
}

function export_trainingsplanPdf() {
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
    const ts = export_createTimestamp();
    const art = D.settings?.art ?? "plan";
    const periodenStr = D.settings?.jahre?.join("-") ?? "jahre";
    const filename = `${art}_${periodenStr}_${ts}.pdf`;

    const opt = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
            scale: 3, // Hohe Auflösung für scharfen Text
            useCORS: true,
            // Hier wenden wir den berechneten Zoom an
            onclone: (clonedDoc) => {
                const el = clonedDoc.querySelector("#tp_table");
                el.style.transform = `scale(${zoomFactor})`;
                el.style.transformOrigin = "top left";

                // WICHTIG: Container verbreitern, damit rechts kein weißer Rand entsteht
                el.style.width = `${100 / zoomFactor}%`;

                // Optional: Höhe korrigieren, falls der Zoom sehr stark ist
                // el.style.height = `${100 / zoomFactor}%`;
            },
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    };

    html2pdf().set(opt).from(element).save();
}
