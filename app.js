// ===== app.js : code commun à toutes les pages =====
// Les images du navbar se changent ici (emoji ou chemin d'image).
const ICONES = {
  accueil:   '<img src="img/home.png" width="22" height="22" alt="">',
  eeb:       '<img src="img/admin.png" width="22" height="22" alt="">',
  formation: '<img src="img/categorie.png" width="22" height="22" alt="">',
  suivi:     '<img src="img/suivi.png" width="22" height="22" alt="">',
  profil:    '<img src="img/User2.png" width="22" height="22" alt="">'
};

// ---- Stockage (Firebase : Firestore + Authentication) ----
const $ = id => document.getElementById(id);

// Bandeau rouge en bas de l'écran : affiche les erreurs au lieu de bloquer la page en silence
function afficherErreur(msg) {
  let b = $("bandeau-erreur");
  if (!b) { b = document.createElement("div"); b.id = "bandeau-erreur";
    b.style.cssText = "position:fixed;bottom:0;left:0;right:0;background:#c00;color:#fff;padding:8px;z-index:99;font-size:12px";
    document.body.appendChild(b); }
  b.textContent = msg;
}
window.addEventListener("error", e => afficherErreur("Erreur JavaScript : " + e.message + " (ligne " + e.lineno + ")"));

// Lecture / écriture : branchées sur Firebase par firebase-init.js (EEB.lire / EEB.ecrire)
const lire = (cle, defaut) => EEB.lire(cle, defaut);
const ecrire = (cle, val) => EEB.ecrire(cle, val);

// Image choisie -> réduite (max px) avant d'être enregistrée, pour ne pas saturer la mémoire
const lireImage = (input, suite, max = 400) => {
  const f = input.files[0]; if (!f) return suite("");
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement("canvas");
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      suite(c.toDataURL(f.type === "image/png" ? "image/png" : "image/jpeg", 0.85));
    };
    im.onerror = () => suite(r.result);
    im.src = r.result;
  };
  r.readAsDataURL(f);
};

const LISTES_DEFAUT = {metiers:["Couture","Menuiserie","Coiffure"],
  centres:["Centre A","Centre B"], entreprises:["Entreprise 1","Entreprise 2"]};
const listes = nom => lire(nom, LISTES_DEFAUT[nom]);
// ---- Comptes : administrateur, modérateur, deuxième statut ----
const statutsDe = u => [u && u.statut, u && u.statut2].filter(Boolean);   // un compte peut avoir 2 statuts
const aStatut = (u, s) => statutsDe(u).includes(s);
const utilisateurCourant = () => { const e = lire("session", null); return e ? (lire("users", []).find(u => u.email === e) || null) : null; };
const estAdminUser = u => aStatut(u, "administrateur");
const estAdmin = () => estAdminUser(utilisateurCourant());
const echapper = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

// ---- Accès aux pages ----
// L'administrateur voit toutes les pages. Les membres EEB-ONG voient tout sauf la page Administrateur.
// Pages à accès restreint : statuts autorisés (en plus de l'administrateur). Les autres pages restent ouvertes comme avant.
const ACCES = {engagement:["EEB-ONG"], presence:["EEB-ONG"], formateur:["EEB-ONG","formateur"], tuteur:["EEB-ONG","tuteur"]};
const LIBELLE_ACCES = {engagement:"à l'administrateur et aux membres de EEB-ONG", presence:"à l'administrateur et aux membres de EEB-ONG",
  formateur:"aux formateurs, à l'administrateur et aux membres de EEB-ONG", tuteur:"aux tuteurs d'entreprise, à l'administrateur et aux membres de EEB-ONG"};
const peutVoir = (p, u = utilisateurCourant()) => !ACCES[p] || (!!u && (estAdminUser(u) || ACCES[p].some(s => aStatut(u, s))));

// Historique des modifications du déploiement (affiché sur la page Administrateur)
const journalDep = (action, groupe) => {
  const j = lire("journalDep", []);
  j.unshift({date:new Date().toLocaleString("fr-FR"), action, groupe});
  ecrire("journalDep", j.slice(0, 50));
};

// Flèches bien visibles : listes déroulantes (select) et menus de la navbar
const stFleches = document.createElement("style");
stFleches.textContent = `select:not([multiple]){-webkit-appearance:none;-moz-appearance:none;appearance:none;cursor:pointer;padding-right:38px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23f28c28' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'><path d='M5 9l7 7 7-7'/></svg>");
    background-repeat:no-repeat;background-position:right 12px center;background-size:16px}
  .fleche{display:inline-block;vertical-align:middle;margin-left:3px;color:var(--orange);transition:transform .2s}
  .item.ouvert .fleche{transform:rotate(180deg)}`;
document.head.appendChild(stFleches);

// ---- Logo sur toutes les pages ----
// Logo de taille moyenne en haut à droite (sauf sur index et connexion qui ont déjà leur logo)
if (!["index","connexion"].includes(document.body.dataset.page)) {
  const l = document.createElement("img"); l.className = "logo logo-moyen"; l.alt = "Logo EEB-ONG";
  document.body.appendChild(l);
}
document.querySelectorAll("img.logo").forEach(i => {
  i.src = lire("logo", "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='120'><text x='10' y='70' font-size='56' fill='%231e5aa8' font-weight='bold'>EEB-<tspan fill='%23f28c28'>ONG</tspan></text></svg>");
});

// ---- Image explicative de la page d'accueil (indépendante du logo, modifiable dans la page admin) ----
document.querySelectorAll("#imageAccueil, img.imageAccueil, img.image-accueil").forEach(img => {
  img.src = lire("imageAccueil", "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='120'><text x='10' y='70' font-size='56' fill='%231e5aa8' font-weight='bold'>EEB-<tspan fill='%23f28c28'>ONG</tspan></text></svg>");
});

// ---- Image explicative de la page À propos (indépendante du logo, modifiable dans la page admin) ----
document.querySelectorAll("#imageApropos").forEach(img => {
  img.src = lire("imageApropos", "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='120'><text x='10' y='70' font-size='56' fill='%231e5aa8' font-weight='bold'>EEB-<tspan fill='%23f28c28'>ONG</tspan></text></svg>");
});

// ---- Langue (français / anglais) ----
const TRAD = {en:{"Accueil":"Home","À propos":"About","Contact":"Contact","Nous contacter":"Contact us","EEB-ONG":"EEB-ONG","Admin":"Admin","Parents":"Parents","Engagement":"Commitment","Témoignages":"Testimonials",
  "Liste":"List","Formation":"Training","Documents":"Documents","Déploiement":"Deployment","Suivi":"Tracking","Formateur":"Trainer","Tuteur":"Tutor","Présence":"Attendance","Profil":"Profile",
  "Rechercher...":"Search...","Mon profil":"My profile","Langue":"Language","Modifier mes informations":"Edit my information",
  "Données de connexion":"Login details","Photo":"Photo","Se déconnecter":"Log out","Enregistrer":"Save","Nom":"Last name",
  "Prénom":"First name","Téléphone":"Phone","Adresse mail":"Email","Mot de passe actuel":"Current password",
  "Nouveau mot de passe (facultatif)":"New password (optional)","Statut":"Status","Métier":"Trade",
  "Centre de formation":"Training center","Entreprise":"Company","Informations enregistrées.":"Information saved.",
  "Mot de passe actuel incorrect.":"Current password is incorrect.","Cet email existe déjà.":"This email already exists.",
  "Données de connexion mises à jour.":"Login details updated.","Photo mise à jour.":"Photo updated."}};
const langue = () => lire("langue", "fr");
const t = txt => (TRAD[langue()] || {})[txt] || txt;
document.documentElement.lang = langue();

// ---- Navbar ----
function creerNavbar() {
  const nav = $("nav"); if (!nav) return;
  const FLECHE = '<svg class="fleche" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 9l7 7 7-7"/></svg>';
  const lien = (txt, url) => `<a href="${url}">${t(txt)}</a>`;
  const item = (cle, txt, url, sous = []) => `<div class="item" tabindex="0">
    <a href="${url}"><span>${ICONES[cle]}</span>${t(txt)}${sous.length ? FLECHE : ""}</a>
    ${sous.length ? `<div class="menu">${sous.map(s => lien(s[0], s[1])).join("")}</div>` : ""}</div>`;
  nav.innerHTML =
    item("accueil","Accueil","accueil.html",[["Accueil","accueil.html"],["À propos","apropos.html"],["Nous contacter","contact.html"]]) +
    item("eeb","EEB-ONG","liste.html",[...(estAdmin() ? [["Admin","admin.html"]] : []),["Liste","liste.html"],["Parents","parents.html"],...(peutVoir("engagement") ? [["Engagement","engagement.html"]] : []),...(peutVoir("presence") ? [["Présence","presence.html"]] : [])]) +
    item("formation","Formation","documents.html",[["Documents","documents.html"],["Déploiement","deploiement.html"]]) +
    item("suivi","Suivi","suivi.html",[["Témoignages","temoignages.html"],["Suivi","suivi.html"],...(peutVoir("formateur") ? [["Formateur","formateur.html"]] : []),...(peutVoir("tuteur") ? [["Tuteur","tuteur.html"]] : [])]) + item("profil","Profil","profil.html");

  // Page active : bouton de la navbar (et élément de sa liste) en orange
  const fichier = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  nav.querySelectorAll(".item").forEach(it => {
    const liens = [...it.querySelectorAll("a")].filter(a => (a.getAttribute("href") || "").toLowerCase() === fichier);
    if (liens.length) it.classList.add("actif");
    liens.forEach(a => { if (a.closest(".menu")) a.classList.add("actif"); });
  });

  // Les boutons qui ont une liste déroulante n'ouvrent plus leur page par défaut : un clic ouvre / ferme la liste
  const fermerMenus = () => nav.querySelectorAll(".item.ouvert").forEach(it => {
    it.classList.remove("ouvert"); it.querySelector(":scope > a").setAttribute("aria-expanded", "false"); });
  nav.querySelectorAll(".item").forEach(it => {
    const bouton = it.querySelector(":scope > a");
    if (!it.querySelector(".menu")) return;   // Profil : lien direct
    bouton.setAttribute("role", "button"); bouton.setAttribute("aria-haspopup", "true"); bouton.setAttribute("aria-expanded", "false");
    bouton.addEventListener("click", e => {
      e.preventDefault();
      const ouvrir = !it.classList.contains("ouvert");
      fermerMenus();                          // une seule liste ouverte à la fois
      if (ouvrir) { it.classList.add("ouvert"); bouton.setAttribute("aria-expanded", "true"); }
    });
  });
  document.addEventListener("click", e => { if (!e.target.closest("nav .item")) fermerMenus(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") fermerMenus(); });
}
creerNavbar();

// ---- Smartphone : navbar sur toute la largeur, logo sous la navbar à gauche (pages avec navbar) ----
if ($("nav")) {
  const st = document.createElement("style");
  st.textContent = `nav .item.actif>a{color:var(--orange)}
    nav .item.actif{border-bottom:3px solid var(--orange)}
    nav .menu a.actif{color:var(--orange);font-weight:bold}
    nav .item:not(.ouvert) .menu{display:none}
    nav .item.ouvert .menu{display:block}
    .menu{min-width:0;width:max-content}
    .menu a{padding:8px 14px}
    @media (max-width:768px){
    nav{width:100%;border-radius:0 0 14px 14px}
    .item{flex:1 1 0;min-width:0}
    .item:nth-last-child(-n+2) .menu{left:auto;right:0}
    body:has(nav) .logo-moyen{position:absolute;top:70px;left:12px;right:auto;width:70px;height:40px;object-fit:contain;object-position:left center}
  }`;
  document.head.appendChild(st);
  const mobile = window.matchMedia("(max-width:768px)");
  const ajuster = () => {   // place le logo juste sous la navbar et décale le contenu en conséquence
    const n = $("nav"), l = document.querySelector(".logo-moyen");
    if (mobile.matches) {
      if (l) l.style.top = (n.offsetHeight + 8) + "px";
      document.body.style.paddingTop = (n.offsetHeight + 62) + "px";
    } else { if (l) l.style.top = ""; document.body.style.paddingTop = ""; }
  };
  window.addEventListener("resize", ajuster); window.addEventListener("load", ajuster);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajuster);
  ajuster();
}

// ---- Pages ----
const pageDemandee = document.body.dataset.page;
const accesRefuse = !!ACCES[pageDemandee] && !peutVoir(pageDemandee);
if (accesRefuse) {   // page réservée : on remplace le contenu, aucun code de la page ne s'exécute
  const m = document.querySelector("main");
  if (m) m.innerHTML = '<h2>Accès réservé</h2><p class="erreur">Cette page est réservée ' + LIBELLE_ACCES[pageDemandee] + '.</p>' +
    (utilisateurCourant() ? "" : '<p><a href="connexion.html">Se connecter</a></p>');
}
const page = accesRefuse ? "acces-refuse" : pageDemandee;

function remplirSelect(id, nom, titre) {
  const s = $(id); if (!s) return;
  s.innerHTML = `<option value="">${titre}</option>` + listes(nom).map(v => `<option>${v}</option>`).join("");
}

if (page === "inscription") {
  remplirSelect("metier","metiers","Métier");
  remplirSelect("centre","centres","Centre de formation");
  remplirSelect("entreprise","entreprises","Entreprise");
  // Statut « administrateur » : 1er compte sans autorisation ; ensuite, l'autorisation d'un administrateur est exigée
  const adminExiste = () => EEB.adminExiste();
  const majBlocAdmin = () => {
    const admin = $("statut").value === "administrateur", autor = admin && adminExiste();
    $("blocAdmin").style.display = admin ? "grid" : "none";
    $("zoneAutor").style.display = autor ? "grid" : "none";
    $("emailAutor").required = $("mdpAutor").required = autor;
    $("noteAdmin").textContent = autor
      ? "Un administrateur existe déjà : l'e-mail et le mot de passe d'un administrateur sont nécessaires pour autoriser ce nouveau compte."
      : "Aucun administrateur n'existe encore : ce premier compte administrateur ne demande aucune autorisation.";
  };
  // Statut « EEB-ONG » (statut principal, ou deuxième statut d'un administrateur) : champ « Fonction »
  const majFonction = () => {
    const eeb = $("statut").value === "EEB-ONG" || ($("statut").value === "administrateur" && $("statut2").value === "EEB-ONG");
    $("fonction").style.display = eeb ? "" : "none";
    $("fonction").required = eeb;
    if (!eeb) $("fonction").value = "";
  };
  $("statut").onchange = () => { majBlocAdmin(); majFonction(); };
  $("statut2").onchange = majFonction;
  majBlocAdmin(); majFonction();
  // Bouton « Réinitialiser le mot de passe » : repris dans inscription.html s'il y est, sinon créé ici (évite l'erreur si l'ancienne page est encore en cache)
  let rb = $("resetMdp");
  if (!rb) { rb = document.createElement("button"); rb.type = "button"; rb.id = "resetMdp"; rb.textContent = "Réinitialiser le mot de passe"; rb.style.display = "none"; $("msg").after(rb); }
  $("formInscription").onsubmit = e => {
    e.preventDefault();
    const msg = $("msg"); msg.textContent = ""; msg.className = "erreur";
    const creeAdmin = $("statut").value === "administrateur";
    const autor = creeAdmin && adminExiste() ? {email:$("emailAutor").value.trim(), mdp:$("mdpAutor").value} : null;
    if ($("mdp").value.length < 6) { msg.textContent = "Mot de passe : 6 caractères minimum."; return; }
    lireImage($("photo"), async photo => {
      try {
        await EEB.inscrire({nom:$("nom").value, prenom:$("prenom").value, tel:$("tel").value,
          email:$("email").value, photo, metier:$("metier").value,
          centre:$("centre").value, entreprise:$("entreprise").value, statut:$("statut").value, statut2:creeAdmin ? $("statut2").value : "",
          fonction:$("fonction").value.trim(), derniereConnexion:Date.now()}, $("mdp").value, autor);
        await EEB.vider(); location.href = "accueil.html";
      } catch (err) { msg.textContent = EEB.messageErreur(err); rb.style.display = err && err.code === "eeb/compte-orphelin" ? "" : "none"; }
    }, 300);
  };
  rb.onclick = async () => {
    const msg = $("msg");
    try { await EEB.reinitialiserMdp($("email").value); msg.className = ""; msg.textContent = "E-mail envoyé : ouvrez le lien reçu pour choisir un nouveau mot de passe, puis revenez ici et créez votre compte avec ce mot de passe."; }
    catch (err) { msg.className = "erreur"; msg.textContent = EEB.messageErreur(err); }
  };
}

const UN_AN = 365 * 24 * 3600 * 1000; // un compte inactif plus d'un an est verrouillé
const chiffres = s => s.replace(/\D/g, "");
if (page === "connexion") {
  // Œil : afficher / masquer le mot de passe
  const oeil = $("voirMdp");
  if (oeil) {
    const OUVERT = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    const BARRE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.9 17.9A10.9 10.9 0 0 1 12 19C5 19 1 12 1 12a18.5 18.5 0 0 1 5.1-5.9M9.9 5.1A10 10 0 0 1 12 5c7 0 11 7 11 7a18.5 18.5 0 0 1-2.2 3.2M1 1l22 22"/><path d="M14.1 14.1A3 3 0 0 1 9.9 9.9"/></svg>';
    oeil.innerHTML = OUVERT;
    oeil.onclick = () => {
      const voir = $("mdp").type === "password";
      $("mdp").type = voir ? "text" : "password";
      oeil.innerHTML = voir ? BARRE : OUVERT;
      oeil.setAttribute("aria-label", voir ? "Masquer le mot de passe" : "Afficher le mot de passe");
    };
  }
  let code = null, compte = null, mdpTemp = "";
  // Connexion réussie : on note la date (pour mesurer l'inactivité) puis on entre
  const entrer = async email => {
    const us = lire("users", []); const u = us.find(x => x.email === email);
    if (u) { u.derniereConnexion = Date.now(); ecrire("users", us); }
    await EEB.vider(); location.href = "accueil.html";
  };
  $("formConnexion").onsubmit = async e => {
    e.preventDefault();
    const email = $("email").value.trim().toLowerCase(), mdp = $("mdp").value;
    try { await EEB.connecter(email, mdp); } catch (err) { $("msg").textContent = EEB.messageErreur(err); return; }
    const u = lire("users", []).find(x => x.email === email);
    if (!u) { await EEB.deconnecter(); $("msg").textContent = "Compte sans profil : contactez l'administrateur."; return; }
    if (Date.now() - (u.derniereConnexion || Date.now()) > UN_AN) {   // compte verrouillé
      compte = u; mdpTemp = mdp; await EEB.deconnecter();
      $("formConnexion").style.display = "none"; $("verif").style.display = "block"; return;
    }
    entrer(u.email);
  };
  $("envoyerCode").onclick = () => {
    if (chiffres($("telVerif").value) !== chiffres(compte.tel)) { $("msgVerif").textContent = "Numéro incorrect."; return; }
    code = String(Math.floor(100000 + Math.random() * 900000));
    // SIMULATION : un vrai site enverrait ce code par SMS (ex. Firebase Phone Auth, Twilio)
    alert("Code de vérification (simulation SMS) : " + code);
    $("msgVerif").textContent = "Code envoyé.";
  };
  $("validerCode").onclick = async () => {
    if (code && $("codeVerif").value.trim() === code) {
      try { await EEB.connecter(compte.email, mdpTemp); mdpTemp = ""; entrer(compte.email); }
      catch (err) { $("msgVerif").textContent = EEB.messageErreur(err); }
    }
    else $("msgVerif").textContent = "Code incorrect.";
  };
  const oubli = $("mdpOublie");
  if (oubli) oubli.onclick = async e => {
    e.preventDefault();
    const msg = $("msg"), email = $("email").value.trim();
    if (!email) { msg.className = "erreur"; msg.textContent = "Saisissez d'abord votre adresse mail ci-dessus."; return; }
    try { await EEB.reinitialiserMdp(email); msg.className = ""; msg.textContent = "E-mail envoyé : ouvrez le lien reçu (vérifiez aussi les spams) pour choisir un nouveau mot de passe."; }
    catch (err) { msg.className = "erreur"; msg.textContent = EEB.messageErreur(err); }
  };
  const reinit = $("reinitSite");
  if (reinit) reinit.onclick = e => {
    e.preventDefault();
    if (confirm("Se déconnecter et effacer les données locales de cet appareil ?")) { EEB.deconnecter().finally(() => { localStorage.clear(); location.reload(); }); }
  };
}

if (page === "liste") {
  const colonnes = {apprenant:["Métier","CF"], formateur:["Matière enseignée","CF"],
    tuteur:["Nom d'entreprise","Ville"], "EEB-ONG":["Fonction"]};
  const valeurs = (u, s) => s === "apprenant" ? [u.metier, u.centre] : s === "formateur" ? [u.matiere||"", u.centre]
    : s === "tuteur" ? [u.entreprise, u.ville||""] : [u.fonction||""];
  const afficher = () => {
    const s = $("choixStatut").value;
    $("thead").innerHTML = "<tr>" + ["Nom et prénom","Téléphone","Email",...colonnes[s]].map(c => `<th>${c}</th>`).join("") + "</tr>";
    $("tbody").innerHTML = lire("users", []).filter(u => aStatut(u, s)).map(u =>
      "<tr>" + [((u.nom ?? "") + " " + (u.prenom ?? "")).trim(), u.tel, u.email, ...valeurs(u,s)].map(c => `<td>${echapper(c)}</td>`).join("") + "</tr>").join("");
  };
  $("choixStatut").onchange = afficher; afficher();
}

// ---- Mot de passe administrateur : créé à la première visite, enregistré sous forme chiffrée (SHA-256) ----
const hacher = async txt => {
  if (window.crypto && crypto.subtle) {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
  }
  return "clair:" + txt;
};
// Retourne un message d'erreur, ou "" si le nouveau mot de passe est valable
const verifierNouveauMdp = (a, b) => a.length < 6 ? "6 caractères minimum." : a !== b ? "Les deux mots de passe sont différents." : "";

// ---- Texte de la page Engagement (modifiable depuis la page Administrateur) ----
// Syntaxe : une ligne = un paragraphe ; « - » = puce ; « -- » = sous-puce.
// Mots à insérer : {parent}, {enfant}, {metier} (remplacés sur la page Engagement).
const TEXTE_ENG_DEFAUT = [
  "Je soussigné(e) Mr/Mme {parent}, parent de {enfant}, accepte que mon enfant suive la formation du métier de {metier},",
  "reconnais avoir contacté l’ONG Enfant Épanoui Bénin pour prendre part à la formation au métier de : {metier}",
  "entrant dans le cadre de la mise en œuvre du Projet d’Appui à la Formation Professionnelle par Alternance des Jeunes Déscolarisés Vulnérables (ProAFPA-JDV) dans les communes de Nikki, Kalalé et Pèrèrè.",
  "À cet effet, je m’engage à :",
  "- Respecter mes engagements vis-à-vis de EEB ONG pendant toute la durée de la formation, à savoir :",
  "-- Prendre part à toutes les activités de la formation et des stages ;",
  "-- Respecter les principes du travail en équipe et œuvrer pour la cohésion sociale au sein du groupe ;",
  "-- Ne commettre aucun acte de VBG en milieu d’apprentissage, de résidence… ;",
  "-- Rembourser les frais de formation (180 000) et retourner à l’ONG les kits de formation et de protection mis à ma disposition, en cas d’abandon."
].join("\n");
const texteEngagement = () => { const t = lire("texteEngagement", ""); return typeof t === "string" && t.trim() ? t : TEXTE_ENG_DEFAUT; };
const htmlEngagement = texte => {
  const VIDE = "………………";
  const ligne = s => echapper(s)
    .replace(/\{parent\}/gi, `<span class="nom nom-parent">${VIDE}</span>`)
    .replace(/\{enfant\}/gi, `<span class="nom nom-enfant">${VIDE}</span>`)
    .replace(/\{m[ée]tier\}/gi, `<span class="nom metier-choisi">${VIDE}</span>`);
  let h = "", niv = 0;   // niv : 0 = hors liste, 1 = dans une liste, 2 = dans une sous-liste
  const fermer = () => { if (niv === 2) h += "</ul></li></ul>"; else if (niv === 1) h += "</li></ul>"; niv = 0; };
  String(texte).split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(l => {
    const sous = /^--\s*/.test(l), puce = !sous && /^-\s+/.test(l);
    if (sous && niv > 0) { if (niv === 1) { h += "<ul>"; niv = 2; } h += "<li>" + ligne(l.replace(/^--\s*/, "")) + "</li>"; }
    else if (sous || puce) {
      const t = ligne(l.replace(/^--?\s*/, ""));
      if (niv === 2) { h += "</ul></li>"; niv = 1; } else if (niv === 1) h += "</li>"; else { h += "<ul>"; niv = 1; }
      h += "<li>" + t;
    }
    else { fermer(); h += "<p>" + ligne(l) + "</p>"; }
  });
  fermer();
  return h;
};

if (page === "admin") {
  const moi = utilisateurCourant();   // la page n'est ouverte qu'à un compte administrateur connecté
  const ouvrirAdmin = () => {
    $("accesRefuse").style.display = "none"; $("formCode").style.display = "none"; $("zoneAdmin").style.display = "block";
    sessionStorage.setItem("admin", "1");
    // Se déconnecter : verrouille la page Administrateur (le mot de passe du compte sera redemandé)
    $("deconnexionAdmin").onclick = () => { sessionStorage.removeItem("admin"); location.reload(); };

    // ---- Modérateurs du site : ajoutés / supprimés par l'administrateur ----
    const nomMod = u => ((u.nom ?? "") + " " + (u.prenom ?? "")).trim();
    const afficherModos = () => {
      const l = lire("users", []).filter(u => aStatut(u, "modérateur"));
      $("modosAdmin").innerHTML = l.length ? l.map(u => `<li><span><b>${echapper(nomMod(u))}</b> — ${echapper(u.email)}</span>
        <button type="button" data-email="${echapper(u.email)}">Supprimer</button></li>`).join("") : "<li>Aucun modérateur.</li>";
    };
    $("modosAdmin").onclick = e => {
      const b = e.target.closest("button[data-email]"); if (!b) return;
      if (!confirm("Supprimer ce modérateur ?")) return;
      ecrire("users", lire("users", []).filter(u => !(u.email === b.dataset.email && aStatut(u, "modérateur"))));
      afficherModos();
    };
    $("formModo").onsubmit = async e => {
      e.preventDefault();
      const email = $("modEmail").value.trim(), msg = $("msgModo");
      msg.className = "erreur";
      if ($("modMdp").value.length < 6) { msg.textContent = "Mot de passe : 6 caractères minimum."; return; }
      try {
        await EEB.creerCompteAdmin({nom:$("modNom").value, prenom:$("modPrenom").value, tel:$("modTel").value, email, photo:"",
          metier:"", centre:"", entreprise:"", statut:"modérateur", statut2:"", derniereConnexion:Date.now()}, $("modMdp").value);
      } catch (err) { msg.textContent = EEB.messageErreur(err); return; }
      $("formModo").reset(); afficherModos(); msg.className = ""; msg.textContent = "Modérateur ajouté : il peut se connecter avec son e-mail.";
    };
    afficherModos();

    // ---- Supprimer un compte (section créée ici : aucune modification de admin.html nécessaire) ----
    {
      const sec = document.createElement("div");
      sec.id = "suppCompte";
      sec.innerHTML = '<h2>Supprimer un compte</h2><p class="note">Recherchez la personne puis cliquez sur « Supprimer ». Son adresse mail pourra ensuite servir à créer un nouveau compte.</p>'
        + '<input id="suppRech" placeholder="Rechercher (nom, prénom, e-mail)"><ul id="suppListe" style="list-style:none;padding:0;margin:8px 0"></ul><p id="msgSupp" class="erreur"></p>';
      $("zoneAdmin").appendChild(sec);
      const nomU = u => ((u.nom ?? "") + " " + (u.prenom ?? "")).trim();
      const estMoi = u => moi && (u._id === moi._id || (u.email && u.email === moi.email));
      const afficherSupp = () => {
        const q = $("suppRech").value.trim().toLowerCase();
        const l = lire("users", []).filter(u => !q || (nomU(u) + " " + (u.email ?? "")).toLowerCase().includes(q))
          .sort((a, b) => nomU(a).localeCompare(nomU(b)));
        $("suppListe").innerHTML = l.length ? l.map(u => `<li style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #c5cad2">
          <span><b>${echapper(nomU(u))}</b> — ${echapper(u.email)}<br><small>${echapper(statutsDe(u).join(", "))}</small></span>
          ${estMoi(u) ? "<small>(votre compte)</small>" : `<button type="button" data-id="${echapper(u._id)}">Supprimer</button>`}</li>`).join("") : "<li>Aucun compte trouvé.</li>";
      };
      $("suppRech").oninput = afficherSupp;
      $("suppListe").onclick = e => {
        const b = e.target.closest("button[data-id]"); if (!b) return;
        const msg = $("msgSupp"); msg.className = "erreur"; msg.textContent = "";
        const us = lire("users", []), u = us.find(x => x._id === b.dataset.id);
        if (!u) return;
        if (estMoi(u)) { msg.textContent = "Vous ne pouvez pas supprimer votre propre compte."; return; }
        if (aStatut(u, "administrateur") && us.filter(x => aStatut(x, "administrateur")).length <= 1) { msg.textContent = "Impossible : c'est le dernier administrateur."; return; }
        if (!confirm("Supprimer définitivement le compte de " + nomU(u) + " (" + u.email + ") ?")) return;
        if (!ecrire("users", us.filter(x => x._id !== u._id))) return;
        afficherSupp(); afficherModos();
        msg.className = ""; msg.textContent = "Compte supprimé : " + u.email + ". Cette adresse peut être réutilisée pour une nouvelle inscription.";
      };
      afficherSupp();
    }

    // ---- Parents (formulaire déplacé depuis la page Parents) ----
    const aprListe = () => lire("users", []).filter(u => aStatut(u, "apprenant"));
    $("parApprenant").innerHTML = "<option value=''>Choisir d'abord le statut</option>";
    $("parStatut").onchange = () => {
      $("parApprenant").innerHTML = "<option value=''>Choisir l'apprenant</option>" + (!$("parStatut").value ? "" :
        aprListe().map(u => { const n = ((u.nom ?? "") + " " + (u.prenom ?? "")).trim(); return `<option>${echapper(n)}</option>`; }).join(""));
    };
    $("formParent").onsubmit = e => { e.preventDefault();
      if (!ecrire("parents", [...lire("parents", []), {apprenant:$("parApprenant").value, nom:$("parNom").value, tel:$("parTel").value, commune:$("parCommune").value, adresse:$("parAdresse").value}])) return;
      $("formParent").reset(); $("msgParent").textContent = "Parent enregistré : il est visible sur la page Parents."; remplirEngParents(); infoParentEng(); };

    // ---- Missions des membres EEB-ONG (affichées dans la colonne « En mission » de la page Présence) ----
    {
      const nomM = u => ((u.nom ?? "") + " " + (u.prenom ?? "")).trim();
      const membresM = () => lire("users", []).filter(u => aStatut(u, "EEB-ONG")).sort((a, b) => nomM(a).localeCompare(nomM(b), "fr"));
      const frM = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? m[3] + "/" + m[2] + "/" + m[1] : (iso || ""); };
      const remplirMembresM = () => { $("misMembre").innerHTML = '<option value="">Choisir le membre</option>' + membresM().map(u => `<option value="${echapper(u.email)}">${echapper(nomM(u))}</option>`).join(""); };
      const afficherMissions = () => {
        const l = [...lire("missions", [])].sort((a, b) => (b.debut || "").localeCompare(a.debut || ""));
        $("listeMissions").innerHTML = l.length ? l.map(m => `<li><span><b>${echapper(m.membre)}</b> — ${echapper(m.intitule)}<br><small>Du ${frM(m.debut)} au ${frM(m.fin)}</small></span>
          <button type="button" data-id="${echapper(m._id)}">Supprimer</button></li>`).join("") : "<li>Aucune mission enregistrée.</li>";
      };
      $("listeMissions").onclick = e => {
        const b = e.target.closest("button[data-id]"); if (!b) return;
        if (!confirm("Supprimer cette mission ?")) return;
        ecrire("missions", lire("missions", []).filter(m => m._id !== b.dataset.id)); afficherMissions();
      };
      $("formMission").onsubmit = e => {
        e.preventDefault();
        const msg = $("msgMission"), u = membresM().find(x => x.email === $("misMembre").value);
        msg.className = "erreur";
        if (!u) { msg.textContent = "Choisissez un membre de EEB-ONG."; return; }
        if ($("misFin").value < $("misDebut").value) { msg.textContent = "La date de fin doit être après la date de début."; return; }
        if (!ecrire("missions", [...lire("missions", []), {email:u.email, membre:nomM(u), intitule:$("misIntitule").value.trim(), debut:$("misDebut").value, fin:$("misFin").value}])) return;
        $("formMission").reset(); afficherMissions(); msg.className = ""; msg.textContent = "Mission enregistrée : elle apparaît sur la page Présence.";
      };
      remplirMembresM(); afficherMissions();
    }

    // ---- Texte de la page Engagement : modifiable ici, affiché sur la page publique Engagement ----
    const zTexte = $("texteEngSaisie"), mTexte = $("msgTexteEng");
    const majApercuEng = () => {
      const VIDE = "………………", box = $("engApercuTexte");
      box.innerHTML = htmlEngagement(texteEngagement());
      const p = lire("parents", [])[$("engParent").value];
      const u = p ? lire("users", []).find(x => ((x.nom ?? "") + " " + (x.prenom ?? "")).trim() === p.apprenant) : null;
      box.querySelectorAll(".nom-parent").forEach(s => s.textContent = p ? p.nom : VIDE);
      box.querySelectorAll(".nom-enfant").forEach(s => s.textContent = p && p.apprenant ? p.apprenant : VIDE);
      box.querySelectorAll(".metier-choisi").forEach(s => s.textContent = u && u.metier ? u.metier : VIDE);
      $("engNomSig").textContent = p ? p.nom : VIDE;
    };
    zTexte.value = texteEngagement(); majApercuEng();
    document.querySelectorAll("[data-ins]").forEach(b => b.onclick = () => {
      zTexte.setRangeText(b.dataset.ins, zTexte.selectionStart, zTexte.selectionEnd, "end"); zTexte.focus(); });
    $("texteEngEnregistrer").onclick = () => {
      mTexte.className = "erreur";
      const v = zTexte.value.trim();
      if (!v) { mTexte.textContent = "Le texte ne peut pas être vide (utilisez « Rétablir le texte d'origine »)."; return; }
      if (!ecrire("texteEngagement", v)) return;
      majApercuEng(); mTexte.className = ""; mTexte.textContent = "Texte enregistré : il apparaît sur la page Engagement.";
    };
    $("texteEngRetablir").onclick = () => {
      ecrire("texteEngagement", "");
      zTexte.value = TEXTE_ENG_DEFAUT; majApercuEng(); mTexte.className = ""; mTexte.textContent = "Texte d'origine rétabli.";
    };

    // ---- Engagement (parent, signature du bénéficiaire, signature et cachet du Directeur) ----
    // Le parent, l'apprenant, le métier et la date se choisissent sur la page publique Engagement.
    const cSig = $("engSignature"), gSig = cSig.getContext("2d"); let dessine = false, trace = false;
    gSig.strokeStyle = "#1e5aa8"; gSig.lineWidth = 2;   // encre bleue
    const xySig = e => { const r = cSig.getBoundingClientRect(); return [(e.clientX - r.left) * cSig.width / r.width, (e.clientY - r.top) * cSig.height / r.height]; };
    cSig.onpointerdown = e => { dessine = true; trace = true; gSig.beginPath(); gSig.moveTo(...xySig(e)); };
    cSig.onpointermove = e => { if (dessine) { gSig.lineTo(...xySig(e)); gSig.stroke(); } };
    cSig.onpointerup = cSig.onpointerleave = () => dessine = false;
    $("engEffacer").onclick = () => { gSig.clearRect(0, 0, cSig.width, cSig.height); trace = false; };
    // Image PNG de la signature et du cachet du Directeur Exécutif (enregistrée tout de suite, affichée sur la page Engagement)
    const majDirecteur = () => {
      const d = lire("signatureDirecteur", "");
      $("engDirApercu").style.display = d ? "block" : "none"; if (d) $("engDirApercu").src = d;
      $("engDirSuppr").style.display = d ? "" : "none";
    };
    majDirecteur();
    $("engDirecteur").onchange = () => {
      const f = $("engDirecteur").files[0], m = $("msgDir"); m.className = "erreur"; m.textContent = "";
      if (!f) return;
      if (f.type !== "image/png") { m.textContent = "Choisissez une image au format PNG."; $("engDirecteur").value = ""; return; }
      lireImage($("engDirecteur"), data => {
        if (!ecrire("signatureDirecteur", data)) return;
        majDirecteur(); $("engDirecteur").value = "";
        m.className = ""; m.textContent = "Signature et cachet du Directeur enregistrés : ils apparaissent sur la page Engagement.";
      }, 500);
    };
    $("engDirSuppr").onclick = () => {
      ecrire("signatureDirecteur", "");
      majDirecteur(); $("msgDir").className = ""; $("msgDir").textContent = "Image supprimée.";
    };
    // Liste déroulante des parents (nom et prénom du parent + bénéficiaire) : le choix complète la fiche d'engagement
    const nrm = s => String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
    const memeParent = (x, p) => nrm(x.parent) === nrm(p.nom) && (!x.apprenant || nrm(x.apprenant) === nrm(p.apprenant));
    const remplirEngParents = () => {
      const sel = $("engParent"), avant = sel.value;
      sel.innerHTML = "<option value=''>Choisir le parent</option>" + lire("parents", []).map((p, i) =>
        `<option value="${i}">${echapper(p.nom)} (parent de ${echapper(p.apprenant)})</option>`).join("");
      sel.value = avant;
    };
    const infoParentEng = () => {
      const p = lire("parents", [])[$("engParent").value], info = $("engInfoParent");
      const e = p ? [...lire("engagements", [])].reverse().find(x => memeParent(x, p)) : null;
      info.textContent = !p ? (lire("parents", []).length ? "" : "Aucun parent enregistré : ajoutez-en un dans la section Parents ci-dessus.")
        : e ? "Ce parent a déjà signé le " + e.date + " : une nouvelle signature remplacera l'ancienne." : "Ce parent n'a pas encore signé.";
    };
    remplirEngParents(); infoParentEng();
    $("engParent").onchange = () => { majApercuEng(); infoParentEng(); };
    $("formEng").onsubmit = e => { e.preventDefault();
      const msg = $("msgEng"), p = lire("parents", [])[$("engParent").value];
      msg.className = "erreur";
      if (!p) { msg.textContent = "Choisissez d'abord le parent qui signe la fiche."; return; }
      if (!$("engAccord").checked) { msg.textContent = "Cochez « J'ai lu et j'accepte les engagements »."; return; }
      if (!trace) { msg.textContent = "La signature du parent est vide."; return; }
      const autres = lire("engagements", []).filter(x => !memeParent(x, p));   // une seule signature par parent
      if (!ecrire("engagements", [...autres, {parent:p.nom, apprenant:p.apprenant, signature:cSig.toDataURL(), date:new Date().toLocaleDateString("fr-FR")}])) return;
      const nom = p.nom;
      $("formEng").reset(); gSig.clearRect(0, 0, cSig.width, cSig.height); trace = false;
      remplirEngParents(); majApercuEng(); infoParentEng();
      msg.className = ""; msg.textContent = "Engagement de " + nom + " enregistré : il est visible sur la page Engagement."; };

    // ---- Témoignages (formulaire et suppression déplacés depuis la page Témoignages) ----
    const afficherTem = () => {
      const l = lire("temoignages", []);
      $("temAdmin").innerHTML = l.length ? l.map((t, i) => `<li><span><b>${echapper(t.auteur)}</b>${t.image ? " 🖼" : ""}${t.video ? " 🎬" : ""}</span>
        <button type="button" data-i="${i}">Supprimer</button></li>`).join("") : "<li>Aucun témoignage.</li>";
    };
    $("temAdmin").onclick = e => {
      const b = e.target.closest("button[data-i]"); if (!b || !confirm("Supprimer ce témoignage ?")) return;
      const l = lire("temoignages", []); l.splice(Number(b.dataset.i), 1); ecrire("temoignages", l); afficherTem();
    };
    $("formTem").onsubmit = e => { e.preventDefault();
      lireImage($("temImage"), img => {
        if (!ecrire("temoignages", [...lire("temoignages", []), {auteur:$("temAuteur").value, texte:$("temTexte").value, image:img, video:$("temVideo").value}])) return;
        $("formTem").reset(); afficherTem(); }); };
    afficherTem();

    let majSelectsDep = null;   // rafraîchit les listes du formulaire de création d'un groupe (défini plus bas)
    $("logoFile").onchange = () => lireImage($("logoFile"), img => { if (ecrire("logo", img)) alert("Logo enregistré."); }, 400);
    // Téléversement avec barre de progression : verte et pleine = image chargée et enregistrée
    const televerserImage = (input, cle, max, barre, etat) => {
      const f = input.files[0]; if (!f) return;
      const rempli = barre.firstElementChild;
      const maj = (pct, txt, classe = "") => {
        barre.className = "barre-tele " + classe; rempli.style.width = pct + "%"; etat.textContent = txt;
        etat.style.color = classe === "ok" ? "#2e9e4f" : classe === "erreur-tele" ? "#c00" : ""; };
      const pause = () => new Promise(r => setTimeout(r, 120));
      maj(0, "Lecture du fichier…");
      const r = new FileReader();
      r.onprogress = e => { if (e.lengthComputable) maj(Math.round(e.loaded / e.total * 50), "Lecture du fichier…"); };
      r.onerror = () => maj(100, "Erreur : impossible de lire le fichier.", "erreur-tele");
      r.onload = async () => {
        maj(60, "Traitement de l'image…"); await pause();
        const im = new Image();
        im.onerror = () => maj(100, "Erreur : ce fichier n'est pas une image valide.", "erreur-tele");
        im.onload = async () => {
          const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement("canvas");
          c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
          c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
          const data = c.toDataURL(f.type === "image/png" ? "image/png" : "image/jpeg", 0.85);
          maj(85, "Enregistrement…"); await pause();
          if (ecrire(cle, data) && lire(cle, "") === data) maj(100, "Image chargée ✔", "ok");
          else maj(100, "Erreur : image non enregistrée (mémoire du navigateur pleine ?).", "erreur-tele");
        };
        im.src = r.result;
      };
      r.readAsDataURL(f);
    };
    if ($("accueilImageFile")) $("accueilImageFile").onchange = () => televerserImage($("accueilImageFile"), "imageAccueil", 800, $("accueilBarre"), $("accueilEtat"));
    if ($("aproposImageFile")) $("aproposImageFile").onchange = () => televerserImage($("aproposImageFile"), "imageApropos", 800, $("aproposBarre"), $("aproposEtat"));
    const afficher = () => {
      const t = $("typeListe").value;
      $("elements").innerHTML = listes(t).map((v,i) => `<li><span>${v}</span><button type="button" onclick="supprimer('${t}',${i})">Supprimer</button></li>`).join("");
      if (majSelectsDep) majSelectsDep();
    };
    window.supprimer = (t,i) => { const l = listes(t); l.splice(i,1); ecrire(t,l); afficher(); };
    $("ajouter").onclick = () => {
      const t = $("typeListe").value, v = $("nouveau").value.trim();
      if (v) { ecrire(t, [...listes(t), v]); $("nouveau").value = ""; afficher(); }
    };
    $("typeListe").onchange = afficher; afficher();

    // ---- Documents de formation (alimentent la page Documents) ----
    const MAX_FICHIER = 500 * 1024;   // 500 Ko : Firestore limite un document à 1 Mo ; au-delà, utiliser un lien
    let docEnCours = null;                 // indice du document en cours de modification (null = ajout)
    const afficherDocs = () => {
      const l = lire("documents", []);
      $("docsAdmin").innerHTML = l.length ? l.map((d, i) => `<li><span><b>${echapper(d.titre)}</b>${d.image ? " 🖼" : ""}${d.video ? " 🎬" : ""}${d.fichier ? " 📎" : ""}</span>
        <div class="actions"><button type="button" onclick="modifierDoc(${i})">Modifier</button>
        <button type="button" onclick="supprimerDoc(${i})">Supprimer</button></div></li>`).join("") : "<li>Aucun document.</li>";
    };
    const quitterEditionDoc = () => {
      docEnCours = null; $("formDoc").reset(); $("msgDoc").textContent = "";
      $("docEditZone").style.display = "none"; $("docAnnuler").style.display = "none";
      $("docValider").textContent = "Ajouter le document";
    };
    window.supprimerDoc = i => { if (!confirm("Supprimer ce document ?")) return; const l = lire("documents", []); l.splice(i,1); ecrire("documents", l); quitterEditionDoc(); afficherDocs(); };
    // Modifier : charge le document dans le formulaire (texte, image, vidéo, fichier)
    window.modifierDoc = i => {
      const d = lire("documents", [])[i]; if (!d) return;
      quitterEditionDoc(); docEnCours = i;
      $("docTitre").value = d.titre || ""; $("docTexte").value = d.texte || "";
      $("docVideoLien").value = d.video && !d.video.startsWith("data:") ? d.video : "";
      $("docFichierLien").value = d.fichier && !d.fichier.startsWith("data:") ? d.fichier : "";
      $("docImgActuelle").src = d.image || ""; $("docImgActuelle").style.display = d.image ? "block" : "none";
      $("caseImage").style.display = d.image ? "flex" : "none";
      $("caseVideo").style.display = d.video ? "flex" : "none";
      $("caseFichier").style.display = d.fichier ? "flex" : "none";
      $("docEditTitre").textContent = "Modification de : " + (d.titre || "document") + " — laissez un fichier vide pour conserver l'actuel.";
      $("docEditZone").style.display = "grid"; $("docAnnuler").style.display = "inline-block";
      $("docValider").textContent = "Enregistrer les modifications";
      $("formDoc").scrollIntoView({behavior:"smooth", block:"center"}); $("docTitre").focus();
    };
    $("docAnnuler").onclick = quitterEditionDoc;
    $("docSupprVideo").onchange = () => { if ($("docSupprVideo").checked) $("docVideoLien").value = ""; };
    $("docSupprFichier").onchange = () => { if ($("docSupprFichier").checked) $("docFichierLien").value = ""; };
    $("formDoc").onsubmit = e => {
      e.preventDefault(); $("msgDoc").textContent = "";
      const trop = [$("docFichier"), $("docVideoFichier")].find(inp => inp.files[0] && inp.files[0].size > MAX_FICHIER);
      if (trop) { $("msgDoc").textContent = "« " + trop.files[0].name + " » dépasse 500 Ko : utilisez plutôt un lien (YouTube, Google Drive…)."; return; }
      const edition = docEnCours, ancien = edition !== null ? (lire("documents", [])[edition] || {}) : {};
      // un lien vide conserve un fichier déjà enregistré dans le site (data:), sinon il remplace l'ancien lien
      const garde = (vieux, lien) => lien || (vieux && vieux.startsWith("data:") ? vieux : "");
      lireImage($("docImage"), img => lireFichier($("docFichier"), (fic, nomFic) => lireFichier($("docVideoFichier"), vid => {
        const lienFic = $("docFichierLien").value.trim(), lienVid = $("docVideoLien").value.trim();
        const fichier = fic || ($("docSupprFichier").checked ? "" : garde(ancien.fichier, lienFic));
        const doc = {titre:$("docTitre").value.trim(), texte:$("docTexte").value.trim(),
          image: img || ($("docSupprImage").checked ? "" : ancien.image || ""),
          video: vid || ($("docSupprVideo").checked ? "" : garde(ancien.video, lienVid)),
          fichier,
          nomFichier: !fichier ? "" : fic ? nomFic : lienFic ? (decodeURIComponent(lienFic.split("/").pop().split("?")[0]) || "document") : (ancien.nomFichier || "document")};
        const l = lire("documents", []);
        if (edition !== null && l[edition]) l[edition] = {...l[edition], ...doc}; else l.push(doc);
        if (ecrire("documents", l)) {
          quitterEditionDoc(); afficherDocs();
          alert(edition !== null ? "Document modifié : les changements sont visibles sur la page Documents." : "Document ajouté : il est visible sur la page Documents.");
        }
      })), 800);
    };
    afficherDocs();

    // ---- Modifications du déploiement (groupes de la page Déploiement + historique) ----
    let depEnCours = null;
    const listeApprenants = () => lire("users", []).filter(u => aStatut(u, "apprenant")).map(u => u.nom + " " + u.prenom);
    const optionsDep = (id, valeurs, choisies, titre) => {
      const tous = [...new Set([...valeurs, ...choisies.filter(Boolean)])];
      $(id).innerHTML = (titre ? `<option value="">${titre}</option>` : "") +
        tous.map(v => `<option value="${echapper(v)}"${choisies.includes(v) ? " selected" : ""}>${echapper(v)}</option>`).join("");
    };
    const afficherDeps = () => {
      const l = lire("groupes", []);
      $("depAdmin").innerHTML = l.length ? l.map((g, i) => `<li><span><b>${echapper(g.groupe)}</b><br>${echapper(g.metier || "-")} · ${echapper(g.entreprise || "-")}<br>
        ${echapper(g.depart)} → ${echapper(g.retour)} · ${(g.membres || []).length} apprenant(s)</span>
        <div class="actions"><button type="button" onclick="modifierDep(${i})">Modifier</button>
        <button type="button" onclick="supprimerDep(${i})">Supprimer</button></div></li>`).join("") : "<li>Aucun groupe de déploiement.</li>";
      const j = lire("journalDep", []);
      $("depJournal").innerHTML = j.length ? j.map(x => `<li><span>${echapper(x.date)} — ${echapper(x.action)} : <b>${echapper(x.groupe)}</b></span></li>`).join("")
        : "<li>Aucune modification enregistrée.</li>";
    };
    const fermerFormDep = () => { depEnCours = null; $("formDepAdmin").style.display = "none"; $("msgDep").textContent = ""; };
    window.modifierDep = i => {
      const g = lire("groupes", [])[i]; if (!g) return;
      depEnCours = i;
      $("depGroupe").value = g.groupe || "";
      optionsDep("depMetier", listes("metiers"), [g.metier], "Métier");
      optionsDep("depEntreprise", listes("entreprises"), [g.entreprise], "Entreprise");
      optionsDep("depMembres", listeApprenants(), g.membres || []);
      $("depDepart").value = g.depart || ""; $("depRetour").value = g.retour || "";
      $("depTitre").textContent = "Modification du groupe : " + g.groupe;
      $("msgDep").textContent = ""; $("formDepAdmin").style.display = "grid";
      $("formDepAdmin").scrollIntoView({behavior:"smooth", block:"center"});
    };
    window.supprimerDep = i => {
      const l = lire("groupes", []); if (!l[i] || !confirm("Supprimer le groupe « " + l[i].groupe + " » ?")) return;
      journalDep("Suppression", l[i].groupe); l.splice(i, 1); ecrire("groupes", l); fermerFormDep(); afficherDeps();
    };
    $("depAnnuler").onclick = fermerFormDep;
    $("formDepAdmin").onsubmit = e => {
      e.preventDefault();
      if ($("depRetour").value < $("depDepart").value) { $("msgDep").textContent = "La date de retour doit être après la date de départ."; return; }
      const l = lire("groupes", []), ancien = l[depEnCours]; if (!ancien) { fermerFormDep(); return; }
      const nouveau = {...ancien, groupe:$("depGroupe").value.trim(), metier:$("depMetier").value, entreprise:$("depEntreprise").value,
        depart:$("depDepart").value, retour:$("depRetour").value, membres:[...$("depMembres").selectedOptions].map(o => o.value)};
      const noms = {groupe:"nom", metier:"métier", entreprise:"entreprise", depart:"date de départ", retour:"date de retour"};
      const changes = Object.keys(noms).filter(k => ancien[k] !== nouveau[k]).map(k => noms[k]);
      if (JSON.stringify([...(ancien.membres || [])].sort()) !== JSON.stringify([...nouveau.membres].sort())) changes.push("apprenants");
      l[depEnCours] = nouveau;
      if (changes.length && !ecrire("groupes", l)) return;
      if (changes.length) journalDep("Modification (" + changes.join(", ") + ")", nouveau.groupe);
      fermerFormDep(); afficherDeps();
    };
    // Création d'un groupe (le formulaire se trouvait avant sur la page Déploiement)
    const garde = (id, l) => [...$(id).selectedOptions].map(o => o.value).filter(v => l.includes(v));
    majSelectsDep = () => {
      const m = listes("metiers"), en = listes("entreprises"), ap = listeApprenants();
      optionsDep("crMetier", m, garde("crMetier", m), "Métier");
      optionsDep("crEntreprise", en, garde("crEntreprise", en), "Entreprise");
      optionsDep("crMembres", ap, garde("crMembres", ap));
    };
    $("formDepCreation").onsubmit = e => {
      e.preventDefault(); $("msgDepCreation").textContent = "";
      if ($("crRetour").value < $("crDepart").value) { $("msgDepCreation").textContent = "La date de retour doit être après la date de départ."; return; }
      const groupe = $("crGroupe").value.trim(), l = lire("groupes", []);
      l.push({groupe, metier:$("crMetier").value, entreprise:$("crEntreprise").value, depart:$("crDepart").value, retour:$("crRetour").value,
        membres:[...$("crMembres").selectedOptions].map(o => o.value)});
      if (!ecrire("groupes", l)) return;
      journalDep("Création", groupe);
      $("formDepCreation").reset(); majSelectsDep(); afficherDeps();
      alert("Groupe créé : il est visible sur la page Déploiement.");
    };
    majSelectsDep();
    afficherDeps();
    // Modifier le mot de passe administrateur
    $("formChangerMdp").onsubmit = async e => {
      e.preventDefault();
      const err = verifierNouveauMdp($("mdpNouveau2").value, $("mdpConfirm2").value);
      if (!await EEB.verifierMdp($("mdpActuel").value)) { $("msgChanger").textContent = "Mot de passe actuel incorrect."; return; }
      if (err) { $("msgChanger").textContent = err; return; }
      try { await EEB.changerMdp($("mdpActuel").value, $("mdpNouveau2").value); $("formChangerMdp").reset(); $("msgChanger").textContent = "Mot de passe modifié."; }
      catch (x) { $("msgChanger").textContent = EEB.messageErreur(x); }
    };
  };
  window.addEventListener("pageshow", e => {
    if (e.persisted && $("zoneAdmin").style.display === "block" && !(estAdmin() && sessionStorage.getItem("admin") === "1")) location.reload();
  });
  if (!estAdminUser(moi)) { $("zoneAdmin").style.display = "none"; $("formCode").style.display = "none"; $("accesRefuse").style.display = "block"; }
  else if (sessionStorage.getItem("admin") === "1") ouvrirAdmin();
  else {                                   // compte administrateur connecté : le mot de passe du compte déverrouille la page
    $("zoneAdmin").style.display = "none"; $("formCode").style.display = "grid";
    $("formCode").onsubmit = async e => {
      e.preventDefault();
      if (await EEB.verifierMdp($("codeAdmin").value)) { $("codeAdmin").value = ""; ouvrirAdmin(); }
      else $("msgCode").textContent = "Mot de passe incorrect.";
    };
  }
}

// ===== Pages ajoutées =====
const apprenants = () => lire("users", []).filter(u => aStatut(u, "apprenant"));
const nomComplet = u => ((u.nom ?? "") + " " + (u.prenom ?? "")).trim();
const lireFichier = (input, suite) => {
  const f = input.files[0]; if (!f) return suite("", "");
  const r = new FileReader(); r.onload = () => suite(r.result, f.name); r.readAsDataURL(f);
};
function remplirApprenants(id, titre = "Choisir l'apprenant") {
  $(id).innerHTML = `<option value="">${titre}</option>` + apprenants().map(u => `<option>${echapper(nomComplet(u))}</option>`).join("");
}

// ===== Présence : codes QR, scanner, tableaux synchronisés =====
const JOURS_OUVRES = [1, 2, 3, 4, 5];   // lundi → vendredi : jours où un membre EEB-ONG qui n'a pas scanné est compté absent
const HEURE_LIMITE_BUREAU = 12;         // à partir de 12h00, un membre qui n'a pas scanné est « Absent »
const isoDe = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const aujourdhui = () => isoDe(new Date());   // le jour va de 00h00 à 23h59 (heure locale de l'appareil)
const heureMin = () => { const d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
const dateFr = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso || ""); };
const nrmTxt = s => String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
const trierParNom = (a, b) => nomComplet(a).localeCompare(nomComplet(b), "fr");

// Signature courte du code (protection légère contre les codes inventés)
const SEL_QR = "EEB-ONG-2026";
const signer = txt => { let h = 2166136261; const s = SEL_QR + txt;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36); };
// Code personnel d'un formateur (F) ou d'un tuteur (T) : change chaque jour car la date en fait partie
const codePersonnel = (role, email, date) => { const base = [role, email, date].join("|"); return base + "|" + signer(base); };
const CODE_BUREAU = "B|" + signer("B");   // code unique du bureau EEB-ONG (page À propos)
// Un QR contient l'adresse d'une page du site + le code (?qr=...) : le scanner de l'appareil photo ou celui du site fonctionnent tous les deux
const urlPage = (fichier, code) => { const u = new URL(fichier, location.href); u.search = ""; u.hash = ""; u.searchParams.set("qr", code); return u.href; };
const extraireCode = texte => { let c = String(texte || "").trim();
  try { c = new URL(c).searchParams.get("qr") || c; } catch (e) {}
  return c; };
const lireCode = texte => { const p = extraireCode(texte).split("|");
  if (p.length !== 4 || !["F", "T"].includes(p[0]) || signer(p.slice(0, 3).join("|")) !== p[3]) return null;
  return {role:p[0], email:p[1], date:p[2]}; };
const lireBureau = texte => extraireCode(texte) === CODE_BUREAU;

// Bibliothèques QR chargées à la demande (internet nécessaire)
const LIBS_QR = ["https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js", "https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs/qrcode.min.js"];
const LIBS_JSQR = ["https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js", "https://unpkg.com/jsqr@1.4.0/dist/jsQR.js", "https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js"];
const scriptsCharges = {};
const charger = src => scriptsCharges[src] || (scriptsCharges[src] = new Promise((ok, ko) => {
  const s = document.createElement("script"); s.src = src; s.onload = () => ok();
  s.onerror = () => { delete scriptsCharges[src]; ko(new Error("chargement impossible")); }; document.head.appendChild(s); }));
// Essaie plusieurs adresses l'une après l'autre jusqu'à ce que la bibliothèque (testée par ok()) soit disponible
async function chargerUne(urls, ok) {
  if (ok()) return true;
  for (const u of urls) { try { await charger(u); if (ok()) return true; } catch (e) {} }
  return ok();
}
async function dessinerQr(conteneur, texte, taille = 200) {
  if (!await chargerUne(LIBS_QR, () => typeof QRCode === "function")) {
    conteneur.innerHTML = '<span class="erreur" style="line-height:1.4">Code QR indisponible (connexion internet requise).</span>'; return; }
  try { conteneur.innerHTML = ""; new QRCode(conteneur, {text:texte, width:taille, height:taille, colorDark:"#000000", colorLight:"#ffffff", correctLevel:QRCode.CorrectLevel.M}); }
  catch (e) { conteneur.innerHTML = '<span class="erreur" style="line-height:1.4">Impossible de générer le code QR.</span>'; }
}

// Styles des nouvelles pages
const stPresence = document.createElement("style");
stPresence.textContent = `.qr-carte{text-align:center;margin:14px auto;padding:14px;border-radius:14px;background:var(--bg);width:max-content;max-width:100%;box-shadow:4px 4px 6px var(--shadow-dark), -4px -4px 6px var(--shadow-light)}
  .qr-zone{display:inline-block;background:#fff;padding:12px;border-radius:10px;line-height:0;min-width:80px;min-height:80px}
  .qr-zone img,.qr-zone canvas{max-width:100%;height:auto}
  .qr-carte p{margin:8px 0 0}
  .info-cible{margin:12px 0;font-size:1rem}
  .barre-outils{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin:12px 0}
  .barre-outils label{display:grid;gap:4px}
  .pres{color:#2e9e4f;font-weight:600} .abs{color:#c00;font-weight:600} .attente{color:#8a93a0;font-weight:600}
  .ligne-choix{display:flex;justify-content:flex-end;margin:0 0 12px}
  .ligne-choix select{width:45%;max-width:260px}
  .fenetre-fond{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:100;padding:16px}
  .fenetre{background:var(--bg);color:var(--bleu);border-radius:14px;padding:20px;max-width:420px;width:100%;text-align:center;box-shadow:4px 4px 6px var(--shadow-dark), -4px -4px 6px var(--shadow-light)}
  .fenetre p{margin:0 0 14px;line-height:1.5}
  .fenetre video{width:100%;max-height:50vh;border-radius:8px;background:#000;margin-bottom:12px}
  .fenetre .secondaire{background:var(--bleu)}
  .boutons-scan{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}`;
document.head.appendChild(stPresence);

// Fenêtre de message (remplace alert)
function fenetre(message) {
  return new Promise(ok => {
    const f = document.createElement("div"); f.className = "fenetre-fond";
    f.innerHTML = '<div class="fenetre" role="alertdialog" aria-modal="true"><p></p><button type="button">OK</button></div>';
    f.querySelector("p").textContent = message;
    const b = f.querySelector("button"); b.onclick = () => { f.remove(); ok(); };
    document.body.appendChild(f); b.focus();
  });
}

// Scanner de code QR : caméra en direct, ou photo du code si la caméra n'est pas utilisable.
// suite(texte) est appelée à la lecture d'un code. Lecteur natif du navigateur (BarcodeDetector) si disponible, sinon jsQR.
async function ouvrirScanner(titre, suite) {
  const fond = document.createElement("div"); fond.className = "fenetre-fond";
  fond.innerHTML = '<div class="fenetre"><p><b class="titre-scan"></b></p><video playsinline muted style="display:none"></video>' +
    '<p class="etat-scan">Démarrage…</p><div class="boutons-scan"><button type="button" class="photo">📷 Photo du code</button>' +
    '<button type="button" class="secondaire annuler">Annuler</button></div><input type="file" accept="image/*" capture="environment" hidden></div>';
  fond.querySelector(".titre-scan").textContent = titre;
  document.body.appendChild(fond);
  const video = fond.querySelector("video"), etat = fond.querySelector(".etat-scan"), fichier = fond.querySelector("input[type=file]");
  const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d", {willReadFrequently:true});
  let flux = null, actif = true, natif = null;
  const fermer = () => { actif = false; if (flux) flux.getTracks().forEach(p => p.stop()); fond.remove(); };
  fond.querySelector(".annuler").onclick = fermer;

  // Lecteur : natif si possible, sinon jsQR (chargé depuis plusieurs sources)
  const preparer = async () => {
    if (natif || typeof jsQR === "function") return true;
    try { if ("BarcodeDetector" in window) { natif = new BarcodeDetector({formats:["qr_code"]}); return true; } } catch (e) { natif = null; }
    etat.textContent = "Chargement du lecteur de code QR…";
    if (await chargerUne(LIBS_JSQR, () => typeof jsQR === "function")) return true;
    etat.textContent = "Lecteur de code QR introuvable : vérifiez la connexion internet puis réessayez.";
    return false;
  };
  const decoder = async (inversion) => {   // lit le code QR présent dans le canvas
    if (natif) { try { const r = await natif.detect(canvas); if (r.length && r[0].rawValue) return r[0].rawValue; } catch (e) {} }
    if (typeof jsQR === "function") {
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const r = jsQR(img.data, img.width, img.height, {inversionAttempts:inversion}); if (r && r.data) return r.data; }
    return null;
  };

  // Mode photo : fonctionne aussi sans caméra en direct (et sans https)
  fond.querySelector(".photo").onclick = () => fichier.click();
  fichier.onchange = async () => {
    const f = fichier.files[0]; if (!f) return;
    if (!await preparer()) return;
    etat.textContent = "Lecture de la photo…";
    const url = URL.createObjectURL(f), im = new Image();
    im.onerror = () => { URL.revokeObjectURL(url); etat.textContent = "Photo illisible, réessayez."; };
    im.onload = async () => {
      const k = Math.min(1, 1000 / Math.max(im.width, im.height));
      canvas.width = Math.round(im.width * k); canvas.height = Math.round(im.height * k);
      ctx.drawImage(im, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url);
      const txt = await decoder("attemptBoth");
      if (txt) { fermer(); suite(txt); } else { etat.textContent = "Aucun code QR lu sur cette photo : rapprochez-vous, cadrez bien le code et réessayez."; fichier.value = ""; }
    };
    im.src = url;
  };

  // Mode caméra en direct
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || window.isSecureContext === false) {
    etat.textContent = "Caméra en direct bloquée : la page doit être ouverte en https (adresse actuelle : " + location.origin + "). Utilisez « Photo du code »."; return; }
  if (!await preparer()) return;
  if (!actif) return;
  etat.textContent = "Démarrage de la caméra…";
  try { flux = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}}, audio:false}); }
  catch (e) {
    etat.textContent = e && e.name === "NotAllowedError" ? "Accès à la caméra refusé : autorisez la caméra pour ce site dans le navigateur, ou utilisez « Photo du code »."
      : e && e.name === "NotFoundError" ? "Aucune caméra détectée : utilisez « Photo du code »."
      : e && e.name === "NotReadableError" ? "La caméra est utilisée par une autre application : fermez-la puis réessayez."
      : "Caméra indisponible (" + (e && e.name || "erreur") + ") : utilisez « Photo du code ».";
    return; }
  if (!actif) { flux.getTracks().forEach(p => p.stop()); return; }
  video.srcObject = flux; video.style.display = "block"; try { await video.play(); } catch (e) {}
  etat.textContent = "Placez le code QR devant la caméra.";
  let occupe = false;
  const boucle = async () => {
    if (!actif) return;
    if (!occupe && video.readyState >= 2 && video.videoWidth) {
      occupe = true;
      const k = Math.min(1, 640 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * k); canvas.height = Math.round(video.videoHeight * k);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const txt = await decoder("dontInvert"); occupe = false;
      if (txt && actif) { fermer(); suite(txt); return; }
    }
    requestAnimationFrame(boucle);
  };
  boucle();
}

// Synchronisation : les tableaux se rafraîchissent dès qu'une présence est enregistrée (autre onglet), et toutes les 15 s
// (cela fait aussi passer les membres en « Absent » à 12h00 et change le code QR à minuit)
function synchroniser(fn) {
  window.addEventListener("storage", e => { if (!e.key || ["presences", "presencesBureau", "suivis", "users", "groupes"].includes(e.key)) fn(); });
  setInterval(fn, 15000);
}
const reappliquerRecherche = () => { const r = document.querySelector(".recherche"); if (r && r.value && r.oninput) r.oninput(); };

// Lignes du tableau Nom et prénom / Métier / Date / Observations / Présent-Absent
function lignesPresence(apprs, date, filtre, lieuObs) {
  const pres = lire("presences", []).filter(p => p.date === date && filtre(p));
  const suivis = lire("suivis", []).filter(s => s.date === date && (!lieuObs || s.lieu === lieuObs));
  const futur = date > aujourdhui();
  return [...apprs].sort(trierParNom).map(u => {
    const present = pres.some(p => p.email === u.email);
    const obs = suivis.filter(s => s.email ? s.email === u.email : nrmTxt(s.apprenant) === nrmTxt(nomComplet(u))).map(s => s.obs).filter(Boolean).join(" ; ");
    const etat = futur ? "-" : present ? '<span class="pres">Présent</span>' : '<span class="abs">Absent</span>';
    return `<tr><td>${echapper(nomComplet(u))}</td><td>${echapper(u.metier || "")}</td><td>${dateFr(date)}</td><td>${echapper(obs)}</td><td>${etat}</td></tr>`;
  }).join("");
}

// ---- À propos : code QR unique du bureau ----
if (page === "apropos" && $("qrBureau")) dessinerQr($("qrBureau"), urlPage("presence.html", CODE_BUREAU), 340);

// ---- Suivi : scanner de code QR (remplace le GPS) ----
if (page === "suivi") {
  const moi = utilisateurCourant(), sel = $("apprenant"), msg = $("msgScan");
  sel.innerHTML = '<option value="">Choisir l\'apprenant</option>' + apprenants().sort(trierParNom).map(u => `<option value="${echapper(u.email)}">${echapper(nomComplet(u))}</option>`).join("");
  if (moi && aStatut(moi, "apprenant")) sel.value = moi.email;   // un apprenant connecté est présélectionné
  $("date").value = aujourdhui();
  // Heure affichée automatiquement (mise à jour chaque seconde, non modifiable)
  const champHeure = $("heure");
  const majHeure = () => { if (champHeure) { const d = new Date();
    champHeure.value = [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, "0")).join(":"); } };
  majHeure(); setInterval(majHeure, 1000);

  const afficher = () => {
    $("tbody").innerHTML = lignesPresence(apprenants(), $("date").value || aujourdhui(), () => true, null)
      || '<tr><td colspan="5">Aucun apprenant inscrit.</td></tr>';
    reappliquerRecherche();
  };
  $("date").onchange = afficher;

  let enAttente = null;   // code scanné avant d'avoir choisi son nom
  const enregistrerScan = async texte => {
    const c = lireCode(texte);
    if (!c) { await fenetre("Code QR non reconnu. Scannez le code personnel d'un formateur ou d'un tuteur."); return; }
    if (c.date !== aujourdhui()) {
      await fenetre("La date de ce code QR ne correspond pas à la date d'aujourd'hui. Merci de trouver le bon code QR et reprendre."); return; }
    const u = apprenants().find(x => x.email === sel.value);
    if (!u) { enAttente = texte; msg.textContent = "Choisissez votre nom dans la liste : votre présence sera enregistrée aussitôt."; return; }
    enAttente = null;
    const pres = lire("presences", []);
    if (pres.some(p => p.email === u.email && p.cible === c.email && p.role === c.role && p.date === c.date)) {
      msg.textContent = "Votre présence est déjà enregistrée aujourd'hui."; return; }
    pres.push({email:u.email, apprenant:nomComplet(u), role:c.role, cible:c.email, date:c.date, heure:heureMin()});
    if (!ecrire("presences", pres)) return;
    const cible = lire("users", []).find(x => x.email === c.email);
    msg.textContent = `✔ Présence enregistrée à ${heureMin()} (${c.role === "F" ? "formateur" : "tuteur"} : ${cible ? nomComplet(cible) : c.email}).`;
    $("date").value = c.date; afficher();
  };
  sel.onchange = () => { if (enAttente && sel.value) enregistrerScan(enAttente); };
  $("scanQr").onclick = () => {
    if (!sel.value) { fenetre("Choisissez d'abord votre nom dans la liste des apprenants."); return; }
    ouvrirScanner("Scanner le code QR du formateur ou du tuteur", enregistrerScan);
  };
  // Code lu avec l'appareil photo du téléphone : la page s'ouvre avec ?qr=...
  const paramQr = new URLSearchParams(location.search).get("qr");
  if (paramQr) { try { history.replaceState(null, "", location.pathname); } catch (e) {} enregistrerScan(paramQr); }

  $("formSuivi").onsubmit = e => { e.preventDefault();
    const u = apprenants().find(x => x.email === sel.value); if (!u) return;
    if (!ecrire("suivis", [...lire("suivis", []), {apprenant:nomComplet(u), email:u.email, lieu:$("lieu").value, date:$("date").value,
      heure:champHeure ? champHeure.value : "", obs:$("obs").value.trim()}])) return;
    $("obs").value = ""; msg.textContent = "Suivi enregistré."; afficher(); };
  afficher(); synchroniser(afficher);
}

// ---- Pages Formateur et Tuteur : code QR personnel du jour + tableau de présence ----
function pagePersonnel(role) {   // role : "formateur" ou "tuteur"
  const lettre = role === "formateur" ? "F" : "T";
  const lieuObs = role === "formateur" ? "Centre de formation" : "Entreprise de stage";
  const libelle = role === "formateur" ? "Formateur" : "Tuteur";
  const moi = utilisateurCourant();
  const gestion = estAdminUser(moi) || aStatut(moi, "EEB-ONG");   // peut consulter n'importe quel formateur / tuteur
  let cibleEmail = moi && aStatut(moi, role) ? moi.email : "";
  const equipe = () => lire("users", []).filter(u => aStatut(u, role)).sort(trierParNom);
  let jour = aujourdhui(), dernierCode = "";
  $("dateVue").value = jour;
  if (gestion) {
    const s = $("choixCible"); $("blocChoix").style.display = "";
    s.innerHTML = `<option value="">Choisir un ${libelle.toLowerCase()}</option>` + equipe().map(u => `<option value="${echapper(u.email)}">${echapper(nomComplet(u))}</option>`).join("");
    s.value = cibleEmail; s.onchange = () => { cibleEmail = s.value; afficher(); };
  }
  // Apprenants attendus : formateur → même centre de formation ; tuteur → groupes de stage de son entreprise à cette date
  const attendus = (cible, date) => {
    const tous = apprenants(), pres = lire("presences", []).filter(p => p.date === date && p.role === lettre && p.cible === cible.email);
    let base;
    if (role === "formateur") base = tous.filter(u => !cible.centre || nrmTxt(u.centre) === nrmTxt(cible.centre));
    else {
      const noms = new Set();
      lire("groupes", []).filter(g => cible.entreprise && nrmTxt(g.entreprise) === nrmTxt(cible.entreprise) && (!g.depart || g.depart <= date) && (!g.retour || date <= g.retour))
        .forEach(g => (g.membres || []).forEach(n => noms.add(nrmTxt(n))));
      base = tous.filter(u => noms.has(nrmTxt(nomComplet(u))));
    }
    const deja = new Set(base.map(u => u.email));
    tous.filter(u => !deja.has(u.email) && pres.some(p => p.email === u.email)).forEach(u => base.push(u));   // un apprenant qui a scanné apparaît toujours
    return base;
  };
  function afficher() {
    const j = aujourdhui();
    if (j !== jour) { if ($("dateVue").value === jour) $("dateVue").value = j; jour = j; }   // minuit : nouveau jour, nouveau code QR
    const cible = equipe().find(u => u.email === cibleEmail), date = $("dateVue").value || jour;
    if (!cible) {
      $("infoCible").textContent = gestion ? `Choisissez un ${libelle.toLowerCase()} dans la liste.` : `Aucun compte ${libelle.toLowerCase()} trouvé.`;
      $("blocQr").style.display = "none"; dernierCode = "";
      $("tbody").innerHTML = '<tr><td colspan="5">Aucun résultat.</td></tr>'; return; }
    const detail = role === "formateur" ? cible.centre : cible.entreprise;
    $("infoCible").innerHTML = `<b>${libelle} :</b> ${echapper(nomComplet(cible))}` + (detail ? ` — ${echapper(detail)}` : "");
    $("blocQr").style.display = "";
    const code = codePersonnel(lettre, cible.email, jour);
    if (code !== dernierCode) {
      dernierCode = code; dessinerQr($("qrCode"), urlPage("suivi.html", code), 200);
      $("qrLegende").textContent = `Code QR personnel du ${dateFr(jour)} — valable de 00h00 à 23h59.`; }
    $("tbody").innerHTML = lignesPresence(attendus(cible, date), date, p => p.role === lettre && p.cible === cible.email, lieuObs)
      || '<tr><td colspan="5">Aucun apprenant à afficher pour cette date.</td></tr>';
    reappliquerRecherche();
  }
  $("dateVue").onchange = afficher;
  $("imprimer").onclick = () => window.print();
  afficher(); synchroniser(afficher);
}
if (page === "formateur") pagePersonnel("formateur");
if (page === "tuteur") pagePersonnel("tuteur");

// ---- Localisation du personnel au bureau ----
// La position est calculée sur l'appareil du membre et comparée à celle du bureau. Seuls « au bureau / hors du bureau »,
// la distance et l'heure de mise à jour sont enregistrés (jamais les coordonnées GPS).
const BUREAU_GPS = {lat:9.937623985099457, lng:3.206579083971553};   // position GPS du bureau
const RAYON_BUREAU = 150;                  // mètres : en dessous de cette distance, l'agent est « au bureau »
const FRAICHEUR_GEO = 5 * 60 * 1000;       // sans nouvelle position depuis 5 minutes : le point passe au rouge
const HEURE_SERVICE = "08:30";             // heure de service
const HEURE_RETARD = "10:00";              // après cette heure : retard
const HEURE_SORTIE = "18:00";              // le scan de sortie est possible à partir de cette heure
const hFr = h => h.replace(":", "H");
const estOuvre = iso => { const [a, m, j] = String(iso).split("-").map(Number); return JOURS_OUVRES.includes(new Date(a, m - 1, j).getDay()); };
const distanceM = (la1, lo1, la2, lo2) => {
  const r = x => x * Math.PI / 180, R = 6371000;
  const a = Math.sin(r(la2 - la1) / 2) ** 2 + Math.cos(r(la1)) * Math.cos(r(la2)) * Math.sin(r(lo2 - lo1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};
let geoId = null, geoDerniere = null, geoBattement = null;
const envoyerPosition = () => {
  const m = utilisateurCourant(); if (!m || !geoDerniere) return;
  const l = lire("localisations", []);
  const rec = {email:m.email, dansBureau:geoDerniere.dans, distance:geoDerniere.d, maj:Date.now(), date:aujourdhui()};
  const i = l.findIndex(x => x.email === m.email);
  if (i >= 0) Object.assign(l[i], rec); else l.push(rec);
  ecrire("localisations", l);
};
function arreterGeo(signaler = true) {
  if (geoId !== null) navigator.geolocation.clearWatch(geoId);
  clearInterval(geoBattement); geoId = null; geoBattement = null;
  localStorage.removeItem("geoBureau");
  if (signaler) { geoDerniere = {dans:false, d:null}; envoyerPosition(); }
}
function demarrerGeo(auRefus) {
  if (!navigator.geolocation) return false;
  if (geoId !== null) return true;
  geoId = navigator.geolocation.watchPosition(pos => {
    const d = Math.round(distanceM(pos.coords.latitude, pos.coords.longitude, BUREAU_GPS.lat, BUREAU_GPS.lng)), dans = d <= RAYON_BUREAU;
    const change = !geoDerniere || geoDerniere.dans !== dans;
    geoDerniere = {dans, d};
    if (change) envoyerPosition();
  }, err => { if (err && err.code === 1) { arreterGeo(false); if (auRefus) auRefus(err); } },   // 1 = autorisation refusée
  {enableHighAccuracy:true, maximumAge:30000, timeout:30000});
  geoBattement = setInterval(envoyerPosition, 90000);    // signal régulier : prouve que l'agent est toujours localisé
  localStorage.setItem("geoBureau", "1");
  return true;
}
// Un membre qui a activé sa localisation reste localisé sur toutes les pages tant que l'application est ouverte
if (localStorage.getItem("geoBureau") === "1") {
  const m = utilisateurCourant();
  if (m && aStatut(m, "EEB-ONG")) demarrerGeo(); else localStorage.removeItem("geoBureau");
}

// ---- Présence des membres EEB-ONG au bureau ----
if (page === "presence") {
  const moi = utilisateurCourant(), sel = $("choixMembre"), msg = $("msgPresence");
  const membres = () => lire("users", []).filter(u => aStatut(u, "EEB-ONG")).sort(trierParNom);
  sel.innerHTML = '<option value="">Tous les membres</option>' + membres().map(u => `<option value="${echapper(u.email)}">${echapper(nomComplet(u))}</option>`).join("");
  $("moisImpression").value = aujourdhui().slice(0, 7);

  const stBureau = document.createElement("style");
  stBureau.textContent = `.pt{display:inline-block;width:22px;height:22px;border-radius:50%;vertical-align:middle;margin-right:6px;box-shadow:2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light)}
    .pt-vert{background:#2e9e4f}.pt-rouge{background:#d62828}.pt-gris{background:#b6bcc6}
    .ret{color:#f28c28;font-weight:600}.mis{color:#1e5aa8;font-weight:600}
    #zoneMois{overflow-x:auto;margin-top:18px}
    #zoneMois h3{margin:0 0 8px}
    #zoneMois table{font-size:11px;margin-top:6px}
    #zoneMois th,#zoneMois td{padding:4px 3px;text-align:center}
    #zoneMois th:first-child,#zoneMois td:first-child{text-align:left;white-space:nowrap}
    #zoneMois td.tot{font-weight:600}
    @media print{
      body:not(.impr-mois) #zoneMois{display:none}
      body.impr-mois main>*:not(#zoneMois){display:none!important}
      body.impr-mois #zoneMois{overflow:visible}
      #zoneMois th{background:#1e5aa8!important;color:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      #zoneMois th,#zoneMois td{border:1px solid #777!important}
    }`;
  document.head.appendChild(stBureau);

  const ctx = () => ({pres:lire("presencesBureau", []), missions:lire("missions", []), locs:lire("localisations", [])});
  const missionsDe = (u, iso, c) => c.missions.filter(m => m.email === u.email && m.debut <= iso && iso <= (m.fin || m.debut));
  // Code du jour : P présent · R retard · M en mission · A absent · E en attente · F à venir · W week-end
  const codeJour = (u, iso, c) => {
    if (!estOuvre(iso)) return {code:"W"};
    const rec = c.pres.find(p => p.email === u.email && p.date === iso);
    if (rec) return {code:(rec.heure && rec.heure > HEURE_RETARD) ? "R" : "P", heure:rec.heure};
    if (missionsDe(u, iso, c).length) return {code:"M"};
    const auj = aujourdhui();
    if (iso > auj) return {code:"F"};
    if (iso === auj && new Date().getHours() < HEURE_LIMITE_BUREAU) return {code:"E"};
    return {code:"A"};
  };
  const badge = r => {
    const h = r.heure ? ` <small>(${echapper(r.heure)})</small>` : "";
    return {P:'<span class="pres">Présent</span>' + h, R:'<span class="ret">Retard</span>' + h, M:'<span class="mis">En mission</span>',
      A:'<span class="abs">Absent</span>', E:'<span class="attente">En attente</span>', F:"-", W:"-"}[r.code];
  };
  const pt = (cls, texte, heure) => `<span class="pt ${cls}" title="${texte}"></span><small>${texte}${heure ? " · " + heure : ""}</small>`;
  const pointBureau = (u, d, c) => {
    if (d !== aujourdhui()) return "-";
    const l = c.locs.find(x => x.email === u.email && x.date === d);
    if (!l) return pt("pt-gris", "Position inconnue");
    const h = new Date(l.maj).toTimeString().slice(0, 5);
    if (l.dansBureau && Date.now() - l.maj < FRAICHEUR_GEO) return pt("pt-vert", "Au bureau", h);
    return pt("pt-rouge", l.dansBureau ? "Plus de signal" : "Hors du bureau", h);
  };
  const ligne = (u, d, c) => {
    const mis = missionsDe(u, d, c).map(m => echapper(m.intitule)).join(" ; ");
    const rec = c.pres.find(p => p.email === u.email && p.date === d), sortie = rec && rec.sortie ? echapper(rec.sortie) : "-";
    return `<tr><td>${echapper(nomComplet(u))}</td><td>${echapper(u.fonction || "")}</td><td>${dateFr(d)}</td><td>${mis}</td><td>${badge(codeJour(u, d, c))}</td><td>${sortie}</td><td>${pointBureau(u, d, c)}</td></tr>`;
  };
  const afficher = () => {
    const c = ctx(), auj = aujourdhui(), liste = membres(), dsel = $("dateRecherche").value;
    let html = "";
    if (dsel && !estOuvre(dsel)) html = `<tr><td colspan="7">Le ${dateFr(dsel)} est un week-end : pas de liste de présence (samedi et dimanche ne sont pas comptés).</td></tr>`;
    else if (!sel.value || dsel) {          // liste complète d'une date (aujourd'hui par défaut)
      const d = dsel || auj, l = sel.value ? liste.filter(x => x.email === sel.value) : liste;
      html = l.map(u => ligne(u, d, c)).join("");
    } else {
      const u = liste.find(x => x.email === sel.value);
      if (u) {   // historique du membre : jours ouvrés (week-ends exclus) depuis la 1re présence enregistrée (60 jours maximum)
        const min = isoDe(new Date(Date.now() - 60 * 864e5)), premier = c.pres.map(p => p.date).sort()[0] || auj, debut = premier > min ? premier : min;
        for (let d = new Date(); isoDe(d) >= debut; d.setDate(d.getDate() - 1)) {
          const iso = isoDe(d);
          if (estOuvre(iso)) html += ligne(u, iso, c);
        }
      }
    }
    $("tbody").innerHTML = html || '<tr><td colspan="7">Aucun résultat.</td></tr>';
    reappliquerRecherche();
  };

  // ---- Impression de la liste d'un mois (du 1er au dernier jour du mois, sans samedis ni dimanches) ----
  const stPage = document.createElement("style");
  stPage.textContent = "@page{size:landscape;margin:10mm}";
  window.addEventListener("afterprint", () => { document.body.classList.remove("impr-mois"); stPage.remove(); });
  const construireMois = () => {
    const val = $("moisImpression").value || aujourdhui().slice(0, 7), [a, m] = val.split("-").map(Number);
    const nb = new Date(a, m, 0).getDate(), c = ctx(), jours = [];
    for (let j = 1; j <= nb; j++) {
      const iso = `${a}-${String(m).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
      if (estOuvre(iso)) jours.push({j, iso, s:"DLMMJVS"[new Date(a, m - 1, j).getDay()]});
    }
    const nomMois = new Date(a, m - 1, 1).toLocaleDateString("fr-FR", {month:"long", year:"numeric"});
    const lettre = {P:"P", R:"R", A:"A", M:"M", E:"", F:"", W:""};
    const lignes = membres().map(u => {
      const n = {P:0, R:0, A:0, M:0};
      const cases = jours.map(x => { const k = codeJour(u, x.iso, c).code; if (n[k] !== undefined) n[k]++; return `<td>${lettre[k]}</td>`; }).join("");
      return `<tr><td>${echapper(nomComplet(u))}</td>${cases}<td class="tot">${n.P + n.R}</td><td class="tot">${n.R}</td><td class="tot">${n.A}</td><td class="tot">${n.M}</td></tr>`;
    }).join("");
    $("zoneMois").innerHTML = `<h3>Liste de présence — ${echapper(nomMois)} (du 1er au ${nb})</h3>
      <p>Heure de service : ${hFr(HEURE_SERVICE)} · Retard : arrivée après ${hFr(HEURE_RETARD)} · Samedis et dimanches non comptés.<br>
      <b>P</b> présent · <b>R</b> retard · <b>A</b> absent · <b>M</b> en mission · case vide : jour à venir.</p>
      <table><thead><tr><th>Nom et prénom</th>${jours.map(x => `<th>${x.j}<br><small>${x.s}</small></th>`).join("")}<th>Présences</th><th>Retards</th><th>Absences</th><th>Missions</th></tr></thead>
      <tbody>${lignes || `<tr><td colspan="${jours.length + 5}">Aucun membre.</td></tr>`}</tbody></table>
      <p><small>Édité le ${dateFr(aujourdhui())}</small></p>`;
  };
  $("imprimerMois").onclick = () => {
    construireMois();
    document.head.appendChild(stPage); document.body.classList.add("impr-mois");
    window.print();
  };

  // ---- Enregistrement de la présence (scan du QR code du bureau) ----
  const estMembre = !!moi && aStatut(moi, "EEB-ONG");
  $("barreScan").style.display = estMembre ? "" : "none";
  const enregistrer = async texte => {
    if (!lireBureau(texte)) { await fenetre("Code QR non reconnu : scannez le code QR « EEB-ONG » de la page À propos."); return; }
    if (!estMembre) { await fenetre("Seuls les membres de EEB-ONG peuvent enregistrer leur présence au bureau."); return; }
    const pres = lire("presencesBureau", []), auj = aujourdhui();
    if (!estOuvre(auj)) { await fenetre("Aujourd'hui est un week-end : la présence n'est pas comptée."); return; }
    const rec = pres.find(p => p.email === moi.email && p.date === auj);
    if (rec) {   // deuxième scan : sortie, possible à partir de 18H00
      if (rec.sortie) { await fenetre("Votre sortie d'aujourd'hui est déjà enregistrée à " + rec.sortie + "."); return; }
      if (heureMin() < HEURE_SORTIE) { await fenetre("Votre arrivée est déjà enregistrée. Le scan de sortie est possible à partir de " + hFr(HEURE_SORTIE) + "."); return; }
      rec.sortie = heureMin();
      if (!ecrire("presencesBureau", pres)) return;
      msg.textContent = "✔ Sortie enregistrée à " + rec.sortie + "."; afficher();
      await fenetre("Code QR scanné avec succès"); return;
    }
    pres.push({email:moi.email, date:auj, heure:heureMin()});
    if (!ecrire("presencesBureau", pres)) return;
    const tard = heureMin() > HEURE_RETARD;
    msg.textContent = "✔ Présence enregistrée à " + heureMin() + (tard ? " (retard : arrivée après " + hFr(HEURE_RETARD) + ")." : "."); afficher();
    await fenetre("Code QR scanné avec succès");
  };
  $("scanBureau").onclick = () => ouvrirScanner("Scanner le code QR EEB-ONG du bureau", enregistrer);

  // ---- Bouton de localisation ----
  const majBoutonGeo = () => { $("activerGeo").textContent = geoId !== null ? "📍 Localisation activée (désactiver)" : "📍 Activer ma localisation"; };
  $("activerGeo").onclick = async () => {
    if (geoId !== null) { arreterGeo(); majBoutonGeo(); msg.textContent = "Localisation désactivée."; afficher(); return; }
    if (!navigator.geolocation) { await fenetre("La localisation n'est pas disponible sur cet appareil ou ce navigateur."); return; }
    demarrerGeo(() => { majBoutonGeo(); fenetre("Localisation refusée : autorisez la position dans les réglages du navigateur pour ce site."); });
    majBoutonGeo();
    msg.textContent = "Localisation activée : votre position est comparée à celle du bureau (les coordonnées ne sont pas enregistrées). Gardez l'application ouverte.";
  };
  majBoutonGeo();

  sel.onchange = afficher; $("dateRecherche").onchange = afficher;
  const paramQr = new URLSearchParams(location.search).get("qr");   // code lu avec l'appareil photo du téléphone
  if (paramQr) { try { history.replaceState(null, "", location.pathname); } catch (e) {} enregistrer(paramQr); }
  afficher(); synchroniser(afficher);
}

// ---- Déploiement : page de lecture, alimentée depuis la page Administrateur ----
if (page === "deploiement") {
  const groupes = lire("groupes", []);
  $("tbody").innerHTML = groupes.length ? groupes.map(g => `<tr><td>${echapper(g.groupe)}</td><td>${echapper(g.metier)}</td><td>${echapper(g.entreprise)}</td>
    <td>${echapper(g.depart)}</td><td>${echapper(g.retour)}</td></tr>`).join("")
    : '<tr><td colspan="5">Aucun groupe de déploiement pour le moment.</td></tr>';

  // Si la page HTML n'a pas (encore) la liste des groupes et la box, on les crée ici, en haut, sur la même ligne
  if (!$("choixGroupe") || !$("boxApprenants")) {
    const stDep = document.createElement("style");
    stDep.textContent = `.ligne-groupes{display:flex;flex-wrap:nowrap;align-items:flex-start;gap:12px;margin:12px 0}
      .ligne-groupes select{flex:0 0 38%;min-width:0;width:38%}
      .box-apprenants{flex:1 1 0;min-width:0;min-height:42px;max-height:160px;overflow-y:auto;padding:10px;border-radius:8px;background:var(--bg);box-shadow:inset 3px 3px 5px var(--shadow-dark), inset -3px -3px 5px var(--shadow-light)}
      .box-apprenants h3{font-size:.85rem;margin:0 0 6px} .box-apprenants p{margin:0} .box-apprenants ul{margin:0;padding-left:18px}`;
    document.head.appendChild(stDep);
    const ligne = document.createElement("div"); ligne.className = "ligne-groupes noprint";
    ligne.innerHTML = '<select id="choixGroupe" aria-label="Choisir un groupe"></select><div id="boxApprenants" class="box-apprenants"></div>';
    const h = document.querySelector("main h1, main h2");
    if (h) h.insertAdjacentElement("afterend", ligne); else document.querySelector("main").prepend(ligne);
  }

  // Liste déroulante des groupes : le choix affiche les apprenants du groupe dans la box
  const choix = $("choixGroupe"), box = $("boxApprenants");
  if (choix && box) {
  const AUCUN = "<p>Choisissez un groupe pour voir ses apprenants.</p>";
  choix.innerHTML = groupes.length
    ? '<option value="">Choisir un groupe</option>' + groupes.map((g, i) => `<option value="${i}">${echapper(g.groupe)}</option>`).join("")
    : '<option value="">Aucun groupe créé</option>';
  choix.disabled = !groupes.length;
  box.innerHTML = groupes.length ? AUCUN : "<p>Aucun groupe créé pour le moment.</p>";
  choix.onchange = () => {
    const g = groupes[choix.value];
    if (!g) { box.innerHTML = AUCUN; return; }
    const m = g.membres || [];
    box.innerHTML = `<h3>${echapper(g.groupe)} — ${m.length} apprenant(s)</h3>` +
      (m.length ? `<ul>${m.map(n => `<li>${echapper(n)}</li>`).join("")}</ul>` : "<p>Aucun apprenant dans ce groupe.</p>");
  };
  }
}

// ---- Parents (lecture seule : les ajouts se font depuis la page Administrateur) ----
if (page === "parents") {
  $("tbody").innerHTML = lire("parents", []).map(p => `<tr><td>${echapper(p.apprenant)}</td><td>${echapper(p.nom)}</td><td>${echapper(p.tel)}</td><td>${echapper(p.commune)}</td><td>${echapper(p.adresse)}</td></tr>`).join("");
}

// ---- Engagement (page publique : le visiteur choisit le parent, le métier et la date ; la signature vient de l'administration) ----
if (page === "engagement") {
  const parents = lire("parents", []), engagements = lire("engagements", []);
  const VIDE = "………………";
  $("texteEng").innerHTML = htmlEngagement(texteEngagement());   // texte modifiable depuis la page Administrateur
  const aujourdhuiISO = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const versISO = s => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s || ""); return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : ""; };
  const norm = s => String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  const listeMetiers = extra => { const l = [...listes("metiers")]; if (extra && !l.includes(extra)) l.push(extra);
    $("metier").innerHTML = "<option value=''>Choisir le métier</option>" + l.map(m => `<option>${echapper(m)}</option>`).join(""); };
  // Met à jour les textes de la fiche (parent, enfant, métier, nom du parent sous la signature)
  const montrer = (p, metier) => {
    document.querySelectorAll(".nom-parent").forEach(s => s.textContent = p ? p.nom : VIDE);
    $("nomParentSig").textContent = p ? p.nom : VIDE;
    document.querySelectorAll(".nom-enfant").forEach(s => s.textContent = p && p.apprenant ? p.apprenant : VIDE);
    document.querySelectorAll(".metier-choisi").forEach(s => s.textContent = metier || VIDE);
  };
  $("parent").innerHTML = "<option value=''>Choisir le parent</option>" + parents.map((p,i) => `<option value="${i}">${echapper(p.nom)} (parent de ${echapper(p.apprenant)})</option>`).join("");
  listeMetiers(); montrer(null, ""); $("dateEng").value = aujourdhuiISO();
  // Signature et cachet du Directeur Exécutif (image PNG envoyée depuis la page Administrateur)
  const dir = lire("signatureDirecteur", "");
  if (dir) { $("signatureDirecteur").src = dir; $("signatureDirecteur").style.display = "block";
    $("cadreDirecteurTexte").style.display = "none"; $("cadreDirecteur").style.opacity = 1; }
  $("parent").onchange = () => {
    const p = parents[$("parent").value];
    const e = p ? [...engagements].reverse().find(x => norm(x.parent) === norm(p.nom) && (!x.apprenant || norm(x.apprenant) === norm(p.apprenant))) : null;   // dernier engagement signé de ce parent
    const u = p ? lire("users", []).find(x => ((x.nom ?? "") + " " + (x.prenom ?? "")).trim() === p.apprenant) : null;
    const m = u && u.metier ? u.metier : "";   // métier de l'apprenant présélectionné (modifiable)
    listeMetiers(m); $("metier").value = m; montrer(p, m);
    $("accord").checked = !!e;
    $("dateEng").value = (e && versISO(e.date)) || aujourdhuiISO();
    $("signatureVue").style.display = e ? "block" : "none"; if (e) $("signatureVue").src = e.signature;
    $("sansSignature").style.display = p && !e ? "block" : "none";
  };
  $("metier").onchange = () => montrer(parents[$("parent").value], $("metier").value);
}

// ---- Témoignages (lecture seule : ajout et suppression depuis la page Administrateur) ----
if (page === "temoignages") {
  $("liste").innerHTML = lire("temoignages", []).map(t => `<div style="border:1px solid var(--orange);padding:10px;margin:10px 0">
    <b>${echapper(t.auteur)}</b><p>${echapper(t.texte)}</p>${t.image ? `<img src="${echapper(t.image)}" style="max-width:100%">` : ""}
    ${t.video ? `<video src="${echapper(t.video)}" controls style="max-width:100%"></video>` : ""}</div>`).join("");
}
// Documents : page de lecture, alimentée depuis la page Administrateur
if (page === "documents") {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const videoHtml = v => {
    if (!v) return "";
    const yt = v.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    if (yt) return `<div class="doc-video"><iframe src="https://www.youtube.com/embed/${yt[1]}" title="Vidéo" loading="lazy" allowfullscreen></iframe></div>`;
    if (/^data:video|\.(mp4|webm|ogg)(\?|#|$)/i.test(v)) return `<video class="doc-media" src="${esc(v)}" controls playsinline preload="metadata"></video>`;
    return `<a href="${esc(v)}" target="_blank" rel="noopener">▶ Voir la vidéo</a>`;
  };
  const carte = d => `<div class="doc-carte">
    ${d.image ? `<img class="doc-image" src="${esc(d.image)}" alt="${esc(d.titre)}" loading="lazy">` : ""}
    <div class="doc-corps">
      <h3>${esc(d.titre)}</h3>
      ${d.texte ? `<p class="doc-texte">${esc(d.texte)}</p>` : ""}
      ${videoHtml(d.video)}
      ${d.fichier ? `<a class="btn doc-fichier" href="${esc(d.fichier)}" download="${esc(d.nomFichier || "document")}" target="_blank" rel="noopener">⬇ Télécharger ${esc(d.nomFichier || "le fichier")}</a>` : ""}
    </div></div>`;
  const docs = lire("documents", []);
  $("liste").innerHTML = docs.length ? docs.map(carte).join("")
    : '<div class="doc-vide">Aucun document pour le moment.</div>';
}

// ---- Contact ----
if (page === "contact") {
  $("formContact").onsubmit = e => { e.preventDefault();
    ecrire("messages", [...lire("messages", []), {nom:$("nom").value, email:$("email").value, message:$("message").value, date:new Date().toISOString()}]);
    $("formContact").reset(); $("msg").textContent = "Message envoyé. Merci !"; };
}

// ---- Barre de recherche à droite du titre (trait orange) ----
const PAGES_RECHERCHE = ["documents","temoignages","engagement","parents","deploiement","suivi","liste","accueil","formateur","tuteur","presence"];
if (PAGES_RECHERCHE.includes(page)) {
  const titre = document.querySelector("main h1, main h2");
  const bloc = document.createElement("div"); bloc.className = "entete-page";
  titre.parentNode.insertBefore(bloc, titre); bloc.appendChild(titre);
  const champ = document.createElement("input");
  champ.type = "search"; champ.placeholder = t("Rechercher..."); champ.className = "recherche noprint";
  // Champ + icône loupe (à gauche, dans le champ)
  const boite = document.createElement("div"); boite.className = "recherche-box noprint";
  boite.innerHTML = '<svg class="recherche-icone" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
  boite.appendChild(champ); bloc.appendChild(boite);
  const stRech = document.createElement("style");
  stRech.textContent = `.recherche-box{position:relative;width:45%;max-width:260px;margin-bottom:6px}
    .recherche-box .recherche{width:100%;max-width:none;margin:0;padding-left:36px}
    .recherche-icone{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--orange);pointer-events:none}`;
  document.head.appendChild(stRech);
  champ.oninput = () => {
    const q = champ.value.toLowerCase();
    // lignes de tableau, cartes, paragraphes et choix de liste déroulante
    document.querySelectorAll("tbody tr, #liste > div, main > p, #parent option").forEach(el => {
      const ok = el.textContent.toLowerCase().includes(q);
      el.style.display = ok ? "" : "none"; el.hidden = !ok;
    });
  };
}

// ---- Profil ----
if (page === "profil") {
  document.querySelectorAll("[data-i18n]").forEach(e => e.textContent = t(e.dataset.i18n));
  document.querySelectorAll("[data-i18n-ph]").forEach(e => e.placeholder = t(e.dataset.i18nPh));
  const users = lire("users", []);
  const i = users.findIndex(u => u.email === lire("session", null));
  if (i < 0) document.querySelector("main").innerHTML = '<h2>Mon profil</h2><p>Vous n\'êtes pas connecté. <a href="connexion.html">Se connecter</a></p>';
  else {
    const message = txt => $("msgProfil").textContent = t(txt);
    remplirSelect("metier","metiers",t("Métier")); remplirSelect("centre","centres",t("Centre de formation")); remplirSelect("entreprise","entreprises",t("Entreprise"));
    const afficher = () => {
      const u = users[i];
      // Initiale de secours (prénom, sinon nom, sinon "?"), encodée pour ne pas casser l'image
      const initiale = Array.from(String(u.prenom || u.nom || "?").trim())[0]?.toUpperCase() || "?";
      const avatar = "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='120' height='120' fill='#f28c28'/><text x='60' y='78' font-size='52' font-family='Arial,sans-serif' text-anchor='middle' fill='white'>" + echapper(initiale) + "</text></svg>";
      $("photoProfil").src = u.photo || "data:image/svg+xml;charset=utf-8," + encodeURIComponent(avatar);
      $("nomProfil").textContent = nomComplet(u);
      $("detailsProfil").innerHTML = [[t("Statut"), statutsDe(u).join(" + ")], [t("Adresse mail"), u.email], [t("Téléphone"), u.tel],
        [t("Métier"), u.metier], [t("Centre de formation"), u.centre], [t("Entreprise"), u.entreprise]]
        .filter(d => d[1]).map(d => `<b>${echapper(d[0])} :</b> ${echapper(d[1])}`).join("<br>");
      $("nom").value = u.nom ?? ""; $("prenom").value = u.prenom ?? ""; $("tel").value = u.tel ?? "";
      $("metier").value = u.metier ?? ""; $("centre").value = u.centre ?? ""; $("entreprise").value = u.entreprise ?? "";
      $("email").value = u.email ?? ""; $("langue").value = langue();
    };
    const sauver = () => { ecrire("users", users); afficher(); };
    $("langue").onchange = () => { ecrire("langue", $("langue").value); location.reload(); };
    $("formInfos").onsubmit = e => { e.preventDefault();
      Object.assign(users[i], {nom:$("nom").value, prenom:$("prenom").value, tel:$("tel").value,
        metier:$("metier").value, centre:$("centre").value, entreprise:$("entreprise").value});
      sauver(); message("Informations enregistrées."); };
    $("formConn").onsubmit = async e => { e.preventDefault();
      try {
        if (!await EEB.verifierMdp($("ancienMdp").value)) return message("Mot de passe actuel incorrect.");
        if ($("email").value.trim().toLowerCase() !== users[i].email) { $("email").value = users[i].email;
          return message("Le changement d'adresse mail n'est pas disponible : contactez l'administrateur."); }
        const nv = $("nouveauMdp").value;
        if (nv) { if (nv.length < 6) return message("6 caractères minimum."); await EEB.changerMdp($("ancienMdp").value, nv); }
        $("ancienMdp").value = $("nouveauMdp").value = "";
        message("Données de connexion mises à jour.");
      } catch (err) { message(EEB.messageErreur(err)); } };
    $("nouvellePhoto").onchange = () => lireFichier($("nouvellePhoto"), img => {
      const im = new Image();
      im.onload = () => {   // réduction de l'image pour économiser la mémoire du navigateur
        const k = Math.min(1, 300 / Math.max(im.width, im.height)), c = document.createElement("canvas");
        c.width = im.width * k; c.height = im.height * k;
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        users[i].photo = c.toDataURL("image/jpeg", 0.8); sauver(); message("Photo mise à jour.");
      };
      im.src = img; });
    $("deconnexion").onclick = async () => {
      await EEB.deconnecter(); sessionStorage.removeItem("admin"); location.href = "index.html"; };
    afficher();
  }
}
