import { DateTime, dateTimeParse } from '@grafana/data';
import { useTheme2 } from '@grafana/ui';
import * as d3 from 'd3';
import React from 'react';

interface XAxisProps {
  values: any[];
  from: DateTime;
  to: DateTime;
  width: number;
  numDays: number;
  timeZone: string;
}

const localeOptions: Intl.DateTimeFormatOptions = {
  month: '2-digit',
  day: '2-digit',
};

const referenceText = dateTimeParse(0).toDate().toLocaleDateString(undefined, localeOptions);

export const XAxis: React.FC<XAxisProps> = React.memo(({ width, values, from, to, numDays, timeZone }) => {
  const xTime = d3.scaleTime().domain([from.subtract(12, 'h').toDate(), to.subtract(12, 'h').toDate()]).range([0, width]);

  const theme = useTheme2();
  const { fontSize, fontFamily } = theme.typography.bodySmall;
  const fontStyle = `${fontSize}px ${fontFamily}`;

  const every = calculateTickInterval(width, numDays, referenceText, fontStyle);

  const xTimeAxis = d3
    .axisBottom(xTime)
    .ticks(d3.timeDay.every(every))
    .tickFormat((d) =>
      dateTimeParse(d as number, { timeZone })
        .toDate()
        .toLocaleDateString(undefined, localeOptions)
    );


  const xAxis: any = xTimeAxis;

  return (
    <g
      ref={(node) => {
        const container = d3.select(node).call(xAxis);

        // Remove junk.
        container.select('.domain').remove();
        // Theming
        container.selectAll('line').attr("stroke", theme.colors.border.medium).attr("stroke-width", 2);
        container.attr('font-family', fontFamily);
        container.attr('font-size', fontSize);
      }}
    />
  );
});

const calculateTickInterval = (width: number, numDays: number, referenceText: string, fontStyle: string) => {
  const preferredTickWidth = measureText(referenceText, fontStyle) * 1.1;
  return Math.max(Math.ceil(numDays / (width / preferredTickWidth)), 1);
};

const measureText = (text: string, fontStyle: string): number => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.font = fontStyle;
    return ctx.measureText(text).width;
  }
  return 0;
};
XAxis.displayName = 'XAxis';
