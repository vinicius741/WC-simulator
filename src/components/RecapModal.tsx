import React from 'react';
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
  const { t, language } = useLanguage();

  // Map of teamId to team object for easy lookup
  const teamMap = React.useMemo<Record<string, Team>>(() => {
    const map: Record<string, Team> = {};
    TEAMS.forEach(t => { map[t.id] = t; });
    return map;
  }, []);

  const champion = teamMap[championId];
  if (!champion) return null;

  // Gather champion's matches
  const recap = React.useMemo<RecapItem[]>(() => {
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

        let scoreStr = '';
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
  }, [championId, groupTeams, knockoutMatches, teamMap, language]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <button className="modal-close-btn" onClick={onClose}>×</button>
          <h2>🏆 {t('recapModalTitle')} 🏆</h2>
          <div style={{ marginTop: '15px' }}>
            <span className="champion-flag" style={{ fontSize: '64px', display: 'block', margin: '8px 0' }}>
              {champion.flag}
            </span>
            <div className="champion-name" style={{ fontSize: '24px', color: 'var(--accent-red)' }}>
              {t(champion.id)}
            </div>
            <div className="champion-code" style={{ fontSize: '12px', letterSpacing: '2px', color: '#1a1a1a', opacity: 0.6 }}>
              {champion.code}
            </div>
          </div>
        </div>

        <div className="modal-body">
          <h4 style={{ fontFamily: 'var(--serif)', fontSize: '16px', color: '#1a1a1a', textTransform: 'uppercase', marginBottom: '12px', borderBottom: '1px dashed var(--border-color)', paddingBottom: '4px' }}>
            {t('recapPathToGlory')}
          </h4>

          <div className="path-recap-list">
            {recap.map(item => (
              <div className="recap-item" key={item.id}>
                <div className="recap-stage">{item.stage}</div>
                <div className="recap-opponent-card">
                  <span className="team-flag">{item.opponentFlag}</span>
                  <span style={{ fontWeight: 600 }} title={item.opponentName}>
                    {item.opponentName}
                  </span>
                </div>
                <div className={`recap-score ${item.isWin ? 'win' : ''}`}>
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

