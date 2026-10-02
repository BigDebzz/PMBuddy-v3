// How PM Buddy documents should be written, shared by every generator and by the refine box.

export const DOC_LAYOUT_RULES = 'Output HTML only: h1 for the title, h2 for sections, p for text, ul and li for lists, and simple table, tr, th, td for tables. No html, head or body tags. No markdown. '
  + 'Make it easy to skim: start with <div class="keypoints"> holding a one-line heading in <p><strong>Key points</strong></p> and a ul of 3 to 5 short bullets. '
  + 'Keep paragraphs to 2 or 3 sentences. Prefer bullets and tables to long text. Keep sections short, and leave out anything that is padding. '
  + 'Use a table for anything that has columns, such as milestones, risks or owners and dates.';

export function buildRefinePrompt(html, instruction) {
  return `You are editing a professional document for a PM Buddy user. Apply the change they ask for and keep everything else.\n\nCURRENT DOCUMENT:\n${html}\n\nCHANGE REQUESTED: "${instruction}"\n\n`
    + 'Rules: do not invent numbers, names or dates. Keep any [square bracket placeholders] unless the user gives the missing detail. Keep the same structure and the key points box at the top, updating it if the content changed. Do not use emoji. '
    + DOC_LAYOUT_RULES
    + ' Return the COMPLETE updated document.';
}

export const REFINE_CHIPS = [
  { label: 'Shorter', instruction: 'Make it shorter. Cut padding and repetition and keep only the important points.' },
  { label: 'More detail', instruction: 'Add more detail to each section, using only the information already in the document. Use placeholders in square brackets where detail is missing.' },
  { label: 'Simpler wording', instruction: 'Rewrite it in simpler, plainer language that anyone can follow.' },
  { label: 'More formal', instruction: 'Make the tone more formal and professional.' },
  { label: 'More bullets', instruction: 'Turn long paragraphs into short bullets and tables where that reads better.' },
];
