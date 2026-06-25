import { useMemo, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { api, ApiError } from '../../utils/apiClient';
import { TEAMS } from '../../data/teams';
import { GROUPS } from '../../data/constants';
import {
  computeGroupStandings,
  rankThirdPlaceTeams,
  isGroupStageComplete,
  type GroupResultMatch,
} from '../../utils/standings';
import {
  generateRoundOf32,
  generateNextRound,
  resultsBySchemaId,
  type GeneratedKnockoutGame,
} from '../../utils/knockoutGenerator';
import { formatKickoff } from './format';
import type { PredictionGame } from '../../types';

interface Props {
  games: PredictionGame[];
  onChanged: () => Promise<void>;
}

type StageKey = 'R32' | 'R16' | 'QF' | 'SF' | '3RD' | 'FINAL';

const ROUND_ORDER: StageKey[] = ['R32', 'R16', 'QF', 'SF', '3RD', 'FINAL'];

const ROUND_LABEL: Record<StageKey, { en: string; pt: string }> = {
  R32: { en: 'Round of 32', pt: 'Oitavas de final' },
  R16: { en: 'Round of 16', pt: 'Oitavas (2ª fase)' },
  QF: { en: 'Quarter-finals', pt: 'Quartas de final' },
  SF: { en: 'Semi-finals', pt: 'Semifinais' },
  '3RD': { en: '3rd place play-off', pt: 'Disputa de 3º lugar' },
  FINAL: { en: 'Final', pt: 'Final' },
};

/**
 * Auto-fill the knockout stage from real group results, reusing the simulator's
 * bracket engine. Staged: R32 (once the group stage is complete), then each
 * subsequent round as the previous round's results land.
 *
 * Each step upserts games via the existing admin/game.php endpoint, keyed by
 * a stable external_id (wc2026-<stage>-<matchNo>), so re-runs are idempotent
 * and safely update matchups if a group result is corrected.
 */
export default function AutoFillKnockout({ games, onChanged }: Props) {
  const { t, language } = useLanguage();
  const [busy, setBusy] = useState<StageKey | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const teamById = useMemo(
    () => Object.fromEntries(TEAMS.map((tm) => [tm.id, tm])),
    [],
  );

  // Group the seeded group-stage games by letter, then compute standings.
  const { standingsByGroup, groupComplete } = useMemo(() => {
    const byGroup: Record<string, GroupResultMatch[]> = {};
    GROUPS.forEach((g) => { byGroup[g] = []; });
    games.forEach((g) => {
      if (g.stage === 'group' && g.group_letter && byGroup[g.group_letter]) {
        byGroup[g.group_letter]!.push({
          home_team_id: g.home_team_id ?? '',
          away_team_id: g.away_team_id ?? '',
          result_home: g.result_home,
          result_away: g.result_away,
        });
      }
    });
    const standings: Record<string, ReturnType<typeof computeGroupStandings>> = {};
    GROUPS.forEach((g) => {
      const teams = TEAMS.filter((tm) => tm.group === g);
      standings[g] = computeGroupStandings(byGroup[g] ?? [], teams);
    });
    return { standingsByGroup: standings, groupComplete: isGroupStageComplete(byGroup) };
  }, [games]);

  // Which round stages already exist as DB games, and which have all results in.
  const stageStatus = useMemo(() => {
    const status: Partial<Record<StageKey, { exists: number; decided: number; total: number }>> = {};
    ROUND_ORDER.forEach((k) => {
      const dbStage = k === 'R32' ? 'r32' : k === 'R16' ? 'r16' : k === 'QF' ? 'qf' : k === 'SF' ? 'sf' : k === '3RD' ? '3rd' : 'final';
      const stageGames = games.filter((g) => g.stage === dbStage);
      // A knockout game is "decided" once it has a result and — for a draw — a
      // recorded penalty-shootout winner. (Group games never reach this filter.)
      const decided = stageGames.filter((g) => {
        if (g.result_home === null || g.result_away === null) return false;
        if (g.result_home !== g.result_away) return true; // decided in regular/extra time
        return g.penalty_winner !== null; // drawn → needs the shootout winner
      }).length;
      const total = k === 'R32' ? 16 : k === 'R16' ? 8 : k === 'QF' ? 4 : k === 'SF' ? 2 : 1;
      status[k] = { exists: stageGames.length, decided, total };
    });
    return status as Record<StageKey, { exists: number; decided: number; total: number }>;
  }, [games]);

  const existingByExternalId = useMemo(
    () => new Map(games.map((g) => [g.external_id, g])),
    [games],
  );

  // The previous round must be fully decided before the next round unlocks.
  // The final and the 3rd-place play-off both depend directly on the semis.
  const canGenerate = (k: StageKey): boolean => {
    if (k === 'R32') return groupComplete;
    if (k === '3RD' || k === 'FINAL') return stageStatus.SF.decided >= stageStatus.SF.total;
    const prevIdx = ROUND_ORDER.indexOf(k) - 1;
    const prev = ROUND_ORDER[prevIdx];
    if (!prev) return false;
    return stageStatus[prev].decided >= stageStatus[prev].total;
  };

  const thirds = useMemo(() => rankThirdPlaceTeams(standingsByGroup), [standingsByGroup]);
  const qualifiedThirds = thirds.filter((x) => x.qualified);

  const generatedGamesByRound = useMemo(() => {
    const resolved = resultsBySchemaId(games);
    const prevResults: Record<string, string | null> = {};
    const prevLosers: Record<string, string | null> = {};
    Object.entries(resolved).forEach(([schemaId, r]) => {
      prevResults[schemaId] = r.winner;
      prevLosers[schemaId] = r.loser;
    });
    const byRound = {} as Record<StageKey, GeneratedKnockoutGame[]>;
    ROUND_ORDER.forEach((k) => {
      if (!canGenerate(k)) {
        byRound[k] = [];
      } else if (k === 'R32') {
        byRound[k] = generateRoundOf32(standingsByGroup, thirds);
      } else {
        byRound[k] = generateNextRound(k, teamById, prevResults, prevLosers);
      }
    });
    return byRound;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games, groupComplete, standingsByGroup, stageStatus, teamById, thirds]);

  const canUpsertGame = (game: GeneratedKnockoutGame): boolean => {
    const existing = existingByExternalId.get(game.externalId);
    return !existing || existing.result_home === null || existing.result_away === null;
  };

  const canUpsertRound = (k: StageKey): boolean => {
    return canGenerate(k) && (generatedGamesByRound[k] ?? []).some(canUpsertGame);
  };

  // Preview of the next actionable round (including safe re-runs of unplayed games).
  const previewRound: StageKey | null = useMemo(() => {
    for (const k of ROUND_ORDER) {
      if (canUpsertRound(k)) return k;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedGamesByRound, groupComplete, stageStatus]);

  const previewGames = previewRound ? generatedGamesByRound[previewRound] ?? [] : [];

  async function upsertRound(k: StageKey, toUpsert: GeneratedKnockoutGame[]) {
    setBusy(k);
    setMsg(null);
    setErr(null);
    let done = 0;
    try {
      for (const game of toUpsert) {
        // Safety: never overwrite a game that already has a result (don't wipe
        // a played/scored game). Upserting an unplayed game is safe and
        // idempotent — it just updates the team identities/seed data.
        const existing = existingByExternalId.get(game.externalId);
        if (existing && existing.result_home !== null && existing.result_away !== null) {
          continue;
        }
        await api.adminAddGame({
          external_id: game.externalId,
          stage: game.stage,
          group_letter: null,
          home_team_id: game.home?.id ?? null,
          away_team_id: game.away?.id ?? null,
          home_team_name: game.home?.name ?? 'TBD',
          away_team_name: game.away?.name ?? 'TBD',
          home_code: game.home?.code ?? null,
          away_code: game.away?.code ?? null,
          home_flag: game.home?.flag ?? null,
          away_flag: game.away?.flag ?? null,
          kickoff_utc: game.kickoffUtc,
          venue: game.venue,
          is_open: true,
        });
        done++;
      }
      await onChanged();
      setMsg(t('autofillDone', { n: done, round: ROUND_LABEL[k][language === 'pt-BR' ? 'pt' : 'en'] }));
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('predSaveError'));
    } finally {
      setBusy(null);
    }
  }

  const roundLabel = (k: StageKey) => ROUND_LABEL[k][language === 'pt-BR' ? 'pt' : 'en'];

  return (
    <div className="admin-subpanel autofill-panel">
      <h3 className="admin-subpanel-title">{t('autofillTitle')}</h3>
      <p className="section-desc">{t('autofillDesc')}</p>

      {!groupComplete && (
        <p className="predictions-empty">{t('autofillGroupIncomplete')}</p>
      )}

      {/* Standings + qualified thirds preview (only meaningful once complete) */}
      {groupComplete && (
        <details className="autofill-details">
          <summary>{t('autofillStandingsPreview')}</summary>
          <div className="autofill-thirds">
            <h4>{t('autofillQualifiedThirds')}</h4>
            <ul className="autofill-thirds-list">
              {qualifiedThirds.map((x) => (
                <li key={x.group}>
                  <span>{x.team.flag}</span> {t(x.team.id)} <span className="muted">({x.group})</span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}

      {/* Round status grid */}
      <ul className="autofill-rounds">
        {ROUND_ORDER.map((k) => {
          const st = stageStatus[k];
          const ready = canGenerate(k);
          const pending = canUpsertRound(k);
          return (
            <li key={k} className={`autofill-round ${pending ? 'is-pending' : ''} ${ready ? 'is-ready' : ''}`}>
              <span className="autofill-round-name">{roundLabel(k)}</span>
              <span className="autofill-round-status">
                {st.exists}/{st.total} {t('autofillGames')}
                {st.decided > 0 && ` · ${st.decided} ${t('autofillDecided')}`}
              </span>
              {pending && (
                <button
                  type="button"
                  className="btn btn-primary autofill-go"
                  disabled={busy !== null}
                  onClick={() => upsertRound(k, generatedGamesByRound[k] ?? [])}
                >
                  {busy === k ? t('predSaving') : t('autofillGenerate')}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {/* Preview of the games about to be generated */}
      {previewRound && previewGames.length > 0 && (
        <details className="autofill-details" open>
          <summary>{t('autofillPreview', { round: roundLabel(previewRound) })}</summary>
          <ul className="autofill-preview-list">
            {previewGames.map((g) => (
              <li key={g.externalId}>
                <span className="autofill-match-no">#{g.matchNo}</span>
                <span className="autofill-teams">
                  <span className="autofill-team home">
                    {g.home ? `${g.home.flag} ${t(g.home.id)}` : <span className="muted">TBD</span>}
                  </span>
                  <span className="autofill-vs">v</span>
                  <span className="autofill-team away">
                    {g.away ? `${g.away.flag} ${t(g.away.id)}` : <span className="muted">TBD</span>}
                  </span>
                </span>
                <span className="autofill-kickoff">{formatKickoff(g.kickoffUtc, language)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {msg && <div className="predictions-success">{msg}</div>}
      {err && <div className="predictions-error">{err}</div>}
    </div>
  );
}
