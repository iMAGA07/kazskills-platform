import { Layout } from '@/app/components/Layout';
import { Card, CardHeader, CardTitle, CardDescription } from '@/app/components/Card';
import { Button } from '@/app/components/Button';
import { Badge } from '@/app/components/Badge';
import { mockDocuments } from '@/data/mockData';
import { Download, FileText, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

export function DocumentsPage() {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'valid':
        return {
          variant: 'success' as const,
          icon: CheckCircle,
          text: 'Действует',
        };
      case 'expiring_soon':
        return {
          variant: 'warning' as const,
          icon: AlertTriangle,
          text: 'Истекает скоро',
        };
      case 'expired':
        return {
          variant: 'destructive' as const,
          icon: XCircle,
          text: 'Истек',
        };
      default:
        return {
          variant: 'secondary' as const,
          icon: FileText,
          text: 'Неизвестно',
        };
    }
  };

  const validDocs = mockDocuments.filter((d) => d.status === 'valid').length;
  const expiringDocs = mockDocuments.filter((d) => d.status === 'expiring_soon').length;
  const expiredDocs = mockDocuments.filter((d) => d.status === 'expired').length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Мои документы</h1>
          <p className="text-muted-foreground mt-2">
            Удостоверения, сертификаты и допуски
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl text-success">{validDocs}</CardTitle>
              <CardDescription>Действующих</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-3xl text-warning">{expiringDocs}</CardTitle>
              <CardDescription>Истекают скоро</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-3xl text-destructive">{expiredDocs}</CardTitle>
              <CardDescription>Истекших</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle>Список документов</CardTitle>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                    Название
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                    Номер
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                    Дата выдачи
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                    Дата окончания
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                    Статус
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-muted-foreground">
                    Действия
                  </th>
                </tr>
              </thead>

              <tbody>
                {mockDocuments.map((doc) => {
                  const statusInfo = getStatusInfo(doc.status);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr
                      key={doc.id}
                      className={clsx(
                        'border-b border-border transition-colors',
                        'hover:bg-accent'
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg flex-shrink-0">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <span className="font-medium text-foreground">{doc.title}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {doc.number}
                      </td>

                      <td className="px-6 py-4 text-sm text-foreground">
                        {new Date(doc.issueDate).toLocaleDateString('ru-RU')}
                      </td>

                      <td className="px-6 py-4 text-sm text-foreground">
                        {new Date(doc.expiryDate).toLocaleDateString('ru-RU')}
                      </td>

                      <td className="px-6 py-4">
                        <Badge variant={statusInfo.variant} className="flex items-center gap-1 w-fit">
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.text}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            // Download document
                            window.open(doc.fileUrl, '_blank');
                          }}
                        >
                          <Download className="w-4 h-4" />
                          Скачать
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
