import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCourses } from '../../context/CoursesContext';
import { IcDownload, IcCheckCircle, IcDocument } from '../../components/Icons';
import { downloadProtocol, protocolTypeForCourse, protocolTypeLabel } from '../../lib/protocol';

const NAVY = '#1B3D84';
const BLUE = '#2B5CE6';
const BORDER = '#E8ECF6';
const MUTED = '#6B7280';

interface PassedCourse {
  courseId: string;
  courseTitle: string;
  passedAt: string;
  score: number;
}

export default function CertificatesPage() {
  const { user } = useAuth();
  const { courses, getProgress } = useCourses();
  const [passed, setPassed] = useState<PassedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || courses.length === 0) { setLoading(false); return; }
    const enrolledIds = new Set(user.enrolledCourses ?? []);
    const assigned = courses.filter(c => c.published && enrolledIds.has(c.id));
    Promise.all(assigned.map(c => getProgress(user.id, c.id)))
      .then(progresses => {
        const out: PassedCourse[] = [];
        progresses.forEach((pr, i) => {
          const attempts = pr.attempts ?? [];
          const best = attempts.filter(a => a.passed).sort((a, b) => b.score - a.score)[0];
          if (best || pr.status === 'completed') {
            const course = assigned[i];
            out.push({
              courseId: course.id,
              courseTitle: course.title,
              passedAt: best?.completedAt ?? new Date().toISOString(),
              score: best ? Math.round(best.score) : 100,
            });
          }
        });
        setPassed(out);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, courses]);

  if (!user) return null;

  const handleDownload = async (pc: PassedCourse) => {
    setBusyId(pc.courseId);
    try {
      await downloadProtocol({
        user: { id: user.id, name: user.name, position: user.position, organization: user.organization, requestNumber: (user as any).requestNumber },
        course: { id: pc.courseId, title: pc.courseTitle },
      });
    } catch (e) {
      console.error('Protocol download error:', e);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', color: '#0F1629' }}>Протоколы проверки знаний</h1>
        <p style={{ color: MUTED, margin: 0, fontSize: 13.5 }}>
          После успешной сдачи по каждому курсу формируется официальный протокол. Скачайте его в формате PDF.
        </p>
      </div>

      {loading && (
        <div style={{ padding: 70, textAlign: 'center', color: '#9CA3AF' }}>Загрузка…</div>
      )}

      {!loading && passed.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 16, padding: '70px 24px', textAlign: 'center', border: `1px solid ${BORDER}` }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#F4F6FB', border: `2px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <IcDocument size={32} color={BLUE} />
          </div>
          <h3 style={{ margin: '0 0 6px', color: '#374151', fontSize: 16, fontWeight: 700 }}>Протоколов пока нет</h3>
          <p style={{ margin: 0, color: '#9CA3AF', fontSize: 13.5 }}>Сдайте тест по назначенному курсу — протокол появится здесь.</p>
        </div>
      )}

      {!loading && passed.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {passed.map(pc => {
            const type = protocolTypeForCourse(pc.courseTitle);
            return (
              <div key={pc.courseId} style={{
                background: '#fff', borderRadius: 12, border: `1px solid ${BORDER}`,
                padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
              }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IcCheckCircle size={22} color="#059669" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: '#0F1629' }}>{pc.courseTitle}</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                    Форма протокола: {protocolTypeLabel(type)} · Результат: {pc.score}% · Сдан {new Date(pc.passedAt).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(pc)}
                  disabled={busyId === pc.courseId}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '10px 16px', borderRadius: 9, border: 'none',
                    background: busyId === pc.courseId ? '#9CA3AF' : NAVY, color: '#fff',
                    fontSize: 13, fontWeight: 600, cursor: busyId === pc.courseId ? 'wait' : 'pointer', flexShrink: 0,
                  }}
                >
                  <IcDownload size={14} color="#fff" />
                  {busyId === pc.courseId ? 'Формирование…' : 'Скачать протокол'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
