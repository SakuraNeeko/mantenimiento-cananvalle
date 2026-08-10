import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { primeraRutaVisible } from '@/lib/auth/post-login-redirect';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Iniciar sesión' };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect(await primeraRutaVisible(session));

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-[8px] bg-primary text-primary-foreground">
          <span className="font-codigo text-sm font-bold">GM</span>
        </div>
        <CardTitle className="text-base">Iniciar sesión</CardTitle>
        <CardDescription>Gestión del mantenimiento</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
