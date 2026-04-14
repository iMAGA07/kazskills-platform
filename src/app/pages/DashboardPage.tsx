import { useNavigate } from 'react-router';
import { Layout } from '@/app/components/Layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/components/Card';
import { Button } from '@/app/components/Button';
import { Badge } from '@/app/components/Badge';
import { mockCourses, currentUser } from '@/data/mockData';
import { Clock, CheckCircle, XCircle, AlertTriangle, BookOpen } from 'lucide-react';

export function DashboardPage() {
  const navigate = useNavigate();

  const getStatusBadge = (status: string, expiryDays: number | null) => {
    if (status === 'passed') {
      if (expiryDays !== null && expiryDays <= 30) {
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Истекает через {expiryDays} дн.
          </Badge>
        );
      }
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Пройден
        </Badge>
      );
    }

    if (status === 'failed') {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Не пройден
        </Badge>
      );
    }

    if (status === 'in_progress') {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          В процессе
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <BookOpen className="w-3 h-3" />
        Не начат
      </Badge>
    );
  };

  const stats = {
    total: mockCourses.length,
    passed: mockCourses.filter((c) => c.status === 'passed').length,
    inProgress: mockCourses.filter((c) => c.status === 'in_progress').length,
    expiring: mockCourses.filter((c) => c.expiryDays !== null && c.expiryDays <= 30).length,
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Добро пожаловать, {currentUser.name.split(' ')[1]}
          </h1>
          <p className="text-muted-foreground mt-2">
            {currentUser.position} • {currentUser.company}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-4xl">{stats.total}</CardTitle>
              <CardDescription>Всего курсов</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-4xl text-success">{stats.passed}</CardTitle>
              <CardDescription>Пройдено</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-4xl text-primary">{stats.inProgress}</CardTitle>
              <CardDescription>В процессе</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-4xl text-warning">{stats.expiring}</CardTitle>
              <CardDescription>Истекает скоро</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Courses List */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Доступные курсы</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {mockCourses.map((course) => (
              <Card key={course.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="mb-2">{course.title}</CardTitle>
                      <CardDescription>{course.description}</CardDescription>
                    </div>
                    {getStatusBadge(course.status, course.expiryDays)}
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Минимальный балл:</span>
                      <span className="font-semibold text-foreground">{course.minScore}%</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Попыток:</span>
                      <span className="font-semibold text-foreground">
                        {course.attempts} / {course.maxAttempts}
                      </span>
                    </div>

                    {course.expiryDate && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Действует до:</span>
                        <span className="font-semibold text-foreground">
                          {new Date(course.expiryDate).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                    )}

                    <div className="pt-3">
                      <Button
                        onClick={() => navigate(`/course/${course.id}`)}
                        variant={course.status === 'not_started' ? 'primary' : 'outline'}
                        className="w-full"
                      >
                        {course.status === 'not_started' && 'Начать курс'}
                        {course.status === 'in_progress' && 'Продолжить'}
                        {course.status === 'passed' && 'Перейти к курсу'}
                        {course.status === 'failed' && 'Повторить тест'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}