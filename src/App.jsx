import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    TimeScale,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { color } from "chart.js/helpers";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    TimeScale,
);

function App() {
    const [sensorData, setSensorData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeRangeDays, setTimeRangeDays] = useState(0.5); // Default to last 12 hours
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [averageInterval, setAverageInterval] = useState(0); // in minutes

    useEffect(() => {
        fetchSensorData();

        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const fetchSensorData = async () => {
        try {
            setLoading(true);
            const response = await fetch(
                "https://api.thingspeak.com/channels/1885010/feeds.json?results=8000",
            );
            // 1440 minutes in a day, so 8000 results covers a bit more than 5 days
            const data = await response.json();

            if (data.feeds && data.feeds.length > 0) {
                setSensorData(data);
                setError(null);
            } else {
                setError("No data available");
            }
        } catch (err) {
            setError("Failed to fetch sensor data");
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    const filterDataByTimeRange = (feeds, days) => {
        const now = new Date();
        const cutoffTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

        return feeds.filter((feed) => {
            const feedDate = new Date(feed.created_at);
            return feedDate >= cutoffTime;
        });
    };

    const formatChartData = () => {
        if (!sensorData || !sensorData.feeds) return null;

        // Filter data based on selected time range
        const filteredFeeds = filterDataByTimeRange(
            sensorData.feeds,
            timeRangeDays,
        );

        // Extract labels (timestamps) as Date objects for time scale
        const labels = filteredFeeds.map((feed) => new Date(feed.created_at));

        // Extract temperature data (field1)
        let temperatureData = filteredFeeds.map(
            (feed) => parseFloat(feed.field1) || null,
        );

        // Extract humidity data (field2)
        let humidityData = filteredFeeds.map(
            (feed) => parseFloat(feed.field2) || null,
        );

        let pressureData = filteredFeeds.map(
            (feed) => parseFloat(feed.field3) || null,
        );

        // Apply averaging if interval is set
        if (averageInterval > 1) {
            const intervalMs = averageInterval * 60 * 1000; // Convert minutes to milliseconds

            const averageData = (data) => {
                const averaged = [];
                let sum = 0;
                let count = 0;
                let currentIntervalStart = labels[0].getTime();

                for (let i = 0; i < data.length; i++) {
                    const time = labels[i].getTime();
                    if (time < currentIntervalStart + intervalMs) {
                        if (data[i] !== null) {
                            sum += data[i];
                            count++;
                        }
                    } else {
                        // Push averaged value for the interval
                        averaged.push(count > 0 ? sum / count : null);
                        // Reset for next interval
                        sum = data[i] !== null ? data[i] : 0;
                        count = data[i] !== null ? 1 : 0;
                        currentIntervalStart += intervalMs;
                        // Handle skipped intervals
                        while (time >= currentIntervalStart + intervalMs) {
                            averaged.push(null);
                            currentIntervalStart += intervalMs;
                        }
                    }
                }
                // Push the last interval
                averaged.push(count > 0 ? sum / count : null);
                return averaged;
            };

            temperatureData = averageData(temperatureData);
            humidityData = averageData(humidityData);
            pressureData = averageData(pressureData);

            // Adjust labels to match averaged data length
            const averagedLabels = [];
            let currentIntervalStart = labels[0].getTime();
            for (let i = 0; i < temperatureData.length; i++) {
                averagedLabels.push(
                    new Date(currentIntervalStart + intervalMs / 2),
                );
                currentIntervalStart += intervalMs;
            }
            // Use averaged labels
            labels.length = 0; // Clear existing labels
            Array.prototype.push.apply(labels, averagedLabels);
        }

        // Prepare chart data structure

        const chartData = {
            labels,
            datasets: [
                {
                    label: "Temperature (°C)",
                    data: temperatureData,
                    borderColor: "#fb2c36",
                    yAxisID: "y",
                    tension: 0.5,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderWidth: isMobile ? 1.5 : 2.5,
                    stepped: true,
                },
                {
                    label: "Humidity (%)",
                    data: humidityData,
                    borderColor: "#2b7fff",
                    yAxisID: "y1",
                    tension: 0.5,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderWidth: isMobile ? 1.5 : 2.5,
                    stepped: true,
                },
                {
                    label: "Pressure (hPa)",
                    data: pressureData,
                    borderColor: "#00c951",
                    yAxisID: "y2",
                    tension: 0.5,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderWidth: isMobile ? 1.5 : 2.5,
                    stepped: true,
                },
            ],
        };

        return chartData;
    };

    const getTimeScaleUnit = (days) => {
        if (days <= 0.5) return "hour";
        if (days === 1) return "hour";
        if (days === 2) return "hour";
        return "day";
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: "index",
            intersect: false,
        },
        plugins: {
            legend: {
                position: "bottom",
                labels: {
                    font: {
                        size: isMobile ? 15 : 18,
                        family: "'Jersey 10', monospace",
                    },
                    padding: isMobile ? 8 : 20,
                    usePointStyle: true,
                    pointStyle: "line",
                    pointStyleWidth: 10,
                    color: "white",
                },
            },
            title: {
                display: false,
            },
            tooltip: {
                enabled: true,
                boxPadding: 5,
                usePointStyle: true,
                callbacks: {
                    labelPointStyle: function (context) {
                        return {
                            pointStyle: "line",
                            rotation: 0,
                        };
                    },
                    labelBorderWidth: function (context) {
                        return 6;
                    },
                },
                titleFont: {
                    size: isMobile ? 14 : 16,
                    family: "'Jersey 10', monospace",
                },
                bodyFont: {
                    size: isMobile ? 14 : 16,
                    family: "'Jersey 10', monospace",
                },
                cornerRadius: 0,
                caretSize: 8,
                caretPadding: 4,
            },
        },
        scales: {
            x: {
                type: "time",
                display: true,
                title: {
                    display: false,
                },
                time: {
                    unit: getTimeScaleUnit(timeRangeDays),
                    displayFormats: {
                        hour: isMobile ? "HH:mm" : "HH:mm",
                        day: isMobile ? "dd" : "MMM dd",
                    },
                },
                ticks: {
                    maxTicksLimit: isMobile
                        ? 7
                        : timeRangeDays === 0.5
                          ? 12
                          : timeRangeDays === 1
                            ? 10
                            : timeRangeDays === 2
                              ? 16
                              : 8,
                    font: {
                        size: isMobile ? 16 : 24,
                        family: "'Micro 5', monospace",
                    },
                    maxRotation: isMobile ? 45 : 0,
                    color: "white",
                },
                grid: {
                    display: true,
                    color: "rgba(200, 200, 200, 0.5)",
                },
            },
            y: {
                type: "linear",
                display: true,
                position: "right",
                title: {
                    display: !isMobile,
                    text: "Temperature (°C)",
                    color: "#fb2c36",
                    font: {
                        size: 18,
                        family: "'Jersey 10', monospace",
                    },
                },
                ticks: {
                    color: "#fb2c36",
                    maxTicksLimit: isMobile ? 3 : 5,
                    font: {
                        size: isMobile ? 16 : 24,
                        family: "'Micro 5', monospace",
                    },
                },
                grid: {
                    display: true,
                    color: "rgba(200, 200, 200, 0.5)",
                },
            },
            y1: {
                type: "linear",
                display: true,
                position: "left",
                title: {
                    display: !isMobile,
                    text: "Humidity (%)",
                    color: "#2b7fff",
                    font: {
                        size: 18,
                        family: "'Jersey 10', monospace",
                    },
                },
                ticks: {
                    color: "#2b7fff",
                    maxTicksLimit: isMobile ? 3 : 5,
                    font: {
                        size: isMobile ? 16 : 24,
                        family: "'Micro 5', monospace",
                    },
                },
                grid: {
                    drawOnChartArea: false,
                },
            },
            y2: {
                type: "linear",
                display: true,
                position: "left",
                title: {
                    display: !isMobile,
                    text: "Pressure (hPa)",
                    color: "#00c951",
                    font: {
                        size: 18,
                        family: "'Jersey 10', monospace",
                    },
                },
                ticks: {
                    color: "#00c951",
                    maxTicksLimit: isMobile ? 3 : 5,
                    font: {
                        size: isMobile ? 16 : 24,
                        family: "'Micro 5', monospace",
                    },
                },
                grid: {
                    drawOnChartArea: false,
                },
            },
        },
    };

    const chartData = formatChartData();

    const getFilteredDataCount = () => {
        if (!sensorData || !sensorData.feeds) return 0;
        return filterDataByTimeRange(sensorData.feeds, timeRangeDays).length;
    };

    if (loading) {
        return (
            <div className="font-jersey-10 flex min-h-screen items-center justify-center bg-zinc-950">
                <div className="pixel-border-card bg-zinc-800 p-6 text-center shadow-lg">
                    <div className="atebits-loader"></div>
                    <p className="mt-4 text-gray-300">Loading sensor data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="font-jersey-10 flex min-h-screen items-center justify-center bg-zinc-950">
                <div className="pixel-border-card bg-zinc-800 p-6 text-center shadow-lg">
                    <p className="mb-4 text-red-500">{error}</p>
                    <button
                        onClick={fetchSensorData}
                        className="border bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="font-jersey-10 flex min-h-[100dvh] flex-col items-center justify-center bg-zinc-950 p-2 text-white">
            <div className="pixel-border-background flex w-full flex-1 flex-col items-center justify-start bg-zinc-900 shadow-lg sm:max-w-6xl md:flex-0">
                {/* Header */}
                {/*  <h2 className="mb-6 mt-6 text-2xl font-bold text-gray-800 sm:text-5xl">Pi Sensor Dashboard</h2> */}
                {/* Latest Sensor Readings */}
                {sensorData && (
                    <div className="m-4 mb-6 grid w-full grid-cols-2 gap-5 px-4 text-3xl text-gray-100 md:m-8 md:w-auto md:grid-cols-3 md:gap-6 md:text-4xl">
                        <div className="pixel-border-card-red bg-red-950 p-3 text-center shadow-md">
                            <p className="font-semibold">Temperature</p>
                            <p className="font-jersey-10 text-5xl font-semibold text-red-500 md:text-5xl">
                                {
                                    sensorData.feeds[
                                        sensorData.feeds.length - 1
                                    ]?.field1
                                }{" "}
                                °C
                            </p>
                        </div>
                        <div className="pixel-border-card-blue bg-blue-950 p-3 text-center shadow-md">
                            <p className="font-semibold">Humidity</p>
                            <p className="font-jersey-10 text-5xl font-semibold text-blue-500 md:text-5xl">
                                {
                                    sensorData.feeds[
                                        sensorData.feeds.length - 1
                                    ]?.field2
                                }{" "}
                                %
                            </p>
                        </div>
                        <div className="pixel-border-card-green col-span-2 bg-green-950 p-3 text-center shadow-md md:col-span-1">
                            <p className="font-semibold">Pressure</p>
                            <p className="font-jersey-10 text-5xl font-semibold text-green-500 md:text-5xl">
                                {
                                    sensorData.feeds[
                                        sensorData.feeds.length - 1
                                    ]?.field3
                                }{" "}
                                hPa
                            </p>
                        </div>
                    </div>
                )}

                {/* Chart Container with responsive height */}
                {chartData && (
                    <div
                        className="mx-2 w-full px-1.5"
                        style={{ height: isMobile ? "250px" : "400px" }}
                    >
                        <Line options={chartOptions} data={chartData} />
                    </div>
                )}

                <div className="flex w-full flex-col px-4 md:w-auto">
                    {/* Controls */}
                    {/* Time Range Buttons */}
                    <div className="pixel-border-card mt-4 flex items-center justify-between bg-zinc-800 p-2">
                        <p className="w-2/5 text-xl font-semibold text-gray-100">
                            Time Range:
                        </p>
                        <div className="text-md flex w-3/5 items-center justify-between gap-3">
                            <button
                                onClick={() => {
                                    setTimeRangeDays(0.5);
                                    setAverageInterval(0);
                                }}
                                className={`h-fit w-24 px-2 font-medium transition-colors sm:text-sm ${
                                    timeRangeDays === 0.5
                                        ? "pixel-border-button-red bg-red-600 py-0 text-white"
                                        : "pixel-border-button-gray bg-gray-200 py-0 text-gray-700 hover:bg-gray-300"
                                }`}
                            >
                                {isMobile ? "12 H" : "12 Hours"}
                            </button>
                            <button
                                onClick={() => {
                                    setTimeRangeDays(1);
                                    setAverageInterval(15);
                                }}
                                className={`h-fit w-24 px-2 font-medium transition-colors sm:text-sm ${
                                    timeRangeDays === 1
                                        ? "pixel-border-button-red bg-red-600 py-0 text-white"
                                        : "pixel-border-button-gray bg-gray-200 py-0 text-gray-700 hover:bg-gray-300"
                                }`}
                            >
                                {isMobile ? "1 D" : "1 Day"}
                            </button>
                            <button
                                onClick={() => {
                                    setTimeRangeDays(2);
                                    setAverageInterval(30);
                                }}
                                className={`h-fit w-24 px-2 font-medium transition-colors sm:text-sm ${
                                    timeRangeDays === 2
                                        ? "pixel-border-button-red bg-red-600 py-0 text-white"
                                        : "pixel-border-button-gray bg-gray-200 py-0 text-gray-700 hover:bg-gray-300"
                                }`}
                            >
                                {isMobile ? "2 D" : "2 Days"}
                            </button>
                            <button
                                onClick={() => {
                                    setTimeRangeDays(3);
                                    setAverageInterval(60);
                                }}
                                className={`h-fit w-24 px-2 font-medium transition-colors sm:text-sm ${
                                    timeRangeDays === 3
                                        ? "pixel-border-button-red bg-red-600 py-0 text-white"
                                        : "pixel-border-button-gray bg-gray-200 py-0 text-gray-700 hover:bg-gray-300"
                                }`}
                            >
                                {isMobile ? "3 D" : "3 Days"}
                            </button>
                        </div>
                    </div>
                    {/* Averaging Interval Selector */}
                    <div className="pixel-border-card mt-5 flex items-center justify-between bg-zinc-800 p-2">
                        <p className="w-2/5 text-xl font-semibold text-gray-100">
                            Average over:
                        </p>
                        <select
                            value={averageInterval}
                            onChange={(e) => {
                                setAverageInterval(parseInt(e.target.value));
                                e.target.blur();
                            }}
                            className="pixel-border-button-gray w-3/5 bg-gray-200 px-2 py-1 font-mono text-gray-700 focus:bg-red-600 focus:text-gray-100 sm:px-3 sm:py-2 sm:text-sm"
                            style={{ fontFamily: "'Jersey 10', monospace" }}
                        >
                            <option value={1}>No Averaging</option>
                            <option value={15}>15 Minutes</option>
                            <option value={30}>30 Minutes</option>
                            <option value={60}>1 Hour</option>
                            <option value={120}>2 Hours</option>
                        </select>
                    </div>
                </div>

                {/* Refresh Button */}
                <button
                    onClick={fetchSensorData}
                    className="pixel-border-button-green mt-8 bg-green-500 px-8 py-2 text-3xl font-bold text-white hover:bg-green-700 md:text-4xl"
                    disabled={loading}
                >
                    Refresh
                </button>

                {/* Data Point Counter*/}
                <div className="mt-5 mb-3 text-center">
                    <p className="text-xs font-semibold text-gray-400 sm:text-sm">
                        Data Points ({timeRangeDays}d)
                    </p>
                    <p className="text-sm text-gray-500 sm:text-lg">
                        {getFilteredDataCount()}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default App;
