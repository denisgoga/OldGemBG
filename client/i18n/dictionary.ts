import type { Locale } from "./locales";

type Dict = Record<string, string>;

const DICT: Record<Locale, Dict> = {
  en: {
    "common.loading": "Loading...",
    "common.loadError":
      "We could not load the catalog. The service may be busy — please try again.",
    "common.retry": "Try again",
    "index.howItWorks": "How it works",
    "index.featuredContent": "Featured Content",
    "index.browsePremium":
      "Browse our premium collection. Click on any item to get free access.",
    "index.seoIntroDefault":
      "OldGem.Net offers free access to premium video content. Browse the collection below, click any video to unlock it with a quick free registration, and watch on any device. New content is added regularly—all you need is a free account.",
    "index.watchAllVideos": "Watch all videos",
    "index.paginationPageOf": "Page {{current}} of {{total}}",
    "index.prevPage": "Previous",
    "index.nextPage": "Next",
    "index.noContentYet": "No content yet. Check back soon!",
    "index.pageEmpty": "No items on this page.",
    "index.thumbnailWarmupHint": "Loading...",
    "index.footerAdultsOnly":
      "Adults only. 18+. By entering you confirm you are of legal age.",
    "index.footerCopyright": "© {{year}} OldGem.Net. All rights reserved.",
    "index.footerModels18Plus": "All models are 18 years of age or older.",
    "accessModal.continueBrowsing": "Continue Browsing",
    "accessModal.unlockPrefix": "Unlock",
    "ageGate.accessRestrictedTitle": "Access Restricted",
    "ageGate.accessRestrictedBody":
      "You must be 18 years of age or older to access OldGem.Net.",
    "ageGate.accessRestrictedErrorHint":
      "If you believe this is an error, please close this window.",
    "ageGate.verificationRequiredTitle": "Age Verification Required",
    "ageGate.verificationBody":
      "OldGem.Net contains content restricted to users 18 years of age and older. Please verify your age to continue.",
    "ageGate.verificationQuestion": "Are you 18 years of age or older?",
    "ageGate.no": "No",
    "ageGate.yesConfirm": "Yes, I Confirm",
    "notFound.oops": "Oops! Page not found",
    "notFound.returnToHome": "Return to Home",
  },
  de: {
    "common.loading": "Wird geladen...",
    "common.loadError":
      "Der Katalog konnte nicht geladen werden. Der Dienst ist möglicherweise überlastet — bitte erneut versuchen.",
    "common.retry": "Erneut versuchen",
    "index.howItWorks": "So funktioniert's",
    "index.featuredContent": "Empfohlener Inhalt",
    "index.browsePremium":
      "Entdecke unsere exklusive Sammlung. Klicke auf einen Beitrag und erhalte kostenlosen Zugriff.",
    "index.seoIntroDefault":
      "OldGem.Net bietet kostenlosen Zugriff auf Premium-Videoinhalte. Stöbere unten in der Sammlung, klicke auf ein Video, um es mit einer schnellen kostenlosen Registrierung freizuschalten, und schaue auf jedem Gerät. Neue Inhalte werden regelmäßig hinzugefügt – alles, was du brauchst, ist ein kostenloses Konto.",
    "index.watchAllVideos": "Alle Videos ansehen",
    "index.paginationPageOf": "Seite {{current}} von {{total}}",
    "index.prevPage": "Zurück",
    "index.nextPage": "Weiter",
    "index.noContentYet": "Noch kein Inhalt. Schau bald wieder vorbei!",
    "index.pageEmpty": "Auf dieser Seite gibt es keine Einträge.",
    "index.thumbnailWarmupHint": "Wird geladen...",
    "index.footerAdultsOnly":
      "Nur für Erwachsene. 18+. Mit der Anmeldung bestätigst du, dass du das gesetzliche Mindestalter erreicht hast.",
    "index.footerCopyright": "© {{year}} OldGem.Net. Alle Rechte vorbehalten.",
    "index.footerModels18Plus":
      "Alle Models sind mindestens 18 Jahre alt.",
    "accessModal.continueBrowsing": "Weiter stöbern",
    "accessModal.unlockPrefix": "Freischalten",
    "ageGate.accessRestrictedTitle": "Zugang eingeschränkt",
    "ageGate.accessRestrictedBody":
      "Du musst mindestens 18 Jahre alt sein, um auf OldGem.Net zuzugreifen.",
    "ageGate.accessRestrictedErrorHint":
      "Wenn du glaubst, dass das ein Fehler ist, schließe bitte dieses Fenster.",
    "ageGate.verificationRequiredTitle": "Altersverifizierung erforderlich",
    "ageGate.verificationBody":
      "OldGem.Net enthält Inhalte, die nur für Nutzer ab 18 Jahren bestimmt sind. Bitte bestätige dein Alter, um fortzufahren.",
    "ageGate.verificationQuestion": "Bist du mindestens 18 Jahre alt?",
    "ageGate.no": "Nein",
    "ageGate.yesConfirm": "Ja, ich bestätige",
    "notFound.oops": "Hoppla! Seite nicht gefunden",
    "notFound.returnToHome": "Zur Startseite",
  },
  it: {
    "common.loading": "Caricamento...",
    "common.loadError":
      "Impossibile caricare il catalogo. Il servizio potrebbe essere occupato — riprova.",
    "common.retry": "Riprova",
    "index.howItWorks": "Come funziona",
    "index.featuredContent": "Contenuti in evidenza",
    "index.browsePremium":
      "Scopri la nostra collezione premium. Clicca su qualsiasi elemento per ottenere accesso gratuito.",
    "index.seoIntroDefault":
      "OldGem.Net offre accesso gratuito a contenuti video premium. Sfoglia la collezione qui sotto, clicca su un video per sbloccarlo con una rapida registrazione gratuita e guarda su qualsiasi dispositivo. Nuovi contenuti vengono aggiunti regolarmente: ti serve solo un account gratuito.",
    "index.watchAllVideos": "Guarda tutti i video",
    "index.paginationPageOf": "Pagina {{current}} di {{total}}",
    "index.prevPage": "Precedente",
    "index.nextPage": "Successiva",
    "index.noContentYet": "Nessun contenuto disponibile al momento. Riprova presto!",
    "index.pageEmpty": "Nessun elemento in questa pagina.",
    "index.thumbnailWarmupHint": "Caricamento...",
    "index.footerAdultsOnly":
      "Solo per adulti. 18+. Inserendo confermi di avere l'età legale.",
    "index.footerCopyright": "© {{year}} OldGem.Net. Tutti i diritti riservati.",
    "index.footerModels18Plus":
      "Tutti i modelli hanno almeno 18 anni.",
    "accessModal.continueBrowsing": "Continua a navigare",
    "accessModal.unlockPrefix": "Sblocca",
    "ageGate.accessRestrictedTitle": "Accesso limitato",
    "ageGate.accessRestrictedBody":
      "Devi avere almeno 18 anni per accedere a OldGem.Net.",
    "ageGate.accessRestrictedErrorHint":
      "Se pensi che sia un errore, chiudi questa finestra.",
    "ageGate.verificationRequiredTitle": "Verifica dell'età richiesta",
    "ageGate.verificationBody":
      "OldGem.Net contiene contenuti riservati agli utenti di età pari o superiore a 18 anni. Verifica la tua età per continuare.",
    "ageGate.verificationQuestion": "Hai almeno 18 anni?",
    "ageGate.no": "No",
    "ageGate.yesConfirm": "Sì, confermo",
    "notFound.oops": "Ops! Pagina non trovata",
    "notFound.returnToHome": "Torna alla home",
  },
  es: {
    "common.loading": "Cargando...",
    "common.loadError":
      "No pudimos cargar el catálogo. El servicio puede estar ocupado — inténtalo de nuevo.",
    "common.retry": "Intentar de nuevo",
    "index.howItWorks": "Cómo funciona",
    "index.featuredContent": "Contenido destacado",
    "index.browsePremium":
      "Explora nuestra colección premium. Haz clic en cualquier elemento para obtener acceso gratuito.",
    "index.seoIntroDefault":
      "OldGem.Net ofrece acceso gratuito a contenido de video premium. Explora la colección a continuación, haz clic en cualquier video para desbloquearlo con un registro gratuito rápido y míralo en cualquier dispositivo. Se agregan contenidos con regularidad: solo necesitas una cuenta gratuita.",
    "index.watchAllVideos": "Ver todos los videos",
    "index.paginationPageOf": "Página {{current}} de {{total}}",
    "index.prevPage": "Anterior",
    "index.nextPage": "Siguiente",
    "index.noContentYet": "Aún no hay contenido. ¡Vuelve pronto!",
    "index.pageEmpty": "No hay elementos en esta página.",
    "index.thumbnailWarmupHint": "Cargando...",
    "index.footerAdultsOnly":
      "Solo para adultos. 18+. Al ingresar confirmas que tienes la edad legal.",
    "index.footerCopyright": "© {{year}} OldGem.Net. Todos los derechos reservados.",
    "index.footerModels18Plus":
      "Todos los modelos tienen 18 años o más.",
    "accessModal.continueBrowsing": "Continuar navegando",
    "accessModal.unlockPrefix": "Desbloquear",
    "ageGate.accessRestrictedTitle": "Acceso restringido",
    "ageGate.accessRestrictedBody":
      "Debes tener 18 años o más para acceder a OldGem.Net.",
    "ageGate.accessRestrictedErrorHint":
      "Si crees que es un error, cierra esta ventana.",
    "ageGate.verificationRequiredTitle": "Se requiere verificación de edad",
    "ageGate.verificationBody":
      "OldGem.Net contiene contenido restringido para usuarios de 18 años o más. Verifica tu edad para continuar.",
    "ageGate.verificationQuestion": "¿Tienes 18 años o más?",
    "ageGate.no": "No",
    "ageGate.yesConfirm": "Sí, lo confirmo",
    "notFound.oops": "¡Uy! Página no encontrada",
    "notFound.returnToHome": "Volver al inicio",
  },
  fr: {
    "common.loading": "Chargement...",
    "common.loadError":
      "Impossible de charger le catalogue. Le service est peut-être saturé — réessayez.",
    "common.retry": "Réessayer",
    "index.howItWorks": "Comment ça marche",
    "index.featuredContent": "Contenu vedette",
    "index.browsePremium":
      "Découvrez notre collection premium. Cliquez sur n'importe quel élément pour obtenir un accès gratuit.",
    "index.seoIntroDefault":
      "OldGem.Net vous donne accès gratuitement à des contenus vidéo premium. Parcourez la collection ci-dessous, cliquez sur une vidéo pour la déverrouiller avec une inscription gratuite rapide et regardez sur n'importe quel appareil. De nouveaux contenus sont ajoutés régulièrement : il vous suffit d'un compte gratuit.",
    "index.watchAllVideos": "Voir toutes les vidéos",
    "index.paginationPageOf": "Page {{current}} sur {{total}}",
    "index.prevPage": "Précédent",
    "index.nextPage": "Suivant",
    "index.noContentYet": "Aucun contenu pour le moment. Revenez bientôt !",
    "index.pageEmpty": "Aucun élément sur cette page.",
    "index.thumbnailWarmupHint": "Chargement...",
    "index.footerAdultsOnly":
      "Réservé aux adultes. 18+. En entrant, vous confirmez que vous avez l'âge légal.",
    "index.footerCopyright": "© {{year}} OldGem.Net. Tous droits réservés.",
    "index.footerModels18Plus":
      "Tous les modèles ont 18 ans ou plus.",
    "accessModal.continueBrowsing": "Continuer la navigation",
    "accessModal.unlockPrefix": "Déverrouiller",
    "ageGate.accessRestrictedTitle": "Accès restreint",
    "ageGate.accessRestrictedBody":
      "Vous devez avoir 18 ans ou plus pour accéder à OldGem.Net.",
    "ageGate.accessRestrictedErrorHint":
      "Si vous pensez qu'il s'agit d'une erreur, veuillez fermer cette fenêtre.",
    "ageGate.verificationRequiredTitle": "Vérification d'âge requise",
    "ageGate.verificationBody":
      "OldGem.Net contient du contenu réservé aux utilisateurs de 18 ans et plus. Veuillez vérifier votre âge pour continuer.",
    "ageGate.verificationQuestion": "Avez-vous 18 ans ou plus ?",
    "ageGate.no": "Non",
    "ageGate.yesConfirm": "Oui, je confirme",
    "notFound.oops": "Oups ! Page introuvable",
    "notFound.returnToHome": "Retour à l'accueil",
  },
};

export function t(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
) {
  const localized = DICT[locale]?.[key];
  const fallback = DICT.en[key];
  const template = localized ?? fallback ?? key;

  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_match, varName: string) => {
    const value = vars[varName];
    return value === undefined ? _match : String(value);
  });
}

