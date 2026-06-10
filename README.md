# Weather Dashboard

A lightweight React-based weather dashboard that shows current weather and a 5-day forecast for searched cities. This repository contains the frontend app located in the `weather-dashboard` folder.

## Features
- Current weather (temperature, conditions, icons)
- 5-day forecast
- City search
- Save favorite cities and view recent searches
- Light / Dark theme toggle

## Quick start
Prerequisite: Node.js installed.

```bash
cd weather-dashboard
npm install
npm start
```

The app runs at http://localhost:3000 by default.

To use live OpenWeatherMap data, add your API key to `weather-dashboard/src/config.js`:

```js
export const OPENWEATHERMAP_API_KEY = 'YOUR_API_KEY_HERE';
```

## Contributing
- Fork, create a branch, make changes, and open a pull request.

## Acknowledgments
- OpenWeatherMap for weather data



