import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function AnalyticsChart({ metrics }) {
  const labels = metrics.map((m) =>
    new Date(m.date).toLocaleDateString(undefined, { month: "short", year: "2-digit" })
  );

  const data = {
    labels,
    datasets: [
      {
        label: "Carbon (tons)",
        data: metrics.map((m) => m.carbon_tons),
        borderColor: "#2f9e44",
        backgroundColor: "rgba(47,158,68,0.15)",
        yAxisID: "y",
        tension: 0.3,
      },
      {
        label: "Biodiversity Index",
        data: metrics.map((m) => m.biodiversity_index),
        borderColor: "#1971c2",
        backgroundColor: "rgba(25,113,194,0.15)",
        yAxisID: "y1",
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    interaction: { mode: "index", intersect: false },
    scales: {
      y: {
        type: "linear",
        position: "left",
        title: { display: true, text: "Carbon (tons)" },
      },
      y1: {
        type: "linear",
        position: "right",
        title: { display: true, text: "Biodiversity Index" },
        grid: { drawOnChartArea: false },
        min: 0,
        max: 1,
      },
    },
  };

  return <Line data={data} options={options} />;
}
