/**
 * ALTA 2026 — Inscriptions au concours
 * Backend Google Apps Script (lié à la Google Sheet des inscriptions).
 *
 * Déploiement : Déployer > Nouveau déploiement > Application Web
 *   - Exécuter en tant que : Moi
 *   - Qui a accès : Tout le monde
 */

var SHEET_NAME = 'Inscriptions';
var MAX_TEAMS = 10;

var HEADERS = [
  'N° inscription', 'Date', 'Statut',
  "Nom de l'équipe", 'Cause choisie', 'Idée / motivation',
  'Chef — Nom', 'Chef — Email', 'Chef — Téléphone', 'Chef — Établissement', 'Chef — Rôle',
  'Membre 2 — Nom', 'Membre 2 — Email', 'Membre 2 — Téléphone', 'Membre 2 — Établissement', 'Membre 2 — Rôle',
  'Membre 3 — Nom', 'Membre 3 — Email', 'Membre 3 — Téléphone', 'Membre 3 — Établissement', 'Membre 3 — Rôle'
];

var ROLES = [
  'Scénario & storytelling',
  'Tournage & prise de vue',
  'Montage & post-production',
  'Acteur / voix off',
  'Polyvalent'
];

var CAUSES = [
  'Enfance & orphelins',
  'Personnes âgées',
  'Malades & don de sang',
  'Personnes sans abri',
  'Environnement',
  'Autre'
];

/* ---------- Setup (à lancer une seule fois depuis l'éditeur) ---------- */
function setup() {
  var sheet = getSheet_();
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setValues([HEADERS])
    .setFontWeight('bold')
    .setBackground('#14150E')
    .setFontColor('#D2DC4A');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(6, 360);
  return 'OK';
}

/* ---------- GET : nombre d'équipes inscrites ---------- */
function doGet() {
  var sheet = getSheet_();
  var count = Math.max(0, sheet.getLastRow() - 1);
  return json_({ ok: true, count: count, max: MAX_TEAMS });
}

/* ---------- POST : nouvelle inscription ---------- */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json_({ ok: false, error: 'Serveur occupé, réessayez dans quelques secondes.' });
  }
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Anti-spam (champ caché)
    if (data.website) return json_({ ok: true, id: 'ALTA-000' });

    var err = validate_(data);
    if (err) return json_({ ok: false, error: err });

    var sheet = getSheet_();
    if (sheet.getLastRow() === 0) setup();

    // Doublons : nom d'équipe ou email déjà inscrit
    var last = sheet.getLastRow();
    if (last > 1) {
      var rows = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
      var teamLower = clean_(data.team).toLowerCase();
      var emails = data.members.map(function (m) { return clean_(m.email).toLowerCase(); });
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (String(r[3]).trim().toLowerCase() === teamLower) {
          return json_({ ok: false, error: "Ce nom d'équipe est déjà pris. Choisissez-en un autre." });
        }
        var existing = [r[7], r[12], r[17]].map(function (x) { return String(x).trim().toLowerCase(); });
        for (var j = 0; j < emails.length; j++) {
          if (existing.indexOf(emails[j]) !== -1) {
            return json_({ ok: false, error: "L'email " + emails[j] + ' est déjà inscrit dans une autre équipe.' });
          }
        }
      }
    }

    var n = Math.max(0, last - 1) + 1;
    var id = 'ALTA-' + ('00' + n).slice(-3);
    var status = n <= MAX_TEAMS ? 'En attente de validation' : "Liste d'attente";

    var row = [id, new Date(), status, clean_(data.team), clean_(data.cause), clean_(data.idea)];
    data.members.forEach(function (m) {
      row.push(clean_(m.name), clean_(m.email).toLowerCase(), "'" + clean_(m.phone), clean_(m.school), clean_(m.role));
    });
    sheet.appendRow(row);

    return json_({ ok: true, id: id, status: status });
  } catch (ex) {
    return json_({ ok: false, error: 'Erreur serveur : ' + ex.message });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Helpers ---------- */
function validate_(d) {
  if (!d || typeof d !== 'object') return 'Données invalides.';
  var team = clean_(d.team);
  if (team.length < 2 || team.length > 40) return "Le nom de l'équipe doit contenir entre 2 et 40 caractères.";
  var cause = clean_(d.cause);
  if (!cause) return 'Choisissez une cause.';
  var idea = clean_(d.idea);
  if (idea.length < 30 || idea.length > 800) return "Décrivez votre idée en 30 à 800 caractères.";
  if (!d.accept) return 'Vous devez accepter le règlement.';
  if (!Array.isArray(d.members) || d.members.length !== 3) return "L'équipe doit compter exactement 3 membres.";
  var seen = {};
  for (var i = 0; i < 3; i++) {
    var m = d.members[i] || {};
    var label = i === 0 ? "Chef d'équipe" : 'Membre ' + (i + 1);
    if (clean_(m.name).length < 3) return label + ' : nom complet requis.';
    var email = clean_(m.email).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return label + ' : email invalide.';
    if (seen[email]) return 'Chaque membre doit avoir un email différent.';
    seen[email] = true;
    var phone = clean_(m.phone).replace(/[\s.\-]/g, '');
    if (!/^(?:\+213|00213|0)[5-7]\d{8}$/.test(phone)) return label + ' : numéro de téléphone algérien invalide.';
    if (clean_(m.school).length < 2) return label + ' : établissement requis.';
    if (ROLES.indexOf(clean_(m.role)) === -1) return label + ' : rôle invalide.';
  }
  return null;
}

function clean_(v) {
  var s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  // Empêche l'injection de formules dans la Sheet
  if (/^[=+\-@]/.test(s) && !/^\+213/.test(s)) s = "'" + s;
  return s.slice(0, 1000);
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
