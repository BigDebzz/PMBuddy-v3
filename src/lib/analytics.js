// src/lib/analytics.js
// Replace G-XXXXXXXXXX in public/index.html with your Google Analytics ID

export const track = (event, data = {}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', event, data);
  }
};

export const Analytics = {
  modeSelected: (mode) => track('mode_selected', { mode }),
  questionAnswered: (questionId, mode) => track('question_answered', { question_id: questionId, mode }),
  reportGenerated: (mode, score) => track('report_generated', { mode, score }),
  reportTabViewed: (tab, mode) => track('report_tab_viewed', { tab, mode }),
  restartClicked: () => track('restart_clicked'),
  pageView: (page) => track('page_view', { page_title: page }),
};
