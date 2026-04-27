import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { processMatchStreak } from '../src/services/faceitService.js';

describe('processMatchStreak', () => {
  it('uses ? when player is not on either team', () => {
    const match = {
      teams: {
        faction1: { players: [{ player_id: 'p1' }] },
        faction2: { players: [{ player_id: 'p2' }] }
      },
      results: { winner: 'faction1' }
    };
    const out = processMatchStreak([match], 'missing-player-id');
    assert.match(out, /\?/);
  });

  it('marks win when player team matches winner', () => {
    const pid = 'me';
    const match = {
      teams: {
        faction1: { players: [{ player_id: pid }] },
        faction2: { players: [{ player_id: 'other' }] }
      },
      results: { winner: 'faction1' }
    };
    const out = processMatchStreak([match], pid);
    assert.match(out, /W/);
    assert.doesNotMatch(out, /\?/);
  });
});
