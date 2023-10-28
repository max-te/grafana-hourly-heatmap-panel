import { DisplayProcessor } from '@grafana/data';
import { useTheme2 } from '@grafana/ui';
import * as d3 from 'd3';
import React from 'react';

interface LegendAxisProps {
  width: number;
  min: number;
  max: number;
  display: DisplayProcessor;
}

/**
 * Horizontal axis describing the color spectrum.
 */
export const LegendAxis: React.FC<LegendAxisProps> = React.memo(({ width, min, max, display }) => {
  const theme = useTheme2();
  const { fontSize, fontFamily } = theme.typography.bodySmall;

  const scale = d3.scaleLinear().domain([min, max]).range([0, width]);

  // const preferredTickWidth = 50;
  // const ratio = width / preferredTickWidth;

  const axis = d3
    .axisBottom(scale)
    .tickFormat((d: any) => {
      const val = display(d);
      return `${val.prefix ?? ''}${val.text}${val.suffix ?? ''}`;
    });

  return <g ref={(node: any) => {
    const container = d3.select(node).call(axis)
    // Theming
    container.selectAll('line, .domain').attr("stroke", theme.colors.border.medium).attr("stroke-width", 2);
    container.attr('font-family', fontFamily);
    container.attr('font-size', fontSize);
  }} />;
});
LegendAxis.displayName = 'LegendAxis';
