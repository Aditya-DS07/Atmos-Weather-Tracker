// Atmos Weather Tracker
// Uses Open-Meteo API (free, no API key needed)

const GEO_URL     = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

// DOM elements
var cityInput       = document.getElementById("cityInput");
var searchBtn       = document.getElementById("searchBtn");
var weatherBox      = document.getElementById("weatherBox");
var historyBox      = document.getElementById("historyBox");
var consoleBox      = document.getElementById("consoleBox");
var clearHistBtn    = document.getElementById("clearHistBtn");
var clearConsoleBtn = document.getElementById("clearConsoleBtn");


// ─── CONSOLE LOGGER ─────────────────────────────────────────

function cLog(type, message) {
  var div = document.createElement("div");
  div.className = "log " + type;
  div.innerHTML = '<span class="badge">' + type.toUpperCase() + '</span> ' + message;
  consoleBox.appendChild(div);
  consoleBox.scrollTop = consoleBox.scrollHeight;
}


// ─── GEOCODE CITY NAME → COORDINATES ────────────────────────

async function geocodeCity(city) {
  cLog("async", 'Geocoding <span class="hl">"' + city + '"</span>...');

  var url = GEO_URL + "?name=" + encodeURIComponent(city) + "&count=1&language=en&format=json";
  var response = await fetch(url);
  var data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error("City not found");
  }

  var place = data.results[0];
  cLog("promise", 'Geocode resolved → <span class="hl">' + place.name + '</span>, ' + place.country);
  return place;
}


// ─── FETCH WEATHER DATA ─────────────────────────────────────

async function getWeather(lat, lon) {
  cLog("async", 'Fetching weather for lat: <span class="hl">' + lat.toFixed(2) + '</span>, lon: <span class="hl">' + lon.toFixed(2) + '</span>...');

  var url = WEATHER_URL +
    "?latitude=" + lat +
    "&longitude=" + lon +
    "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,visibility,is_day" +
    "&wind_speed_unit=kmh&timezone=auto";

  var response = await fetch(url);
  var data = await response.json();

  cLog("promise", '.then() resolved — HTTP <span class="hl">' + response.status + "</span>");
  return data;
}


// ─── MAP WEATHER CODE TO EMOJI ──────────────────────────────

function getEmoji(code, isDay) {
  if (code === 0)  return isDay ? "☀️" : "🌙";
  if (code <= 3)   return "⛅";
  if (code <= 49)  return "🌫️";
  if (code <= 69)  return "🌧️";
  if (code <= 79)  return "❄️";
  if (code <= 99)  return "⛈️";
  return "🌡️";
}

function getCondition(code) {
  if (code === 0)  return "Clear Sky";
  if (code <= 3)   return "Partly Cloudy";
  if (code <= 49)  return "Fog";
  if (code <= 55)  return "Drizzle";
  if (code <= 69)  return "Rain";
  if (code <= 79)  return "Snow";
  if (code <= 99)  return "Thunderstorm";
  return "Unknown";
}


// ─── RENDER WEATHER ─────────────────────────────────────────

function renderWeather(current, place, timezone) {
  var temp = Math.round(current.temperature_2m);
  var feelsLike = Math.round(current.apparent_temperature);
  var humidity = current.relative_humidity_2m;
  var wind = current.wind_speed_10m;
  var vis = current.visibility;
  var code = current.weather_code;
  var isDay = current.is_day;

  var emoji = getEmoji(code, isDay);
  var condition = getCondition(code);

  // Get the location's local time
  var now = new Date();
  var tzOptions = timezone ? { timeZone: timezone } : {};
  var dateStr = now.toLocaleDateString("en-US", Object.assign({ weekday: "short", month: "short", day: "numeric" }, tzOptions));
  var timeStr = now.toLocaleTimeString("en-US", Object.assign({ hour: "2-digit", minute: "2-digit" }, tzOptions));

  weatherBox.innerHTML =
    '<div class="weather-banner">' +
      '<span class="banner-emoji">' + emoji + '</span>' +
      '<div class="banner-info">' +
        '<div class="banner-temp">' + temp + '°C</div>' +
        '<div class="banner-condition">' + condition + '</div>' +
        '<div class="banner-location">' + place.name + ', ' + place.country + '</div>' +
        '<div class="banner-time">' + dateStr + '  •  ' + timeStr + '</div>' +
      '</div>' +
    '</div>' +

    '<div class="weather-item"><label>📍 City</label><span>' + place.name + ', ' + place.country + '</span></div>' +
    '<div class="weather-item"><label>🌡️ Temperature</label><span>' + temp + ' °C</span></div>' +
    '<div class="weather-item"><label>🤒 Feels Like</label><span>' + feelsLike + ' °C</span></div>' +
    '<div class="weather-item"><label>🌤️ Weather</label><span>' + condition + '</span></div>' +
    '<div class="weather-item"><label>💧 Humidity</label><span class="humidity-wrap">' + humidity + '% <span class="humidity-bar"><span class="humidity-fill" style="width:' + humidity + '%"></span></span></span></div>' +
    '<div class="weather-item"><label>💨 Wind Speed</label><span>' + wind + ' km/h</span></div>' +
    '<div class="weather-item"><label>👁️ Visibility</label><span>' + (vis / 1000).toFixed(1) + ' km</span></div>' +
    '<div class="weather-item"><label>📅 Local Time</label><span>' + dateStr + ' • ' + timeStr + '</span></div>';

  cLog("sync", "DOM updated — weather rendered.");
}


// ─── SEARCH HISTORY (localStorage) ──────────────────────────

function saveHistory(city) {
  var history = JSON.parse(localStorage.getItem("weatherHistory")) || [];

  // Remove duplicate
  history = history.filter(function(c) {
    return c.toLowerCase() !== city.toLowerCase();
  });

  // Add to front, keep max 8
  history.unshift(city);
  if (history.length > 8) history = history.slice(0, 8);

  localStorage.setItem("weatherHistory", JSON.stringify(history));
  cLog("info", 'Saved <span class="hl">"' + city + '"</span> to localStorage.');
  showHistory();
}

function showHistory() {
  var history = JSON.parse(localStorage.getItem("weatherHistory")) || [];
  historyBox.innerHTML = "";

  if (history.length === 0) {
    historyBox.innerHTML = '<span class="no-history">No searches yet.</span>';
    return;
  }

  history.forEach(function(city) {
    var btn = document.createElement("button");
    btn.textContent = city;
    btn.addEventListener("click", function() {
      cLog("sync", '[EVENT] History chip clicked → <span class="hl">"' + city + '"</span>');
      cityInput.value = city;
      search(city);
    });
    historyBox.appendChild(btn);
  });
}

function clearHistory() {
  localStorage.removeItem("weatherHistory");
  cLog("info", "History cleared.");
  showHistory();
}


// ─── MAIN SEARCH (2-step: geocode → weather) ────────────────

async function search(city) {
  cLog("sync", '[CALL STACK] search("' + city + '") — synchronous start.');

  weatherBox.innerHTML = '<div class="loading-text">🔍 Fetching weather...</div>';

  // Demonstrate microtask vs macrotask
  Promise.resolve().then(function() {
    cLog("promise", "[MICROTASK] Promise.resolve().then() — runs before setTimeout.");
  });

  setTimeout(function() {
    cLog("callback", "[MACROTASK] setTimeout(0) — runs after microtasks.");
  }, 0);

  cLog("sync", "[CALL STACK] Sync code continues after scheduling tasks.");

  try {
    // Step 1: Geocode city name to coordinates
    var place = await geocodeCity(city);

    // Step 2: Fetch weather using coordinates
    var data = await getWeather(place.latitude, place.longitude);
    cLog("success", 'Weather data received for <span class="hl">' + place.name + '</span>.');

    renderWeather(data.current, place, data.timezone);
    saveHistory(place.name);

  } catch (error) {
    cLog("error", "[CATCH] " + error.message);
    weatherBox.innerHTML = '<div class="error-text">⚠️ ' + error.message + '</div>';

  } finally {
    cLog("info", "[FINALLY] Search complete — always runs.");
  }
}


// ─── EVENT LISTENERS ────────────────────────────────────────

searchBtn.addEventListener("click", function() {
  var city = cityInput.value.trim();
  if (city) {
    cLog("sync", "[EVENT] 'click' on Search button.");
    search(city);
  }
});

cityInput.addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    var city = cityInput.value.trim();
    if (city) {
      cLog("sync", "[EVENT] Enter key pressed.");
      search(city);
    }
  }
});

document.querySelectorAll(".tip-chip").forEach(function(chip) {
  chip.addEventListener("click", function() {
    var city = chip.dataset.city;
    cityInput.value = city;
    cLog("sync", '[TIP] Clicked → <span class="hl">"' + city + '"</span>');
    search(city);
  });
});

clearHistBtn.addEventListener("click", function() {
  cLog("sync", "[EVENT] Clear History clicked.");
  clearHistory();
});

clearConsoleBtn.addEventListener("click", function() {
  consoleBox.innerHTML = "";
  cLog("sync", "Console cleared.");
});


// ─── INIT ───────────────────────────────────────────────────

cLog("sync", "[INIT] Script loaded — DOM ready.");
cLog("sync", "[INIT] Event listeners registered.");
cLog("info", "[INIT] Open-Meteo API ready — no API key needed.");
cLog("async", "[EVENT LOOP] Call stack empty — awaiting input...");
showHistory();
