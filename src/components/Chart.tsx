import { Field, ThresholdsConfig, ThresholdsMode, TimeRange } from '@grafana/data';
import { useTheme2 } from '@grafana/ui';
import React, { useMemo, useState } from 'react';
import { bucketize } from '../bucket';
import { makeCustomColorScale, makeDivergingSpectrumColorScale, makeSpectrumColorScale } from '../colors';
import { HeatmapFieldConfig, Quality } from '../types';
import { HeatmapWithAxes } from './HeatmapWithAxes';
import { Legend } from './Legend';
import { TimeRegion } from './TimeRegionEditor';

interface ChartProps {
  width: number;
  height: number;

  legend: boolean;
  cellBorder: boolean;
  showValueIndicator: boolean;
  legendGradientQuality: Quality;
  timeField: Field<number>;
  valueField: Field<number>;
  timeZone: string;
  timeRange: TimeRange;
  dailyIntervalHours: [number, number];
  regions: TimeRegion[];
  tooltip: boolean;
}

/**
 * A Chart contains the heatmap chart and optional legend. It's
 * main purpose is to enable stacked heatmaps for when the data query contains
 * multiple data frames.
 */
export const Chart: React.FC<ChartProps> = ({
  width,
  height,
  legend,
  timeField,
  valueField,
  timeZone,
  timeRange,
  dailyIntervalHours,
  regions,
  showValueIndicator,
  cellBorder,
  legendGradientQuality,
  tooltip,
}) => {
  const [hoverValue, setHoverValue] = useState<number | undefined>();
  const theme = useTheme2();

  // Create a histogram for each day. This builds the main data structure that
  // we'll use for the heatmap visualization.
  const bucketData = useMemo(
    () => bucketize(timeField, valueField, timeZone, timeRange, dailyIntervalHours, theme),
    [timeField, valueField, timeZone, timeRange, dailyIntervalHours, theme]
  );

  const colorMapper = buildColorMapper(valueField);

  // Calculate dimensions for the legend.
  const legendPadding = { top: 15, left: 40, bottom: 0, right: 10 };
  const legendWidth = width - (legendPadding.left + legendPadding.right);
  const legendHeight = 35;

  // Heatmap expands to fill any space not used by the legend.
  const heatmapPadding = { top: 0, left: 0, bottom: 0, right: legendPadding.right };
  const heatmapWidth = width - (heatmapPadding.left + heatmapPadding.right);
  const heatmapHeight =
    height -
    (heatmapPadding.top + heatmapPadding.bottom) -
    (legend ? legendHeight + legendPadding.top + legendPadding.bottom : 0.0);

  const heatmapPos = { x: heatmapPadding.left, y: heatmapPadding.top };
  const legendPos = {
    x: legendPadding.left,
    y: heatmapPadding.top + heatmapHeight + heatmapPadding.bottom + legendPadding.top,
  };

  const onHeatmapHover = (value?: number) => {
    setHoverValue(value);
  };

  return (
    <>
      <g transform={`translate(${heatmapPos.x}, ${heatmapPos.y})`}>
        <HeatmapWithAxes
          data={bucketData}
          width={heatmapWidth}
          height={heatmapHeight}
          colorDisplay={colorMapper}
          timeZone={timeZone}
          timeRange={timeRange}
          dailyInterval={dailyIntervalHours}
          regions={regions}
          onHover={onHeatmapHover}
          cellBorder={cellBorder}
          tooltip={tooltip}
        />
      </g>

      {legend ? (
        <g transform={`translate(${legendPos.x}, ${legendPos.y})`}>
          <Legend
            width={legendWidth}
            height={legendHeight}
            min={valueField.config.min!}
            max={valueField.config.max!}
            valueDisplay={valueField.display!}
            colorDisplay={colorMapper}
            currentValue={hoverValue}
            indicator={showValueIndicator}
            quality={legendGradientQuality}
          />
        </g>
      ) : null}
    </>
  );
};

/**
 * makeColorDisplay returns a function that maps a value to a color.
 *
 * @param field from which the colors are configured
 */
const buildColorMapper = (field: Field<number>): ((value: number) => string) => {
  const customFieldOptions = field.config.custom as HeatmapFieldConfig;
  const colorPalette = customFieldOptions.colorPalette;
  const invertPalette = customFieldOptions.invertPalette;
  const divergingPalette = customFieldOptions.divergingPalette;
  const nullValueColor = customFieldOptions.nullValueColor;
  const colorSpace = customFieldOptions.colorSpace;
  const colorThresholds: ThresholdsConfig = customFieldOptions.thresholds ?? {
    mode: ThresholdsMode.Percentage,
    steps: [],
  };

  // Create the scales we'll be using to map values to colors.
  switch (colorPalette) {
    case "custom":
      const customColorScale = makeCustomColorScale(colorSpace, field.config.min!, field.config.max!, colorThresholds);
      return (value: number): string => customColorScale(value) ?? nullValueColor;
    case "fieldOptions":
      return (value: number): string => field.display!(value).color!;
    default:
      if (divergingPalette) {
        const divergingColorScale = makeDivergingSpectrumColorScale(colorPalette, field.config.min!, field.config.max!, invertPalette);
        return (value: number): string => divergingColorScale(value) ?? nullValueColor;
      } else {
        const spectrumColorScale = makeSpectrumColorScale(colorPalette, field.config.min!, field.config.max!, invertPalette);
        return (value: number): string => spectrumColorScale(value) ?? nullValueColor;
      }
  }
};
