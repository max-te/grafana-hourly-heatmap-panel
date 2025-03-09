import { DataHoverClearEvent, DataHoverEvent, DateTime, GrafanaTheme2, dateTimeAsMoment, dateTimeParse } from '@grafana/data';
import { useTheme2, useStyles2, Tooltip as GTooltip, usePanelContext } from '@grafana/ui';
import * as d3 from 'd3';
import React, { useCallback, useRef } from 'react';
import { BucketData } from '../bucket';
import { TimeRegion } from './TimeRegionEditor';
import { Tooltip } from './Tooltip';
import { css } from '@emotion/css';

// const minutesPerDay = 24 * 60;
interface HeatmapProps {
  values: string[];
  data: BucketData;
  colorDisplay: (value: number) => string;
  width: number;
  height: number;
  numBuckets: number;
  timeZone: string;
  dailyIntervalMinutes: [number, number];
  regions: TimeRegion[];
  onHover: (value?: number) => void;
  cellBorder: boolean;
  tooltip: boolean;
}

const getStyles = (theme: GrafanaTheme2) => {
  return {
    cell: css`
      &:hover {
        filter: invert() brightness(.66) invert();
        stroke: ${theme.colors.border.strong}
      }
    `
  }
};

/**
 * A two-dimensional grid of colored cells.
 */
export const Heatmap: React.FC<HeatmapProps> = ({
  values,
  data,
  colorDisplay,
  width,
  height,
  numBuckets,
  timeZone,
  dailyIntervalMinutes,
  regions,
  onHover,
  cellBorder,
  tooltip,
}) => {
  const theme = useTheme2();
  const styles = useStyles2(getStyles);
  const { eventBus } = usePanelContext();
  const hoverData = useRef<null | [DateTime, number]>(null);
  const setHoverData = useCallback((data: null | [DateTime, number]) => {
    if (data !== null) {
      const [time, value] = data;
      eventBus.publish<DataHoverEvent>({
        payload: { point: { time: time.unix() * 1000 } },
        type: DataHoverEvent.type
      });
      onHover(value);
    } else {
      eventBus.publish<DataHoverClearEvent>({
        payload: {},
        type: DataHoverClearEvent.type
      });
      onHover(undefined);
    }
    hoverData.current = data;
  }, [eventBus, onHover]);

  const x = d3.scaleBand().domain(values).range([0, width]).rangeRound([0, width]);

  const y = d3.scaleLinear().domain(dailyIntervalMinutes).range([0, height]).rangeRound([0, height]);

  const cellWidth = Math.ceil(x.bandwidth() + 0.5);

  const intervalMinutes = dailyIntervalMinutes[1] - dailyIntervalMinutes[0] + 1;
  const pixelsPerMinute = height / intervalMinutes;
  const bucketMinutes = intervalMinutes / numBuckets;

  return (
    <>
      <g>
        {data.points.map((d, i) => {
          const startOfDay = dateTimeParse(d.dayMillis, { timeZone }).startOf('day');
          const bucketStart = dateTimeParse(d.bucketStartMillis, { timeZone });
          const bucketMid = (dateTimeAsMoment(bucketStart).clone() as DateTime).add(bucketMinutes / 2, 'minutes');
          const minutesSinceStartOfDay = bucketStart.hour!() * 60 + bucketStart.minute!();
          const displayValue = data.valueField.display!(d.value);
          const thisCellY = y(minutesSinceStartOfDay) ?? 0;
          const thisCellEndY = y(minutesSinceStartOfDay + bucketMinutes) ?? 0;
          const thisCellHeight = (thisCellEndY - thisCellY) + 1;

          const content = (
            <rect
              key={d.bucketStartMillis}
              x={x(startOfDay.valueOf().toString()) ?? 0}
              y={thisCellY}
              fill={colorDisplay(d.value)}
              width={cellWidth}
              height={thisCellHeight}
              onMouseLeave={() => { setHoverData(null); }}
              onMouseEnter={() => { setHoverData([bucketMid, d.value]); }}
              stroke={cellBorder ? theme.colors.background.primary : undefined}
              strokeWidth={2 * 2}
              className={styles.cell}
              clipPath='fill-box'
              shapeRendering={'optimizeSpeed'}
            />
          );

          if (tooltip) {
            return (
              <GTooltip
                key={d.bucketStartMillis}
                content={
                  <div>
                    <Tooltip
                      bucketStartTime={bucketStart}
                      displayValue={displayValue}
                      numBuckets={numBuckets}
                      tz={timeZone}
                    />
                  </div>
                }
                placement="bottom"
              >
                {content}
              </GTooltip>
            );
          }
          return content;
        })}
      </g>
      <g>
        {regions
          .filter((region) => {
            const yPos = Math.ceil(y(region.start.hour * 60 + region.start.minute) ?? 0);
            return 0 <= yPos && yPos < height;
          })
          .map((region, key) => {
            const regionDuration =
              region.end.hour * 60 + region.end.minute - (region.start.hour * 60 + region.start.minute);
            const yPos = Math.ceil(y(region.start.hour * 60 + region.start.minute) ?? 0);
            const regionHeight = Math.ceil(regionDuration * pixelsPerMinute);
            return (
              <rect
                key={key}
                x={0}
                y={yPos}
                width={width}
                height={yPos + regionHeight >= height ? height - yPos : regionHeight}
                stroke={region.color}
                fill={region.color}
                pointerEvents="none"
                strokeWidth={2}
              />
            );
          })}
      </g>
    </>
  );
};
