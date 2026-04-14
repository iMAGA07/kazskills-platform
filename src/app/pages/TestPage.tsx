import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Layout } from '@/app/components/Layout';
import { Card, CardContent } from '@/app/components/Card';
import { Button } from '@/app/components/Button';
import { mockTest, mockCourses } from '@/data/mockData';
import { Clock, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

export function TestPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const course = mockCourses.find((c) => c.id === courseId);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [timeLeft, setTimeLeft] = useState(mockTest.duration * 60); // в секундах

  const currentQuestion = mockTest.questions[currentQuestionIndex];

  // Таймер
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOptionSelect = (optionId: string) => {
    const questionId = currentQuestion.id;

    if (currentQuestion.type === 'single') {
      setSelectedAnswers({
        ...selectedAnswers,
        [questionId]: [optionId],
      });
    } else {
      const current = selectedAnswers[questionId] || [];
      const updated = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];

      setSelectedAnswers({
        ...selectedAnswers,
        [questionId]: updated,
      });
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < mockTest.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleFinish = () => {
    // Подсчитываем результат
    let correctCount = 0;

    mockTest.questions.forEach((question) => {
      const userAnswers = selectedAnswers[question.id] || [];
      const correctAnswers = question.options
        .filter((opt) => opt.isCorrect)
        .map((opt) => opt.id);

      const isCorrect =
        userAnswers.length === correctAnswers.length &&
        userAnswers.every((ans) => correctAnswers.includes(ans));

      if (isCorrect) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / mockTest.questions.length) * 100);
    navigate(`/test-result/${courseId}`, { state: { score, answers: selectedAnswers } });
  };

  if (!course) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Тест не найден</p>
        </div>
      </Layout>
    );
  }

  const currentAnswer = selectedAnswers[currentQuestion.id] || [];
  const isAnswered = currentAnswer.length > 0;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Timer & Progress */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className={clsx(
                  'w-5 h-5',
                  timeLeft < 300 ? 'text-destructive' : 'text-muted-foreground'
                )} />
                <span className={clsx(
                  'text-lg font-semibold',
                  timeLeft < 300 ? 'text-destructive' : 'text-foreground'
                )}>
                  {formatTime(timeLeft)}
                </span>
              </div>

              <div className="text-sm text-muted-foreground">
                Вопрос <span className="font-semibold text-foreground">
                  {currentQuestionIndex + 1}
                </span> из <span className="font-semibold text-foreground">
                  {mockTest.questions.length}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${((currentQuestionIndex + 1) / mockTest.questions.length) * 100}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Question */}
        <Card>
          <CardContent className="py-8">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {currentQuestion.text}
                </h2>
                {currentQuestion.type === 'multiple' && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Выберите все правильные ответы
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option) => {
                  const isSelected = currentAnswer.includes(option.id);

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleOptionSelect(option.id)}
                      className={clsx(
                        'w-full text-left p-4 border-2 rounded-lg transition-all',
                        'hover:bg-accent',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={clsx(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                            isSelected
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground'
                          )}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                          )}
                        </div>
                        <span className="text-foreground">{option.text}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <Button
            onClick={handlePrevious}
            variant="outline"
            disabled={currentQuestionIndex === 0}
          >
            Назад
          </Button>

          <div className="flex gap-2">
            {currentQuestionIndex < mockTest.questions.length - 1 ? (
              <Button
                onClick={handleNext}
                variant="primary"
                disabled={!isAnswered}
              >
                Далее
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                variant="success"
                disabled={!isAnswered}
              >
                Завершить экзамен
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}