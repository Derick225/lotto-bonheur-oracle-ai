import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface FrequencyChartProps {
  data: { [key: number]: number };
  title?: string;
}

export function FrequencyChart({ data, title = "Fréquence des numéros" }: FrequencyChartProps) {
  const sortedEntries = Object.entries(data)
    .map(([num, freq]) => ({ number: parseInt(num), frequency: freq }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 20);

  const chartData = {
    labels: sortedEntries.map(item => `N°${item.number}`),
    datasets: [
      {
        label: 'Fréquence',
        data: sortedEntries.map(item => item.frequency),
        backgroundColor: sortedEntries.map((item) => {
          const num = item.number;
          if (num >= 1 && num <= 9) return 'rgba(255, 255, 255, 0.8)';
          if (num >= 10 && num <= 19) return 'rgba(59, 130, 246, 0.8)';
          if (num >= 20 && num <= 29) return 'rgba(34, 197, 94, 0.8)';
          if (num >= 30 && num <= 39) return 'rgba(99, 102, 241, 0.8)';
          if (num >= 40 && num <= 49) return 'rgba(234, 179, 8, 0.8)';
          if (num >= 50 && num <= 59) return 'rgba(236, 72, 153, 0.8)';
          if (num >= 60 && num <= 69) return 'rgba(249, 115, 22, 0.8)';
          if (num >= 70 && num <= 79) return 'rgba(107, 114, 128, 0.8)';
          return 'rgba(239, 68, 68, 0.8)';
        }),
        borderColor: sortedEntries.map((item) => {
          const num = item.number;
          if (num >= 1 && num <= 9) return 'rgba(0, 0, 0, 1)';
          if (num >= 10 && num <= 19) return 'rgba(59, 130, 246, 1)';
          if (num >= 20 && num <= 29) return 'rgba(34, 197, 94, 1)';
          if (num >= 30 && num <= 39) return 'rgba(99, 102, 241, 1)';
          if (num >= 40 && num <= 49) return 'rgba(234, 179, 8, 1)';
          if (num >= 50 && num <= 59) return 'rgba(236, 72, 153, 1)';
          if (num >= 60 && num <= 69) return 'rgba(249, 115, 22, 1)';
          if (num >= 70 && num <= 79) return 'rgba(107, 114, 128, 1)';
          return 'rgba(239, 68, 68, 1)';
        }),
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: title,
        color: 'hsl(210, 20%, 92%)',
      },
      tooltip: {
        backgroundColor: 'hsl(220, 25%, 8%)',
        titleColor: 'hsl(210, 20%, 92%)',
        bodyColor: 'hsl(210, 20%, 92%)',
        borderColor: 'hsl(217, 91%, 60%)',
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: 'hsl(217, 10%, 64%)',
        },
        grid: {
          color: 'hsl(215, 25%, 18%)',
        },
      },
      x: {
        ticks: {
          color: 'hsl(217, 10%, 64%)',
        },
        grid: {
          color: 'hsl(215, 25%, 18%)',
        },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
}

interface TrendChartProps {
  data: Array<{ date: string; numbers: number[] }>;
  selectedNumber?: number;
}

export function TrendChart({ data, selectedNumber }: TrendChartProps) {
  const dates = data.map(item => new Date(item.date).toLocaleDateString('fr-FR'));
  const occurrences = data.map(item => 
    selectedNumber ? (item.numbers.includes(selectedNumber) ? 1 : 0) : item.numbers.length
  );

  const chartData = {
    labels: dates.slice(-30), // Derniers 30 tirages
    datasets: [
      {
        label: selectedNumber ? `Apparitions du numéro ${selectedNumber}` : 'Nombre total de numéros',
        data: occurrences.slice(-30),
        borderColor: 'hsl(217, 91%, 60%)',
        backgroundColor: 'hsl(217, 91%, 60%, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: 'hsl(210, 20%, 92%)',
        },
      },
      tooltip: {
        backgroundColor: 'hsl(220, 25%, 8%)',
        titleColor: 'hsl(210, 20%, 92%)',
        bodyColor: 'hsl(210, 20%, 92%)',
        borderColor: 'hsl(217, 91%, 60%)',
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: 'hsl(217, 10%, 64%)',
        },
        grid: {
          color: 'hsl(215, 25%, 18%)',
        },
      },
      x: {
        ticks: {
          color: 'hsl(217, 10%, 64%)',
        },
        grid: {
          color: 'hsl(215, 25%, 18%)',
        },
      },
    },
  };

  return <Line data={chartData} options={options} />;
}

interface NumberDistributionChartProps {
  data: { [key: number]: number };
}

export function NumberDistributionChart({ data }: NumberDistributionChartProps) {
  const ranges = [
    { label: '1-18', min: 1, max: 18, color: 'rgba(59, 130, 246, 0.8)' },
    { label: '19-36', min: 19, max: 36, color: 'rgba(34, 197, 94, 0.8)' },
    { label: '37-54', min: 37, max: 54, color: 'rgba(234, 179, 8, 0.8)' },
    { label: '55-72', min: 55, max: 72, color: 'rgba(236, 72, 153, 0.8)' },
    { label: '73-90', min: 73, max: 90, color: 'rgba(239, 68, 68, 0.8)' },
  ];

  const distributionData = ranges.map(range => {
    const count = Object.entries(data)
      .filter(([num]) => {
        const number = parseInt(num);
        return number >= range.min && number <= range.max;
      })
      .reduce((sum, [, freq]) => sum + freq, 0);
    
    return { range: range.label, count, color: range.color };
  });

  const chartData = {
    labels: distributionData.map(item => item.range),
    datasets: [
      {
        data: distributionData.map(item => item.count),
        backgroundColor: distributionData.map(item => item.color),
        borderColor: distributionData.map(item => item.color.replace('0.8', '1')),
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Distribution par plage de numéros',
        color: 'hsl(210, 20%, 92%)',
      },
      tooltip: {
        backgroundColor: 'hsl(220, 25%, 8%)',
        titleColor: 'hsl(210, 20%, 92%)',
        bodyColor: 'hsl(210, 20%, 92%)',
        borderColor: 'hsl(217, 91%, 60%)',
        borderWidth: 1,
      },
    },
    maintainAspectRatio: false,
  };

  return <Doughnut data={chartData} options={options} />;
}

interface HeatmapProps {
  coOccurrences: { [key: string]: number };
}

export function CoOccurrenceHeatmap({ coOccurrences }: HeatmapProps) {
  // Simplification pour l'affichage - top 10 des co-occurrences
  const topPairs = Object.entries(coOccurrences)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const chartData = {
    labels: topPairs.map(([pair]) => pair.replace('-', ' + ')),
    datasets: [
      {
        label: 'Co-occurrences',
        data: topPairs.map(([, count]) => count),
        backgroundColor: 'hsl(217, 91%, 60%, 0.8)',
        borderColor: 'hsl(217, 91%, 60%)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Paires de numéros les plus fréquentes',
        color: 'hsl(210, 20%, 92%)',
      },
      tooltip: {
        backgroundColor: 'hsl(220, 25%, 8%)',
        titleColor: 'hsl(210, 20%, 92%)',
        bodyColor: 'hsl(210, 20%, 92%)',
        borderColor: 'hsl(217, 91%, 60%)',
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        ticks: {
          color: 'hsl(217, 10%, 64%)',
        },
        grid: {
          color: 'hsl(215, 25%, 18%)',
        },
      },
      x: {
        beginAtZero: true,
        ticks: {
          color: 'hsl(217, 10%, 64%)',
        },
        grid: {
          color: 'hsl(215, 25%, 18%)',
        },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
}