import React, { useEffect, useRef, useState } from 'react';
import { sortCourses, type Course } from '../../context/CoursesContext';
import { IcSearch, IcClose } from '../Icons';

const BLUE = '#2B5CE6';
const NAVY = '#1B3D84';
const BORDER = '#E3E7F0';

/**
 * Course assignment picker.
 *  • Selected ("blue") courses sit at the top, reorderable by dragging the ⠿
 *    handle (pointer-based — works with mouse AND touch) or the ▲/▼ arrows.
 *    Newly added courses land at the BOTTOM of the blue group.
 *  • Available courses listed below (pinned/main first, then A→Z), searchable;
 *    click one to add it to the bottom of the selected group.
 * `value` is the ordered list of assigned course ids; order is preserved.
 */
export function CourseAssignPicker({
  courses, value, onChange, compact = false,
}: {
  courses: Course[];
  value: string[];
  onChange: (ids: string[]) => void;
  compact?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Keep the latest value/selected available to the window listeners.
  const valueRef = useRef(value);
  valueRef.current = value;

  const byId = new Map(courses.map(c => [c.id, c]));
  const selected = value.map(id => byId.get(id)).filter(Boolean) as Course[];
  const selectedSet = new Set(value);
  const available = sortCourses(courses.filter(c => !selectedSet.has(c.id)))
    .filter(c => search.trim() === '' || c.title.toLowerCase().includes(search.toLowerCase()));

  const add = (id: string) => onChange([...value, id]);
  const remove = (id: string) => onChange(value.filter(x => x !== id));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= valueRef.current.length || from === to) return;
    const next = [...valueRef.current];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
  };

  // Pointer-based drag reorder of the selected list.
  useEffect(() => {
    if (!dragId) return;

    const computeTarget = (clientY: number): number => {
      const ids = valueRef.current;
      // Default: keep position.
      let target = ids.indexOf(dragId);
      for (let j = 0; j < ids.length; j++) {
        const el = rowRefs.current[ids[j]];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (clientY < r.top + r.height / 2) { target = j; break; }
        target = j; // below all midpoints so far → last
      }
      return target;
    };

    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      const ids = valueRef.current;
      const cur = ids.indexOf(dragId);
      if (cur < 0) return;
      const target = computeTarget(e.clientY);
      if (target !== cur) move(cur, target);
    };
    const onUp = () => setDragId(null);

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragId]);

  const rowPad = compact ? '8px 10px' : '9px 12px';
  const fontSize = compact ? 12.5 : 13;

  return (
    <div>
      {/* Selected (reorderable) */}
      {selected.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 5 }}>
            Назначено ({selected.length}) — тяните ⠿ или жмите ▲▼ для порядка
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {selected.map((course, i) => {
              const dragging = dragId === course.id;
              return (
                <div
                  key={course.id}
                  ref={el => { rowRefs.current[course.id] = el; }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: rowPad, borderRadius: 8,
                    border: `1.5px solid ${dragging ? NAVY : BLUE}`,
                    background: '#EBF1FE',
                    boxShadow: dragging ? '0 6px 18px rgba(27,61,132,0.25)' : 'none',
                    opacity: dragging ? 0.92 : 1,
                    transition: dragging ? 'none' : 'box-shadow 0.12s',
                  }}
                >
                  {/* Drag handle — pointer down starts the reorder */}
                  <span
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setDragId(course.id);
                    }}
                    title="Перетащите"
                    style={{
                      flexShrink: 0, color: '#6B7280', fontSize: 16, lineHeight: 1,
                      cursor: 'grab', userSelect: 'none', touchAction: 'none',
                      padding: '0 2px',
                    }}
                  >⠿</span>
                  <span style={{ flexShrink: 0, width: 18, textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: BLUE }}>{i + 1}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize, color: NAVY, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', userSelect: 'none' }}>
                    {course.title}
                  </span>
                  <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} title="Вверх" style={arrowBtn(i === 0)}>▲</button>
                  <button type="button" onClick={() => move(i, i + 1)} disabled={i === selected.length - 1} title="Вниз" style={arrowBtn(i === selected.length - 1)}>▼</button>
                  <button type="button" onClick={() => remove(course.id)} title="Убрать"
                    style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IcClose size={13} color="#9CA3AF" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available */}
      {courses.length > 6 && (
        <div style={{ position: 'relative', marginBottom: 6 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
            <IcSearch size={14} color="#9CA3AF" />
          </span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск курса…"
            style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8, border: `1.5px solid ${BORDER}`, background: '#F8FAFD', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      )}
      {available.length > 0 && (
        <>
          {selected.length > 0 && (
            <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 5 }}>Доступные курсы — нажмите, чтобы добавить</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: compact ? 200 : 240, overflowY: 'auto', paddingRight: 2 }}>
            {available.map(course => (
              <div
                key={course.id}
                onClick={() => add(course.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: rowPad, borderRadius: 8,
                  border: `1.5px solid ${BORDER}`, background: '#fff',
                  cursor: 'pointer',
                }}
              >
                <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: `2px solid #D1D5DB` }} />
                {course.pinned && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#B45309', background: '#FEF3C7', padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>ОСН.</span>
                )}
                <span style={{ flex: 1, minWidth: 0, fontSize, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.title}</span>
                <span style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0 }}>{course.lessons.length} мат.</span>
              </div>
            ))}
          </div>
        </>
      )}
      {available.length === 0 && selected.length === 0 && (
        <div style={{ fontSize: 12.5, color: '#9CA3AF', padding: '8px 0' }}>Нет доступных курсов.</div>
      )}
    </div>
  );
}

function arrowBtn(disabled: boolean): React.CSSProperties {
  return {
    flexShrink: 0, width: 24, height: 24, borderRadius: 6,
    border: `1px solid ${BORDER}`, background: disabled ? '#F8FAFD' : '#fff',
    color: disabled ? '#D1D5DB' : '#6B7280', cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 10, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}
