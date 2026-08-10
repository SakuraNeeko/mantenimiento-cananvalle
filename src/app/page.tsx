import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { primeraRutaVisible } from '@/lib/auth/post-login-redirect';

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  redirect(await primeraRutaVisible(session));
}
