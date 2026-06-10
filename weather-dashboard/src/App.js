import React, { useEffect, useState } from 'react';
import './App.css';
import { getForecast, getForecastByCoordinates, getWeather, getWeatherByCoordinates } from './weatherService';

const formatSearchTime = () => (
  new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
);

const normalizeCity = (cityName) => cityName.trim();

const stripCountrySuffix = (cityName) => (
  cityName.replace(/,\s*[A-Z]{2}$/i, '').trim()
);

const uniqueCities = (cities) => (
  [...new Map(cities.filter(Boolean).map((cityName) => [cityName.toLowerCase(), cityName])).values()]
);

const getFriendlyError = (error) => (
  error.message === 'Failed to fetch'
    ? 'Unable to reach the live weather service. Please check your connection and try again.'
    : error.message || 'Unknown error'
);

function App() {
  const [theme, setTheme] = useState('light');
  const [city, setCity] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [favoriteCities, setFavoriteCities] = useState([]);
  const [showForecast, setShowForecast] = useState(false);
  const [usingCurrentLocation, setUsingCurrentLocation] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
      return;
    }

    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.body.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteCities');
    if (savedFavorites) {
      const cleanedFavorites = uniqueCities(JSON.parse(savedFavorites).map(stripCountrySuffix));
      setFavoriteCities(cleanedFavorites);
    }

    const savedSearches = localStorage.getItem('recentSearches');
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches).map((search) => ({
        ...search,
        city: stripCountrySuffix(search.city)
      })).filter((search) => search.city));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
  }, [recentSearches]);

  useEffect(() => {
    localStorage.setItem('favoriteCities', JSON.stringify(favoriteCities));
  }, [favoriteCities]);

  const saveRecentSearch = (cityName) => {
    const cleanedCity = stripCountrySuffix(normalizeCity(cityName));
    if (!cleanedCity) return;

    setRecentSearches((currentSearches) => {
      const withoutDuplicate = currentSearches.filter(
        (item) => item.city.toLowerCase() !== cleanedCity.toLowerCase()
      );

      return [
        { city: cleanedCity, searchedAt: formatSearchTime() },
        ...withoutDuplicate
      ].slice(0, 5);
    });
  };

  const fetchWeatherData = async (cityName) => {
    const cleanedCity = stripCountrySuffix(normalizeCity(cityName));

    if (!cleanedCity) {
      setError('Please enter a city name');
      return;
    }

    setLoading(true);
    setError('');
    setWeatherData(null);
    setForecastData(null);
    setShowForecast(false);
    setUsingCurrentLocation(false);

    try {
      const weatherResult = await getWeather(cleanedCity);
      if (!weatherResult) throw new Error('Failed to fetch weather data');

      setWeatherData(weatherResult);
      setCity(weatherResult.city || cleanedCity);
      saveRecentSearch(weatherResult.city || cleanedCity);

      const forecastResult = await getForecast(cleanedCity);
      if (forecastResult) setForecastData(forecastResult);
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentLocationWeather = () => {
    if (!navigator.geolocation) {
      setError('Current location is not supported in this browser');
      return;
    }

    setLoading(true);
    setError('');
    setWeatherData(null);
    setForecastData(null);
    setShowForecast(false);
    setUsingCurrentLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const weatherResult = await getWeatherByCoordinates(latitude, longitude);
          const forecastResult = await getForecastByCoordinates(latitude, longitude);

          setWeatherData(weatherResult);
          if (forecastResult) setForecastData(forecastResult);
          setCity(weatherResult.city);
          saveRecentSearch(weatherResult.city);
        } catch (err) {
          setError(getFriendlyError(err));
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError('Location access was denied');
        setLoading(false);
      }
    );
  };

  const handleSearch = (event) => {
    event.preventDefault();
    fetchWeatherData(city);
  };

  const handleCityClick = (cityName) => {
    const cleanedCity = stripCountrySuffix(cityName);
    setCity(cleanedCity);
    fetchWeatherData(cleanedCity);
  };

  const addToFavorites = () => {
    const favoriteCity = weatherData ? stripCountrySuffix(weatherData.city) : '';
    if (favoriteCity && !favoriteCities.includes(favoriteCity)) {
      setFavoriteCities([...favoriteCities, favoriteCity]);
    }
  };

  const removeFromFavorites = (cityToRemove) => {
    setFavoriteCities(favoriteCities.filter(cityName => cityName !== cityToRemove));
  };

  const removeFromRecentSearches = (cityToRemove) => {
    setRecentSearches(recentSearches.filter(item => item.city !== cityToRemove));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const isFavorite = weatherData && favoriteCities.includes(stripCountrySuffix(weatherData.city));

  return (
    <div className={`App theme-${theme}`}>
      <div className="container">
        <div className="header-row">
          <h1>Weather Dashboard</h1>
          <div className="header-actions" aria-label="Quick actions">
            {loading ? (
              <button type="button" className="icon-button loading-action" aria-label="Loading" disabled>
                <span className="hourglass" aria-hidden="true">⏳</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={fetchCurrentLocationWeather}
                  className="icon-button location-button"
                  aria-label="Use current location"
                  title="Use my location"
                >
                  📍
                </button>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="icon-button theme-button"
                  aria-label="Toggle theme"
                  title="Toggle theme"
                >
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFavorites(!showFavorites)}
                  className={`icon-button favorites-button ${showFavorites ? 'active' : ''}`}
                  aria-label={showFavorites ? 'Hide favorites' : 'Show favorites'}
                  title={showFavorites ? 'Hide favorites' : 'Show favorites'}
                  aria-pressed={showFavorites}
                >
                  ⭐
                </button>
              </>
            )}
          </div>
        </div>

        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Enter city name..."
            className="search-input"
          />
          <button type="submit" disabled={loading} className="search-button">
            Search
          </button>
        </form>

        {recentSearches.length > 0 && (
          <div className="history-section">
            <button
              type="button"
              className="section-toggle"
              onClick={() => setShowRecentSearches(!showRecentSearches)}
            >
              {showRecentSearches ? '◄' : '►'} Recent Searches
            </button>
            {showRecentSearches && (
              <>
                <div className="chip-list">
                  {recentSearches.map((search) => (
                    <div key={search.city} className="city-chip">
                      <button
                        type="button"
                        onClick={() => handleCityClick(search.city)}
                        className="chip-main"
                      >
                        <span>{search.city}</span>
                        <small>{search.searchedAt}</small>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromRecentSearches(search.city)}
                        className="chip-remove"
                        aria-label={`Remove ${search.city} from recent searches`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={clearRecentSearches} className="clear-history">
                  Clear History
                </button>
              </>
            )}
          </div>
        )}

        {showFavorites && favoriteCities.length > 0 && (
          <div className="favorites-section">
            <h3>Favorite Cities</h3>
            <div className="favorites-list">
              {favoriteCities.map((favoriteCity) => (
                <div key={favoriteCity} className="favorite-item">
                  <button
                    type="button"
                    onClick={() => handleCityClick(favoriteCity)}
                    className={`favorite-button ${stripCountrySuffix(weatherData?.city || '') === favoriteCity ? 'active' : ''}`}
                  >
                    {favoriteCity}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromFavorites(favoriteCity)}
                    className="remove-favorite"
                    aria-label={`Remove ${favoriteCity} from favorites`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {showFavorites && favoriteCities.length === 0 && (
          <div className="favorites-section empty-state">
            <h3>Favorite Cities</h3>
            <p>No favorite cities yet.</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {weatherData && (
          <div className="weather-card">
            <div className="weather-header">
              <h2>{usingCurrentLocation ? `Current Location: ${weatherData.city}` : weatherData.city}</h2>
              <button
                type="button"
                onClick={addToFavorites}
                disabled={isFavorite}
                className="add-favorite-button"
                title={isFavorite ? 'Favorited' : 'Add to Favorites'}
              >
                {isFavorite ? '★ Favorited' : '☆ Add to Favorites'}
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

            {forecastData && (
              <button
                type="button"
                onClick={() => setShowForecast(!showForecast)}
                className="forecast-toggle"
              >
                {showForecast ? 'Hide Forecast' : 'Show 5-Day Forecast'}
              </button>
            )}

            {weatherData.airQuality && (
              <div className="air-quality-panel">
                <h3>Air Quality</h3>
                <div className="air-quality-content">
                  <span className={`aqi-badge ${weatherData.airQuality.index > 100 ? 'warning' : ''}`}>
                    {weatherData.airQuality.index}
                  </span>
                  <span className="aqi-label">{weatherData.airQuality.label}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {showForecast && forecastData && (
          <div className="forecast-section">
            <h3>5-Day Forecast</h3>
            <div className="forecast-list">
              {forecastData.forecasts.map((forecast) => (
                <div key={forecast.date} className="forecast-item">
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
