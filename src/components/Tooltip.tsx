import { SeriesTable } from '@grafana/ui';
import { DateTime, DisplayValue } from '@grafana/data';
import React from 'react';

interface TooltipProps {
  bucketStartTime: DateTime;
  displayValue: DisplayValue;
  numBuckets: number;
  tz: string;
}

// Generates a tooltip for a data point.
export const Tooltip: React.FC<TooltipProps> = ({ bucketStartTime, displayValue, numBuckets, tz }) => {
  return (
    <div>
      <SeriesTable
        timestamp={bucketStartTime.format()}
        series={[
          {
            label: displayValue.title,
            value: (displayValue.prefix || "") + displayValue.text + (displayValue.suffix || ""),
            color: displayValue.color,
            isActive: true,
          }
        ]} />
    </div>
  );
};
