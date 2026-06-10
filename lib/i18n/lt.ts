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
    noClients: 'Klientų nėra',
    selectPrompt: 'Pasirinkite klientą iš kairės',
    newClient: 'Naujas klientas',
    channels: 'Kanalai',
  },

  clientDetail: {
    sections: {
      goals: 'Tikslai',
      tasks: 'Užduotys',
      content: 'Turinys',
      reports: 'Ataskaitos',
      files: 'Failai',
    },
    goals: {
      noGoals: 'Tikslų nėra',
      achieved: 'Pasiekta',
      deadline: 'Terminas:',
    },
    tasks: {
      noTasks: 'Užduočių nėra',
      statuses: {
        backlog: 'Eilėje',
        in_progress: 'Vykdoma',
        review: 'Peržiūroje',
        done: 'Atlikta',
      },
      priorities: {
        low: 'Žema',
        medium: 'Vidutinė',
        high: 'Aukšta',
      },
      types: {
        agency_task: 'Agentūros užduotis',
        client_request: 'Kliento užklausa',
      },
      due: 'Terminas:',
    },
    content: {
      noContent: 'Turinio nėra',
      statuses: {
        draft: 'Juodraštis',
        review: 'Peržiūroje',
        approved: 'Patvirtinta',
        rejected: 'Atmesta',
        published: 'Paskelbta',
      },
      publishDate: 'Planuojama:',
    },
    reports: {
      published: 'Paskelbta',
      pendingApproval: 'Laukia patvirtinimo',
      drafts: 'Juodraščiai',
      thisMonth: 'Šį mėnesį',
      postsUnit: 'įrašai',
    },
    files: {
      noFiles: 'Failų nėra',
      types: {
        video: 'Vaizdo įrašas',
        photo: 'Nuotrauka',
        doc: 'Dokumentas',
        brand: 'Prekės ženklas',
      },
      uploaded: 'Įkelta:',
      download: 'Atsisiųsti',
    },
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
  calendar: {
    title: 'Turinio kalendorius',
    prev: '←',
    next: '→',
    weekdays: ['Pr', 'An', 'Tr', 'Kt', 'Pn', 'Š', 'S'],
    months: ['Sausis','Vasaris','Kovas','Balandis','Gegužė','Birželis','Liepa','Rugpjūtis','Rugsėjis','Spalis','Lapkritis','Gruodis'],
    unscheduled: 'Nesuplanuoti įrašai',
    noUnscheduled: 'Visi įrašai turi datas',
    newPost: '+ Naujas įrašas',
    statuses: {
      draft: 'Juodraštis',
      review: 'Peržiūroje',
      approved: 'Patvirtinta',
      rejected: 'Atmesta',
      published: 'Paskelbta',
    },
  },

  postModal: {
    close: '✕',
    platform: 'Platforma:',
    date: 'Data:',
    noDate: 'Data nenustatyta',
    caption: 'Turinys',
    noCaption: 'Aprašymas nepridėtas',
    comments: 'Komentarai',
    noComments: 'Komentarų dar nėra',
    commentPlaceholder: 'Rašyti komentarą...',
    sendComment: 'Siųsti',
    approveBtn: '✓ Patvirtinti',
    rejectBtn: '✕ Atmesti',
    scheduleSection: 'Planuoti į socialinį tinklą',
    bufferProfile: 'Pasirinkti paskyrą',
    scheduleDate: 'Publikavimo laikas',
    scheduleBtn: 'Suplanuoti per Buffer',
    scheduling: 'Planuojama...',
    noBufferToken: 'Buffer token\'as nenurodytas šiam klientui',
    scheduleSuccess: 'Sėkmingai suplanuota!',
    scheduleError: 'Klaida planuojant. Patikrinkite Buffer token\'ą.',
    loadingProfiles: 'Kraunami Buffer profiliai...',
    noProfiles: 'Buffer profilių nerasta',
  },
} as const
