/**
 * Type definitions for Noon Learning i18n Localization System
 */

export interface CommonTranslations {
  appName: string;
  appNameFull: string;
  appSlogan: string;
  appDescription: string;
  close: string;
  cancel: string;
  confirm: string;
  save: string;
  delete: string;
  retry: string;
  search: string;
  page: string;
  pageOf: string;
  loading: string;
  errorTitle: string;
  emptyTitle: string;
  back: string;
  home: string;
  library: string;
  addBook: string;
  progress: string;
  settings: string;
  language: string;
  switchLanguage: string;
  arabic: string;
  english: string;
  localPrivacyNotice: string;
  safeForStudents: string;
}

export interface LibraryTranslations {
  pageTitle: string;
  pageSubtitle: string;
  noonBooksSection: string;
  noonBooksSubtitle: string;
  localBooksSection: string;
  localBooksSubtitle: string;
  savedOnDevice: string;
  noLocalBooksYet: string;
  recentBooks: string;
  allBooks: string;
  searchPlaceholder: string;
  statusDemo: string;
  statusLocal: string;
  pageProgress: string;
  progressPercent: string;
  lastOpened: string;
  empty: string;
  emptyTitle: string;
  emptyDesc: string;
  emptyAction: string;
  sampleBooksPrompt: string;
  openBook: string;
  continueReading: string;
  clearAllLocal: string;
  confirmClearAll: string;
  deleteBook: string;
  confirmDeleteBook: string;
}

export interface BookViewerTranslations {
  backToLibrary: string;
  fitWidth: string;
  fitHeight: string;
  zoomIn: string;
  zoomOut: string;
  resetZoom: string;
  pageThumbnails: string;
  notes: string;
  selectionPrompt: string;
  toolsTitle: string;
  noonTools: string;
  notesTitle: string;
  pageNotesTitle: string;
  addNotePlaceholder: string;
  noteInputPlaceholder: string;
  saveNote: string;
  emptyNotes: string;
  noNotesYet: string;
  pageSavedToast: string;
  jumpToPage: string;
  prevPage: string;
  previousPage: string;
  nextPage: string;
  closeViewer: string;
  backToPage: string;
  pageOf: string;
  pageProgress: string;
  exitFullscreen: string;
  fullscreen: string;
  localPdfSource: string;
  goToPagePrompt: string;
  interactionLayer: string;
  loadingPage: string;
  deleteBook: string;
  confirmDeleteBook: string;
  invalidFileError: string;
  fileTooLargeError: string;
  invalidPageError: string;
}

export interface LocalDocumentsTranslations {
  storageNotice: string;
  uploadTitle: string;
  uploadSubtitle: string;
  dropActive: string;
  selectFileBtn: string;
  sizeLimitNotice: string;
  deleteConfirm: string;
  deleteSuccess: string;
  saveSuccess: string;
  savedLocally: string;
  dragDropDesktop: string;
  mobileUploadBtn: string;
  fileSupported: string;
  sampleQuickPickTitle: string;
  processingTitle: string;
  processingSteps: {
    reading: string;
    extracting: string;
    indexing: string;
  };
  successTitle: string;
  successDesc: string;
  successAction: string;
  errorTitle: string;
  errorDesc: string;
  errorRetry: string;
  addAnotherBook: string;
}

export interface SelectionTranslations {
  dragToSelect: string;
  selectPrompt: string;
  selectedRegion: string;
  clearSelection: string;
  moveSelection: string;
  activeSelectionOnPage: string;
  toolsList: string;
  toolsTitle: string;
  selectPromptDetailed: string;
}

export interface AiAssistantTranslations {
  panelTitle: string;
  geminiBadge: string;
  localMockBadge: string;
  geminiPoweredBadge: string;
  selectionTypePrefix: string;
  loadingTitle: string;
  loadingSub: string;
  errorTitle: string;
  retryBtn: string;
  closeBtn: string;
  disclaimer: string;
  explain: string;
  simplify: string;
  stepByStep: string;
  hint: string;
  quiz: string;
  analyzeProblem: string;
  explainFigure: string;
  readAloud: string;
  toolsList: {
    simplify: string;
    simplifyDesc: string;
    stepByStep: string;
    stepByStepDesc: string;
    hint: string;
    hintDesc: string;
    quiz: string;
    quizDesc: string;
    readAloud: string;
    readAloudDesc: string;
    analyzeProblem: string;
    analyzeProblemDesc: string;
    explainFigure: string;
    explainFigureDesc: string;
  };
  quizFeedback: {
    checkAnswer: string;
    correct: string;
    incorrect: string;
  };
  audioPlayer: {
    playing: string;
    paused: string;
  };
}

export interface GuidedMathTranslations {
  analyzeProblemTitle: string;
  given: string;
  required: string;
  concept: string;
  hint: string;
  steps: string;
  finalSolution: string;
  confidence: string;
  unclearNotice: string;
  hintModeTitle: string;
  hintModeSub: string;
  nextHint: string;
  showSolution: string;
  backToHints: string;
  fullSolutionBadge: string;
  hintIndexBadge: string;
  loading: string;
}

export interface ScienceAnalysisTranslations {
  explainImageTitle: string;
  whatAppears: string;
  importantParts: string;
  relationToNearby: string;
  simplifiedExplanation: string;
  quizQuestion: string;
  confidence: string;
  unclearNotice: string;
  visibleOnPage: string;
  inferredFromElement: string;
  switchMathPrompt: string;
  switchMathBtn: string;
  visualHeaderBanner: string;
  loading: string;
}

export interface ErrorsTranslations {
  invalidPdf: string;
  fileTooLarge: string;
  networkError: string;
  connectionFailed: string;
  readingError: string;
  unclearSelection: string;
  unknownError: string;
  fileTooBigError: string;
  invalidPageError: string;
  retryAction: string;
}

export interface SettingsTranslations {
  title: string;
  language: string;
  languageDesc: string;
  arabic: string;
  english: string;
  close: string;
  currentDirection: string;
}

export interface TranslationDictionary {
  common: CommonTranslations;
  library: LibraryTranslations;
  bookViewer: BookViewerTranslations;
  localDocuments: LocalDocumentsTranslations;
  selection: SelectionTranslations;
  aiAssistant: AiAssistantTranslations;
  guidedMath: GuidedMathTranslations;
  scienceAnalysis: ScienceAnalysisTranslations;
  errors: ErrorsTranslations;
  settings: SettingsTranslations;

  // Backward compatibility aliases
  science: ScienceAnalysisTranslations;
  viewer: BookViewerTranslations;
  noonTools: {
    title: string;
    subtitle: string;
    currentlyAnalyzing: string;
    selectPrompt: string;
    toolsList: AiAssistantTranslations['toolsList'];
    quiz: AiAssistantTranslations['quizFeedback'];
    audioPlayer: AiAssistantTranslations['audioPlayer'];
  };
  nav: {
    home: string;
    library: string;
    addBook: string;
    progress: string;
    bookViewer: string;
  };
  actions: {
    startLearning: string;
    addBook: string;
    openBook: string;
    continueReading: string;
    backToLibrary: string;
    search: string;
    close: string;
    cancel: string;
    confirm: string;
    save: string;
    delete: string;
    share: string;
    retry: string;
    clearSearch: string;
    expand: string;
    collapse: string;
    reset: string;
    selectElement: string;
    addNote: string;
    all: string;
    filterBy: string;
  };
  home: {
    heroKicker: string;
    heroTitle: string;
    heroSubtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    featureHighlightTitle: string;
    feature1Title: string;
    feature1Desc: string;
    feature2Title: string;
    feature2Desc: string;
    feature3Title: string;
    feature3Desc: string;
    quickStats: {
      authenticLayout: string;
      interactiveTools: string;
      offlineFriendly: string;
    };
  };
  addBook: LocalDocumentsTranslations & {
    pageTitle: string;
    pageSubtitle: string;
    localNotice: string;
  };
  progress: {
    pageTitle: string;
    pageSubtitle: string;
    readPages: string;
    accuracy: string;
    streak: string;
    reviewedLessons: string;
    recentActivity: string;
    recentActivityTitle: string;
    needsReview: string;
    reviewBadge: string;
    noActivity: string;
    noReviews: string;
    difficultyEasy: string;
    difficultyMedium: string;
    difficultyHard: string;
    startReview: string;
    statPages: string;
    statLessons: string;
    statQuizzes: string;
    statAccuracy: string;
    conceptsNeedingReviewTitle: string;
    conceptsNeedingReviewDesc: string;
    reviewNow: string;
  };
  appName: string;
  appNameFull: string;
  appSlogan: string;
  appDescription: string;
}
