import Link from 'next/link';
import { notFound } from 'next/navigation';

import { apiGet } from '@/api/server';
import type { AdminSummary } from '@/api/types';
import { currentViewer } from '@/api/viewer';
import { kindLabel, visibilityLabel } from '@/components/entity/labels';
import { ListScreen } from '@/components/layout/list-screen';
import { routes } from '@/routes';

function megabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

export default async function SummaryPage() {
  const viewer = await currentViewer();

  if (!viewer?.isAdmin) {
    notFound();
  }

  const summary = await apiGet<AdminSummary>('/admin/summary').catch(() => null);

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
              ['предметов', totals.entities],
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

          <h2 className="mt-4">предметы по видам</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="frame">
              <tbody>
                {summary.byKind.map((row) => (
                  <tr key={`${row.kind}-${row.visibility}`}>
                    <td className="frame px-2">{kindLabel(row.kind)}</td>
                    <td className="frame px-2">{visibilityLabel(row.visibility)}</td>
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
          <p>Заявок ждут решения: {summary.pendingApplications}.</p>
          <p className="mt-2">
            <Link href={routes.home()} className="underline">
              настройка главной
            </Link>
          </p>
          <span className="hint">Подборка, витрина и манифест правятся кнопкой на самой главной.</span>
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
                  заходов {row.viewerCount}, откликов {row.feedbackCount}
                </span>
              </li>
            ))}
          </ol>

          {summary.popular.length === 0 ? <p>Предметов пока нет.</p> : null}
        </div>
      }
    />
  );
}
