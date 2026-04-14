import { useParams, useNavigate, useLocation } from 'react-router';
import { Layout } from '@/app/components/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/Card';
import { Button } from '@/app/components/Button';
import { Badge } from '@/app/components/Badge';
import { mockTest, mockCourses } from '@/data/mockData';
import { CheckCircle, XCircle, Home } from 'lucide-react';
import { clsx } from 'clsx';

export function TestResultPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const course = mockCourses.find((c) => c.id === courseId);

  const { score, answers } = location.state || { score: 0, answers: {} };
  const passed = score >= (course?.minScore || 80);

  const results = mockTest.questions.map((question) => {
    const userAnswers = answers[question.id] || [];
    const correctAnswers = question.options
      .filter((opt) => opt.isCorrect)
      .map((opt) => opt.id);

    const isCorrect =
      userAnswers.length === correctAnswers.length &&
      userAnswers.every((ans: string) => correctAnswers.includes(ans));

    return {
      question,
      userAnswers,
      correctAnswers,
      isCorrect,
    };
  });

  const correctCount = results.filter((r) => r.isCorrect).length;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Result Header */}
        <Card className="border-2">
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <div
                className={clsx(
                  'inline-flex items-center justify-center w-20 h-20 rounded-full mx-auto',
                  passed ? 'bg-success/10' : 'bg-destructive/10'
                )}
              >
                {passed ? (
                  <CheckCircle className="w-12 h-12 text-success" />
                ) : (
                  <XCircle className="w-12 h-12 text-destructive" />
                )}
              </div>

              <div>
                <h1 className="text-4xl font-semibold text-foreground mb-2">
                  {score}%
                </h1>
                <Badge variant={passed ? 'success' : 'destructive'} className="text-base px-4 py-1">
                  {passed ? 'Тест пройден' : 'Тест не пройден'}
                </Badge>
              </div>

              <p className="text-muted-foreground">
                {passed
                  ? 'Поздравляем! Вы успешно прошли тестирование.'
                  : `Необходимо набрать минимум ${course?.minScore}% для прохождения теста.`}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-border">
              <div className="text-center">
                <p className="text-2xl font-semibold text-foreground">{correctCount}</p>
                <p className="text-sm text-muted-foreground mt-1">Правильных ответов</p>
              </div>

              <div className="text-center">
                <p className="text-2xl font-semibold text-foreground">
                  {mockTest.questions.length - correctCount}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Ошибок</p>
              </div>

              <div className="text-center">
                <p className="text-2xl font-semibold text-foreground">{mockTest.questions.length}</p>
                <p className="text-sm text-muted-foreground mt-1">Всего вопросов</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Results */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Детальные результаты</h2>

          <div className="space-y-4">
            {results.map((result, index) => (
              <Card key={result.question.id} className={clsx(
                'border-l-4',
                result.isCorrect ? 'border-l-success' : 'border-l-destructive'
              )}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-base">
                      Вопрос {index + 1}: {result.question.text}
                    </CardTitle>
                    <Badge variant={result.isCorrect ? 'success' : 'destructive'}>
                      {result.isCorrect ? 'Верно' : 'Неверно'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    {result.question.options.map((option) => {
                      const isUserAnswer = result.userAnswers.includes(option.id);
                      const isCorrectAnswer = option.isCorrect;

                      return (
                        <div
                          key={option.id}
                          className={clsx(
                            'p-3 rounded-lg border-2',
                            isCorrectAnswer && 'bg-success/5 border-success',
                            !isCorrectAnswer && isUserAnswer && 'bg-destructive/5 border-destructive',
                            !isCorrectAnswer && !isUserAnswer && 'bg-muted border-transparent'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {isCorrectAnswer ? (
                              <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                            ) : isUserAnswer ? (
                              <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                            ) : (
                              <div className="w-5 h-5" />
                            )}
                            <span
                              className={clsx(
                                'text-sm',
                                isCorrectAnswer && 'text-success font-medium',
                                !isCorrectAnswer && isUserAnswer && 'text-destructive',
                                !isCorrectAnswer && !isUserAnswer && 'text-muted-foreground'
                              )}
                            >
                              {option.text}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            Вернуться к курсам
          </Button>

          {!passed && course && course.attempts < course.maxAttempts && (
            <Button
              onClick={() => navigate(`/test/${courseId}`)}
              variant="primary"
            >
              Повторить попытку
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}