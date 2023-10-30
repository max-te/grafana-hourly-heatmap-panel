import { DataHoverClearEvent, DataHoverEvent, DateTime, GrafanaTheme2, dateTimeAsMoment, dateTimeParse } from '@grafana/data';
import { useTheme2, useStyles2, Tooltip as GTooltip, usePanelContext } from '@grafana/ui';
import * as d3 from 'd3';
import React, { useEffect, useState } from 'react';
import { BucketData } from '../bucket';
import { TimeRegion } from './TimeRegionEditor';
import { Tooltip } from './Tooltip';
import { css } from '@emotion/css';

const minutesPerDay = 24 * 60;
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
  const [hoverData, setHoverData] = useState<null | [DateTime, number]>(null);

  useEffect(() => {
    if (hoverData !== null) {
      let [time, value] = hoverData;
      eventBus.publish<DataHoverEvent>({
        payload: { point: { time: time } },
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
  }, [hoverData, eventBus, onHover]);

  const x = d3.scaleBand().domain(values).range([0, width]);

  const y = d3.scaleLinear().domain(dailyIntervalMinutes).range([0, height]);

  const cellWidth = Math.ceil(x.bandwidth());
  const cellHeight = bucketHeight(height, numBuckets, dailyIntervalMinutes);

  const intervalMinutes = dailyIntervalMinutes[1] - dailyIntervalMinutes[0];
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

          const content = (
            <rect
              x={x(startOfDay.valueOf().toString())}
              y={Math.ceil(y(minutesSinceStartOfDay) ?? 0)}
              fill={colorDisplay(d.value)}
              width={cellWidth}
              height={cellHeight}
              onMouseLeave={() => { setHoverData(null); }}
              onMouseEnter={() => { setHoverData([bucketMid, d.value]); }}
              stroke={cellBorder ? theme.colors.background.primary : undefined}
              strokeWidth={2 * 2}
              className={styles.cell}
              clipPath='fill-box'
            />
          );

          if (tooltip) {
            return (
              <GTooltip
                key={i}
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
          } else {
            return content;
          }
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

const bucketHeight = (height: number, numBuckets: number, dailyIntervalMinutes: [number, number]) => {
  const minutesPerBucket = minutesPerDay / numBuckets;
  const intervalMinutes = dailyIntervalMinutes[1] - dailyIntervalMinutes[0];
  const pixelsPerBucket = height / (intervalMinutes / minutesPerBucket);
  return Math.ceil(pixelsPerBucket);
};
