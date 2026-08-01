import { Meter } from "react-aria-components/Meter";
import { riskMeterTone } from "../../lib/demoConstants";
import type { RiskLevel } from "@ai-mae-check/core";

export function RiskMeter({
  value,
  label,
  riskLevel
}: {
  value: number;
  label: string;
  riskLevel: RiskLevel;
}) {
  return (
    <Meter
      aria-label="リスクメーター"
      aria-valuetext={label}
      value={value}
      minValue={0}
      maxValue={100}
      className="w-full"
    >
      {({ percentage }) => (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm font-black text-ink">{label}</span>
            <span className="text-xs font-bold text-muted">{Math.round(percentage ?? 0)}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-cloud">
            <div
              className={`h-full rounded-full ${riskMeterTone[riskLevel]}`}
              style={{ width: `${percentage ?? 0}%` }}
            />
          </div>
        </>
      )}
    </Meter>
  );
}
