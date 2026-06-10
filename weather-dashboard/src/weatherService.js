const WEATHER_CODE_MAP = {
  0: ['Clear', 'Clear sky', '01d'],
  1: ['Clear', 'Mainly clear', '02d'],
  2: ['Clouds', 'Partly cloudy', '03d'],
  3: ['Clouds', 'Overcast', '04d'],
  45: ['Fog', 'Fog', '50d'],
  48: ['Fog', 'Depositing rime fog', '50d'],
  51: ['Drizzle', 'Light drizzle', '09d'],
  53: ['Drizzle', 'Moderate drizzle', '09d'],
  55: ['Drizzle', 'Dense drizzle', '09d'],
  61: ['Rain', 'Slight rain', '10d'],
  63: ['Rain', 'Moderate rain', '10d'],
  65: ['Rain', 'Heavy rain', '10d'],
  71: ['Snow', 'Slight snow', '13d'],
  73: ['Snow', 'Moderate snow', '13d'],
  75: ['Snow', 'Heavy snow', '13d'],
  80: ['Rain', 'Slight rain showers', '09d'],
  81: ['Rain', 'Moderate rain showers', '09d'],
  82: ['Rain', 'Violent rain showers', '09d'],
  95: ['Thunderstorm', 'Thunderstorm', '11d'],
  96: ['Thunderstorm', 'Thunderstorm with hail', '11d'],
  99: ['Thunderstorm', 'Thunderstorm with heavy hail', '11d']
};

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function formatLocationName(city, country) {
  return city || country || 'Current Location';
}

function getWeatherDetails(code) {
  const [condition, description, icon] = WEATHER_CODE_MAP[code] || ['Clouds', 'Weather data unavailable', '03d'];
  return {
    condition,
    description,
    iconUrl: `https://openweathermap.org/img/wn/${icon}@2x.png`
  };
}

function airQualityLabel(index) {
  if (index <= 50) return 'Good';
  if (index <= 100) return 'Moderate';
  if (index <= 150) return 'Unhealthy for Sensitive Groups';
  if (index <= 200) return 'Unhealthy';
  if (index <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

function pm25ToAqi(pm25 = 0) {
  const ranges = [
    { cLow: 0, cHigh: 12, iLow: 0, iHigh: 50 },
    { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
    { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
    { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
    { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500 }
  ];

  const range = ranges.find(({ cLow, cHigh }) => pm25 >= cLow && pm25 <= cHigh) || ranges[ranges.length - 1];
  return Math.round(((range.iHigh - range.iLow) / (range.cHigh - range.cLow)) * (pm25 - range.cLow) + range.iLow);
}

async function getCityCoordinates(city) {
  if (!city || !city.trim()) throw new Error('Please enter a city name');

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city.trim())}&count=1&language=en&format=json`;
  const data = await fetchJson(url);
  const result = data.results?.[0];

  if (!result) {
    throw new Error(`No city found for "${city}"`);
  }

  return {
    latitude: result.latitude,
    longitude: result.longitude,
    name: formatLocationName(result.name, result.country_code)
  };
}

async function getLocationNameByCoordinates(latitude, longitude) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const data = await fetchJson(url);
    return data.city || data.locality || data.principalSubdivision || data.countryName || 'Current Location';
  } catch {
    return 'Current Location';
  }
}

async function getAirQuality(latitude, longitude) {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&hourly=pm2_5&forecast_days=1`;
    const data = await fetchJson(url);
    const values = data.hourly?.pm2_5 || [];
    const pm25 = [...values].reverse().find((value) => typeof value === 'number');

    if (pm25 == null) return null;

    const index = pm25ToAqi(pm25);
    return {
      index,
      label: airQualityLabel(index)
    };
  } catch {
    return null;
  }
}

async function getWeatherAtCoordinates(latitude, longitude, cityName) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max&timezone=auto&forecast_days=5`;
  const data = await fetchJson(url);
  const details = getWeatherDetails(data.current?.weather_code);
  const airQuality = await getAirQuality(latitude, longitude);

  return {
    weather: {
      city: cityName,
      temperature: Math.round(data.current?.temperature_2m ?? 0),
      ...details,
      airQuality
    },
    forecast: {
      forecasts: (data.daily?.time || []).map((date, index) => {
        const forecastDetails = getWeatherDetails(data.daily.weather_code?.[index]);
        return {
          date,
          temperature: Math.round(data.daily.temperature_2m_max?.[index] ?? 0),
          condition: forecastDetails.condition,
          iconUrl: forecastDetails.iconUrl
        };
      })
    }
  };
}

export async function getWeather(city) {
  const location = await getCityCoordinates(city);
  const { weather } = await getWeatherAtCoordinates(location.latitude, location.longitude, location.name);
  return weather;
}

export async function getWeatherByCoordinates(latitude, longitude) {
  if (latitude == null || longitude == null) {
    throw new Error('Unable to determine current location');
  }

  const cityName = await getLocationNameByCoordinates(latitude, longitude);
  const { weather } = await getWeatherAtCoordinates(latitude, longitude, cityName);
  return weather;
}

export async function getForecast(city) {
  const location = await getCityCoordinates(city);
  const { forecast } = await getWeatherAtCoordinates(location.latitude, location.longitude, location.name);
  return forecast;
}

export async function getForecastByCoordinates(latitude, longitude) {
  if (latitude == null || longitude == null) return null;

  const { forecast } = await getWeatherAtCoordinates(latitude, longitude, 'Current Location');
  return forecast;
}
