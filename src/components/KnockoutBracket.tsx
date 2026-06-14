import React, { useState } from 'react';
import { TEAMS } from '../data/teams';
import type { Team, KnockoutMatch } from '../types';
import { useLanguage } from '../hooks/useLanguage';

const R32_VISUAL_ORDER: string[] = [
  'R32_1',  // Match 73
  'R32_3',  // Match 75
  'R32_2',  // Match 74
  'R32_5',  // Match 77
  'R32_4',  // Match 76
  'R32_6',  // Match 78
  'R32_7',  // Match 79
  'R32_8',  // Match 80
  'R32_11', // Match 83
  'R32_12', // Match 84
  'R32_9',  // Match 81
  'R32_10', // Match 82
  'R32_14', // Match 86
  'R32_16', // Match 88
  'R32_13', // Match 85
  'R32_15'  // Match 87
];

interface StageData {
  key: string;
  label: string;
  subtitle: string;
  matches: KnockoutMatch[];
}

type StagesMap = {
  R32: StageData;
  R16: StageData;
  QF: StageData;
  SF: StageData;
  F: StageData;
};

interface KnockoutBracketProps {
  knockoutMatches: KnockoutMatch[];
  onSelectWinner: (matchId: string, side: 'home' | 'away', isPenalty?: boolean) => void;
  champion: string;
}

export function KnockoutBracket({
  knockoutMatches,
  onSelectWinner,
  champion
}: KnockoutBracketProps) {
  const [activeStageFilter, setActiveStageFilter] = useState<string>('ALL');
  const { t } = useLanguage();

  // Map of teamId to team object for easy lookup
  const teamMap = React.useMemo<Record<string, Team>>(() => {
    const map: Record<string, Team> = {};
    TEAMS.forEach(t => { map[t.id] = t; });
    return map;
  }, []);

  const getMatchLabel = (label: string) => {
    if (label.startsWith('Match ')) {
      const id = label.replace('Match ', '');
      return t('matchLabel', { id });
    }
    if (label === '3rd Place') return t('stageTag3rd');
    if (label === 'Final') return t('stageTagFinal');
    return label;
  };

  // Helper to render team name/flag or placeholder
  const renderTeamName = (teamId: string | undefined, placeholderText: string) => {
    if (!teamId) {
      return <span className="ko-team-placeholder">{placeholderText}</span>;
    }
    const team = teamMap[teamId];
    const displayTeamName = team ? t(team.id) : teamId;
    return (
      <div className="ko-team-info">
        <span className="team-flag">{team?.flag}</span>
        <span className="team-name" title={displayTeamName}>{displayTeamName}</span>
      </div>
    );
  };

  const getPlaceholderText = (match: KnockoutMatch, side: 'home' | 'away'): string => {
    // 3rd place match has explicit losers
    if (match.id === 'PLAYOFF_3RD') {
      return side === 'home' ? t('placeholderLoserMatch', { match: '101' }) : t('placeholderLoserMatch', { match: '102' });
    }

    // Find if there is a feeder match that propagates to this slot
    const feeder = knockoutMatches.find(f => f.nextMatchId === match.id && f.nextSide === side);
    if (feeder) {
      return t('placeholderWinnerOf', { match: getMatchLabel(feeder.label) });
    }

    // Fallback for R32 group qualifiers
    const code = side === 'home' ? match.home : match.away;
    if (code === '3rd') return t('placeholderBest3rd');
    if (!code) return t('placeholderTBD');
    const num = code.charAt(0);
    const grp = code.substring(1);
    const prefix = num === '1' ? t('placeholderWinnerGrp', { group: grp }) : t('placeholderRunnerUpGrp', { group: grp });
    return prefix;
  };

  // Group matches by stage, preserving the order from the schema
  const stages = React.useMemo<StagesMap>(() => {
    const s: StagesMap = {
      R32: { key: 'R32', label: t('stageR32'), subtitle: t('r32MatchesSubtitle'), matches: [] },
      R16: { key: 'R16', label: t('stageR16'), subtitle: t('r16MatchesSubtitle'), matches: [] },
      QF:  { key: 'QF',  label: t('stageQF'), subtitle: t('qfMatchesSubtitle'), matches: [] },
      SF:  { key: 'SF',  label: t('stageSF'), subtitle: t('sfMatchesSubtitle'), matches: [] },
      F:   { key: 'F',   label: t('stageF'), subtitle: t('fMatchesSubtitle'), matches: [] }
    };
    knockoutMatches.forEach(m => {
      if (m.stage === 'R32') s.R32.matches.push(m);
      else if (m.stage === 'R16') s.R16.matches.push(m);
      else if (m.stage === 'QF') s.QF.matches.push(m);
      else if (m.stage === 'SF') s.SF.matches.push(m);
      else if (m.stage === 'FINAL' || m.stage === '3RD') s.F.matches.push(m);
    });
    // Sort R32 visually so feeders of R16 matches are adjacent
    s.R32.matches.sort((a, b) => R32_VISUAL_ORDER.indexOf(a.id) - R32_VISUAL_ORDER.indexOf(b.id));
    return s;
  }, [knockoutMatches, t]);

  const handlePenaltyToggle = (matchId: string, side: 'home' | 'away', e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectWinner(matchId, side, true);
  };

  const renderTeamRow = (match: KnockoutMatch, side: 'home' | 'away') => {
    const teamId = side === 'home' ? match.home : match.away;
    const isWinner = match.winner === teamId && teamId !== '';
    const score = side === 'home' ? match.homeScore : match.awayScore;
    const showScore = score !== null && score !== undefined && match.winner !== '';
    return (
      <div
        className={`ko-team-row ${!teamId ? 'placeholder' : ''} ${isWinner ? 'winner' : ''}`}
        onClick={() => teamId && onSelectWinner(match.id, side)}
      >
        {renderTeamName(teamId || undefined, getPlaceholderText(match, side))}
        <div className="ko-team-meta">
          {showScore && <span className="ko-team-score">{score}</span>}
          {teamId && isWinner && (
            <button
              className={`penalty-btn ${match.penaltyWinner === side ? 'active' : ''}`}
              onClick={(e) => handlePenaltyToggle(match.id, side, e)}
              title={t('pkTooltip')}
            >
              PK
            </button>
          )}
        </div>
      </div>
    );
  };

  const stageShortLabel = (stage: string): string => {
    if (stage === 'R32') return 'R32';
    if (stage === 'R16') return 'R16';
    if (stage === 'QF') return 'QF';
    if (stage === 'SF') return 'SF';
    if (stage === 'FINAL') return t('stageTagFinal');
    if (stage === '3RD') return t('stageTag3rd');
    return stage;
  };

  const renderMatchCard = (match: KnockoutMatch) => {
    return (
      <div className="ko-match-card" data-match-id={match.id} key={match.id}>
        <div className="ko-match-header">
          <span className="ko-match-label">{getMatchLabel(match.label)}</span>
          <span className="ko-match-stage-tag">{stageShortLabel(match.stage)}</span>
        </div>
        <div className="ko-match-teams">
          {renderTeamRow(match, 'home')}
          {renderTeamRow(match, 'away')}
        </div>
      </div>
    );
  };

  // Compute vertical positions for every match by averaging the positions
  // of its two feeder matches from the previous round.
  const MATCH_HEIGHT = 96;
  const MATCH_GAP = 12;
  const SLOT = MATCH_HEIGHT + MATCH_GAP; // 108px

  const matchTops = React.useMemo<Record<string, number>>(() => {
    const tops: Record<string, number> = {};
    // R32: sequential list
    stages.R32.matches.forEach((m, i) => {
      tops[m.id] = i * SLOT;
    });
    // R16: center between its two R32 feeders
    stages.R16.matches.forEach(m => {
      const feeders = knockoutMatches.filter(f => f.nextMatchId === m.id);
      if (feeders.length === 2) {
        tops[m.id] = ((tops[feeders[0]!.id] ?? 0) + (tops[feeders[1]!.id] ?? 0)) / 2;
      } else {
        const idx = stages.R16.matches.findIndex(x => x.id === m.id);
        tops[m.id] = idx * 2 * SLOT + SLOT / 2;
      }
    });
    // QF: center between its two R16 feeders
    stages.QF.matches.forEach(m => {
      const feeders = knockoutMatches.filter(f => f.nextMatchId === m.id);
      if (feeders.length === 2) {
        tops[m.id] = ((tops[feeders[0]!.id] ?? 0) + (tops[feeders[1]!.id] ?? 0)) / 2;
      }
    });
    // SF: center between its two QF feeders
    stages.SF.matches.forEach(m => {
      const feeders = knockoutMatches.filter(f => f.nextMatchId === m.id);
      if (feeders.length === 2) {
        tops[m.id] = ((tops[feeders[0]!.id] ?? 0) + (tops[feeders[1]!.id] ?? 0)) / 2;
      }
    });
    // Final: center between its two SF feeders
    const finalMatch = stages.F.matches.find(m => m.id === 'FINAL');
    if (finalMatch) {
      const feeders = knockoutMatches.filter(f => f.nextMatchId === 'FINAL');
      if (feeders.length === 2) {
        tops['FINAL'] = ((tops[feeders[0]!.id] ?? 0) + (tops[feeders[1]!.id] ?? 0)) / 2;
      }
    }
    // 3rd place: shown directly below the Final
    if (tops['FINAL'] !== undefined) {
      tops['PLAYOFF_3RD'] = tops['FINAL'] + SLOT + 16;
    }
    return tops;
  }, [knockoutMatches, stages, SLOT]);

  const renderConnectors = (stageKey: string) => {
    if (activeStageFilter !== 'ALL') return null;
    if (stageKey === 'R32') return null;

    const stage = stages[stageKey as keyof StagesMap];
    return stage.matches.map((target) => {
      if (target.id === 'PLAYOFF_3RD') return null;

      const feeders = knockoutMatches.filter((f) => f.nextMatchId === target.id);
      if (feeders.length !== 2) return null;

      const t0 = matchTops[feeders[0]!.id];
      const t1 = matchTops[feeders[1]!.id];
      const targetTop = matchTops[target.id];
      if (t0 === undefined || t1 === undefined || targetTop === undefined) return null;

      const upperTop = Math.min(t0, t1);
      const lowerTop = Math.max(t0, t1);
      const upperCenter = upperTop + MATCH_HEIGHT / 2;
      const lowerCenter = lowerTop + MATCH_HEIGHT / 2;
      const targetCenter = targetTop + MATCH_HEIGHT / 2;

      return (
        <React.Fragment key={`conn-${target.id}`}>
          <div
            className="bracket-connector-vertical"
            style={{ top: `${upperCenter}px`, height: `${lowerCenter - upperCenter}px` }}
          />
          <div
            className="bracket-connector-stub"
            style={{ top: `${targetCenter - 0.5}px`, left: '-18px', width: '18px' }}
          />
        </React.Fragment>
      );
    });
  };

  const renderColumn = (stageKey: string) => {
    const stage = stages[stageKey as keyof StagesMap];
    if (activeStageFilter !== 'ALL' && activeStageFilter !== stageKey) return null;

    return (
      <div className="bracket-column" key={stageKey} data-stage={stageKey}>
        <div className="bracket-column-header">
          <div className="bracket-column-title">{stage.label}</div>
          <div className="bracket-column-subtitle">{stage.subtitle}</div>
        </div>
        <div className="bracket-column-body">
          {renderConnectors(stageKey)}
          {stage.matches.map((m) => {
            // 3rd-place card is rendered separately, below the Final
            if (m.id === 'PLAYOFF_3RD') return null;
            const top = matchTops[m.id];
            if (top === undefined) return null;
            return (
              <div
                className="bracket-cell"
                key={m.id}
                style={{ top: `${top}px` }}
              >
                {renderMatchCard(m)}
              </div>
            );
          })}
          {stageKey === 'F' && (() => {
            const tpm = knockoutMatches.find(m => m.id === 'PLAYOFF_3RD');
            if (!tpm) return null;
            const top = matchTops['PLAYOFF_3RD'];
            if (top === undefined) return null;
            return (
              <div
                className="bracket-cell"
                key={tpm.id}
                style={{ top: `${top}px` }}
              >
                {renderMatchCard(tpm)}
              </div>
            );
          })()}
        </div>
      </div>
    );
  };

  const champTeam = champion ? teamMap[champion] : null;

  return (
    <div>
      <div className="info-banner">
        <span>ℹ️</span>
        <span>
          {t('bracketInfoBanner')}
        </span>
      </div>

      {/* Mobile / focused stage selector */}
      <div className="bracket-stage-tabs">
        <button
          className={`stage-tab-btn ${activeStageFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setActiveStageFilter('ALL')}
        >
          {t('stageAll')}
        </button>
        <button
          className={`stage-tab-btn ${activeStageFilter === 'R32' ? 'active' : ''}`}
          onClick={() => setActiveStageFilter('R32')}
        >
          {t('stageR32')}
        </button>
        <button
          className={`stage-tab-btn ${activeStageFilter === 'R16' ? 'active' : ''}`}
          onClick={() => setActiveStageFilter('R16')}
        >
          {t('stageR16')}
        </button>
        <button
          className={`stage-tab-btn ${activeStageFilter === 'QF' ? 'active' : ''}`}
          onClick={() => setActiveStageFilter('QF')}
        >
          {t('stageQF')}
        </button>
        <button
          className={`stage-tab-btn ${activeStageFilter === 'SF' ? 'active' : ''}`}
          onClick={() => setActiveStageFilter('SF')}
        >
          {t('stageSF')}
        </button>
        <button
          className={`stage-tab-btn ${activeStageFilter === 'F' ? 'active' : ''}`}
          onClick={() => setActiveStageFilter('F')}
        >
          {t('stageF')}
        </button>
      </div>

      <div className="bracket-wrapper">
        <div className="bracket-grid">
          {renderColumn('R32')}
          {renderColumn('R16')}
          {renderColumn('QF')}
          {renderColumn('SF')}
          {renderColumn('F')}

          {/* Champion column */}
          {(activeStageFilter === 'ALL' || activeStageFilter === 'F') && (
            <div className="bracket-column bracket-column-champion" data-stage="CHAMP">
              <div className="bracket-column-header">
                <div className="bracket-column-title">{t('stageChampion')}</div>
                <div className="bracket-column-subtitle">{t('crownedFromFinal')}</div>
              </div>
              <div className="bracket-column-body">
                <div
                  className="bracket-cell"
                  key="champion"
                  style={{ top: `${matchTops['FINAL'] !== undefined ? matchTops['FINAL'] - 42 : 0}px` }}
                >
                  {champTeam ? (
                    <div className="champion-display-card">
                      <h3>🏆 {t('worldChampionTitle')} 🏆</h3>
                      <span className="champion-flag">{champTeam.flag}</span>
                      <div className="champion-name">{t(champTeam.id)}</div>
                      <div className="champion-code">{champTeam.code}</div>
                    </div>
                  ) : (
                    <div className="champion-empty">
                      <span>🏆</span>
                      <span>{t('predictTheChampion')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default KnockoutBracket;
