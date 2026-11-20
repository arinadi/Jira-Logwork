// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DayGroupList } from './DayGroupList';
import { groupByDay } from '../utils/dayGroups';
import type { WorklogEntry } from '../types/worklog';

afterEach(cleanup);

const row = (id: string, issueKey: string, timeSpent: string, status: WorklogEntry['status'], topUp?: true): WorklogEntry =>
  ({ id, issueKey, date: '2026-10-06', timeSpent, comment: `work on ${issueKey}`, status, originalRowIndex: 0, ...(topUp ? { topUp } : {}) });

function renderDay(entries: WorklogEntry[]) {
  const groups = groupByDay(entries, { targetMinutes: 480, holidays: new Map(), today: '2026-10-07' });
  return render(
    <DayGroupList
      groups={groups}
      targetMinutes={480}
      onUpdate={vi.fn()}
      onRemove={vi.fn()}
      onCopyToDays={vi.fn()}
      onSyncRow={vi.fn()}
      onAcceptSuggestions={vi.fn()}
      leave={{ tickets: { annual: '', sick: '' }, minutesByDay: {}, typesByDay: {}, entries: [] }}
      onAddEntry={vi.fn()}
    />,
  );
}

describe('DayGroupList top-up rows', () => {
  it('labels the top-up row "Top-up" and no other row of the day', () => {
    renderDay([
      row('synced', 'A-1', '15m', 'synced'),
      row('topup', 'A-1', '7h 45m', 'ready', true),
      row('plain', 'B-1', '1h', 'ready'),
    ]);

    const labels = screen.getAllByText('Top-up');
    expect(labels).toHaveLength(1);
    const li = labels[0].closest('li');
    expect(li?.textContent).toContain('7h 45m');
    expect(li?.textContent).toContain('Ready');
  });

  it('shows no "Top-up" label when the day has no top-up row', () => {
    renderDay([row('synced', 'A-1', '15m', 'synced'), row('plain', 'B-1', '7h 45m', 'ready')]);

    expect(screen.queryByText('Top-up')).toBeNull();
  });
});
