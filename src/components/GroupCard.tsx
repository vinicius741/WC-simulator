import React, { useState, useRef } from 'react';
import { GripVertical } from 'lucide-react';
import type { Team } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { FINALIZED_GROUPS } from '../data/currentTournamentState';

interface GroupCardProps {
  groupLetter: string;
  teams: Team[];
  onReorderTeams: (groupLetter: string, startIndex: number, endIndex: number, position: 'before' | 'after') => void;
  onMoveTeam: (groupLetter: string, index: number, direction: 'up' | 'down') => void;
  onSimulateGroup: (groupLetter: string) => void;
}

export function GroupCard({ groupLetter, teams, onReorderTeams, onMoveTeam, onSimulateGroup }: GroupCardProps) {
  const { t } = useLanguage();
  const isFinalized = FINALIZED_GROUPS.has(groupLetter);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  // Track the drag-over position ("before" or "after" the target index) for accurate insertion
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  // Use a ref counter to avoid clearing dragOverIdx when hovering child elements
  const dragOverCounter = useRef(0);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (isFinalized) return;
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    // Required for Firefox support
    e.dataTransfer.setData('text/plain', String(index));
    // Use a slight delay to let the drag image render before applying opacity
    requestAnimationFrame(() => {
      setDraggedIdx(index);
    });
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (isFinalized) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Determine whether the cursor is in the top or bottom half of the row
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'before' : 'after';

    if (dragOverIdx !== index || dropPosition !== position) {
      setDragOverIdx(index);
      setDropPosition(position);
    }
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    if (isFinalized) return;
    e.preventDefault();
    dragOverCounter.current++;
    setDragOverIdx(index);
  };

  const handleDragLeave = () => {
    dragOverCounter.current--;
    // Only clear if we've left the row entirely (counter reaches 0)
    if (dragOverCounter.current <= 0) {
      dragOverCounter.current = 0;
      setDragOverIdx(null);
      setDropPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    if (isFinalized) return;
    e.preventDefault();
    dragOverCounter.current = 0;

    if (draggedIdx !== null && draggedIdx !== index) {
      onReorderTeams(groupLetter, draggedIdx, index, dropPosition || 'before');
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
    setDropPosition(null);
  };

  const handleDragEnd = () => {
    dragOverCounter.current = 0;
    setDraggedIdx(null);
    setDragOverIdx(null);
    setDropPosition(null);
  };

  return (
    <div className="group-card">
      <div className="group-header">
        <h3 className="group-title">{t('groupLetter', { letter: groupLetter })}</h3>
        <button className="group-sim-btn" onClick={() => onSimulateGroup(groupLetter)} disabled={isFinalized}>
          {t('btnSimulate')}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {teams.map((team, idx) => {
          const isTop2 = idx < 2;
          const is3rd = idx === 2;
          const isBeingDragged = idx === draggedIdx;
          const isDraggedOver = idx === dragOverIdx;

          // Determine border styling during drag operations
          const borderStyle = isTop2 ? '3px solid var(--accent-green)' : is3rd ? '3px solid var(--accent-navy)' : '3px solid var(--border-color)';

          // Determine drop indicator line (top or bottom border)
          let dropIndicatorStyle: 'top' | 'bottom' | 'none' = 'none';
          if (isDraggedOver && !isBeingDragged) {
            dropIndicatorStyle = dropPosition === 'before' ? 'top' : 'bottom';
          }

          return (
            <div 
              key={team.id} 
              draggable={!isFinalized}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragEnter={(e) => handleDragEnter(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className="fixture-row" 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                background: isBeingDragged ? 'rgba(0,0,0,0.05)' : isTop2 ? 'rgba(46, 125, 50, 0.03)' : is3rd ? 'rgba(13, 30, 54, 0.03)' : 'transparent',
                borderLeft: borderStyle,
                borderTop: dropIndicatorStyle === 'top' ? '3px solid var(--accent-red)' : 'none',
                borderBottom: dropIndicatorStyle === 'bottom' ? '3px solid var(--accent-red)' : 'none',
                padding: '10px 12px',
                cursor: isFinalized ? 'default' : isBeingDragged ? 'grabbing' : 'grab',
                opacity: isBeingDragged ? 0.4 : 1,
                transition: 'background 0.15s ease, border 0.15s ease',
                position: 'relative',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '65%' }}>
                {/* Drag Handle Icon */}
                <GripVertical 
                  size={14} 
                  style={{ 
                    color: 'var(--text-muted)', 
                    cursor: isFinalized ? 'default' : 'grab', 
                    flexShrink: 0,
                    pointerEvents: 'none'
                  }} 
                />

                <span style={{ 
                  fontFamily: 'var(--serif)', 
                  fontWeight: 'bold', 
                  fontSize: '14px',
                  color: isTop2 ? 'var(--accent-green)' : is3rd ? 'var(--accent-navy)' : 'var(--text-muted)',
                  width: '15px'
                }}>
                  {idx + 1}
                </span>
                
                <span className="team-flag" style={{ fontSize: '18px' }}>{team.flag}</span>
                <span style={{ fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t(team.id)} <span className="team-code" style={{ fontSize: '10px', marginLeft: '4px' }}>{team.code}</span>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Fallback arrows for accessibility and touch devices */}
                <button
                  className="group-sim-btn"
                  style={{ 
                    padding: '2px 6px', 
                    fontSize: '10px', 
                    visibility: idx === 0 || isFinalized ? 'hidden' : 'visible',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveTeam(groupLetter, idx, 'up');
                  }}
                  title={t('btnMoveUp')}
                >
                  ▲
                </button>
                <button
                  className="group-sim-btn"
                  style={{ 
                    padding: '2px 6px', 
                    fontSize: '10px', 
                    visibility: idx === 3 || isFinalized ? 'hidden' : 'visible',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveTeam(groupLetter, idx, 'down');
                  }}
                  title={t('btnMoveDown')}
                >
                  ▼
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default GroupCard;
