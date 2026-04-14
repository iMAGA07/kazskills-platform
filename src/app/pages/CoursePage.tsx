import { useParams, useNavigate } from 'react-router';
import { Layout } from '@/app/components/Layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/components/Card';
import { Button } from '@/app/components/Button';
import { Badge } from '@/app/components/Badge';
import { mockCourses } from '@/data/mockData';
import { ArrowLeft, FileText, PlayCircle, CheckCircle, AlertCircle } from 'lucide-react';

export function CoursePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const course = mockCourses.find((c) => c.id === id);

  if (!course) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Курс не найден</p>
          <Button onClick={() => navigate('/dashboard')} variant="outline" className="mt-4">
            Вернуться к курсам
          </Button>
        </div>
      </Layout>
    );
  }

  const canStartTest = course.attempts < course.maxAttempts;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Back Button */}
        <Button
          onClick={() => navigate('/dashboard')}
          variant="ghost"
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад к курсам
        </Button>

        {/* Course Header */}
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-3">
            {course.title}
          </h1>
          <p className="text-muted-foreground">
            {course.description}
          </p>
        </div>

        {/* Course Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Информация о курсе</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Минимальный балл</p>
                <p className="text-2xl font-semibold text-foreground">{course.minScore}%</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Попыток осталось</p>
                <p className="text-2xl font-semibold text-foreground">
                  {course.maxAttempts - course.attempts}
                </p>
              </div>

              {course.expiryDate && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Действителен до</p>
                  <p className="text-lg font-semibold text-foreground">
                    {new Date(course.expiryDate).toLocaleDateString('ru-RU')}
                  </p>
                  {course.expiryDays !== null && course.expiryDays <= 30 && (
                    <Badge variant="warning" className="mt-2">
                      Осталось {course.expiryDays} дн.
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Materials */}
        <Card>
          <CardHeader>
            <CardTitle>Учебные материалы</CardTitle>
            <CardDescription>
              Изучите все материалы перед прохождением тестирования
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {course.materials.map((material) => (
                <div
                  key={material.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{material.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {material.slides} слайдов • Презентация
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => navigate(`/materials/${material.id}`)}
                  >
                    <PlayCircle className="w-4 h-4" />
                    Открыть
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Test Section */}
        <Card>
          <CardHeader>
            <CardTitle>Тестирование</CardTitle>
            <CardDescription>
              После изучения материалов пройдите тестирование для подтверждения знаний
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!canStartTest && (
                <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                  <div className="text-sm text-destructive">
                    <p className="font-medium">Исчерпаны все попытки</p>
                    <p className="mt-1">Обратитесь к администратору для возможности повторной сдачи</p>
                  </div>
                </div>
              )}

              {course.status === 'passed' && (
                <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                  <div className="text-sm text-success">
                    <p className="font-medium">Тестирование пройдено успешно</p>
                    <p className="mt-1">Вы можете пройти тест повторно для улучшения результата</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 bg-accent rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Количество вопросов</p>
                  <p className="text-xl font-semibold text-foreground">5</p>
                </div>

                <div className="p-4 bg-accent rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Время на тест</p>
                  <p className="text-xl font-semibold text-foreground">30 минут</p>
                </div>

                <div className="p-4 bg-accent rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Тип вопросов</p>
                  <p className="text-xl font-semibold text-foreground">Выбор ответа</p>
                </div>
              </div>

              <Button
                onClick={() => navigate(`/test/${course.id}`)}
                variant="primary"
                size="lg"
                className="w-full mt-4"
                disabled={!canStartTest}
              >
                {course.status === 'not_started' ? 'Начать тестирование' : 'Пройти тестирование'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}