import React, { useState } from 'react';
import { TEAMS } from '../data/teams';
import type { Team, KnockoutMatch } from '../types';
import { useLanguage } from '../hooks/useLanguage';

const R32_VISUAL_ORDER: string[] = [
  'R32_2',  // Match 74
  'R32_5',  // Match 77
  'R32_1',  // Match 73
  'R32_3',  // Match 75
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
      return <span className="text-[11px] text-text-muted italic">{placeholderText}</span>;
    }
    const team = teamMap[teamId];
    const displayTeamName = team ? t(team.id) : teamId;
    return (
      <div className="flex items-center gap-1.5 font-medium overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0">
        <span className="team-flag text-sm">{team?.flag}</span>
        <span className="overflow-hidden text-ellipsis whitespace-nowrap" title={displayTeamName}>{displayTeamName}</span>
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
        className={`ko-team-row flex justify-between items-center py-[7px] pl-2.5 pr-2 cursor-pointer transition-all duration-150 ease-out relative text-xs border-b border-border-soft gap-1.5 last:border-b-0 ${!teamId ? 'text-text-muted not-allowed italic text-[11px]' : ''} ${isWinner ? 'text-crimson font-bold' : ''}`}
        style={isWinner ? { background: 'rgba(176, 0, 0, 0.04)' } : undefined}
        onClick={() => teamId && onSelectWinner(match.id, side)}
      >
        {renderTeamName(teamId || undefined, getPlaceholderText(match, side))}
        <div className="flex items-center gap-1 flex-shrink-0">
          {showScore && (
            <span className={`font-bold text-xs text-ink min-w-[14px] text-center tabular-nums ${isWinner ? '!text-crimson' : ''}`}>
              {score}
            </span>
          )}
          {teamId && isWinner && (
            <button
              className={`bg-bg-tertiary border border-border text-text-secondary text-[8px] font-bold px-[5px] py-0.5 rounded-sm cursor-pointer flex-shrink-0 uppercase transition-all duration-150 ease-out hover:border-crimson hover:text-crimson ${match.penaltyWinner === side ? '!bg-crimson !text-white !border-crimson' : ''} phone:!min-w-11 phone:!min-h-11 phone:!text-[11px] phone:!px-2.5 phone:!py-1.5`}
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
      <div
        key={match.id}
        className="
          ko-match-card bg-card border border-border w-full relative border-l-[3px] border-l-navy
          transition-[border-color,box-shadow] duration-150 ease-out
          hover:border-l-crimson
          phone:max-w-[460px] phone:mx-auto
        "
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        data-match-id={match.id}
      >
        <div className="ko-match-header bg-bg-tertiary px-2 py-1 text-[9px] font-bold text-text-secondary border-b border-border flex justify-between items-center uppercase tracking-[0.4px] phone:text-[11px] phone:px-2.5 phone:py-1.5 phone:tracking-[0.3px]">
          <span className="font-bold text-ink">{getMatchLabel(match.label)}</span>
          <span className="bg-navy text-white px-[5px] text-[8px] tracking-[0.5px] rounded-sm phone:text-[10px] phone:px-1.5 phone:py-0.5">
            {stageShortLabel(match.stage)}
          </span>
        </div>
        <div className="flex flex-col">
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
            className="bracket-connector-vertical tablet:!hidden"
            style={{ top: `${upperCenter}px`, height: `${lowerCenter - upperCenter}px` }}
          />
          <div
            className="bracket-connector-stub tablet:!hidden"
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
      <div
        key={stageKey}
        data-stage={stageKey}
        className="
          bracket-column flex flex-col flex-1 min-w-[220px] relative
          tablet:!flex-1 tablet:basis-full tablet:w-full
        "
      >
        <div className="text-center px-0 pb-2.5 mb-2.5 border-b-2 border-navy">
          <div className="font-serif text-[15px] font-bold text-ink uppercase tracking-[1px] leading-tight">
            {stage.label}
          </div>
          <div className="text-[10px] text-text-muted font-semibold uppercase tracking-[0.5px] mt-[3px]">
            {stage.subtitle}
          </div>
        </div>
        <div
          className="
            bracket-column-body block relative h-[1860px]
            tablet:!h-auto tablet:!flex tablet:!flex-col tablet:!gap-3
          "
          style={{
            ['--match-height' as string]: '96px',
            ['--match-gap' as string]: '12px',
            ['--slot' as string]: 'calc(var(--match-height) + var(--match-gap))',
          }}
        >
          {renderConnectors(stageKey)}
          {stage.matches.map((m) => {
            // 3rd-place card is rendered separately, below the Final
            if (m.id === 'PLAYOFF_3RD') return null;
            const top = matchTops[m.id];
            if (top === undefined) return null;
            return (
              <div
                key={m.id}
                className="bracket-cell absolute left-0 right-0 top-0 flex items-center z-[2] tablet:!static tablet:!h-auto"
                style={{ top: `${top}px`, height: 'var(--match-height)' }}
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
                key={tpm.id}
                className="bracket-cell absolute left-0 right-0 top-0 flex items-center z-[2] tablet:!static tablet:!h-auto"
                style={{ top: `${top}px`, height: 'var(--match-height)' }}
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
      <div
        className="
          info-banner bg-bg-tertiary border-l-4 border-l-navy text-ink px-[18px] py-3 text-[13px] mb-[25px] text-left
          phone:!flex phone:!gap-2 phone:!items-start phone:!text-xs phone:!p-3.5
        "
      >
        <span>ℹ️</span>
        <span>
          {t('bracketInfoBanner')}
        </span>
      </div>

      {/* Mobile / focused stage selector */}
      <div
        className="
          bracket-stage-tabs flex justify-center gap-1.5 mb-[15px] overflow-x-auto pb-[5px]
          phone:!justify-start phone:!gap-2 phone:!pb-2 phone:[scrollbar-width:none] phone:phone-no-scrollbar
        "
      >
        {(['ALL', 'R32', 'R16', 'QF', 'SF', 'F'] as const).map((key) => {
          const label = key === 'ALL' ? t('stageAll') : key === 'R32' ? t('stageR32') : key === 'R16' ? t('stageR16') : key === 'QF' ? t('stageQF') : key === 'SF' ? t('stageSF') : t('stageF');
          return (
            <button
              key={key}
              className={`stage-tab-btn bg-bg-secondary border border-border text-text-secondary text-[11px] font-bold px-3.5 py-1.5 rounded-sm cursor-pointer whitespace-nowrap uppercase transition-all duration-150 ease-out phone:!min-h-11 phone:!px-3.5 phone:!py-2.5 ${activeStageFilter === key ? '!bg-navy !text-white !border-navy' : ''}`}
              onClick={() => setActiveStageFilter(key)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div
        className="
          bracket-wrapper overflow-x-auto px-0 pt-2.5 pb-[30px] mb-[50px] bg-bg-secondary border border-border border-t-[3px] border-t-navy
          tablet:!overflow-x-visible tablet:!p-[10px_12px_24px]
          phone:!p-[8px_10px_16px]
        "
      >
        <div
          className="
            bracket-grid flex items-stretch gap-9 min-w-full p-[18px_18px_24px] relative
            tablet:!flex-col tablet:!min-w-0 tablet:!gap-6 tablet:!p-0
            phone:!gap-[18px]
          "
        >
          {renderColumn('R32')}
          {renderColumn('R16')}
          {renderColumn('QF')}
          {renderColumn('SF')}
          {renderColumn('F')}

          {/* Champion column */}
          {(activeStageFilter === 'ALL' || activeStageFilter === 'F') && (
            <div
              className="bracket-column bracket-column-champion min-w-[220px] basis-[240px] grow-0 shrink-0 tablet:basis-full tablet:w-full"
              data-stage="CHAMP"
            >
              <div className="text-center px-0 pb-2.5 mb-2.5 border-b-2 border-navy">
                <div className="font-serif text-[15px] font-bold text-ink uppercase tracking-[1px] leading-tight">
                  {t('stageChampion')}
                </div>
                <div className="text-[10px] text-text-muted font-semibold uppercase tracking-[0.5px] mt-[3px]">
                  {t('crownedFromFinal')}
                </div>
              </div>
              <div
                className="bracket-column-body block relative h-[1860px] tablet:!h-auto tablet:!flex tablet:!flex-col tablet:!gap-3"
                style={{
                  ['--match-height' as string]: '96px',
                  ['--match-gap' as string]: '12px',
                  ['--slot' as string]: 'calc(var(--match-height) + var(--match-gap))',
                }}
              >
                <div
                  className="bracket-cell absolute left-0 right-0 top-0 flex items-center z-[2] tablet:!static tablet:!h-auto"
                  key="champion"
                  style={{ top: `${matchTops['FINAL'] !== undefined ? matchTops['FINAL'] - 42 : 0}px`, height: 'var(--match-height)' }}
                >
                  {champTeam ? (
                    <div
                      className="
                        bg-bg-secondary border-2 border-gold p-[25px] text-center w-[220px]
                        tablet:!w-full tablet:!max-w-[440px] tablet:!mx-auto
                      "
                      style={{ boxShadow: '0 4px 12px rgba(197, 160, 89, 0.15)' }}
                    >
                      <h3 className="font-serif text-base text-navy uppercase mb-2.5 border-b border-gold pb-1">
                        🏆 {t('worldChampionTitle')} 🏆
                      </h3>
                      <span className="champion-flag text-5xl mb-2 inline-block">{champTeam.flag}</span>
                      <div className="champion-name font-serif text-xl font-bold text-ink">{t(champTeam.id)}</div>
                      <div className="champion-code text-[11px] text-text-secondary font-bold">{champTeam.code}</div>
                    </div>
                  ) : (
                    <div
                      className="
                        w-[220px] h-[180px] border-2 border-dashed border-border flex flex-col items-center justify-center text-text-muted text-xs gap-2
                        tablet:!w-full tablet:!h-auto tablet:!min-h-[150px] tablet:!p-6
                      "
                    >
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
