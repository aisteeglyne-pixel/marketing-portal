// Visi lietuviški tekstai – vienas šaltinis, UTF-8 garantuotas.
// Naudojimas: import { lt } from '@/lib/i18n/lt'

export const lt = {
  common: {
    loading: 'Kraunama...',
    pageInProgress: 'Šis puslapis kuriamas...',
    logout: 'Atsijungti',
    save: 'Išsaugoti',
    cancel: 'Atšaukti',
    edit: 'Redaguoti',
    delete: 'Ištrinti',
    noData: 'Duomenų nėra',
  },

  nav: {
    dashboard: 'Apžvalga',
    clients: 'Klientai',
    content: 'Turinys',
    tasks: 'Užduotys',
    reports: 'Ataskaitos',
    files: 'Failai',
    goals: 'Tikslai',
    settings: 'Nustatymai',
    clientHome: 'Pradžia',
  },

  login: {
    title: 'Klientų portalas',
    subtitle: 'Prisijunkite prie savo paskyros',
    emailLabel: 'El. paštas',
    emailPlaceholder: 'vardas@imone.lt',
    passwordLabel: 'Slaptažodis',
    submitButton: 'Prisijungti',
    submittingButton: 'Jungiamasi...',
    errorMessage: 'Neteisingas el. paštas arba slaptažodis',
  },

  dashboard: {
    title: 'Apžvalga',
    greeting: 'Sveiki',
    stats: {
      activeClients: 'Aktyvūs klientai',
      pendingApproval: 'Laukia patvirtinimo',
      activeTasks: 'Aktyvios užduotys',
    },
    quickActions: {
      title: 'Greiti veiksmai',
      viewContent: 'Peržiūrėti turinį',
      manageClients: 'Valdyti klientus',
      viewTasks: 'Žiūrėti užduotis',
    },
  },

  content: {
    title: 'Turinys',
    newPost: '+ Naujas įrašas',
    noContent: 'Turinio nerasta',
    edit: 'Redaguoti',
    statuses: {
      all: 'Visi',
      draft: 'Juodraštis',
      review: 'Peržiūroje',
      approved: 'Patvirtinta',
      rejected: 'Atmesta',
      published: 'Paskelbta',
    },
  },

  clients: {
    title: 'Klientai',
  },

  tasks: {
    title: 'Užduotys',
  },

  reports: {
    title: 'Ataskaitos',
  },

  files: {
    title: 'Failai',
  },

  goals: {
    title: 'Tikslai',
  },

  settings: {
    title: 'Nustatymai',
  },

  clientHome: {
    title: 'Sveiki',
    stats: {
      pendingApproval: 'Laukia patvirtinimo',
      activeTasks: 'Aktyvios užduotys',
      goals: 'Tikslai',
    },
    quickNav: {
      title: 'Greita navigacija',
      viewContent: 'Peržiūrėti turinį',
      myTasks: 'Mano užduotys',
      uploadFiles: 'Įkelti failus',
    },
  },

  clientContent: {
    title: 'Turinys',
    noContent: 'Kol kas turinio nėra',
    plannedDate: 'Planuojama:',
    commentPlaceholder: 'Komentaras agentūrai (neprivaloma)...',
    approveButton: '✓ Patvirtinti',
    rejectButton: '✕ Atmesti',
    statuses: {
      draft: 'Juodraštis',
      review: 'Peržiūroje',
      approved: 'Patvirtinta',
      rejected: 'Atmesta',
      published: 'Paskelbta',
    },
  },
} as const
