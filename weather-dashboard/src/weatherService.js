import { OPENWEATHERMAP_API_KEY } from './config';

const mockWeather = (city) => ({
  city,
  temperature: 21,
  condition: 'Clouds',
  description: 'Partly cloudy',
  iconUrl: 'https://openweathermap.org/img/wn/03d@2x.png'
});

const mockForecast = (city) => ({
  forecasts: [
    { date: new Date().toISOString(), temperature: 22, condition: 'Clouds', iconUrl: 'https://openweathermap.org/img/wn/03d@2x.png' },
    { date: new Date(Date.now() + 86400000).toISOString(), temperature: 24, condition: 'Clear', iconUrl: 'https://openweathermap.org/img/wn/01d@2x.png' },
    { date: new Date(Date.now() + 2 * 86400000).toISOString(), temperature: 19, condition: 'Rain', iconUrl: 'https://openweathermap.org/img/wn/09d@2x.png' },
    { date: new Date(Date.now() + 3 * 86400000).toISOString(), temperature: 20, condition: 'Clouds', iconUrl: 'https://openweathermap.org/img/wn/03d@2x.png' },
    { date: new Date(Date.now() + 4 * 86400000).toISOString(), temperature: 23, condition: 'Clear', iconUrl: 'https://openweathermap.org/img/wn/01d@2x.png' },
  ]
});

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getWeather(city) {
  if (!city || !city.trim()) throw new Error('Please enter a city name');

  if (!OPENWEATHERMAP_API_KEY) {
    // Return mocked data
    return mockWeather(city);
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${OPENWEATHERMAP_API_KEY}`;
  const data = await fetchJson(url);

  return {
    city: `${data.name}, ${data.sys?.country || ''}`.trim(),
    temperature: Math.round(data.main.temp),
    condition: data.weather?.[0]?.main || '',
    description: data.weather?.[0]?.description || '',
    iconUrl: data.weather?.[0]?.icon ? `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png` : ''
  };
}

export async function getForecast(city) {
  if (!city || !city.trim()) return null;

  if (!OPENWEATHERMAP_API_KEY) {
    return mockForecast(city);
  }

  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${OPENWEATHERMAP_API_KEY}`;
  const data = await fetchJson(url);

  // The 5-day forecast endpoint returns 3-hour buckets. We'll pick one forecast per day (around 12:00) or fall back.
  const byDay = {};
  (data.list || []).forEach(item => {
    const date = new Date(item.dt * 1000);
    const dayKey = date.toISOString().slice(0,10);
    const hour = date.getUTCHours();
    if (!byDay[dayKey] || Math.abs(hour - 12) < Math.abs(new Date(byDay[dayKey].dt * 1000).getUTCHours() - 12)) {
      byDay[dayKey] = item;
    }
  });


  const forecasts = Object.keys(byDay).slice(0,5).map(key => {
    const item = byDay[key];
    return {
      date: new Date(item.dt * 1000).toISOString(),
      temperature: Math.round(item.main.temp),
      condition: item.weather?.[0]?.main || '',
      iconUrl: item.weather?.[0]?.icon ? `https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png` : ''
    };
  });

  return { forecasts };
}
