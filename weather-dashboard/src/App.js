import React, { useState, useEffect } from 'react';
import './App.css';
import { getWeather, getForecast } from './weatherService';

function App() {
  const [city, setCity] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [favoriteCities, setFavoriteCities] = useState([]);
  const [showForecast, setShowForecast] = useState(false);

  // Load favorite cities from localStorage on component mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteCities');
    if (savedFavorites) {
      setFavoriteCities(JSON.parse(savedFavorites));
    }
  }, []);

  // Save favorite cities to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('favoriteCities', JSON.stringify(favoriteCities));
  }, [favoriteCities]);

  const fetchWeatherData = async (cityName) => {
    if (!cityName.trim()) {
      setError('Please enter a city name');
      return;
    }

    setLoading(true);
    setError('');
    setWeatherData(null);
    setForecastData(null);

    try {
      const weatherResult = await getWeather(cityName);
      if (!weatherResult) throw new Error('Failed to fetch weather data');
      setWeatherData(weatherResult);

      const forecastResult = await getForecast(cityName);
      if (forecastResult) setForecastData(forecastResult);

    } catch (err) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchWeatherData(city);
  };

  const handleFavoriteClick = (cityName) => {
    setCity(cityName);
    fetchWeatherData(cityName);
  };

  const addToFavorites = () => {
    if (weatherData && !favoriteCities.includes(weatherData.city)) {
      setFavoriteCities([...favoriteCities, weatherData.city]);
    }
  };

  const removeFromFavorites = (cityToRemove) => {
    setFavoriteCities(favoriteCities.filter(city => city !== cityToRemove));
  };

  return (
    <div className="App">
      <div className="container">
        <h1>Weather Dashboard</h1>
        
        {/* Search Form */}
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Enter city name..."
            className="search-input"
          />
          <button type="submit" disabled={loading} className="search-button">
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Favorite Cities */}
        {favoriteCities.length > 0 && (
          <div className="favorites-section">
            <h3>Favorite Cities</h3>
            <div className="favorites-list">
              {favoriteCities.map((favoriteCity) => (
                <div key={favoriteCity} className="favorite-item">
                  <button
                    onClick={() => handleFavoriteClick(favoriteCity)}
                    className={`favorite-button ${weatherData?.city === favoriteCity ? 'active' : ''}`}
                  >
                    {favoriteCity}
                  </button>
                  <button
                    onClick={() => removeFromFavorites(favoriteCity)}
                    className="remove-favorite"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Weather Data */}
        {weatherData && (
          <div className="weather-card">
            <div className="weather-header">
              <h2>{weatherData.city}</h2>
              <button
                onClick={addToFavorites}
                disabled={favoriteCities.includes(weatherData.city)}
                className="add-favorite-button"
              >
                {favoriteCities.includes(weatherData.city) ? '★ Favorited' : '☆ Add to Favorites'}
              </button>
            </div>
            
            <div className="weather-main">
              <div className="weather-info">
                <div className="temperature">{weatherData.temperature}°C</div>
                <div className="condition">{weatherData.condition}</div>
                <div className="description">{weatherData.description}</div>
              </div>
              <div className="weather-icon">
                <img src={weatherData.iconUrl} alt={weatherData.condition} />
              </div>
            </div>

            {/* Forecast Toggle */}
            {forecastData && (
              <button
                onClick={() => setShowForecast(!showForecast)}
                className="forecast-toggle"
              >
                {showForecast ? 'Hide Forecast' : 'Show 5-Day Forecast'}
              </button>
            )}
          </div>
        )}

        {/* 5-Day Forecast */}
        {showForecast && forecastData && (
          <div className="forecast-section">
            <h3>5-Day Forecast</h3>
            <div className="forecast-list">
              {forecastData.forecasts.map((forecast, index) => (
                <div key={index} className="forecast-item">
                  <div className="forecast-date">
                    {new Date(forecast.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <img src={forecast.iconUrl} alt={forecast.condition} className="forecast-icon" />
                  <div className="forecast-temp">{forecast.temperature}°C</div>
                  <div className="forecast-condition">{forecast.condition}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;