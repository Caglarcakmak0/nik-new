import React, { useState, useMemo } from 'react';
import { useHabits } from '../../hooks/useHabits';
import { HabitsLayout } from './HabitsLayout';
import { HabitRiskPanel, HabitHeatmap, HabitCreateModal, HabitEditModal } from '../../components/habits';
import { HabitTrends } from '../../components/habits/HabitTrends';

const HabitsPage: React.FC = () => {
  const { routines, loading, error, refresh, markDone, markSkip, mockMode, toggleMock, setRoutineStatus, updateRoutine } = useHabits();
  const [openCreate, setOpenCreate] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  // Filters
  const [filterQuery, setFilterQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRecurrence, setFilterRecurrence] = useState('');
  // Undo archive
  const [recentArchive, setRecentArchive] = useState<{id:string; name:string}|null>(null);
  const undoArchive = async () => {
    if(recentArchive){ await setRoutineStatus(recentArchive.id, 'active'); setRecentArchive(null); refresh(); }
  };
  const onStatusChange = async (id: string, status: 'active'|'paused'|'archived') => {
    const target = routines.find(r=> r._id===id);
    await setRoutineStatus(id, status);
    if(status==='archived' && target){ setRecentArchive({id, name: target.name}); }
    refresh();
  };

  const filtered = useMemo(()=> {
    return routines.filter(r=> {
      if(filterStatus && (r as any).status !== filterStatus) return false;
      if(filterRecurrence && r.schedule?.recurrence !== filterRecurrence) return false;
      if(filterQuery){
        const q = filterQuery.toLowerCase();
        if(!r.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [routines, filterStatus, filterRecurrence, filterQuery]);

  return (
    <>
      <HabitsLayout
        routines={filtered.map(r=> ({...r, status: (r as any).status as ('active'|'paused'|'archived'|undefined)}))}
        loading={loading}
        error={error}
        onRefresh={refresh}
        onCreate={() => setOpenCreate(true)}
        onDone={markDone}
        onSkip={markSkip}
        mockMode={mockMode}
        onToggleMock={toggleMock}
        onStatusChange={onStatusChange}
        onEdit={(id)=> setEditId(id)}
        filterQuery={filterQuery}
        onFilterQueryChange={setFilterQuery}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        filterRecurrence={filterRecurrence}
        onFilterRecurrenceChange={setFilterRecurrence}
        recentlyArchivedName={recentArchive?.name || null}
        onUndoArchive={undoArchive}
      />
      <div className="habits-analytics-grid">
        <HabitRiskPanel mockMode={mockMode} />
        <HabitHeatmap mockMode={mockMode} />
        <HabitTrends mockMode={mockMode} />
      </div>
      <HabitCreateModal open={openCreate} onClose={()=> setOpenCreate(false)} onCreated={refresh} />
      <HabitEditModal
        open={!!editId}
        routine={routines.find(r=> r._id===editId) as any}
        onClose={()=> setEditId(null)}
        onUpdated={async (patch: any)=> { if(editId){ await updateRoutine(editId, patch); refresh(); setEditId(null);} }}
      />
    </>
  );
};

export default HabitsPage;
