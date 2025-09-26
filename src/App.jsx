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
        const temperatureData = filteredFeeds.map(
            (feed) => parseFloat(feed.field1) || null,
        );

        // Extract humidity data (field2)
        const humidityData = filteredFeeds.map(
            (feed) => parseFloat(feed.field2) || null,
        );

        const pressureData = filteredFeeds.map(
            (feed) => parseFloat(feed.field3) || null,
        );

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
                    color: "rgba(200, 200, 200, 0.3)",
                },
            },
            y: {
                type: "linear",
                display: true,
                position: "right",
                title: {
                    display: !isMobile,
                    text: "Temperature (°C)",
                    color: "rgb(255, 99, 132)",
                    font: {
                        size: 18,
                        family: "'Jersey 10', monospace",
                    },
                },
                ticks: {
                    color: "rgb(255, 99, 132)",
                    maxTicksLimit: isMobile ? 3 : 5,
                    font: {
                        size: isMobile ? 16 : 24,
                        family: "'Micro 5', monospace",
                    },
                },
                grid: {
                    display: true,
                    color: "rgba(200, 200, 200, 0.3)",
                },
            },
            y1: {
                type: "linear",
                display: true,
                position: "left",
                title: {
                    display: !isMobile,
                    text: "Humidity (%)",
                    color: "rgb(54, 162, 235)",
                    font: {
                        size: 18,
                        family: "'Jersey 10', monospace",
                    },
                },
                ticks: {
                    color: "rgb(54, 162, 235)",
                    maxTicksLimit: isMobile ? 3 : 5,
                    font: {
                        size: isMobile ? 16 : 24,
                        family: "'Micro 5', monospace",
                    },
                },
                grid: {
                    drawOnChartArea: false,
                    color: "rgba(200, 200, 200, 0.3)",
                },
            },
            y2: {
                type: "linear",
                display: true,
                position: "left",
                title: {
                    display: !isMobile,
                    text: "Pressure (hPa)",
                    color: "rgb(0, 201, 81)",
                    font: {
                        size: 18,
                        family: "'Jersey 10', monospace",
                    },
                },
                ticks: {
                    color: "rgb(0, 201, 81)",
                    maxTicksLimit: isMobile ? 3 : 5,
                    font: {
                        size: isMobile ? 16 : 24,
                        family: "'Micro 5', monospace",
                    },
                },
                grid: {
                    drawOnChartArea: false,
                    color: "rgba(200, 200, 200, 0.3)",
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
            <div className="font-jersey-10 flex min-h-screen items-center justify-center bg-gray-200">
                <div className="rounded-lg bg-white p-6 text-center shadow-lg">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
                    <p className="mt-4 text-gray-600">Loading sensor data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="font-jersey-10 flex min-h-screen items-center justify-center bg-gray-200">
                <div className="rounded-lg bg-white p-6 text-center shadow-lg">
                    <p className="mb-4 text-red-500">{error}</p>
                    <button
                        onClick={fetchSensorData}
                        className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="font-jersey-10 flex min-h-[100dvh] flex-col items-center justify-center bg-zinc-950 text-white">
            <div className="flex w-full flex-col items-center justify-start border-2 border-gray-400 bg-zinc-950 shadow-lg sm:max-w-6xl">
                {/* Header */}
                {/*  <h2 className="mb-6 mt-6 text-2xl font-bold text-gray-800 sm:text-5xl">Pi Sensor Dashboard</h2> */}
                {/* Latest Sensor Readings */}
                {sensorData && (
                    <div className="m-4 mt-6 grid grid-cols-2 gap-3 text-3xl text-gray-300 sm:gap-4 sm:text-xl md:grid-cols-3">
                        <div className="border-2 border-gray-400 bg-zinc-800 p-3 text-center shadow-md">
                            <p className="font-semibold">Temperature</p>
                            <p className="font-jersey-10 text-5xl font-semibold text-red-500 sm:text-5xl">
                                {
                                    sensorData.feeds[
                                        sensorData.feeds.length - 1
                                    ]?.field1
                                }{" "}
                                °C
                            </p>
                        </div>
                        <div className="border-2 border-gray-400 bg-zinc-800 p-3 text-center shadow-md">
                            <p className="font-semibold">Humidity</p>
                            <p className="font-jersey-10 text-5xl font-semibold text-blue-500 sm:text-5xl">
                                {
                                    sensorData.feeds[
                                        sensorData.feeds.length - 1
                                    ]?.field2
                                }{" "}
                                %
                            </p>
                        </div>
                        <div className="col-span-2 border-2 border-gray-400 bg-zinc-800 p-3 text-center shadow-md md:col-span-1">
                            <p className="font-semibold">Pressure</p>
                            <p className="font-jersey-10 text-5xl font-semibold text-green-500 sm:text-5xl">
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
                        className="mx-2 w-full px-1"
                        style={{ height: isMobile ? "250px" : "400px" }}
                    >
                        <Line options={chartOptions} data={chartData} />
                    </div>
                )}

                {/* Controls */}
                {/* Time Range Buttons */}
                <div className="flex items-center justify-center gap-2 border-2 border-gray-400 bg-zinc-800 p-3">
                    <p className="text-lg font-semibold text-gray-300">
                        Time Range:
                    </p>
                    <div className="text-md flex gap-2">
                        <button
                            onClick={() => setTimeRangeDays(0.5)}
                            className={`border px-2 py-1 font-medium transition-colors sm:px-3 sm:text-sm ${
                                timeRangeDays === 0.5
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                        >
                            12 Hours
                        </button>
                        <button
                            onClick={() => setTimeRangeDays(1)}
                            className={`border px-2 py-1 font-medium transition-colors sm:px-3 sm:text-sm ${
                                timeRangeDays === 1
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                        >
                            1 Day
                        </button>
                        <button
                            onClick={() => setTimeRangeDays(2)}
                            className={`border px-2 py-1 font-medium transition-colors sm:px-3 sm:text-sm ${
                                timeRangeDays === 2
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                        >
                            2 Days
                        </button>
                        <button
                            onClick={() => setTimeRangeDays(3)}
                            className={`border px-2 py-1 font-medium transition-colors sm:px-3 sm:text-sm ${
                                timeRangeDays === 3
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                        >
                            3 Days
                        </button>
                    </div>
                </div>

                {/* Refresh Button */}
                <button
                    onClick={fetchSensorData}
                    className="mt-4 border-2 border-green-900 bg-green-500 px-3 py-2 text-2xl font-bold text-white hover:bg-green-700 sm:px-4 sm:text-sm"
                    disabled={loading}
                >
                    Refresh
                </button>

                {/* Data Point Counter */}
                <div className="mb-4a mt-4 text-center">
                    <p className="text-xs font-semibold sm:text-sm">
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
