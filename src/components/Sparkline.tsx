import React from 'react';
import ReactECharts from 'echarts-for-react';

interface SparklineProps {
    data: number[];
    color?: string;
    height?: number;
    width?: string;
    showXAxis?: boolean;
    label?: string;
    min?: 'auto' | number;
    max?: 'auto' | number;
}

export const Sparkline: React.FC<SparklineProps> = ({
    data,
    color = '#3b82f6',
    height = 50,
    width = '100%',
    showXAxis = false,
    label,
    min = 'auto',
    max = 'auto'
}) => {
    // Determine gradient color based on input color
    const getGradient = (hex: string) => {
        return {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{
                offset: 0, color: hex // Start color
            }, {
                offset: 1, color: hex + '00' // End color (transparent)
            }]
        };
    };

    const option = {
        grid: {
            top: 5,
            bottom: showXAxis ? 20 : 0,
            left: 0,
            right: 0,
            containLabel: false
        },
        xAxis: {
            type: 'category',
            show: showXAxis,
            data: data.map((_, i) => i),
            boundaryGap: false,
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { color: '#94a3b8', fontSize: 10 }
        },
        yAxis: {
            scale: true,
            min: min === 'auto' ? (value: { min: number, max: number }) => {
                const range = value.max - value.min;
                // If range is small (normalized 0-1), use smaller padding. Else use larger.
                const padding = range < 1.05 ? 0.05 : 5;
                return Math.max(0, value.min - padding);
            } : min,
            max: max === 'auto' ? (value: { max: number, min: number }) => {
                const range = value.max - value.min;
                const padding = range < 1.05 ? 0.05 : 5;
                return value.max + padding;
            } : max
        },
        tooltip: {
            trigger: 'axis',
            formatter: '{c}',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderColor: '#e2e8f0',
            textStyle: { color: '#1e293b', fontSize: 10, fontWeight: 'bold' },
            padding: [4, 8]
        },
        series: [
            {
                data: data,
                type: 'line',
                smooth: true,
                showSymbol: data.length < 2,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: {
                    width: 2,
                    color: color
                },
                areaStyle: {
                    color: getGradient(color),
                    opacity: 0.3
                },
                emphasis: {
                    focus: 'series',
                    itemStyle: {
                        opacity: 1,
                        color: color
                    }
                },
                name: label
            }
        ],
        animationDuration: 1000,
        animationEasing: 'cubicOut'
    };

    return (
        <ReactECharts
            option={option}
            style={{ height: height, width: width }}
            opts={{ renderer: 'svg' }}
        />
    );
};
