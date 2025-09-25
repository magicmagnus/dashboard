import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale } from 'chart.js'
import 'chartjs-adapter-date-fns';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale)

function App() {
  const [sensorData, setSensorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRangeDays, setTimeRangeDays] = useState(1);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    fetchSensorData();
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchSensorData = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://api.thingspeak.com/channels/1885010/feeds.json?results=800');
      const data = await response.json();
      
      if (data.feeds && data.feeds.length > 0) {
        setSensorData(data);
        setError(null);
      } else {
        setError('No data available');
      }
    } catch (err) {
      setError('Failed to fetch sensor data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterDataByTimeRange = (feeds, days) => {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    
    return feeds.filter(feed => {
      const feedDate = new Date(feed.created_at);
      return feedDate >= cutoffTime;
    });
  };

  const formatChartData = () => {
    if (!sensorData || !sensorData.feeds) return null;

    // Filter data based on selected time range
    const filteredFeeds = filterDataByTimeRange(sensorData.feeds, timeRangeDays);
    
    // Extract labels (timestamps) as Date objects for time scale
    const labels = filteredFeeds.map(feed => new Date(feed.created_at));

    // Extract temperature data (field1)
    const temperatureData = filteredFeeds.map(feed => parseFloat(feed.field1) || null);
    
    // Extract humidity data (field2)
    const humidityData = filteredFeeds.map(feed => parseFloat(feed.field2) || null);

    const pressureData = filteredFeeds.map(feed => parseFloat(feed.field3) || null);
  
    const chartData = {
      labels,
      datasets: [
        {
          label: 'Temperature (°C)',
          data: temperatureData,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          yAxisID: 'y',
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: isMobile ? 1.5 : 2,
        },
        {
          label: 'Humidity (%)',
          data: humidityData,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          yAxisID: 'y1',
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: isMobile ? 1.5 : 2,
        },
        {
          label: 'Pressure (hPa)',
          data: pressureData,
          borderColor: 'rgba(0, 201, 81, 0.4)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          yAxisID: 'y2',
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: isMobile ? 1.5 : 2,
        },
      ],
    };

    return chartData
  };

  const getTimeScaleUnit = (days) => {
    if (days === 1) return 'hour';
    if (days === 2) return 'hour';
    return 'day';
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: isMobile ? 10 : 12,
          },
          padding: isMobile ? 8 : 20,
          usePointStyle: true,
          pointStyle: 'line',
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
        type: 'time',
        display: true,
        title: {
          display: true,
          text: 'Time',
          font: {
            size: isMobile ? 10 : 12,
          },
        },
        time: {
          unit: getTimeScaleUnit(timeRangeDays),
          displayFormats: {
            hour: isMobile ? 'HH:mm' : 'MMM dd, HH:mm',
            day: isMobile ? 'dd' : 'MMM dd'
          }
        },
        ticks: {
          maxTicksLimit: isMobile ? 4 : (timeRangeDays === 1 ? 10 : timeRangeDays === 2 ? 16 : 8),
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
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: !isMobile,
          text: 'Temperature (°C)',
          color: 'rgb(255, 99, 132)',
          font: {
            size: isMobile ? 9 : 11,
          },
        },
        ticks: {
          color: 'rgb(255, 99, 132)',
          maxTicksLimit: isMobile ? 4 : 5,
          font: {
            size: isMobile ? 8 : 10,
          },
        },
        grid: {
          display: true,
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: !isMobile,
          text: 'Humidity (%)',
          color: 'rgb(54, 162, 235)',
          font: {
            size: isMobile ? 9 : 11,
          },
        },
        ticks: {
          color: 'rgb(54, 162, 235)',
          maxTicksLimit: isMobile ? 4 : 5,
          font: {
            size: isMobile ? 8 : 10,
          },
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      y2: {
        type: 'linear',
        display: false, // Hide pressure axis on mobile
        position: 'left',
        title: {
          display: !isMobile,
          text: 'Pressure (hPa)',
          color: 'rgb(75, 192, 192, 0.5)',
          font: {
            size: isMobile ? 9 : 11,
          },
        },
        ticks: {
          color: 'rgb(75, 192, 192)',
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
      <div className="bg-gray-200 flex items-center justify-center min-h-screen">
        <div className="bg-white p-6 rounded-lg shadow-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sensor data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-200 flex items-center justify-center min-h-screen">
        <div className="bg-white p-6 rounded-lg shadow-lg text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={fetchSensorData}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-200 flex items-center justify-center min-h-screen p-2 sm:p-4">
      <div className="bg-white p-3 sm:p-6 rounded-lg shadow-lg w-full max-w-6xl h-full ">
       
        {/* Header */}
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Sensor Dashboard</h2>
        
        {/* Latest Sensor Readings */}
        {sensorData && (
          <div className="mb-4 sm:mb-6 grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
            <div className="text-center">
              <p className="font-semibold">Temperature</p>
              <p className="text-red-500 text-xl sm:text-3xl">
                {sensorData.feeds[sensorData.feeds.length - 1]?.field1}°C
              </p>
            </div>
            <div className="text-center">
              <p className="font-semibold">Humidity</p>
              <p className="text-blue-500 text-xl sm:text-3xl">
                {sensorData.feeds[sensorData.feeds.length - 1]?.field2}%
              </p>
            </div>
            <div className="text-center col-span-2 md:col-span-1">
              <p className="font-semibold">Pressure</p>
              <p className="text-green-500 text-xl sm:text-3xl">
                {sensorData.feeds[sensorData.feeds.length - 1]?.field3} hPa</p>
            </div>
          </div>
        )}
        
        {/* Chart Container with responsive height */}
        {chartData && (
          <div className="mt-4 sm:mt-6">
            <div style={{ height: isMobile ? '300px' : '400px', position: 'relative' }}>
              <Line options={chartOptions} data={chartData} />
            </div>
          </div>
        )}
        
        {/* Controls */}
        <div className="mt-4 sm:mt-6 flex flex-col items-center gap-3 sm:gap-4">
          {/* Time Range Buttons */}
          <div className="flex gap-1 sm:gap-2">
            <button
              onClick={() => setTimeRangeDays(1)}
              className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium transition-colors ${
                timeRangeDays === 1
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              1 Day
            </button>
            <button
              onClick={() => setTimeRangeDays(2)}
              className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium transition-colors ${
                timeRangeDays === 2
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              2 Days
            </button>
            <button
              onClick={() => setTimeRangeDays(3)}
              className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium transition-colors ${
                timeRangeDays === 3
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              3 Days
            </button>
          </div>
          
          {/* Refresh Button */}
          <button 
            onClick={fetchSensorData}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-3 sm:px-4 rounded text-xs sm:text-sm"
            disabled={loading}
          >
            Refresh Data
          </button>
          
          {/* Data Point Counter */}
          <div className="text-center">
            <p className="font-semibold text-xs sm:text-sm">Data Points ({timeRangeDays}d)</p>
            <p className="text-gray-500 text-sm sm:text-lg">{getFilteredDataCount()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;