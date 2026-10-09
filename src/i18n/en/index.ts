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
    subtitle: 'On-demand assistant for page elements',
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
    heroKicker: 'Authentic reading backed by intelligence',
    heroTitle: 'Your textbook as is, your understanding better',
    heroSubtitle:
      'Read your original textbook pages in their original format, assisted by Noon AI for step-by-step guidance, hints, and quizzes.',
    ctaPrimary: 'Start Learning Now',
    ctaSecondary: 'Add a Textbook',
    featureHighlightTitle: 'Why Students Love Noon',
    feature1Title: 'Original Book Layout',
    feature1Desc: 'We keep the page format identical to the printed book with all figures and tables.',
    feature2Title: 'On-Demand Smart Tools',
    feature2Desc: 'Tap on any paragraph, problem, or diagram for step-by-step guidance.',
    feature3Title: 'Privacy on Your Device',
    feature3Desc: 'Books and notes are stored locally in your browser without complex sign-ups.',
    quickStats: {
      authenticLayout: '100% Authentic Layout',
      interactiveTools: '7 Smart Tools',
      offlineFriendly: 'Instant Local Storage',
    },
  },
  addBook: {
    ...localDocuments,
    pageTitle: 'Add a School Textbook',
    pageSubtitle: 'Upload a PDF textbook to start the interactive study experience',
    localNotice: 'Files are saved locally on this device.',
  },
  progress: {
    pageTitle: 'Learning Progress Dashboard',
    pageSubtitle: 'Interactive tracking of your study and reading achievement',
    readPages: 'Pages Read',
    accuracy: 'Quiz Accuracy',
    streak: 'Day Streak',
    reviewedLessons: 'Reviewed Lessons',
    recentActivity: 'Recent Activity',
    recentActivityTitle: 'Recent Activity Log',
    needsReview: 'Recommended Review Concepts',
    reviewBadge: 'Recommended Review',
    noActivity: 'No recent activity recorded. Start reading to log your progress!',
    noReviews: 'Great job! No concepts need urgent review right now.',
    difficultyEasy: 'Easy',
    difficultyMedium: 'Medium',
    difficultyHard: 'Hard',
    startReview: 'Start Review Now',
    statPages: 'Pages Read',
    statLessons: 'Reviewed Lessons',
    statQuizzes: 'Completed Quizzes',
    statAccuracy: 'Quiz Accuracy',
    conceptsNeedingReviewTitle: 'Concepts Needing Review',
    conceptsNeedingReviewDesc: 'Concepts identified by the system for review based on your reading',
    reviewNow: 'Review Now',
  },
  appName: common.appName,
  appNameFull: common.appNameFull,
  appSlogan: common.appSlogan,
  appDescription: common.appDescription,
};

export default en;
