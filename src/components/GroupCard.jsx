import React, { useState } from 'react';
import { GripVertical } from 'lucide-react';

export function GroupCard({ groupLetter, teams, onReorderTeams, onMoveTeam, onSimulateGroup }) {
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    // Required for Firefox support
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIdx(null);
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== index) {
      onReorderTeams(groupLetter, draggedIdx, index);
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  return (
    <div className="group-card">
      <div className="group-header">
        <h3 className="group-title">Group {groupLetter}</h3>
        <button className="group-sim-btn" onClick={() => onSimulateGroup(groupLetter)}>
          Simulate
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {teams.map((team, idx) => {
          const isTop2 = idx < 2;
          const is3rd = idx === 2;
          const isBeingDragged = idx === draggedIdx;
          const isDraggedOver = idx === dragOverIdx;

          // Determine border styling during drag operations
          let borderStyle = isTop2 ? '3px solid var(--accent-green)' : is3rd ? '3px solid var(--accent-navy)' : '3px solid var(--border-color)';
          if (isDraggedOver && !isBeingDragged) {
            borderStyle = '3px dashed var(--accent-red)';
          }

          return (
            <div 
              key={team.id} 
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
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
                padding: '10px 12px',
                cursor: isBeingDragged ? 'grabbing' : 'grab',
                opacity: isBeingDragged ? 0.4 : 1,
                transition: 'background 0.15s ease, border 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '65%' }}>
                {/* Drag Handle Icon */}
                <GripVertical 
                  size={14} 
                  style={{ 
                    color: 'var(--text-muted)', 
                    cursor: 'grab', 
                    flexShrink: 0 
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
                  {team.name} <span className="team-code" style={{ fontSize: '10px', marginLeft: '4px' }}>{team.code}</span>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Fallback arrows for accessibility and touch devices */}
                <button
                  className="group-sim-btn"
                  style={{ 
                    padding: '2px 6px', 
                    fontSize: '10px', 
                    visibility: idx === 0 ? 'hidden' : 'visible',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveTeam(groupLetter, idx, 'up');
                  }}
                  title="Move Up"
                >
                  ▲
                </button>
                <button
                  className="group-sim-btn"
                  style={{ 
                    padding: '2px 6px', 
                    fontSize: '10px', 
                    visibility: idx === 3 ? 'hidden' : 'visible',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveTeam(groupLetter, idx, 'down');
                  }}
                  title="Move Down"
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
