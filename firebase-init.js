// ===== firebase-init.js : couche de données Firebase (Firestore + Authentication) =====
// Chargé par chaque page avec <script type="module" src="firebase-init.js">.
// Il charge les données, puis lance app.js (qui utilise EEB.lire / EEB.ecrire).
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, getDoc, getDocs, onSnapshot, writeBatch, setDoc, waitForPendingWrites }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// ⬇⬇⬇ COLLEZ ICI VOTRE firebaseConfig (Console Firebase > Paramètres du projet > Vos applications)
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyALbaiUqglD4Eg9un6ogNnlM6RkJkbtcnw",

  authDomain: "eeb-ong.firebaseapp.com",

  projectId: "eeb-ong",

  storageBucket: "eeb-ong.firebasestorage.app",

  messagingSenderId: "249224669726",

  appId: "1:249224669726:web:2c2f27e8d3a6756e7cdc0f"
};

// Classement des clés utilisées par l'application
const COLLECTIONS = ["users","parents","groupes","suivis","presences","presencesBureau","engagements","documents","temoignages","messages","journalDep"];
const PRIVE = ["signatureDirecteur"];                // collection « prive » : réservée aux comptes connectés
const LOCAL = ["session","langue"];                  // propres à l'appareil (localStorage)
const ORDRE_INVERSE = ["journalDep"];                // plus récent d'abord
const PAGES_TEMPS_REEL = ["suivi","formateur","tuteur","presence","deploiement","parents","liste","documents","temoignages"];
const MAX_DOC = 900000;                              // Firestore : 1 Mo maximum par document

const app = initializeApp(FIREBASE_CONFIG);
const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
const auth = getAuth(app);

const erreurUI = m => (window.afficherErreur ? window.afficherErreur(m) : console.error(m));
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === "object" && !Array.isArray(x)
  ? Object.keys(x).sort().reduce((a, c) => (a[c] = x[c], a), {}) : x);
const copie = v => v === undefined ? v : JSON.parse(JSON.stringify(v));
const genId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
let compteurN = 0; const nouveauN = () => Date.now() * 1000 + (compteurN++ % 1000);

const CACHE = {};            // valeurs lues par l'application
const SNAP = {};             // collections : Map(id -> {json, obj}) = dernier état connu de Firestore
let adminExisteFlag = false, pret = false, desabonner = [];

const reconstruire = k => {
  const l = [...SNAP[k].values()].map(x => x.obj).sort((a, b) => (a._n || 0) - (b._n || 0));
  CACHE[k] = ORDRE_INVERSE.includes(k) ? l.reverse() : l;
};
const remplir = (k, snap) => {
  SNAP[k] = new Map();
  snap.forEach(d => SNAP[k].set(d.id, { json: canon(d.data()), obj: { ...d.data(), _id: d.id } }));
  reconstruire(k);
};

// ---- Temps réel : une autre personne modifie une donnée -> la page affichée se met à jour ----
let minuteur = null;
const rafraichir = () => {
  const p = document.body.dataset.page;
  if (!PAGES_TEMPS_REEL.includes(p)) return;
  clearTimeout(minuteur);
  minuteur = setTimeout(() => {
    const a = document.activeElement;
    const saisie = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
    const rempli = [...document.querySelectorAll("textarea,input:not([type=date]):not([type=time]):not([type=checkbox]):not([type=file]):not([type=hidden])")].some(e => e.value);
    if (!saisie && !rempli) location.reload();
  }, 500);
};
const ecoute = k => snap => {
  let change = false; const m = SNAP[k];
  snap.docChanges().forEach(c => {
    const id = c.doc.id;
    if (c.type === "removed") { if (m.delete(id)) change = true; return; }
    const j = canon(c.doc.data()), ex = m.get(id);
    if (!ex || ex.json !== j) { m.set(id, { json: j, obj: { ...c.doc.data(), _id: id } }); change = true; }
  });
  if (change) { reconstruire(k); if (pret) rafraichir(); }
};

async function chargerPublic() {
  try { adminExisteFlag = (await getDoc(doc(db, "meta", "admin"))).exists(); } catch (e) {}
  try { (await getDocs(collection(db, "config"))).forEach(d => CACHE[d.id] = d.data().valeur); } catch (e) {}
}
async function chargerDonnees() {
  desabonner.forEach(f => f()); desabonner = [];
  await Promise.all(COLLECTIONS.map(async k => {
    try { remplir(k, await getDocs(collection(db, k))); }
    catch (e) { SNAP[k] = new Map(); CACHE[k] = []; return; }          // pas le droit de lire : liste vide
    desabonner.push(onSnapshot(collection(db, k), ecoute(k), () => {}));
  }));
  if (auth.currentUser) {
    try { (await getDocs(collection(db, "prive"))).forEach(d => CACHE[d.id] = d.data().valeur); } catch (e) {}
  }
}
const majSession = () => {
  const u = auth.currentUser;
  if (u && u.email) localStorage.setItem("session", JSON.stringify(u.email.toLowerCase()));
  else localStorage.removeItem("session");
};

// ---- lire / ecrire : mêmes noms et mêmes règles que l'ancien localStorage ----
const lire = (cle, defaut) => {
  try {
    if (LOCAL.includes(cle)) return JSON.parse(localStorage.getItem(cle) || "null") ?? defaut;
    const v = CACHE[cle] === undefined ? undefined : copie(CACHE[cle]);
    if (v === undefined || v === null) return defaut;
    if (Array.isArray(defaut) && !Array.isArray(v)) return defaut;
    return v;
  } catch (e) { return defaut; }
};
const ecrire = (cle, val) => {
  try {
    if (LOCAL.includes(cle)) { localStorage.setItem(cle, JSON.stringify(val)); return true; }
    if (COLLECTIONS.includes(cle)) return ecrireCollection(cle, val);
    const col = PRIVE.includes(cle) ? "prive" : "config";
    if (canon(val).length > MAX_DOC) { erreurUI("Donnée trop volumineuse pour Firebase (1 Mo maximum) : utilisez une image plus petite ou un lien."); return false; }
    CACHE[cle] = copie(val);
    setDoc(doc(db, col, cle), { valeur: val ?? "" }).catch(e => erreurUI("Firebase : " + e.message));
    return true;
  } catch (e) { erreurUI("Erreur d'enregistrement : " + e.message); return false; }
};
function ecrireCollection(k, liste) {
  if (!Array.isArray(liste)) return false;
  if (!SNAP[k]) SNAP[k] = new Map();
  const vus = new Set(), ops = [];
  for (const it of liste) {
    if (!it._id) it._id = genId();                         // identifiant donné aussi à l'objet de l'appelant
    if (it._n === undefined) it._n = nouveauN();
    vus.add(it._id);
    const { _id, ...data } = it, j = canon(data), ex = SNAP[k].get(_id);
    if (ex && ex.json === j) continue;
    if (j.length > MAX_DOC) { erreurUI("Un élément dépasse 1 Mo (image ou fichier trop gros) : utilisez une image plus petite ou un lien."); return false; }
    ops.push({ type: "set", id: _id, data: JSON.parse(j), json: j, obj: copie(it) });
  }
  for (const id of SNAP[k].keys()) if (!vus.has(id)) ops.push({ type: "delete", id });
  for (const o of ops) {                                   // cache à jour tout de suite
    if (o.type === "set") SNAP[k].set(o.id, { json: o.json, obj: o.obj }); else SNAP[k].delete(o.id);
  }
  reconstruire(k);
  for (let i = 0; i < ops.length; i += 400) {
    const b = writeBatch(db);
    ops.slice(i, i + 400).forEach(o => o.type === "set" ? b.set(doc(db, k, o.id), o.data) : b.delete(doc(db, k, o.id)));
    b.commit().catch(e => erreurUI("Firebase : " + (e.code === "permission-denied" ? "action non autorisée pour ce compte." : e.message)));
  }
  return true;
}

// ---- Comptes (Firebase Authentication) ----
let appSec = null;
const getSec = () => appSec || (appSec = initializeApp(FIREBASE_CONFIG, "secondaire"));

const MESSAGES = {
  "auth/invalid-credential": "Email ou mot de passe incorrect.", "auth/wrong-password": "Email ou mot de passe incorrect.",
  "auth/user-not-found": "Email ou mot de passe incorrect.", "auth/invalid-email": "Adresse mail invalide.",
  "auth/email-already-in-use": "Cet email existe déjà.", "auth/weak-password": "Mot de passe : 6 caractères minimum.",
  "auth/too-many-requests": "Trop d'essais : réessayez dans quelques minutes.", "auth/network-request-failed": "Pas de connexion internet.",
  "eeb/autorisation": "Autorisation refusée : e-mail ou mot de passe administrateur incorrect.",
  "permission-denied": "Action non autorisée pour ce compte."
};
const messageErreur = e => MESSAGES[e && e.code] || ("Erreur : " + ((e && e.message) || e));

async function connecter(email, mdp) {
  await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), mdp);
  majSession(); await chargerDonnees();
}
async function deconnecter() { desabonner.forEach(f => f()); desabonner = []; await signOut(auth); majSession(); }

// Inscription. « autor » = {email, mdp} d'un administrateur, exigé pour créer un administrateur quand il en existe déjà un.
async function inscrire(profil, mdp, autor) {
  let dbEcriture = db, authSec = null;
  const email = profil.email.trim().toLowerCase();
  try {
    if (autor) {
      authSec = getAuth(getSec());
      const c = await signInWithEmailAndPassword(authSec, autor.email.trim().toLowerCase(), autor.mdp).catch(() => { throw { code: "eeb/autorisation" }; });
      dbEcriture = getFirestore(getSec());
      const u = await getDoc(doc(dbEcriture, "users", c.user.uid));
      const d = u.exists() ? u.data() : {};
      if (d.statut !== "administrateur" && d.statut2 !== "administrateur") throw { code: "eeb/autorisation" };
    }
    const cred = await createUserWithEmailAndPassword(auth, email, mdp);
    const b = writeBatch(dbEcriture);
    b.set(doc(dbEcriture, "users", cred.user.uid), { ...profil, email, _n: nouveauN() });
    if (profil.statut === "administrateur" && !autor) b.set(doc(dbEcriture, "meta", "admin"), { uid: cred.user.uid, date: Date.now() });
    await b.commit();
    majSession(); await chargerDonnees();
  } finally { if (authSec) await signOut(authSec).catch(() => {}); }
}
// Création d'un compte par l'administrateur connecté (modérateur) sans le déconnecter
async function creerCompteAdmin(profil, mdp) {
  const authSec = getAuth(getSec());
  const email = profil.email.trim().toLowerCase();
  try {
    const cred = await createUserWithEmailAndPassword(authSec, email, mdp);
    const data = { ...profil, email, _n: nouveauN() };
    await setDoc(doc(db, "users", cred.user.uid), data);
    const d = data;
    SNAP.users.set(cred.user.uid, { json: canon(d), obj: { ...d, _id: cred.user.uid } }); reconstruire("users");
  } finally { await signOut(authSec).catch(() => {}); }
}
async function verifierMdp(mdp) {
  const u = auth.currentUser; if (!u) return false;
  try { await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, mdp)); return true; }
  catch (e) { return false; }
}
async function changerMdp(ancien, nouveau) {
  const u = auth.currentUser;
  await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, ancien));
  await updatePassword(u, nouveau);
}

window.EEB = { lire, ecrire, connecter, deconnecter, inscrire, creerCompteAdmin, verifierMdp, changerMdp, messageErreur,
  adminExiste: () => adminExisteFlag, vider: () => waitForPendingWrites(db).catch(() => {}), db, auth };

// ---- Démarrage : session, données, puis app.js ----
(async () => {
  if (FIREBASE_CONFIG.apiKey === "COLLER_ICI") {
    document.body.insertAdjacentHTML("afterbegin", '<p style="background:#c00;color:#fff;padding:10px;margin:0;position:relative;z-index:99">Firebase n\'est pas configuré : ouvrez firebase-init.js et collez votre firebaseConfig.</p>');
  }
  try {
    await new Promise(r => { const off = onAuthStateChanged(auth, () => { off(); r(); }); });
    majSession();
    await chargerPublic();
    await chargerDonnees();
  } catch (e) { console.error(e); }
  pret = true;
  const s = document.createElement("script"); s.src = "app.js"; document.body.appendChild(s);
})();

// ---- Application installable (PWA) ----
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(e => console.warn("sw.js :", e)));
}
(() => {
  if (matchMedia("(display-mode: standalone)").matches || navigator.standalone) return;     // déjà installée
  if (localStorage.getItem("installMasque")) return;
  const bouton = (texte, action) => {
    const b = document.createElement("div");
    b.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;z-index:98;background:#1e5aa8;color:#fff;padding:12px 14px;border-radius:12px;font:13px Poppins,Arial,sans-serif;display:flex;gap:10px;align-items:center;box-shadow:0 4px 12px rgba(0,0,0,.3)";
    b.className = "noprint";
    b.innerHTML = '<span style="flex:1">' + texte + '</span>' + (action ? '<button style="background:#f28c28;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer">Installer</button>' : "") +
      '<button aria-label="Fermer" style="background:none;color:#fff;border:none;font-size:18px;cursor:pointer">✕</button>';
    const [b1, b2] = b.querySelectorAll("button");
    (b2 || b1).onclick = () => { localStorage.setItem("installMasque", "1"); b.remove(); };
    if (b2) b1.onclick = action;
    document.body.appendChild(b); return b;
  };
  let evt = null;
  window.addEventListener("beforeinstallprompt", e => {            // Android / Chrome
    e.preventDefault(); evt = e;
    const b = bouton("Installer EEB-ONG sur votre téléphone", async () => { b.remove(); evt.prompt(); await evt.userChoice; evt = null; });
  });
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  if (ios) window.addEventListener("load", () => setTimeout(() =>
    bouton("Pour installer : touchez <b>Partager</b> (carré avec flèche) puis <b>Sur l’écran d’accueil</b>.", null), 1500));
})();
