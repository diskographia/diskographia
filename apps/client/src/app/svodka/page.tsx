import { notFound } from 'next/navigation';
import Link from 'next/link';

import { apiGet } from '@/api/client';
import { authHeaders } from '@/api/session';
import { currentViewer } from '@/api/viewer';
import { ListScreen } from '@/components/layout/list-screen';
import { routes } from '@/routes';

interface Summary {
  byKind: { kind: string; visibility: string; total: number }[];
  totals: {
    profiles: number;
    entities: number;
    deleted: number;
    files: number;
    bytes: string;
    views: number;
    feedback: number;
  };
  popular: { title: string; handle: string; slug: string; viewer_count: number; feedback_count: number }[];
  pendingApplications: number;
}

const KIND: Record<string, string> = {
  event: 'ивент',
  capsule: 'капсула',
  content: 'контент',
  product: 'товар',
};

const VISIBILITY: Record<string, string> = {
  draft: 'черновик',
  private: 'только автор',
  unlisted: 'по ссылке',
  public: 'публичный',
};

function megabytes(bytes: string): string {
  return `${(Number(bytes) / 1024 / 1024).toFixed(1)} МБ`;
}

export default async function SummaryPage() {
  const viewer = await currentViewer();

  if (!viewer?.isAdmin) {
    notFound();
  }

  const summary = await apiGet<Summary>('/admin/summary', { headers: await authHeaders() }).catch(() => null);

  if (!summary) {
    notFound();
  }

  const { totals } = summary;

  return (
    <ListScreen
      title="сводка"
      list={
        <>
          <div className="flex flex-wrap gap-2">
            {[
              ['профилей', totals.profiles],
              ['объектов', totals.entities],
              ['удалённых', totals.deleted],
              ['файлов', `${totals.files}, ${megabytes(totals.bytes)}`],
              ['заходов', totals.views],
              ['откликов', totals.feedback],
              ['заявок ждут', summary.pendingApplications],
            ].map(([label, value]) => (
              <div key={String(label)} className="frame p-2">
                <div>{label}</div>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <h2 className="mt-4">объекты по видам</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="frame">
              <tbody>
                {summary.byKind.map((row) => (
                  <tr key={`${row.kind}-${row.visibility}`}>
                    <td className="frame px-2">{KIND[row.kind] ?? row.kind}</td>
                    <td className="frame px-2">{VISIBILITY[row.visibility] ?? row.visibility}</td>
                    <td className="frame px-2">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      }
      info={
        <div>
          <p>заявок ждут решения: {summary.pendingApplications}</p>
          <p className="mt-2">
            <Link href={routes.home()} className="underline">
              настройка главной
            </Link>
          </p>
          <span className="hint">подборка, витрина и манифест правятся кнопкой на самой главной</span>
        </div>
      }
      text={
        <div>
          <h2>чаще всего смотрят</h2>
          <ol className="mt-2">
            {summary.popular.map((row) => (
              <li key={`${row.handle}/${row.slug}`}>
                <Link href={routes.entity(row.handle, row.slug)} className="underline">
                  {row.title}
                </Link>
                <span className="hint">
                  заходов {row.viewer_count}, откликов {row.feedback_count}
                </span>
              </li>
            ))}
          </ol>

          {summary.popular.length === 0 ? <p>объектов пока нет</p> : null}
        </div>
      }
    />
  );
}
