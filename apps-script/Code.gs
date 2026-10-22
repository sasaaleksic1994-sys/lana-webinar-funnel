/**
 * Lana Kern · Webinar-Anmeldung · Speicherung in Google Sheets (Ersatz/Ergänzung zu Close).
 * Einrichtung: script.google.com → Neues Projekt → Code einfügen → SHEET_ID setzen →
 * Bereitstellen → Web-App (Ausführen als: ich, Zugriff: jeder) → URL in config.js bei `endpoint` eintragen.
 *
 * Sonderfälle:
 *  - Doppelte Anmeldung: gleiche E-Mail = kein zweiter Lead, bestehende Zeile bekommt „Anmeldungen“ +1, Erstanmeldung bleibt.
 *  - Fehlende Felder: ohne Vorname oder gültige E-Mail wird nichts gespeichert, Fehler landet im Blatt „Fehler“.
 *  - Gleichzeitige Anfragen: LockService verhindert doppelte Zeilen.
 */
const SHEET_ID = '1fHbLLzHbSm6RrCJYFliE5sftNsaF3JWXYy8n6VyGlLM'; // ID aus der Tabellen-URL zwischen /d/ und /edit
const HEADERS = ['Anmeldedatum', 'Erstanmeldung', 'Anmeldungen', 'Vorname', 'E-Mail', 'Quelle', 'Kampagne', 'Ad', 'Webinar', 'Status'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const d = JSON.parse(e.postData.contents);
    const email = String(d.email || '').trim().toLowerCase();
    if (!d.vorname || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error('Pflichtfeld fehlt (Vorname oder E-Mail)');
    const sh = sheet_('Anmeldungen', HEADERS);
    const row = [d.anmeldedatum || new Date().toISOString(), '', 1, d.vorname, email, d.quelle || 'direkt',
      d.utm_campaign || '', d.utm_content || '', d.webinar || '', 'Angemeldet'];
    const last = sh.getLastRow();
    const emails = last > 1 ? sh.getRange(2, 5, last - 1, 1).getValues().map(r => String(r[0]).toLowerCase()) : [];
    const idx = emails.indexOf(email);
    if (idx > -1) {
      const r = idx + 2;
      const old = sh.getRange(r, 1, 1, HEADERS.length).getValues()[0];
      row[1] = old[1] || old[0];
      row[2] = Number(old[2] || 1) + 1;
      row[5] = old[5] || row[5]; // Erstquelle bleibt
      sh.getRange(r, 1, 1, HEADERS.length).setValues([row]);
    } else {
      row[1] = row[0];
      sh.appendRow(row);
    }
    return json_({ ok: true, duplicate: idx > -1 });
  } catch (err) {
    sheet_('Fehler', ['Zeitpunkt', 'Fehler', 'Rohdaten']).appendRow([new Date(), String(err), e && e.postData ? e.postData.contents : '']);
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function sheet_(name, headers) {
  const ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(headers); sh.setFrozenRows(1); }
  return sh;
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
