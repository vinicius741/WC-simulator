import React, { useState, useRef } from 'react';
import { GripVertical } from 'lucide-react';
import type { Team } from '../types';
import { useLanguage } from '../hooks/useLanguage';

interface GroupCardProps {
  groupLetter: string;
  teams: Team[];
  onReorderTeams: (groupLetter: string, startIndex: number, endIndex: number, position: 'before' | 'after') => void;
  onMoveTeam: (groupLetter: string, index: number, direction: 'up' | 'down') => void;
  onSimulateGroup: (groupLetter: string) => void;
}

export function GroupCard({ groupLetter, teams, onReorderTeams, onMoveTeam, onSimulateGroup }: GroupCardProps) {
  const { t } = useLanguage();
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  // Track the drag-over position ("before" or "after" the target index) for accurate insertion
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
  // Use a ref counter to avoid clearing dragOverIdx when hovering child elements
  const dragOverCounter = useRef(0);

  const handleDragStart = (e: React.DragEvent, index: number) => {
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
    <div
      className="
        group-card bg-card border border-border flex flex-col
        border-t-[3px] border-t-navy p-4 min-w-0 phone:p-3
      "
    >
      <div className="flex justify-between items-center mb-3 pb-1.5 border-b border-border">
        <h3 className="font-serif text-xl font-bold text-ink">{t('groupLetter', { letter: groupLetter })}</h3>
        <button
          className="
            group-sim-btn bg-transparent border border-border text-text-secondary px-2 py-1 font-sans text-[10px] font-bold cursor-pointer uppercase tracking-[0.5px] transition-all duration-150 ease-out
            hover:border-crimson hover:text-crimson
            phone:text-xs phone:px-3 phone:py-2 phone:min-h-9
          "
          onClick={() => onSimulateGroup(groupLetter)}
        >
          {t('btnSimulate')}
        </button>
      </div>

      <div className="flex flex-col gap-2">
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
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragEnter={(e) => handleDragEnter(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className="
                fixture-row flex justify-between items-center
                bg-bg-tertiary border border-border text-[11px]
                phone:!px-2.5 phone:!py-3
              "
              style={{
                background: isBeingDragged ? 'rgba(0,0,0,0.05)' : isTop2 ? 'rgba(46, 125, 50, 0.03)' : is3rd ? 'rgba(13, 30, 54, 0.03)' : 'transparent',
                borderLeft: borderStyle,
                borderTop: dropIndicatorStyle === 'top' ? '3px solid var(--accent-red)' : 'none',
                borderBottom: dropIndicatorStyle === 'bottom' ? '3px solid var(--accent-red)' : 'none',
                padding: '10px 12px',
                cursor: isBeingDragged ? 'grabbing' : 'grab',
                opacity: isBeingDragged ? 0.4 : 1,
                transition: 'background 0.15s ease, border 0.15s ease',
                position: 'relative',
                userSelect: 'none',
              }}
            >
              <div className="flex items-center gap-2.5 w-[65%] min-w-0">
                {/* Drag Handle Icon */}
                <GripVertical
                  size={14}
                  style={{
                    color: 'var(--text-muted)',
                    cursor: 'grab',
                    flexShrink: 0,
                    pointerEvents: 'none'
                  }}
                />

                <span
                  style={{
                    fontFamily: 'var(--serif)',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    color: isTop2 ? 'var(--accent-green)' : is3rd ? 'var(--accent-navy)' : 'var(--text-muted)',
                    width: '15px'
                  }}
                >
                  {idx + 1}
                </span>

                <span className="team-flag text-[18px]">{team.flag}</span>
                <span className="font-semibold text-[13px] overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                  {t(team.id)} <span className="team-code text-[10px] ml-1 font-bold text-ink">{team.code}</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Fallback arrows for accessibility and touch devices */}
                <button
                  className="
                    group-sim-btn bg-transparent border border-border text-text-primary px-1.5 py-0.5 text-[10px] font-bold cursor-pointer uppercase tracking-[0.5px] transition-all duration-150 ease-out
                    phone:!min-w-10 phone:!min-h-10 phone:!px-2.5 phone:!py-1.5 phone:!text-sm phone:!leading-none phone:inline-flex phone:!items-center phone:!justify-center
                  "
                  style={{
                    visibility: idx === 0 ? 'hidden' : 'visible',
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
                  className="
                    group-sim-btn bg-transparent border border-border text-text-primary px-1.5 py-0.5 text-[10px] font-bold cursor-pointer uppercase tracking-[0.5px] transition-all duration-150 ease-out
                    phone:!min-w-10 phone:!min-h-10 phone:!px-2.5 phone:!py-1.5 phone:!text-sm phone:!leading-none phone:inline-flex phone:!items-center phone:!justify-center
                  "
                  style={{
                    visibility: idx === 3 ? 'hidden' : 'visible',
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
