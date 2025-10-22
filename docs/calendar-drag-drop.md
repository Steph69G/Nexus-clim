# Calendar Drag & Drop System

**Phase 19 Feature - Unified Drag & Drop for All Calendar Views**

---

## 🎯 OVERVIEW

Système industrialisé de drag & drop pour tous les calendriers avec :
- ✅ API unifiée (`moveMission`)
- ✅ Hook réutilisable (`useMissionDragDrop`)
- ✅ RPC SQL avec règles métier
- ✅ Détection de conflits
- ✅ Contrôle d'accès (RLS)
- ✅ Logs et audit trail

---

## 📁 ARCHITECTURE

```
src/
├── api/
│   └── missions.calendar.ts         ← moveMission() API
├── components/
│   └── calendar/
│       ├── useMissionDragDrop.ts    ← Hook réutilisable
│       ├── CalendarView.tsx         ← Composant existant
│       └── DraggableCalendarExample.tsx  ← Exemple d'intégration
supabase/
└── migrations/
    └── 20251022170000_create_move_mission_rpc.sql  ← RPC SQL
```

---

## 🚀 QUICK START

### 1. Import the Hook

```typescript
import { useMissionDragDrop } from '@/components/calendar/useMissionDragDrop';
```

### 2. Use in Your Component

```typescript
export default function MyCalendarPage() {
  const { onDropEvent, isPending, error } = useMissionDragDrop('month');

  const handleDrop = async (mission: Mission, newDate: Date) => {
    // Define start/end times
    const start = new Date(newDate);
    start.setHours(8, 0, 0, 0);  // 08:00

    const end = new Date(start);
    end.setHours(9, 0, 0, 0);    // 09:00 (1h duration)

    try {
      await onDropEvent({
        id: mission.id.toString(),
        start,
        end,
        assigneeId: mission.assigned_user_id,
      });

      // Success - refresh data
      refetchMissions();
    } catch (err) {
      // Error handled automatically
      console.error('Move failed:', err);
    }
  };

  return (
    <div>
      {isPending && <LoadingOverlay />}
      <Calendar onMissionDrop={handleDrop} />
    </div>
  );
}
```

### 3. Apply to All Views

| View | Code | Snap Duration | Cross-Resource |
|------|------|---------------|----------------|
| Week | `useMissionDragDrop('week')` | 15 min | ✅ |
| Month | `useMissionDragDrop('month')` | 1 hour default | ❌ |
| Day | `useMissionDragDrop('day')` | 15 min | ✅ |
| Resource | `useMissionDragDrop('resource')` | 15 min | ✅ |

---

## 🔧 API REFERENCE

### `moveMission(args)`

**Arguments:**
```typescript
{
  missionId: string;        // Mission UUID
  start: string;            // ISO datetime
  end: string;              // ISO datetime
  assigneeId?: string;      // Reassign to another user (optional)
  source?: 'week'|'month'|'day'|'resource';  // Source view
  force?: boolean;          // Force move despite conflicts (admin only)
}
```

**Returns:**
```typescript
{
  mission_id: string;
  assignee_id: string | null;
  start: string;
  end: string;
}
```

**Errors:**
- `Authentication required` - User not logged in
- `Mission not found` - Invalid mission ID
- `Not allowed to move this mission` - Permission denied
- `Cannot move mission with status: X` - Status prevents move
- `End time must be after start time` - Invalid date range
- `Scheduling conflict detected` - Overlap with another mission
- `Not allowed to reassign mission` - Tech trying to change assignee

---

## 🛡️ BUSINESS RULES

### Permission Matrix

| Role | Can Move Own | Can Move Others | Can Change Assignee | Can Force |
|------|--------------|-----------------|---------------------|-----------|
| Admin | ✅ | ✅ | ✅ | ✅ |
| SAL | ✅ | ✅ | ✅ | ✅ |
| Tech | ✅ | ❌ | ❌ | ❌ |
| Client | ❌ | ❌ | ❌ | ❌ |

### Status Restrictions

**Cannot move missions with status:**
- `valide` (validated)
- `termine` (completed)
- `annule` (cancelled)

**Can move:**
- `nouveau` (new)
- `planifie` (planned)
- `confirme` (confirmed)
- `en_cours` (in progress)

### Conflict Detection

**Conflict occurs when:**
```sql
-- New time range overlaps with existing mission
-- for the same assignee (excluding cancelled/completed)
SELECT COUNT(*) FROM missions
WHERE assigned_user_id = :assignee
  AND status NOT IN ('annule', 'termine')
  AND scheduled_start < :new_end
  AND (scheduled_start + duration) > :new_start
```

**Admin/SAL can force** with `force: true`

---

## 🎨 UX GUIDELINES

### Snap Duration

```typescript
// Week/Day view - 15 minute snapping
const snapMinutes = 15;

// Month view - 1 hour default slots
const defaultDuration = 60; // minutes
```

### Visual Feedback

**During drag:**
- Show ghost preview of new position
- Highlight target time slot
- Show conflict warning if detected

**On success:**
- Smooth animation to new position
- Brief success toast (optional)
- Refresh calendar data

**On error:**
- Rollback to original position
- Show error toast with message
- Keep mission draggable

### Disabled States

**Disable drag for:**
```typescript
const isDraggable = (mission: Mission) => {
  // Status check
  if (['valide', 'termine', 'annule'].includes(mission.status)) {
    return false;
  }

  // Permission check
  if (userRole === 'tech' && mission.assigned_user_id !== userId) {
    return false;
  }

  return true;
};
```

**Visual indicator:**
```css
/* Not draggable */
.mission-card-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Draggable */
.mission-card-draggable {
  cursor: move;
}
```

---

## 🔍 CONFLICT RESOLUTION

### Detection

Conflicts are detected automatically by the RPC:

```typescript
// Conflict detected
try {
  await moveMission({ ... });
} catch (error) {
  if (error.message.includes('Scheduling conflict')) {
    // Show conflict UI
    showConflictDialog({
      existingMission: conflictingMission,
      newTime: { start, end },
      canForce: userRole in ['admin', 'sal']
    });
  }
}
```

### Admin Force Override

```typescript
// Admin can force despite conflicts
await moveMission({
  ...args,
  force: true  // Override conflicts
});
```

### User Notification

```typescript
// Conflict toast example
toast.error('Conflit détecté', {
  description: `Une autre mission existe déjà à ce créneau`,
  action: userIsAdmin ? {
    label: 'Forcer',
    onClick: () => moveMission({ ...args, force: true })
  } : undefined
});
```

---

## 📊 LOGGING & AUDIT

All moves are logged in `app_events`:

```sql
SELECT * FROM app_events
WHERE event_type = 'calendar_move'
ORDER BY created_at DESC;
```

**Event metadata:**
```json
{
  "mission_id": "uuid",
  "start": "2025-10-23T08:00:00Z",
  "end": "2025-10-23T09:00:00Z",
  "assignee_id": "uuid",
  "source": "week",
  "forced": false,
  "conflict_count": 0,
  "moved_by": "user_uuid"
}
```

---

## 🧪 TESTING CHECKLIST

### Unit Tests
- [ ] `moveMission()` API calls RPC correctly
- [ ] `useMissionDragDrop()` handles success
- [ ] `useMissionDragDrop()` handles errors
- [ ] Permission checks work

### Integration Tests
- [ ] Week view drag horizontal/vertical
- [ ] Month view drag to different day
- [ ] Day view drag to different time
- [ ] Resource view drag to different tech
- [ ] Conflict detection works
- [ ] Admin force override works
- [ ] Tech cannot move others' missions

### E2E Tests
```typescript
test('Admin can move any mission', async () => {
  await login('admin@example.com');
  await dragMission('mission-123', { to: '2025-10-25 10:00' });
  await expect(missionCard).toHaveText('25 oct, 10:00');
});

test('Tech cannot move others missions', async () => {
  await login('tech@example.com');
  await dragMission('mission-456', { to: '2025-10-25 10:00' });
  await expect(errorToast).toBeVisible();
  await expect(errorToast).toHaveText('Not allowed');
});

test('Conflict detected and prevented', async () => {
  await login('admin@example.com');
  await dragMission('mission-789', { to: '2025-10-25 10:00' });
  await expect(conflictToast).toBeVisible();
  await expect(missionCard).toHavePosition({ original: true });
});
```

---

## 🚀 DEPLOYMENT

### Migration

```bash
# Apply migration
supabase db push

# Or manually
psql $DATABASE_URL < supabase/migrations/20251022170000_create_move_mission_rpc.sql
```

### Verification

```sql
-- Check function exists
SELECT proname, proargtypes
FROM pg_proc
WHERE proname = 'move_mission';

-- Test RPC
SELECT move_mission(
  'mission-uuid'::uuid,
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '1 day' + INTERVAL '1 hour',
  NULL,
  'test',
  false
);
```

---

## 📝 EXAMPLES

### Example 1: Week View with Snap

```typescript
import { useMissionDragDrop } from '@/components/calendar/useMissionDragDrop';

export default function WeekView() {
  const { onDropEvent, isPending } = useMissionDragDrop('week');

  const handleDrop = (event: CalendarEvent) => {
    // Snap to 15 min intervals
    const start = snapToInterval(event.start, 15);
    const end = snapToInterval(event.end, 15);

    onDropEvent({
      id: event.id,
      start,
      end,
      assigneeId: event.assigneeId
    });
  };

  return <WeekCalendar onEventDrop={handleDrop} disabled={isPending} />;
}

function snapToInterval(date: Date, minutes: number): Date {
  const ms = 1000 * 60 * minutes;
  return new Date(Math.round(date.getTime() / ms) * ms);
}
```

### Example 2: Resource View with Reassignment

```typescript
export default function ResourceView() {
  const { onDropEvent, isPending } = useMissionDragDrop('resource');

  const handleDropToTech = (mission: Mission, targetTechId: string, time: Date) => {
    const start = new Date(time);
    const end = new Date(start.getTime() + mission.duration * 60 * 1000);

    onDropEvent({
      id: mission.id,
      start,
      end,
      assigneeId: targetTechId  // Reassign to new tech
    });
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {techs.map(tech => (
        <TechColumn
          key={tech.id}
          tech={tech}
          onMissionDrop={(mission, time) => handleDropToTech(mission, tech.id, time)}
          disabled={isPending}
        />
      ))}
    </div>
  );
}
```

### Example 3: Conflict Handling

```typescript
export default function CalendarWithConflicts() {
  const { onDropEvent, isPending, error } = useMissionDragDrop('week');
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingMove, setPendingMove] = useState(null);

  const handleDrop = async (event: CalendarEvent) => {
    try {
      await onDropEvent(event);
    } catch (err) {
      if (err.message.includes('conflict')) {
        setPendingMove(event);
        setShowConflictModal(true);
      }
    }
  };

  const handleForce = async () => {
    await moveMission({ ...pendingMove, force: true });
    setShowConflictModal(false);
  };

  return (
    <>
      <Calendar onEventDrop={handleDrop} />

      {showConflictModal && (
        <ConflictModal
          onForce={handleForce}
          onCancel={() => setShowConflictModal(false)}
        />
      )}
    </>
  );
}
```

---

## 🔗 RELATED

- `src/api/missions.calendar.ts` - API functions
- `src/components/calendar/useMissionDragDrop.ts` - Hook
- `supabase/migrations/20251022170000_create_move_mission_rpc.sql` - RPC
- `docs/url-filters.md` - URL query patterns

---

**Created:** 2025-10-22
**Phase:** 19 - Calendar DnD Industrialization
**Status:** ✅ Ready for implementation
