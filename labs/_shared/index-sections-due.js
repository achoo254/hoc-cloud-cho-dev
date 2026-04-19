// index-sections-due.js — DUE TODAY hero block for dashboard-first index.
// Aggregates SM-2 due/new counts across catalog, renders CTA to first lab with due cards.

import { LabTemplate } from './lab-template.js';
import { escapeHtml } from './index-sections-utils.js';

export function renderDueToday(mount, catalog, _stats) {
  if (!mount) return;

  let totalDue = 0;
  let totalNew = 0;
  let labsWithDue = 0;
  let firstLabWithDue = null;
  let firstLabWithNew = null;

  catalog.forEach(group => {
    group.labs.forEach(lab => {
      if (lab.status !== 'ready' || !lab.cards) return;
      const { due, new: newC } = LabTemplate.getDueCount(lab.id, lab.cards);
      totalDue += due;
      totalNew += newC;
      if (due > 0) {
        labsWithDue++;
        if (!firstLabWithDue) firstLabWithDue = lab;
      }
      if (newC > 0 && !firstLabWithNew) firstLabWithNew = lab;
    });
  });

  if (totalDue === 0 && totalNew === 0) {
    mount.innerHTML = `
      <div class="due-today-card empty">
        <div class="due-num">0</div>
        <div class="due-label">Chưa có thẻ. Mở lab bất kỳ để tạo flashcard.</div>
      </div>`;
    return;
  }

  if (totalDue === 0 && totalNew > 0) {
    const target = firstLabWithNew;
    mount.innerHTML = `
      <div class="due-today-card empty">
        <div class="due-num">0</div>
        <div class="due-label">Hết thẻ due. ${totalNew} thẻ mới sẵn sàng.</div>
        ${target ? `<a class="due-cta" href="${escapeHtml(target.href)}">Học thẻ mới →</a>` : ''}
      </div>`;
    return;
  }

  const target = firstLabWithDue;
  mount.innerHTML = `
    <div class="due-today-card">
      <div class="due-num">${totalDue}</div>
      <div class="due-label">thẻ cần ôn hôm nay</div>
      <div class="due-meta">${labsWithDue} lab · ${totalNew} thẻ mới</div>
      ${target ? `<a class="due-cta" href="${escapeHtml(target.href)}">Ôn ngay →</a>` : ''}
    </div>`;
}
