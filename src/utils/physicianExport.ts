import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { MenstruationLog } from '../services/supabase';
import { ReferralFlag } from './referralFlag';

const MOOD_LABELS: Record<string, string> = {
  great: 'Great', good: 'Good', okay: 'Okay', bad: 'Bad', terrible: 'Terrible',
};
const FLOW_LABELS: Record<string, string> = {
  none: 'None', light: 'Light', medium: 'Medium', heavy: 'Heavy', very_heavy: 'Very Heavy',
};

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildPhysicianSummaryHtml(logs: MenstruationLog[], flags: ReferralFlag[]): string {
  const sorted = [...logs].sort((a, b) => a.log_date.localeCompare(b.log_date));
  const rows = sorted.map(log => `
    <tr>
      <td>${log.log_date}</td>
      <td>${log.cramp_level ?? '—'}</td>
      <td>${log.mood ? (MOOD_LABELS[log.mood] ?? log.mood) : '—'}</td>
      <td>${log.flow_level ? (FLOW_LABELS[log.flow_level] ?? log.flow_level) : '—'}</td>
      <td>${log.notes ? escapeHtml(log.notes) : ''}</td>
    </tr>`).join('');

  const suggestedLabs = Array.from(new Set(flags.flatMap(f => f.suggestedLabs)));

  return `
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 24px; color: #1a1a1a; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      .meta { font-size: 12px; color: #666; margin-bottom: 20px; }
      .disclaimer { font-size: 11px; color: #444; background: #f6f6f6; border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
      th { background: #f0f0f0; }
      h2 { font-size: 15px; margin-top: 24px; }
      ul { font-size: 13px; }
    </style>
  </head>
  <body>
    <h1>PhasePlate Physician Summary</h1>
    <div class="meta">Generated ${new Date().toLocaleDateString()}</div>
    <div class="disclaimer">
      This report is a user-generated log from the PhasePlate Hub. It is intended to assist a healthcare
      provider in clinical assessment and is not a diagnostic report.
    </div>

    ${suggestedLabs.length ? `
      <h2>Suggested Labs to Discuss</h2>
      <ul>${suggestedLabs.map(l => `<li>${l}</li>`).join('')}</ul>
    ` : ''}

    <h2>Logged Symptoms</h2>
    <table>
      <thead><tr><th>Date</th><th>Cramp (1&ndash;5)</th><th>Mood</th><th>Flow</th><th>Notes</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5">No logs in range</td></tr>'}</tbody>
    </table>
  </body>
  </html>`;
}

export async function exportPhysicianSummary(logs: MenstruationLog[], flags: ReferralFlag[]): Promise<void> {
  const html = buildPhysicianSummaryHtml(logs, flags);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }
}
