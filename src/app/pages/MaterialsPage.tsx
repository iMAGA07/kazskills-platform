import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Layout } from '@/app/components/Layout';
import { Button } from '@/app/components/Button';
import { Card } from '@/app/components/Card';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

export function MaterialsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(1);
  const totalSlides = 25;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад к курсу
          </Button>

          <div className="text-sm text-muted-foreground">
            Слайд {currentSlide} из {totalSlides}
          </div>
        </div>

        {/* Presentation Viewer */}
        <Card className="bg-muted">
          <div className="aspect-video flex items-center justify-center p-8">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                Слайд {currentSlide}
              </h2>
              <p className="text-muted-foreground mb-6">
                Введение в промышленную безопасность
              </p>
              <div className="bg-card rounded-lg p-8 max-w-2xl mx-auto">
                <p className="text-foreground">
                  Здесь отображается содержимое презентации. В реальной системе здесь будут
                  отображаться слайды из файлов PowerPoint, PDF или других форматов.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between">
          <Button
            onClick={() => setCurrentSlide(Math.max(1, currentSlide - 1))}
            variant="outline"
            disabled={currentSlide === 1}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Предыдущий
          </Button>

          <div className="flex gap-2">
            {Array.from({ length: Math.min(10, totalSlides) }).map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentSlide(i + 1)}
                className={`w-8 h-8 rounded flex items-center justify-center text-sm transition-colors ${
                  currentSlide === i + 1
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <Button
            onClick={() => setCurrentSlide(Math.min(totalSlides, currentSlide + 1))}
            variant="outline"
            disabled={currentSlide === totalSlides}
            className="gap-2"
          >
            Следующий
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Layout>
  );
}