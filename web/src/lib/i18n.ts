// FleetMaster Pro - i18n System (English + Bengali)
// Supports runtime language switching persisted in localStorage

export type Language = 'en' | 'bn';

export const translations = {
  en: {
    // App
    appName: 'FleetMaster Pro',
    appTagline: 'Enterprise Fleet Management',

    // Navigation
    nav: {
      dashboard: 'Dashboard',
      vehicles: 'Vehicles',
      tickets: 'Tickets',
      fuel: 'Fuel Tracking',
      payments: 'Payments',
      expenses: 'Expenses',
      analytics: 'Analytics',
      users: 'Team',
      settings: 'Settings',
      logout: 'Logout',
    },

    // Auth
    auth: {
      login: 'Sign In',
      register: 'Register',
      phone: 'Phone Number',
      password: 'Password',
      companyName: 'Company Name',
      ownerName: 'Owner Name',
      email: 'Email (Optional)',
      loginBtn: 'Sign In',
      registerBtn: 'Create Organization',
      forgotPassword: 'Forgot password?',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?',
      signingIn: 'Signing in...',
      registering: 'Registering...',
    },

    // Dashboard
    dashboard: {
      welcome: 'Welcome back',
      activeVehicles: 'Active Vehicles',
      openTickets: 'Open Tickets',
      fuelThisMonth: 'Fuel This Month',
      netProfit: 'Net Profit',
      expiryAlerts: 'Expiry Alerts',
      recentActivity: 'Recent Activity',
      quickActions: 'Quick Actions',
      addVehicle: 'Add Vehicle',
      newTicket: 'New Ticket',
      logFuel: 'Log Fuel',
      viewReports: 'View Reports',
    },

    // Vehicles
    vehicles: {
      title: 'Fleet Vehicles',
      addVehicle: 'Add Vehicle',
      regNumber: 'Registration Number',
      brand: 'Brand',
      model: 'Model',
      year: 'Year',
      fuelType: 'Fuel Type',
      status: 'Status',
      odometer: 'Odometer',
      driver: 'Driver',
      helper: 'Helper',
      engineNo: 'Engine No.',
      chassisNo: 'Chassis No.',
      documents: 'Documents',
      serviceHistory: 'Service History',
      fuelLogs: 'Fuel Logs',
      viewDetails: 'View Details',
      editVehicle: 'Edit Vehicle',
      documentVault: 'Document Vault',
      uploadDocument: 'Upload Document',
      noDocuments: 'No documents uploaded',
      expiresIn: 'Expires in',
      days: 'days',
    },

    // Tickets
    tickets: {
      title: 'Maintenance Tickets',
      newTicket: 'New Ticket',
      kanban: 'Kanban Board',
      type: 'Issue Type',
      status: 'Status',
      vehicle: 'Vehicle',
      reportedBy: 'Reported By',
      assignedTo: 'Assigned To',
      description: 'Description',
      odometer: 'Odometer Reading',
      images: 'Photos',
      voiceNote: 'Voice Note',
      solution: 'Solution',
      partsUsed: 'Parts Used',
      laborCost: 'Labor Cost',
      totalCost: 'Total Cost',
      assign: 'Assign Technician',
      solve: 'Mark Solved',
      close: 'Close Ticket',
      statuses: {
        Open: 'Open',
        Assigned: 'Assigned',
        InProgress: 'In Progress',
        Solved_PendingPayment: 'Pending Payment',
        Solved: 'Solved',
        Closed: 'Closed',
      },
    },

    // Fuel
    fuel: {
      title: 'Fuel Tracking',
      logFuel: 'Log Fuel Fill-up',
      date: 'Fuel Date',
      liters: 'Liters',
      pricePerLiter: 'Price/Liter',
      totalCost: 'Total Cost',
      station: 'Fuel Station',
      odometer: 'Odometer Reading',
      odoPhoto: 'Odometer Photo',
      mileage: 'Mileage (km/L)',
      efficiency: 'Fuel Efficiency',
      trend: 'Fuel Trend',
      verifyOdo: 'Verify Odometer',
      alerts: 'Low Efficiency Alerts',
    },

    // Payments
    payments: {
      title: 'Payments',
      pending: 'Pending Verification',
      history: 'Transaction History',
      method: 'Payment Method',
      amount: 'Amount',
      transactionId: 'Transaction ID',
      verify: 'Verify Payment',
      reject: 'Reject',
      status: 'Status',
      invoiceNo: 'Invoice No.',
      ticketNo: 'Ticket No.',
      exportCSV: 'Export CSV',
    },

    // Expenses
    expenses: {
      title: 'Expenses & Income',
      addExpense: 'Add Expense',
      addIncome: 'Add Income',
      category: 'Category',
      amount: 'Amount',
      date: 'Date',
      notes: 'Notes',
      vehicle: 'Vehicle',
      source: 'Income Source',
      description: 'Description',
      totalExpenses: 'Total Expenses',
      totalIncome: 'Total Income',
      netBalance: 'Net Balance',
    },

    // Analytics
    analytics: {
      title: 'Reports & Analytics',
      profitLoss: 'Profit & Loss',
      expenseBreakdown: 'Expense Breakdown',
      fuelAnalytics: 'Fuel Analytics',
      downloadPDF: 'Download PDF',
      revenue: 'Revenue',
      expenses: 'Expenses',
      netProfit: 'Net Profit',
      period: 'Period',
    },

    // Users
    users: {
      title: 'Team Management',
      addMember: 'Add Team Member',
      name: 'Name',
      phone: 'Phone',
      role: 'Role',
      email: 'Email',
      licenseNo: 'License No.',
      licenseExpiry: 'License Expiry',
      vehicle: 'Assigned Vehicle',
      active: 'Active',
      inactive: 'Inactive',
      deactivate: 'Deactivate',
      edit: 'Edit',
      roles: {
        owner: 'Owner',
        driver: 'Driver',
        helper: 'Helper',
        technician: 'Technician',
        accountant: 'Accountant',
      },
    },

    // Common
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      add: 'Add',
      search: 'Search...',
      filter: 'Filter',
      loading: 'Loading...',
      noData: 'No data found',
      error: 'Something went wrong',
      success: 'Success!',
      confirm: 'Confirm',
      back: 'Back',
      close: 'Close',
      submit: 'Submit',
      required: 'Required',
      optional: 'Optional',
      all: 'All',
      yes: 'Yes',
      no: 'No',
    },

    // Roles
    roles: {
      owner: 'Owner',
      driver: 'Driver',
      helper: 'Helper',
      technician: 'Technician',
      accountant: 'Accountant',
    },
  },

  bn: {
    // App
    appName: 'ফ্লিটমাস্টার প্রো',
    appTagline: 'এন্টারপ্রাইজ ফ্লিট ম্যানেজমেন্ট',

    // Navigation
    nav: {
      dashboard: 'ড্যাশবোর্ড',
      vehicles: 'গাড়িসমূহ',
      tickets: 'টিকিট',
      fuel: 'জ্বালানি ট্র্যাকিং',
      payments: 'পেমেন্ট',
      expenses: 'খরচ',
      analytics: 'বিশ্লেষণ',
      users: 'দল',
      settings: 'সেটিংস',
      logout: 'লগ আউট',
    },

    // Auth
    auth: {
      login: 'সাইন ইন',
      register: 'নিবন্ধন',
      phone: 'ফোন নম্বর',
      password: 'পাসওয়ার্ড',
      companyName: 'কোম্পানির নাম',
      ownerName: 'মালিকের নাম',
      email: 'ইমেইল (ঐচ্ছিক)',
      loginBtn: 'সাইন ইন করুন',
      registerBtn: 'প্রতিষ্ঠান তৈরি করুন',
      forgotPassword: 'পাসওয়ার্ড ভুলে গেছেন?',
      noAccount: 'অ্যাকাউন্ট নেই?',
      hasAccount: 'ইতিমধ্যে অ্যাকাউন্ট আছে?',
      signingIn: 'সাইন ইন হচ্ছে...',
      registering: 'নিবন্ধন হচ্ছে...',
    },

    // Dashboard
    dashboard: {
      welcome: 'স্বাগতম',
      activeVehicles: 'সক্রিয় গাড়ি',
      openTickets: 'খোলা টিকিট',
      fuelThisMonth: 'এই মাসের জ্বালানি',
      netProfit: 'নিট মুনাফা',
      expiryAlerts: 'মেয়াদ শেষের সতর্কতা',
      recentActivity: 'সাম্প্রতিক কার্যক্রম',
      quickActions: 'দ্রুত কার্যক্রম',
      addVehicle: 'গাড়ি যোগ করুন',
      newTicket: 'নতুন টিকিট',
      logFuel: 'জ্বালানি লগ করুন',
      viewReports: 'রিপোর্ট দেখুন',
    },

    // Vehicles
    vehicles: {
      title: 'ফ্লিট গাড়িসমূহ',
      addVehicle: 'গাড়ি যোগ করুন',
      regNumber: 'নিবন্ধন নম্বর',
      brand: 'ব্র্যান্ড',
      model: 'মডেল',
      year: 'বছর',
      fuelType: 'জ্বালানির ধরন',
      status: 'স্ট্যাটাস',
      odometer: 'ওডোমিটার',
      driver: 'চালক',
      helper: 'সহকারী',
      engineNo: 'ইঞ্জিন নং',
      chassisNo: 'চ্যাসিস নং',
      documents: 'নথিপত্র',
      serviceHistory: 'সার্ভিস ইতিহাস',
      fuelLogs: 'জ্বালানি লগ',
      viewDetails: 'বিস্তারিত দেখুন',
      editVehicle: 'গাড়ি সম্পাদনা',
      documentVault: 'নথি ভল্ট',
      uploadDocument: 'নথি আপলোড করুন',
      noDocuments: 'কোনো নথি আপলোড হয়নি',
      expiresIn: 'মেয়াদ শেষ হবে',
      days: 'দিনে',
    },

    // Tickets
    tickets: {
      title: 'রক্ষণাবেক্ষণ টিকিট',
      newTicket: 'নতুন টিকিট',
      kanban: 'কানবান বোর্ড',
      type: 'সমস্যার ধরন',
      status: 'স্ট্যাটাস',
      vehicle: 'গাড়ি',
      reportedBy: 'রিপোর্টকারী',
      assignedTo: 'নিযুক্ত',
      description: 'বিবরণ',
      odometer: 'ওডোমিটার রিডিং',
      images: 'ছবি',
      voiceNote: 'ভয়েস নোট',
      solution: 'সমাধান',
      partsUsed: 'ব্যবহৃত যন্ত্রাংশ',
      laborCost: 'শ্রম খরচ',
      totalCost: 'মোট খরচ',
      assign: 'টেকনিশিয়ান নিযুক্ত করুন',
      solve: 'সমাধান হয়েছে',
      close: 'টিকিট বন্ধ করুন',
      statuses: {
        Open: 'খোলা',
        Assigned: 'নিযুক্ত',
        InProgress: 'চলমান',
        Solved_PendingPayment: 'পেমেন্ট বাকি',
        Solved: 'সমাধান হয়েছে',
        Closed: 'বন্ধ',
      },
    },

    // Fuel
    fuel: {
      title: 'জ্বালানি ট্র্যাকিং',
      logFuel: 'জ্বালানি ভরা লগ করুন',
      date: 'তারিখ',
      liters: 'লিটার',
      pricePerLiter: 'প্রতি লিটার দাম',
      totalCost: 'মোট খরচ',
      station: 'পেট্রোল স্টেশন',
      odometer: 'ওডোমিটার রিডিং',
      odoPhoto: 'ওডোমিটার ছবি',
      mileage: 'মাইলেজ (কি.মি/লি)',
      efficiency: 'জ্বালানি দক্ষতা',
      trend: 'জ্বালানি প্রবণতা',
      verifyOdo: 'ওডোমিটার যাচাই',
      alerts: 'কম দক্ষতার সতর্কতা',
    },

    // Payments
    payments: {
      title: 'পেমেন্ট',
      pending: 'যাচাই অপেক্ষমাণ',
      history: 'লেনদেনের ইতিহাস',
      method: 'পেমেন্ট পদ্ধতি',
      amount: 'পরিমাণ',
      transactionId: 'ট্রানজেকশন আইডি',
      verify: 'পেমেন্ট যাচাই করুন',
      reject: 'প্রত্যাখ্যান',
      status: 'স্ট্যাটাস',
      invoiceNo: 'ইনভয়েস নং',
      ticketNo: 'টিকিট নং',
      exportCSV: 'CSV ডাউনলোড',
    },

    // Expenses
    expenses: {
      title: 'খরচ ও আয়',
      addExpense: 'খরচ যোগ করুন',
      addIncome: 'আয় যোগ করুন',
      category: 'বিভাগ',
      amount: 'পরিমাণ',
      date: 'তারিখ',
      notes: 'নোট',
      vehicle: 'গাড়ি',
      source: 'আয়ের উৎস',
      description: 'বিবরণ',
      totalExpenses: 'মোট খরচ',
      totalIncome: 'মোট আয়',
      netBalance: 'নিট ব্যালেন্স',
    },

    // Analytics
    analytics: {
      title: 'রিপোর্ট ও বিশ্লেষণ',
      profitLoss: 'লাভ-লোকসান',
      expenseBreakdown: 'খরচের বিভাজন',
      fuelAnalytics: 'জ্বালানি বিশ্লেষণ',
      downloadPDF: 'PDF ডাউনলোড',
      revenue: 'আয়',
      expenses: 'খরচ',
      netProfit: 'নিট মুনাফা',
      period: 'সময়কাল',
    },

    // Users
    users: {
      title: 'দল ব্যবস্থাপনা',
      addMember: 'সদস্য যোগ করুন',
      name: 'নাম',
      phone: 'ফোন',
      role: 'ভূমিকা',
      email: 'ইমেইল',
      licenseNo: 'লাইসেন্স নং',
      licenseExpiry: 'লাইসেন্সের মেয়াদ',
      vehicle: 'নিযুক্ত গাড়ি',
      active: 'সক্রিয়',
      inactive: 'নিষ্ক্রিয়',
      deactivate: 'নিষ্ক্রিয় করুন',
      edit: 'সম্পাদনা',
      roles: {
        owner: 'মালিক',
        driver: 'চালক',
        helper: 'সহকারী',
        technician: 'টেকনিশিয়ান',
        accountant: 'হিসাবরক্ষক',
      },
    },

    // Common
    common: {
      save: 'সংরক্ষণ করুন',
      cancel: 'বাতিল',
      delete: 'মুছুন',
      edit: 'সম্পাদনা',
      view: 'দেখুন',
      add: 'যোগ করুন',
      search: 'খুঁজুন...',
      filter: 'ফিল্টার',
      loading: 'লোড হচ্ছে...',
      noData: 'কোনো তথ্য নেই',
      error: 'কিছু সমস্যা হয়েছে',
      success: 'সফল!',
      confirm: 'নিশ্চিত করুন',
      back: 'ফিরে যান',
      close: 'বন্ধ করুন',
      submit: 'জমা দিন',
      required: 'প্রয়োজনীয়',
      optional: 'ঐচ্ছিক',
      all: 'সব',
      yes: 'হ্যাঁ',
      no: 'না',
    },

    // Roles
    roles: {
      owner: 'মালিক',
      driver: 'চালক',
      helper: 'সহকারী',
      technician: 'টেকনিশিয়ান',
      accountant: 'হিসাবরক্ষক',
    },
  },
} as const;

export type TranslationKeys = typeof translations.en;

// Get stored language from localStorage (SSR-safe)
export function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  return (localStorage.getItem('fm_lang') as Language) || 'en';
}

// Set language in localStorage
export function setStoredLanguage(lang: Language) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('fm_lang', lang);
  }
}

// Get translations for current language
export function t(lang: Language): TranslationKeys {
  return translations[lang] as TranslationKeys;
}
