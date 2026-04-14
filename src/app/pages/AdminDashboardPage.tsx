import { useState } from 'react';
import { Layout } from '@/app/components/Layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/components/Card';
import { Button } from '@/app/components/Button';
import { Input } from '@/app/components/Input';
import { Badge } from '@/app/components/Badge';
import { mockCourses, mockDocuments } from '@/data/mockData';
import { 
  Users, 
  BookOpen, 
  FileText, 
  Search, 
  Plus,
  Edit,
  Trash2,
  Filter
} from 'lucide-react';

type Tab = 'users' | 'courses' | 'tests' | 'documents' | 'reports';

export function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [searchQuery, setSearchQuery] = useState('');

  const mockUsers = [
    {
      id: '1',
      name: 'Айтмухамбетов Серик Жумакелдинович',
      email: 'aitmukhambet.s@kazskills.kz',
      position: 'Ведущий инженер',
      company: 'Kazskills',
      coursesCompleted: 2,
      status: 'active',
    },
    {
      id: '2',
      name: 'Айтмухамбетов Серик Жумакелдинович',
      email: 'aitmukhambet.s2@kazskills.kz',
      position: 'Инженер по ОТ',
      company: 'Kazskills',
      coursesCompleted: 3,
      status: 'active',
    },
    {
      id: '3',
      name: 'Айтмухамбетов Серик Жумакелдинович',
      email: 'aitmukhambet.s3@kazskills.kz',
      position: 'Специалист по ПБ',
      company: 'Kazskills',
      coursesCompleted: 1,
      status: 'active',
    },
  ];

  const tabs = [
    { id: 'users' as Tab, label: 'Пользователи', icon: Users },
    { id: 'courses' as Tab, label: 'Курсы', icon: BookOpen },
    { id: 'tests' as Tab, label: 'Тесты', icon: FileText },
    { id: 'documents' as Tab, label: 'Документы', icon: FileText },
    { id: 'reports' as Tab, label: 'Отчеты', icon: FileText },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Административная панель
          </h1>
          <p className="text-muted-foreground mt-2">
            Управление пользователями, курсами и отчетами
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">127</CardTitle>
              <CardDescription>Всего пользователей</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">{mockCourses.length}</CardTitle>
              <CardDescription>Активных курсов</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">89</CardTitle>
              <CardDescription>Пройдено тестов</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">{mockDocuments.length}</CardTitle>
              <CardDescription>Выданных документов</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {tabs.find((t) => t.id === activeTab)?.label}
              </CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Фильтр
                </Button>
                <Button variant="primary" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Создать
                </Button>
              </div>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            {activeTab === 'users' && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                      ФИО
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                      Должность
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                      Компания
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                      Пройдено курсов
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
                  {mockUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border hover:bg-accent transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-foreground">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {user.position}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {user.company}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {user.coursesCompleted}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="success">Активен</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'courses' && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                      Название курса
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                      Описание
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                      Мин. балл
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                      Материалов
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-muted-foreground">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mockCourses.map((course) => (
                    <tr
                      key={course.id}
                      className="border-b border-border hover:bg-accent transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-foreground">
                        {course.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground max-w-md truncate">
                        {course.description}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {course.minScore}%
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {course.materials.length}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab !== 'users' && activeTab !== 'courses' && (
              <div className="py-12 text-center text-muted-foreground">
                Раздел "{tabs.find((t) => t.id === activeTab)?.label}" в разработке
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}