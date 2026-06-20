import React, { useEffect } from 'react';
import { TEAMS } from '../data/teams';
import type { KnockoutMatch, Team } from '../types';
import { useLanguage } from '../hooks/useLanguage';

interface RecapItem {
  id: string;
  stage: string;
  opponentFlag: string;
  opponentCode: string;
  opponentName: string;
  scoreText: string;
  isWin: boolean;
  isDraw: boolean;
}

interface RecapModalProps {
  championId: string;
  groupTeams: Record<string, Team[]>;
  knockoutMatches: KnockoutMatch[];
  onClose: () => void;
}

export function RecapModal({ championId, groupTeams, knockoutMatches, onClose }: RecapModalProps) {
  const { t } = useLanguage();

  // Lock background scroll while the modal is open (prevents iOS rubber-banding
  // behind the overlay). Restored on unmount.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Map of teamId to team object for easy lookup
  const teamMap = React.useMemo<Record<string, Team>>(() => {
    const map: Record<string, Team> = {};
    TEAMS.forEach(t => { map[t.id] = t; });
    return map;
  }, []);

  // Gather champion's matches. Champion is resolved inside the memo so this
  // hook always runs unconditionally — the early return must come *after* all
  // hooks (react-hooks/rules-of-hooks).
  const recap = React.useMemo<RecapItem[]>(() => {
    const champion = teamMap[championId];
    if (!champion) return [];

    const list: RecapItem[] = [];

    // 1. Group stage recap (since there are no match scores)
    const grp = champion.group;
    const grpTeams = groupTeams[grp] || [];
    const idx = grpTeams.findIndex(t => t.id === championId);
    const posText = idx === 0 ? t('pos1st') : idx === 1 ? t('pos2nd') : idx === 2 ? t('pos3rd') : t('pos4th');

    list.push({
      id: 'group_recap',
      stage: t('groupLetter', { letter: grp }),
      opponentFlag: '🏁',
      opponentCode: 'GRP',
      opponentName: t('recapGroupFinished', { pos: posText, grp: grp }),
      scoreText: t('recapQualified'),
      isWin: true,
      isDraw: false
    });

    // 2. Knockout stage matches
    const stagesOrdered = ['R32', 'R16', 'QF', 'SF', 'FINAL'] as const;
    stagesOrdered.forEach(stageKey => {
      const match = knockoutMatches.find(m =>
        m.stage === stageKey && (m.home === championId || m.away === championId)
      );

      if (match) {
        const isHome = match.home === championId;
        const opponentId = isHome ? match.away : match.home;
        const opponent = teamMap[opponentId];
        const myScore = isHome ? match.homeScore : match.awayScore;
        const oppScore = isHome ? match.awayScore : match.homeScore;

        let scoreStr: string;
        const isWin = match.winner === championId;

        if (myScore !== null && oppScore !== null) {
          scoreStr = `${myScore} - ${oppScore}`;
          if (myScore === oppScore && match.penaltyWinner) {
            scoreStr += ` (${match.penaltyWinner === (isHome ? 'home' : 'away') ? t('recapWinPK') : t('recapLossPK')})`;
          }
        } else {
          // No score entered — just show result
          const viaPenalty = match.penaltyWinner === (isHome ? 'home' : 'away');
          scoreStr = viaPenalty ? t('recapWonPK') : t('recapWon');
        }

        list.push({
          id: match.id,
          stage: stageKey === 'R32' ? t('recapR32') :
                 stageKey === 'R16' ? t('recapR16') :
                 stageKey === 'QF' ? t('recapQF') :
                 stageKey === 'SF' ? t('recapSF') : t('recapFinal'),
          opponentFlag: opponent?.flag || '🏴',
          opponentCode: opponent?.code || 'TBD',
          opponentName: opponent ? t(opponent.id) : t('placeholderTBD'),
          scoreText: scoreStr,
          isWin: isWin,
          isDraw: false
        });
      }
    });

    return list;
  }, [championId, groupTeams, knockoutMatches, teamMap, t]);

  const champion = teamMap[championId];
  if (!champion) return null;

  return (
    <div
      className="
        modal-overlay fixed inset-0 z-[1000] flex items-center justify-center p-[15px]
        phone:!items-start phone:!p-[calc(env(safe-area-inset-top)+8px)_max(12px,env(safe-area-inset-right))_calc(env(safe-area-inset-bottom)+12px)_max(12px,env(safe-area-inset-left))]
      "
      style={{ background: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div
        className="
          modal-content bg-bg-secondary border-t-4 border-t-crimson w-full max-w-[500px] overflow-hidden relative
          flex flex-col
          phone:!max-h-[calc(100dvh-20px-env(safe-area-inset-top)-env(safe-area-inset-bottom))]
          shadow-[0_4px_25px_rgba(0,0,0,0.15)]
        "
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header p-[25px_20px_10px] text-center border-b border-border phone:!pt-[calc(env(safe-area-inset-top)+16px)] phone:!px-4 phone:!pb-2">
          <button
            className="
              modal-close-btn absolute top-3 right-[15px] bg-transparent border-none text-text-muted text-2xl cursor-pointer
              w-11 h-11 min-h-11 flex items-center justify-center
              phone:!top-[calc(env(safe-area-inset-top)+6px)] phone:!right-[calc(env(safe-area-inset-right)+8px)]
            "
            onClick={onClose}
          >
            ×
          </button>
          <h2 className="font-serif text-2xl font-bold text-ink phone:text-xl">🏆 {t('recapModalTitle')} 🏆</h2>
          <div className="mt-[15px]">
            <span className="champion-flag text-[64px] block mx-auto my-2" style={{ fontSize: 'clamp(40px, 12vw, 64px)' }}>
              {champion.flag}
            </span>
            <div className="champion-name font-serif font-bold" style={{ fontSize: '24px', color: 'var(--accent-red)' }}>
              {t(champion.id)}
            </div>
            <div className="champion-code text-xs font-bold" style={{ letterSpacing: '2px', color: '#1a1a1a', opacity: 0.6 }}>
              {champion.code}
            </div>
          </div>
        </div>

        <div className="modal-body p-[15px_20px_25px] phone:!overflow-y-auto phone:!overscroll-contain phone:!flex-1">
          <h4 className="font-serif text-base text-ink uppercase mb-3 border-b border-dashed border-border pb-1">
            {t('recapPathToGlory')}
          </h4>

          <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto phone:!max-h-none phone:!overflow-visible">
            {recap.map(item => (
              <div
                key={item.id}
                className="recap-item flex items-center bg-bg-tertiary border border-border p-2.5 px-3 justify-between phone:!p-2.5"
              >
                <div className="recap-stage font-bold text-[11px] text-navy uppercase w-1/4 phone:!text-[11px] phone:!leading-tight">
                  {item.stage}
                </div>
                <div className="recap-opponent-card flex items-center gap-1.5 text-xs w-1/2 font-medium phone:!min-w-0 phone:!text-[13px] phone:!flex-1 phone:!basis-1/2">
                  <span className="team-flag">{item.opponentFlag}</span>
                  <span className="font-semibold min-w-0" title={item.opponentName}>
                    {item.opponentName}
                  </span>
                </div>
                <div className={`recap-score font-bold text-xs text-black w-1/4 text-right phone:!text-sm ${item.isWin ? '!text-crimson' : ''}`}>
                  {item.scoreText}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecapModal;
