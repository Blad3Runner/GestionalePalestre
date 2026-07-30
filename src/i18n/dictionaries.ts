import { DEFAULT_LOCALE, type Locale } from "@/i18n/locale";

/**
 * Every piece of text the interface shows, in both languages.
 *
 * Italian is the reference: `Dictionary` is its shape, so TypeScript refuses to compile
 * if the English version forgets a phrase or invents one. No text is written directly
 * into a page — if it is on screen, it is in here.
 */

const it = {
  common: {
    appName: "Gestionale Palestre",
    signIn: "Accedi",
    signOut: "Esci",
    email: "Email",
    password: "Password",
    language: "Lingua",
    italian: "Italiano",
    english: "Inglese",
    back: "Indietro",
    loading: "Attendere…",
  },
  nav: {
    title: "Menu",
    admin: "Amministrazione piattaforma",
    owner: "Gestione palestra",
    desk: "Reception",
    trainer: "Area trainer",
    member: "Area personale",
    signedInAs: "Accesso effettuato come",
    yourRoles: "I tuoi ruoli",
    viewing: "Stai vedendo",
    wholeCircuit: "tutta la struttura",
    allCompanies: "Tutte le società",
    switchScope: "Cambia sede",
  },
  roles: {
    PLATFORM_ADMIN: "Amministratore piattaforma",
    GYM_OWNER: "Titolare",
    STAFF: "Reception",
    TRAINER: "Trainer",
    MEMBER: "Cliente",
  },
  signIn: {
    title: "Accedi",
    lede: "Inserisci le tue credenziali per entrare.",
    submit: "Accedi",
    forgot: "Password dimenticata?",
    failed: "Email o password non corretti.",
    missingFields: "Inserisci email e password.",
  },
  forgot: {
    title: "Password dimenticata",
    lede: "Inserisci la tua email: se l'account esiste, ti invieremo un link per reimpostare la password.",
    submit: "Invia il link",
    sent: "Se quell'indirizzo corrisponde a un account, il link è stato inviato. Controlla la posta.",
    backToSignIn: "Torna all'accesso",
  },
  reset: {
    title: "Nuova password",
    lede: "Scegli una nuova password per il tuo account.",
    newPassword: "Nuova password",
    confirmPassword: "Conferma password",
    submit: "Salva la nuova password",
    done: "Password aggiornata. Ora puoi accedere.",
    invalidToken: "Questo link non è più valido. Richiedine uno nuovo.",
    mismatch: "Le due password non coincidono.",
    tooShort: "La password deve avere almeno {min} caratteri.",
    tooLong: "La password è troppo lunga.",
  },
  denied: {
    title: "Accesso non consentito",
    lede: "Il tuo account non ha i permessi per vedere questa pagina.",
    explanation:
      "Non è un errore tecnico: la pagina esiste, ma è riservata ad altri ruoli. Se pensi che sia uno sbaglio, contatta il titolare.",
    requestedPage: "Pagina richiesta",
    requiredRoles: "Ruoli ammessi",
    yourRoles: "I tuoi ruoli",
    goHome: "Torna alla pagina iniziale",
  },
  pages: {
    adminTitle: "Amministrazione piattaforma",
    adminLede: "Riservato ai fondatori della piattaforma.",
    ownerTitle: "Gestione palestra",
    ownerLede: "Riservato al titolare.",
    deskTitle: "Reception",
    deskLede: "Riservato al titolare e allo staff di reception.",
    trainerTitle: "Area trainer",
    trainerLede: "Riservato ai trainer.",
    memberTitle: "Area personale",
    memberLede: "Riservato ai clienti.",
    placeholder:
      "Questa pagina esiste per dimostrare che i permessi funzionano. I contenuti veri arrivano nei passi successivi del piano.",
  },
};

/**
 * The shape every language must have — the *keys* of the Italian version, with plain
 * strings as values. Deliberately no `as const`: that would freeze each Italian phrase
 * into its own type and make it impossible for English to say anything different.
 */
export type Dictionary = typeof it;

const en: Dictionary = {
  common: {
    appName: "Gestionale Palestre",
    signIn: "Sign in",
    signOut: "Sign out",
    email: "Email",
    password: "Password",
    language: "Language",
    italian: "Italian",
    english: "English",
    back: "Back",
    loading: "Please wait…",
  },
  nav: {
    title: "Menu",
    admin: "Platform administration",
    owner: "Gym management",
    desk: "Front desk",
    trainer: "Trainer area",
    member: "My area",
    signedInAs: "Signed in as",
    yourRoles: "Your roles",
    viewing: "You are viewing",
    wholeCircuit: "the whole circuit",
    allCompanies: "All companies",
    switchScope: "Switch location",
  },
  roles: {
    PLATFORM_ADMIN: "Platform administrator",
    GYM_OWNER: "Gym owner",
    STAFF: "Front desk",
    TRAINER: "Trainer",
    MEMBER: "Member",
  },
  signIn: {
    title: "Sign in",
    lede: "Enter your details to continue.",
    submit: "Sign in",
    forgot: "Forgotten your password?",
    failed: "That email and password do not match.",
    missingFields: "Please enter both email and password.",
  },
  forgot: {
    title: "Forgotten password",
    lede: "Enter your email. If the account exists we will send a link to set a new password.",
    submit: "Send the link",
    sent: "If that address matches an account, the link has been sent. Please check your inbox.",
    backToSignIn: "Back to sign in",
  },
  reset: {
    title: "New password",
    lede: "Choose a new password for your account.",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    submit: "Save the new password",
    done: "Password updated. You can sign in now.",
    invalidToken: "This link is no longer valid. Please request a new one.",
    mismatch: "The two passwords do not match.",
    tooShort: "The password must be at least {min} characters long.",
    tooLong: "That password is too long.",
  },
  denied: {
    title: "Access not allowed",
    lede: "Your account does not have permission to see this page.",
    explanation:
      "This is not a technical fault: the page exists, but it is reserved for other roles. If you believe this is a mistake, contact the gym owner.",
    requestedPage: "Page requested",
    requiredRoles: "Roles allowed",
    yourRoles: "Your roles",
    goHome: "Back to the start page",
  },
  pages: {
    adminTitle: "Platform administration",
    adminLede: "Reserved for the platform founders.",
    ownerTitle: "Gym management",
    ownerLede: "Reserved for the gym owner.",
    deskTitle: "Front desk",
    deskLede: "Reserved for the gym owner and front desk staff.",
    trainerTitle: "Trainer area",
    trainerLede: "Reserved for trainers.",
    memberTitle: "My area",
    memberLede: "Reserved for members.",
    placeholder:
      "This page exists to demonstrate that permissions work. The real content arrives in later steps of the plan.",
  },
};

const dictionaries: Record<Locale, Dictionary> = { it, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

/** Fills `{placeholders}` in a translated string. */
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}
