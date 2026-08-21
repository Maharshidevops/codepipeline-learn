// ApexCharts ports of QURALYST-20 Analysis.tsx recharts (line + horizontal/stacked bars).
// Colors match the Replit chart palette (blue / green / rose).
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { useThemeTokens } from '@/hooks/useThemeTokens';
import type { PEActivityTrendRow, PEGeoClusterRow, PEHoldPeriodRow, PETopSectorRow } from '@/types';

const BLUE = '#3b82f6';
const ROSE = '#ef4444';
const EMERALD = '#10b981';

const baseChart: ApexOptions['chart'] = {
  toolbar: { show: false },
  fontFamily: 'inherit',
  animations: { enabled: true, speed: 400 },
};

function getChartTheme(isDark: boolean) {
  const muted = isDark ? '#94a3b8' : '#64748b';
  const grid = isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0';
  const tooltipTheme: 'light' | 'dark' = isDark ? 'dark' : 'light';
  return { muted, grid, tooltipTheme };
}

function axisLabels(color: string, grid: string): ApexOptions['xaxis'] {
  return {
    labels: { style: { colors: color, fontSize: '11px' } },
    axisBorder: { color: grid },
    axisTicks: { color: grid },
  };
}

/** Monthly new investments vs exits — Q20 LineChart. */
export function ActivityTrendChart({ rows }: { rows: PEActivityTrendRow[] }) {
  const { isDark } = useThemeTokens();
  const { muted, grid, tooltipTheme } = getChartTheme(isDark);
  const categories = rows.map((r) => r.month);

  const options: ApexOptions = {
    chart: { ...baseChart, type: 'line', height: 300, zoom: { enabled: false } },
    colors: [BLUE, ROSE],
    stroke: { curve: 'smooth', width: 2 },
    markers: { size: 3, strokeWidth: 0 },
    dataLabels: { enabled: false },
    grid: { borderColor: grid, strokeDashArray: 3 },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '12px',
      labels: { colors: muted },
    },
    xaxis: { ...axisLabels(muted, grid), categories },
    yaxis: { labels: { style: { colors: muted, fontSize: '11px' } } },
    tooltip: {
      theme: tooltipTheme,
      shared: true,
      intersect: false,
      fillSeriesColor: false,
      style: { fontSize: '12px' },
    },
  };

  const series = [
    { name: 'New investments', data: rows.map((r) => r.added) },
    { name: 'Exits', data: rows.map((r) => r.exited) },
  ];

  return (
    <div
      className="pean-chart"
      data-testid="chart-activity-trend"
      data-categories={categories.join('|')}
    >
      <Chart type="line" height={300} options={options} series={series} />
    </div>
  );
}

/** Top sectors — Q20 vertical BarChart (horizontal bars). */
export function TopSectorsChart({ rows }: { rows: PETopSectorRow[] }) {
  const { isDark } = useThemeTokens();
  const { muted, grid, tooltipTheme } = getChartTheme(isDark);
  const ordered = [...rows].sort((a, b) => b.investments - a.investments);
  const categories = ordered.map((r) => r.sector);
  const height = Math.max(280, categories.length * 28 + 60);

  const options: ApexOptions = {
    chart: { ...baseChart, type: 'bar', height },
    plotOptions: {
      bar: { horizontal: true, borderRadius: 3, barHeight: '70%' },
    },
    colors: [BLUE],
    dataLabels: { enabled: false },
    grid: { borderColor: grid, strokeDashArray: 3, xaxis: { lines: { show: true } } },
    xaxis: {
      ...axisLabels(muted, grid),
      categories,
    },
    yaxis: {
      labels: {
        style: { colors: muted, fontSize: '11px' },
        maxWidth: 180,
      },
    },
    tooltip: { theme: tooltipTheme, y: { formatter: (v) => `${v}` }, style: { fontSize: '12px' } },
  };
  const series = [{ name: 'Investments', data: ordered.map((r) => r.investments) }];

  return (
    <div
      className="pean-chart"
      data-testid="chart-top-sectors"
      data-categories={rows.map((r) => r.sector).join('|')}
    >
      <Chart type="bar" height={height} options={options} series={series} />
    </div>
  );
}

/** Geographic clustering — holdings + unique firms. */
export function GeoClustersChart({ rows }: { rows: PEGeoClusterRow[] }) {
  const { isDark } = useThemeTokens();
  const { muted, grid, tooltipTheme } = getChartTheme(isDark);
  const ordered = [...rows].sort((a, b) => b.holdings - a.holdings);
  const categories = ordered.map((r) => r.label);
  const height = Math.max(280, categories.length * 28 + 80);

  const options: ApexOptions = {
    chart: { ...baseChart, type: 'bar', height, stacked: false },
    plotOptions: {
      bar: { horizontal: true, borderRadius: 3, barHeight: '65%' },
    },
    colors: [BLUE, EMERALD],
    dataLabels: { enabled: false },
    grid: { borderColor: grid, strokeDashArray: 3 },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '12px',
      labels: { colors: muted },
    },
    xaxis: { ...axisLabels(muted, grid), categories },
    yaxis: {
      labels: { style: { colors: muted, fontSize: '11px' }, maxWidth: 120 },
    },
    tooltip: { theme: tooltipTheme, shared: true, intersect: false, style: { fontSize: '12px' } },
  };
  const series = [
    { name: 'Holdings', data: ordered.map((r) => r.holdings) },
    { name: 'Unique firms', data: ordered.map((r) => r.uniqueFirms) },
  ];

  return (
    <div
      className="pean-chart"
      data-testid="chart-geo"
      data-categories={rows.map((r) => r.label).join('|')}
    >
      <Chart type="bar" height={height} options={options} series={series} />
    </div>
  );
}

/** Hold period distribution — stacked current + exited. */
export function HoldPeriodsChart({ rows }: { rows: PEHoldPeriodRow[] }) {
  const { isDark } = useThemeTokens();
  const { muted, grid, tooltipTheme } = getChartTheme(isDark);
  const ordered = [...rows].sort((a, b) => a.sortIdx - b.sortIdx);
  const categories = ordered.map((r) => r.bucket);

  const options: ApexOptions = {
    chart: { ...baseChart, type: 'bar', height: 320, stacked: true },
    plotOptions: {
      bar: { borderRadius: 2, columnWidth: '55%' },
    },
    colors: [BLUE, ROSE],
    dataLabels: { enabled: false },
    grid: { borderColor: grid, strokeDashArray: 3 },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '12px',
      labels: { colors: muted },
    },
    xaxis: { ...axisLabels(muted, grid), categories },
    yaxis: { labels: { style: { colors: muted, fontSize: '11px' } } },
    tooltip: { theme: tooltipTheme, shared: true, intersect: false, style: { fontSize: '12px' } },
  };
  const series = [
    { name: 'Current', data: ordered.map((r) => r.current) },
    { name: 'Exited', data: ordered.map((r) => r.exited) },
  ];

  return (
    <div
      className="pean-chart"
      data-testid="chart-hold-periods"
      data-categories={categories.join('|')}
    >
      <Chart type="bar" height={320} options={options} series={series} />
    </div>
  );
}
