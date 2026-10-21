import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { setLanguage } from '../src/i18n/index.js';
import { ProgressPage } from '../src/pages/ProgressPage.js';

const progress = {
  totalPagesRead: 24,
  lessonsReviewed: 8,
  quizzesCompleted: 6,
  quizzesAccuracy: 91,
  conceptsNeedingReview: [{ id: 'demo-concept', title: 'Demo weakness', reason: 'Demo reason', subject: 'Math', pageNumber: 3, difficulty: 'hard', bookId: 'demo' }],
  recentActivities: [{ id: 'demo-activity', action: 'Demo activity', bookTitle: 'Demo book', pageNumber: 3, timeAgo: 'now' }],
} as any;

function render(language: 'ar' | 'en') {
  setLanguage(language);
  return renderToStaticMarkup(
    React.createElement(ProgressPage, {
      progress,
      onOpenBookToPage: () => undefined,
      onNavigate: () => undefined,
    }),
  );
}

const english = render('en');
assert.match(english, /Demo \/ unverified data/);
assert.match(english, /mix seeded demo metrics with real events/);
assert.match(english, /Real progress cannot be shown yet/);
assert.doesNotMatch(english, /Demo weakness|Demo reason|Demo activity|>24</);

const arabic = render('ar');
assert.match(arabic, /بيانات تجريبية \/ غير موثقة/);
assert.match(arabic, /قد تجمع البيانات المتاحة بين أرقام تجريبية وأحداث حقيقية/);
assert.match(arabic, /لا يمكن عرض تقدم فعلي الآن/);
assert.match(arabic, /dir="rtl"/);
assert.doesNotMatch(arabic, /Demo weakness|Demo reason|Demo activity|>24</);

console.log('ProgressPage honesty tests passed in Arabic and English.');
