import React, { useState } from 'react';
import { IcFileText, IcDownload, IcMedal } from '../../components/Icons';

const BORDER = '#E8ECF6';
const FAINT = '#F4F6FB';

// PDF icon component
const PdfIcon = () => (
  <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
    <path d="M2 0C0.895 0 0 0.895 0 2V16C0 17.105 0.895 18 2 18H14C15.105 18 16 17.105 16 16V5.414C16 4.883 15.789 4.375 15.414 4L12 0.586C11.625 0.211 11.117 0 10.586 0H2Z" fill="#EF4444"/>
    <path d="M10 0V4C10 4.552 10.448 5 11 5H16" fill="#DC2626"/>
    <text x="50%" y="70%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="5" fontWeight="bold">PDF</text>
  </svg>
);

// Mock data - replace with real data from backend
const mockDocuments = [
  {
    id: 1,
    number: '16974',
    title: 'Протокол №16974 (Безопасность и Охрана труда)',
    status: 'valid',
    statusLabel: 'Действует',
    issueDate: '06.12.2025',
    expiryDate: '06.12.2026',
  },
  {
    id: 2,
    number: '16175',
    title: 'Протокол №16175 (Обеспечение промышленной безопасности Закон РК «о гражданской защите» (ИТР))',
    status: 'valid',
    statusLabel: 'Действует',
    issueDate: '29.10.2025',
    expiryDate: '29.10.2026',
  },
  {
    id: 3,
    number: '14552',
    title: 'Протокол №14552 (Пожарно-технический минимум)',
    status: 'valid',
    statusLabel: 'Действует',
    issueDate: '19.06.2025',
    expiryDate: '19.06.2026',
  },
  {
    id: 4,
    number: '13377',
    title: 'Обратиться к менеджеру за протоколом прохождения (Отсутствует шаблон для автоматической загрузки)',
    status: 'expired',
    statusLabel: 'Истёк',
    issueDate: '02.04.2025',
    expiryDate: '02.04.2026',
  },
  {
    id: 5,
    number: '13357',
    title: 'Обратиться к менеджеру за протоколом прохождения (Отсутствует шаблон для автоматической загрузки)',
    status: 'expired',
    statusLabel: 'Истёк',
    issueDate: '01.04.2025',
    expiryDate: '01.04.2026',
  },
];

const mockCertificates = [
  {
    id: 1,
    number: 'KC-2025-001',
    courseName: 'Безопасность и Охрана труда',
    issueDate: '06.12.2025',
    expiryDate: '06.12.2026',
    status: 'valid',
    statusLabel: 'Действителен',
  },
  {
    id: 2,
    number: 'KC-2025-002',
    courseName: 'Пожарно-технический минимум',
    issueDate: '19.06.2025',
    expiryDate: '19.06.2026',
    status: 'valid',
    statusLabel: 'Действителен',
  },
];

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<'documents' | 'certificates'>('documents');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return { color: '#059669', bg: '#D1FAE5' };
      case 'expired':
        return { color: '#EF4444', bg: '#FEE2E2' };
      default:
        return { color: '#6B7280', bg: '#F3F4F6' };
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header with tabs */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 16px', fontSize: '24px', fontWeight: 700, color: '#0F1629', textTransform: 'uppercase' }}>
          ДОКУМЕНТЫ И СЕРТИФИКАТЫ
        </h1>
        
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #E3E7F0' }}>
          <button
            onClick={() => setActiveTab('documents')}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'documents' ? '2px solid #2B5CE6' : '2px solid transparent',
              color: activeTab === 'documents' ? '#2B5CE6' : '#6B7280',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '-2px',
              transition: 'all 0.15s',
            }}
          >
            ДОКУМЕНТЫ
          </button>
          <button
            onClick={() => setActiveTab('certificates')}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'certificates' ? '2px solid #2B5CE6' : '2px solid transparent',
              color: activeTab === 'certificates' ? '#2B5CE6' : '#6B7280',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '-2px',
              transition: 'all 0.15s',
            }}
          >
            СЕРТИФИКАТЫ
          </button>
        </div>
      </div>

      {/* Documents tab */}
      {activeTab === 'documents' && (
        <div style={{
          background: '#fff', borderRadius: '12px',
          border: '1px solid #E3E7F0', overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: FAINT, borderBottom: `1px solid ${BORDER}` }}>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6B7280', width: '80px', textTransform: 'uppercase' }}>
                  №
                </th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                  Название
                </th>
                <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6B7280', width: '120px', textTransform: 'uppercase' }}>
                  Статус
                </th>
                <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6B7280', width: '140px', textTransform: 'uppercase' }}>
                  Дата получения
                </th>
                <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6B7280', width: '140px', textTransform: 'uppercase' }}>
                  Истекает
                </th>
              </tr>
            </thead>
            <tbody>
              {mockDocuments.map((doc, idx) => {
                const statusColors = getStatusColor(doc.status);
                return (
                  <tr
                    key={doc.id}
                    style={{
                      borderBottom: idx < mockDocuments.length - 1 ? `1px solid ${BORDER}` : 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = FAINT}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = '#fff'}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F1629' }}>
                        {doc.number}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <PdfIcon />
                        <a
                          href="#"
                          style={{
                            fontSize: '14px',
                            color: '#2B5CE6',
                            textDecoration: 'none',
                            fontWeight: 500,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                        >
                          {doc.title}
                        </a>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', fontSize: '12px', fontWeight: 600,
                        color: statusColors.color, background: statusColors.bg,
                        padding: '5px 12px', borderRadius: '16px',
                      }}>
                        {doc.statusLabel}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center', fontSize: '14px', color: '#6B7280' }}>
                      {doc.issueDate}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center', fontSize: '14px', color: '#6B7280' }}>
                      {doc.expiryDate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Certificates tab */}
      {activeTab === 'certificates' && (
        <div style={{
          background: '#fff', borderRadius: '12px',
          border: '1px solid #E3E7F0', overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: FAINT, borderBottom: `1px solid ${BORDER}` }}>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6B7280', width: '120px', textTransform: 'uppercase' }}>
                  Номер
                </th>
                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                  Курс
                </th>
                <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6B7280', width: '120px', textTransform: 'uppercase' }}>
                  Статус
                </th>
                <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6B7280', width: '140px', textTransform: 'uppercase' }}>
                  Выдан
                </th>
                <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6B7280', width: '140px', textTransform: 'uppercase' }}>
                  Действителен до
                </th>
                <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6B7280', width: '100px', textTransform: 'uppercase' }}>
                  Действия
                </th>
              </tr>
            </thead>
            <tbody>
              {mockCertificates.map((cert, idx) => {
                const statusColors = getStatusColor(cert.status);
                return (
                  <tr
                    key={cert.id}
                    style={{
                      borderBottom: idx < mockCertificates.length - 1 ? `1px solid ${BORDER}` : 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = FAINT}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = '#fff'}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F1629' }}>
                        {cert.number}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '6px',
                          background: '#EBF1FE',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <IcMedal size={16} color="#2B5CE6" />
                        </div>
                        <span style={{ fontSize: '14px', color: '#0F1629', fontWeight: 500 }}>
                          {cert.courseName}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', fontSize: '12px', fontWeight: 600,
                        color: statusColors.color, background: statusColors.bg,
                        padding: '5px 12px', borderRadius: '16px',
                      }}>
                        {cert.statusLabel}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center', fontSize: '14px', color: '#6B7280' }}>
                      {cert.issueDate}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center', fontSize: '14px', color: '#6B7280' }}>
                      {cert.expiryDate}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <button
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: '#2B5CE6',
                          border: 'none',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                      >
                        Скачать
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}