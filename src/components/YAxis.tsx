import { dateTime, DateTimeDuration, toDuration } from '@grafana/data';
import { useTheme2 } from '@grafana/ui';
import * as d3 from 'd3';
import React from 'react';

interface YAxisProps {
  height: number;
  dailyInterval: [number, number];
}

export const YAxis: React.FC<YAxisProps> = React.memo(({ height, dailyInterval }) => {
  const theme = useTheme2();
  const y = d3.scaleLinear().domain(dailyInterval).rangeRound([0, height]);

  const every = calculateTickHeight(height);

  const yAxis: any = d3
    .axisLeft(y)
    .tickValues(d3.range(dailyInterval[0], dailyInterval[1] + 1, every))
    .tickFormat((d) => formatDuration(toDuration(d as number, 'hours'), 'HH:mm'));

  return (
    <g
      ref={(node) => {
        const container = d3.select(node).call(yAxis);

        // Remove junk.
        container.select('.domain').remove();
        // Theming
        container.selectAll('line').attr("stroke", theme.colors.border.medium).attr("stroke-width", 2);
        container.attr('font-family', theme.typography.bodySmall.fontFamily);
      }}
    />
  );
});
YAxis.displayName = 'YAxis';

const calculateTickHeight = (height: number) => {
  const preferredTickHeight = 20;
  const ratio = (preferredTickHeight / height) * 24;
  return Math.max(Math.round(ratio), 1);
};

const formatDuration = (duration: DateTimeDuration, format: string) => {
  const date = dateTime().startOf('day');
  return date.add(duration.hours(), 'hours').format(format);
};
