import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * @param {{
 *   data: Array<{ date: string, news?: number | null, pulse?: number | null }>,
 *   status?: string | null,
 *   showPulse?: boolean,
 * }} props
 */
export default function HealthTrendChart({ data = [], status = null, showPulse = true }) {
  const hasPulse = showPulse && data.some((d) => d.pulse != null && Number.isFinite(Number(d.pulse)));

  return (
    <div>
      {status ? (
        <div
          className="alert"
          role="status"
          style={{
            marginBottom: 12,
            padding: "10px 14px",
            borderRadius: 8,
            background: status.includes("🚨")
              ? "#fef2f2"
              : status.includes("⚠️")
                ? "#fffbeb"
                : "#f0fdf4",
            border: `1px solid ${
              status.includes("🚨") ? "#fecaca" : status.includes("⚠️") ? "#fcd34d" : "#bbf7d0"
            }`,
            fontWeight: 600,
            color: status.includes("🚨") ? "#991b1b" : status.includes("⚠️") ? "#92400e" : "#166534",
          }}
        >
          {status}
        </div>
      ) : null}

      <div style={{ width: "100%", height: 300, minHeight: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: hasPulse ? 28 : 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis
              yAxisId="news"
              allowDecimals={false}
              tick={{ fontSize: 11 }}
              domain={[0, "auto"]}
              label={{ value: "NEWS", angle: -90, position: "insideLeft", style: { fontSize: 10 } }}
            />
            {hasPulse ? (
              <YAxis
                yAxisId="pulse"
                orientation="right"
                tick={{ fontSize: 11 }}
                domain={["auto", "auto"]}
                label={{ value: "Pulse", angle: 90, position: "insideRight", style: { fontSize: 10 } }}
              />
            ) : null}
            <Tooltip />
            <Line
              yAxisId="news"
              type="monotone"
              dataKey="news"
              name="NEWS"
              stroke="#0f766e"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
            {hasPulse ? (
              <Line
                yAxisId="pulse"
                type="monotone"
                dataKey="pulse"
                name="Pulse"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
