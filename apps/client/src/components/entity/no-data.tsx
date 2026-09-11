import { StaticScreen } from '@/components/world/static-screen';

// пустое место отмечается тем же шумом, что и потерянный сигнал
export function NoData() {
  return <StaticScreen>no_data</StaticScreen>;
}
