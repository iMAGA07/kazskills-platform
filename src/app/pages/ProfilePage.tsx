import { Layout } from '@/app/components/Layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/components/Card';
import { Button } from '@/app/components/Button';
import { Input } from '@/app/components/Input';
import { currentUser } from '@/data/mockData';
import { User, Mail, Building2, Briefcase } from 'lucide-react';

export function ProfilePage() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Профиль пользователя</h1>
          <p className="text-muted-foreground mt-2">
            Личная информация и настройки
          </p>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-6">
              <div className="flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full">
                <User className="w-10 h-10 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">{currentUser.name}</CardTitle>
                <CardDescription className="text-base mt-1">
                  {currentUser.email}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="ФИО"
                  value={currentUser.name}
                  disabled
                  className="bg-muted"
                />

                <Input
                  label="Email"
                  type="email"
                  value={currentUser.email}
                  disabled
                  className="bg-muted"
                />

                <Input
                  label="Должность"
                  value={currentUser.position}
                  disabled
                  className="bg-muted"
                />

                <Input
                  label="Компания"
                  value={currentUser.company}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-4">
                  Для изменения личных данных обратитесь к администратору системы
                </p>
                <Button variant="outline" type="button">
                  Связаться с администратором
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium text-foreground">{currentUser.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
                  <Briefcase className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Должность</p>
                  <p className="font-medium text-foreground">{currentUser.position}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Компания</p>
                  <p className="font-medium text-foreground text-sm">{currentUser.company}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
