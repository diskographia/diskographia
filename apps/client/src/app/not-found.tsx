import { StaticScreen } from '@/components/world/static-screen';

export default function NotFoundPage() {
  return (
    <main className="fixed inset-0 z-30">
      <StaticScreen>404 no_signal, страницы не существует</StaticScreen>
    </main>
  );
}
