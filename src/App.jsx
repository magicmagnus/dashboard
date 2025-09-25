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
                    borderColor: "rgb(255, 99, 132)",
                    backgroundColor: "rgba(255, 99, 132, 0.1)",
                    yAxisID: "y",
                    tension: 0.5,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderWidth: isMobile ? 1.5 : 2,
                },
                {
                    label: "Humidity (%)",
                    data: humidityData,
                    borderColor: "rgb(54, 162, 235)",
                    backgroundColor: "rgba(54, 162, 235, 0.1)",
                    yAxisID: "y1",
                    tension: 0.5,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderWidth: isMobile ? 1.5 : 2,
                },
                {
                    label: "Pressure (hPa)",
                    data: pressureData,
                    borderColor: "rgba(0, 201, 81, 0.4)",
                    backgroundColor: "rgba(75, 192, 192, 0.1)",
                    yAxisID: "y2",
                    tension: 0.5,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    borderWidth: isMobile ? 1.5 : 2,
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
                        size: isMobile ? 11 : 12,
                    },
                    padding: isMobile ? 12 : 20,
                    usePointStyle: true,
                    pointStyle: "line",
                },
            },
            title: {
                display: false,
            },
            tooltip: {
                titleFont: {
                    size: isMobile ? 11 : 12,
                },
                bodyFont: {
                    size: isMobile ? 10 : 12,
                },
            },
        },
        scales: {
            x: {
                type: "time",
                display: true,
                title: {
                    display: false,
                    text: "Time",
                    font: {
                        size: isMobile ? 10 : 12,
                    },
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
                        size: isMobile ? 9 : 11,
                    },
                    maxRotation: isMobile ? 45 : 0,
                },
                grid: {
                    display: true,
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
                        size: 12,
                    },
                },
                ticks: {
                    color: "rgb(255, 99, 132)",
                    maxTicksLimit: isMobile ? 3 : 5,
                    font: {
                        size: isMobile ? 10 : 12,
                    },
                },
                grid: {
                    display: true,
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
                        size: 12,
                    },
                },
                ticks: {
                    color: "rgb(54, 162, 235)",
                    maxTicksLimit: isMobile ? 3 : 5,
                    font: {
                        size: isMobile ? 10 : 12,
                    },
                },
                grid: {
                    drawOnChartArea: false,
                },
            },
            y2: {
                type: "linear",
                display: false, // Hide pressure axis on mobile
                position: "left",
                title: {
                    display: !isMobile,
                    text: "Pressure (hPa)",
                    color: "rgb(75, 192, 192, 0.5)",
                    font: {
                        size: 12,
                    },
                },
                ticks: {
                    color: "rgb(75, 192, 192)",
                    maxTicksLimit: isMobile ? 4 : 5,
                    font: {
                        size: isMobile ? 8 : 10,
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
            <div className="flex min-h-screen items-center justify-center bg-gray-200">
                <div className="rounded-lg bg-white p-6 text-center shadow-lg">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
                    <p className="mt-4 text-gray-600">Loading sensor data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-200">
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
        <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-gray-200">
            <div className="flex w-full flex-col items-center justify-start rounded-2xl bg-gray-100 shadow-lg sm:max-w-6xl">
                {/* Header */}
                {/*  <h2 className="mb-6 mt-6 text-2xl font-bold text-gray-800 sm:text-5xl">Pi Sensor Dashboard</h2> */}
                {/* Latest Sensor Readings */}
                {sensorData && (
                    <div className="m-4 grid grid-cols-2 gap-2 text-xl text-gray-600 sm:gap-4 sm:text-xl md:grid-cols-3">
                        <div className="rounded-xl bg-white p-3 text-center shadow-md">
                            <p className="font-semibold">Temperature</p>
                            <p className="text-3xl font-semibold text-red-500 sm:text-5xl">
                                {
                                    sensorData.feeds[
                                        sensorData.feeds.length - 1
                                    ]?.field1
                                }
                                °C
                            </p>
                        </div>
                        <div className="rounded-xl bg-white p-3 text-center shadow-md">
                            <p className="font-semibold">Humidity</p>
                            <p className="text-3xl font-semibold text-blue-500 sm:text-5xl">
                                {
                                    sensorData.feeds[
                                        sensorData.feeds.length - 1
                                    ]?.field2
                                }
                                %
                            </p>
                        </div>
                        <div className="col-span-2 rounded-xl bg-white p-3 text-center shadow-md md:col-span-1">
                            <p className="font-semibold">Pressure</p>
                            <p className="text-3xl font-semibold text-green-500 sm:text-5xl">
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
                <div className="flex items-center justify-center gap-2 p-4">
                    <p className="text-sm font-semibold text-gray-600">
                        Time Range:
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setTimeRangeDays(0.5)}
                            className={`rounded px-2 py-1 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                                timeRangeDays === 0.5
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                        >
                            12 Hours
                        </button>
                        <button
                            onClick={() => setTimeRangeDays(1)}
                            className={`rounded px-2 py-1 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                                timeRangeDays === 1
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                        >
                            1 Day
                        </button>
                        <button
                            onClick={() => setTimeRangeDays(2)}
                            className={`rounded px-2 py-1 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                                timeRangeDays === 2
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                        >
                            2 Days
                        </button>
                        <button
                            onClick={() => setTimeRangeDays(3)}
                            className={`rounded px-2 py-1 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
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
                    className="text-md mt-0 rounded bg-green-500 px-3 py-2 font-bold text-white hover:bg-green-700 sm:px-4 sm:text-sm"
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
