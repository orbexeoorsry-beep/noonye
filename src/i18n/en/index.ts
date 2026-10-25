import { common } from './common';
import { library } from './library';
import { bookViewer } from './bookViewer';
import { localDocuments } from './localDocuments';
import { selection } from './selection';
import { aiAssistant } from './aiAssistant';
import { guidedMath } from './guidedMath';
import { scienceAnalysis } from './scienceAnalysis';
import { errors } from './errors';
import { settings } from './settings';
import { TranslationDictionary } from '../types';

export const en: TranslationDictionary = {
  common,
  library,
  bookViewer,
  localDocuments,
  selection,
  aiAssistant,
  guidedMath,
  scienceAnalysis,
  errors,
  settings,

  // Backward compatibility aliases
  science: scienceAnalysis,
  viewer: bookViewer,
  noonTools: {
    title: aiAssistant.panelTitle,
    subtitle: 'Reading tools (some features are unavailable)',
    currentlyAnalyzing: 'Currently Selected Element:',
    selectPrompt: 'Select an element on the page to start',
    toolsList: aiAssistant.toolsList,
    quiz: aiAssistant.quizFeedback,
    audioPlayer: aiAssistant.audioPlayer,
  },
  nav: {
    home: common.home,
    library: common.library,
    addBook: common.addBook,
    progress: common.progress,
    bookViewer: bookViewer.backToLibrary,
  },
  actions: {
    startLearning: 'Start Learning',
    addBook: common.addBook,
    openBook: library.openBook,
    continueReading: library.continueReading,
    backToLibrary: bookViewer.backToLibrary,
    search: library.searchPlaceholder,
    close: common.close,
    cancel: common.cancel,
    confirm: common.confirm,
    save: common.save,
    delete: common.delete,
    share: 'Share',
    retry: common.retry,
    clearSearch: 'Clear Search',
    expand: 'Expand',
    collapse: 'Collapse',
    reset: 'Reset',
    selectElement: 'Select Element',
    addNote: 'Add Note',
    all: 'All',
    filterBy: 'Filter By',
  },
  home: {
    heroKicker: 'Read your books in their original format',
    heroTitle: 'Your textbook and notes in one place',
    heroSubtitle:
      'Read your textbook pages in their original format. Books and notes stay on this device; explanation and guidance tools are currently unavailable. Experimental local practice questions do not assess overall learning.',
    ctaPrimary: 'Start Reading Now',
    ctaSecondary: 'Add a Textbook',
    featureHighlightTitle: 'Available Reading Features',
    feature1Title: 'Original Book Layout',
    feature1Desc: 'We keep the page format identical to the printed book with all figures and tables.',
    feature2Title: 'Reading tools',
    feature2Desc: 'Text and page selection tools are currently unavailable; read the locally stored book pages.',
    feature3Title: 'Privacy on Your Device',
    feature3Desc: 'Books and notes are stored locally in your browser without complex sign-ups.',
    quickStats: {
      authenticLayout: 'Original Book Pages',
      interactiveTools: 'Reading tools unavailable',
      offlineFriendly: 'Instant Local Storage',
    },
  },
  addBook: {
    ...localDocuments,
    pageTitle: 'Add a School Textbook',
    pageSubtitle: 'Upload a PDF textbook for local storage and reading',
    localNotice: 'Files are saved locally on this device.',
  },
  progress: {
    pageTitle: 'Reading Activity',
    pageSubtitle: 'A record of reading activity on this device',
    readPages: 'Pages Read',
    accuracy: 'Local practice answer accuracy',
    streak: 'Day Streak',
    reviewedLessons: 'Reviewed Lessons',
    recentActivity: 'Recent Activity',
    recentActivityTitle: 'Recent Activity Log',
    needsReview: 'Review suggestions unavailable',
    reviewBadge: 'Unavailable',
    noActivity: 'No recent activity recorded. Start reading to log your progress!',
    noReviews: 'Review suggestions are currently unavailable.',
    difficultyEasy: 'Easy',
    difficultyMedium: 'Medium',
    difficultyHard: 'Hard',
    startReview: 'Start Review Now',
    statPages: 'Pages Read',
    statLessons: 'Reviewed Lessons',
    statQuizzes: 'Completed Local Practice',
    statAccuracy: 'Local practice answer accuracy',
    conceptsNeedingReviewTitle: 'Review suggestions unavailable',
    conceptsNeedingReviewDesc: 'The app does not assess reading or identify concepts for review.',
    reviewNow: 'Review Now',
  },
  appName: common.appName,
  appNameFull: common.appNameFull,
  appSlogan: common.appSlogan,
  appDescription: common.appDescription,
};

export default en;
