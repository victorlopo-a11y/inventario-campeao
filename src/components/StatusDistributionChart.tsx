import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

interface StatusDistributionChartProps {
  saida: number;
  manutencao: number;
  danificado: number;
  devolucao: number;
}

const StatusDistributionChart = ({ saida, manutencao, danificado, devolucao }: StatusDistributionChartProps) => {
  const data = [
    { name: "Saída", value: saida, color: "#3b82f6" },
    { name: "Em manutenção", value: manutencao, color: "#22c55e" },
    { name: "Danificado", value: danificado, color: "#ef4444" },
    { name: "Devolução", value: devolucao, color: "#eab308" },
  ];

  const total = saida + manutencao + danificado + devolucao;

  if (total === 0) {
    return (
      <div className="bg-card rounded-lg p-6">
        <h2 className="text-lg font-semibold text-center mb-4">Distribuição por Status</h2>
        <p className="text-center text-muted-foreground">Nenhum dado disponível</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-6">
      <h2 className="text-lg font-semibold text-center mb-4">Distribuição por Status</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry: any) => `${value} (${entry.payload.value})`}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StatusDistributionChart;
