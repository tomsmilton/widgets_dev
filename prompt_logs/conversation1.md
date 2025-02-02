# Centroid app
This is a ChatGPT log. Model: O1

---

## User 
i want to make a little html app that has a map (e.g open street map) and i click on different points adding pins in the map which are where my different friends live and it then shows me the centroid of all of the houses. I should be able to label the names of the houses and then all save the houses and centroid to a CSV. I should also be able to load the csv back in 

---

## O1

Below is a simple example of an HTML + JavaScript Leaflet app that does the following:

Displays an OpenStreetMap-based map.
When you click on the map, it prompts you for a label (friend’s name), places a pin there, and saves the pin data (latitude, longitude, label) in memory.
Calculates and displays the centroid (average lat/long) whenever you add a new pin.
Allows you to export all pins (including centroid) to a CSV file.
Allows you to load an existing CSV file to restore all pins (including centroid).
Important: For this to work locally, you may need to run a local web server (e.g., using python -m http.server) rather than just opening the file in the browser. Some browsers block certain operations (like file input reading) when running from the local file system.

### Complete Example Code
Create a file named index.html with the following contents:
```html

<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Friends' Houses with Centroid</title>
  <!-- Leaflet CSS -->
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    integrity="sha256-DuoPlKQvHlZ6k3DUZg0LzflAsH2jZa6hB0oPBbc4Nb0="
    crossorigin=""
  />
  <!-- Leaflet JS -->
  <script
    src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    integrity="sha256-Q0PBEp8bdi0N3XD6ruaVeOF9pld2XRZZhYMe0JG3Z0g="
    crossorigin=""
  ></script>
  <style>
    html, body {
      margin: 0; 
      padding: 0; 
      height: 100%; 
    }
    #map {
      width: 100%;
      height: 80%;
    }
    #controls {
      padding: 10px;
    }
  </style>
</head>

<body>
  <div id="map"></div>

  <div id="controls">
    <button id="exportBtn">Export to CSV</button>
    <input type="file" id="fileInput" accept=".csv" />
  </div>

  <script>
    // -----------------------------
    // GLOBAL VARIABLES
    // -----------------------------
    let map;
    let markers = [];  // Will hold objects of the form: { lat, lng, label, marker }
    let centroidMarker = null;

    // -----------------------------
    // INITIALIZE MAP
    // -----------------------------
    function initMap() {
      map = L.map('map').setView([40, -100], 4); // Center on the US by default

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // When user clicks on the map, prompt for a name and place a marker
      map.on('click', onMapClick);
    }

    // -----------------------------
    // CLICK HANDLER
    // -----------------------------
    function onMapClick(e) {
      const label = prompt("Enter your friend's name (label for this pin):");
      if (label === null || label.trim() === '') {
        return; // Do nothing if the user cancelled or typed empty
      }

      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      // Create marker
      const marker = L.marker([lat, lng]).addTo(map);
      marker.bindPopup(label);

      // Add to our array of markers
      markers.push({ lat, lng, label, marker });

      // Recompute centroid and show it
      updateCentroid();
    }

    // -----------------------------
    // COMPUTE & UPDATE CENTROID
    // -----------------------------
    function updateCentroid() {
      if (markers.length === 0) {
        removeCentroid();
        return;
      }

      const sumLat = markers.reduce((acc, m) => acc + m.lat, 0);
      const sumLng = markers.reduce((acc, m) => acc + m.lng, 0);

      const avgLat = sumLat / markers.length;
      const avgLng = sumLng / markers.length;

      // If there's already a centroid marker on the map, remove it
      removeCentroid();

      // Add new centroid marker
      centroidMarker = L.marker([avgLat, avgLng], {
        icon: L.divIcon({
          className: 'centroid-icon',
          html: '<div style="background: red; width: 16px; height: 16px; border-radius: 50%;"></div>'
        })
      }).addTo(map);
      centroidMarker.bindPopup(`Centroid of ${markers.length} points`);

      // Optionally, you can pan or zoom to the centroid (comment out if undesired):
      // map.panTo([avgLat, avgLng]);
    }

    // -----------------------------
    // REMOVE CENTROID MARKER
    // -----------------------------
    function removeCentroid() {
      if (centroidMarker) {
        centroidMarker.remove();
        centroidMarker = null;
      }
    }

    // -----------------------------
    // EXPORT TO CSV
    // -----------------------------
    function exportToCSV() {
      if (markers.length === 0) {
        alert("No markers to export!");
        return;
      }

      // We'll include a header row: lat, lng, label
      // Also, let's include "CENTROID" as a special row
      // so that when we load, we know where the centroid marker is.
      // But it's optional; you could re-calculate the centroid upon load.

      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "lat,lng,label\n";

      // Add each marker
      markers.forEach((m) => {
        csvContent += `${m.lat},${m.lng},${m.label}\n`;
      });

      // Compute centroid again and add it as a special row
      if (centroidMarker) {
        const sumLat = markers.reduce((acc, m) => acc + m.lat, 0);
        const sumLng = markers.reduce((acc, m) => acc + m.lng, 0);
        const avgLat = sumLat / markers.length;
        const avgLng = sumLng / markers.length;
        csvContent += `${avgLat},${avgLng},CENTROID\n`;
      }

      // Create a link to download
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "friends_and_centroid.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // -----------------------------
    // LOAD FROM CSV
    // -----------------------------
    function loadFromCSV(file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const csvData = event.target.result;
        processCSVData(csvData);
      };
      reader.readAsText(file);
    }

    function processCSVData(csvData) {
      // Clear existing markers from map
      markers.forEach((m) => map.removeLayer(m.marker));
      markers = [];
      removeCentroid();

      const lines = csvData.split(/\r?\n/);

      // We assume the first line is a header: lat,lng,label
      // We'll skip it. If there's no header in your CSV, remove the .slice(1)
      const dataLines = lines.slice(1);

      dataLines.forEach((line) => {
        if (!line.trim()) return; // skip empty lines
        const [latStr, lngStr, label] = line.split(",");
        if (!latStr || !lngStr || !label) return; // skip malformed lines
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);

        // If it's the special "CENTROID" row, we could skip or handle differently
        if (label === "CENTROID") {
          // You could place the centroid marker if you want, or just ignore it
          // Here we do place a marker, but you could also choose to recalc instead
          centroidMarker = L.marker([lat, lng], {
            icon: L.divIcon({
              className: 'centroid-icon',
              html: '<div style="background: red; width: 16px; height: 16px; border-radius: 50%;"></div>'
            })
          }).addTo(map);
          centroidMarker.bindPopup("Centroid (loaded from CSV)");
        } else {
          // Regular house marker
          const marker = L.marker([lat, lng]).addTo(map);
          marker.bindPopup(label);
          markers.push({ lat, lng, label, marker });
        }
      });

      // If you prefer to recalc the centroid fresh from loaded data (instead
      // of using the CSV's stored centroid), you can call:
      // updateCentroid();
    }

    // -----------------------------
    // SETUP EVENT LISTENERS
    // -----------------------------
    window.onload = () => {
      initMap();

      // Export button
      document.getElementById('exportBtn').addEventListener('click', exportToCSV);

      // File input for loading CSV
      document.getElementById('fileInput').addEventListener('change', (evt) => {
        const file = evt.target.files[0];
        if (file) {
          loadFromCSV(file);
        }
      });
    };
  </script>
</body>
</html>

````
How it works
Map Initialization

Loads Leaflet from CDN.
Sets up an OpenStreetMap layer.
Centers the map on [40, -100] (roughly the US) with zoom level 4.
Click to Add Marker

On map.on('click', onMapClick), we prompt for a friend’s name.
Create a Leaflet marker at the clicked lat/long.
Store the marker data in markers.
Centroid Computation

After each new marker, we sum all latitudes, sum all longitudes, divide by the number of markers to get the average lat and average lng.
Remove the old centroid marker (if any), and then add a new centroid marker.
Export to CSV

We build a CSV string with a header line.
For each marker, we add a line with lat,lng,label.
We also add a line for the centroid if we want to store it explicitly.
Then force a download of that CSV.
Load from CSV

We read the CSV file using an ````<input type="file">```` and FileReader.
Skip the header line.
For each row, parse out lat, lng, and label.
If the label is "CENTROID", we create a centroid marker. Otherwise, a regular friend’s house marker.
Alternatively, you can ignore the stored centroid row and let the app re-calculate it from the loaded friend-house pins only.
This should get you started with a simple web app for placing markers, labeling them, storing them to CSV, and reloading them later—all while computing a centroid on the fly. Enjoy coding!

---

## User
it should load with a map view of openstreet map and not require me to load a csv - i should be able to start from fresh 

---

## O1

Below is an updated (but still fairly minimal) HTML + JavaScript example using Leaflet. It starts with a fresh (empty) map showing OpenStreetMap tiles, lets you click to place markers (with labels) for your friends’ houses, calculates the centroid of those markers, and provides buttons to export everything to a CSV file and load from a CSV file if desired. Importantly, it does not require a CSV when you first load it—you can start with an empty map right away.

Note: When running locally, some browsers don’t allow file reading/writing (for loading/saving CSV) from the local filesystem if you just open the file in the browser. You may need to run a local server (e.g. python -m http.server) and then navigate to http://localhost:8000/your-file.html in order for file loading to work.

### Example ````index.html````

```html

<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Friends' Houses with Centroid</title>
  <!-- Leaflet CSS -->
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    integrity="sha256-DuoPlKQvHlZ6k3DUZg0LzflAsH2jZa6hB0oPBbc4Nb0="
    crossorigin=""
  />
  <!-- Leaflet JS -->
  <script
    src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    integrity="sha256-Q0PBEp8bdi0N3XD6ruaVeOF9pld2XRZZhYMe0JG3Z0g="
    crossorigin=""
  ></script>
  <style>
    html, body {
      margin: 0; 
      padding: 0; 
      height: 100%; 
    }
    #map {
      width: 100%;
      height: 80%;
    }
    #controls {
      padding: 10px;
    }
  </style>
</head>

<body>
  <div id="map"></div>

  <div id="controls">
    <button id="exportBtn">Export to CSV</button>
    <input type="file" id="fileInput" accept=".csv" />
    <p>Add markers by clicking anywhere on the map. Then optionally export or load CSV.</p>
  </div>

  <script>
    // -----------------------------
    // GLOBAL VARIABLES
    // -----------------------------
    let map;
    let markers = [];  // Each element is an object: { lat, lng, label, marker }
    let centroidMarker = null;

    // -----------------------------
    // INITIALIZE MAP
    // -----------------------------
    function initMap() {
      // Create a Leaflet map centered on the US by default
      map = L.map('map').setView([40, -100], 4);

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);

      // On click, add a marker
      map.on('click', onMapClick);
    }

    // -----------------------------
    // CLICK HANDLER
    // -----------------------------
    function onMapClick(e) {
      const label = prompt("Enter your friend's name (label for this pin):");
      if (label === null || label.trim() === '') {
        return; // Do nothing if user canceled or left blank
      }

      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      // Create marker
      const marker = L.marker([lat, lng]).addTo(map);
      marker.bindPopup(label);

      // Add to our list of markers
      markers.push({ lat, lng, label, marker });

      // Update the centroid
      updateCentroid();
    }

    // -----------------------------
    // UPDATE CENTROID
    // -----------------------------
    function updateCentroid() {
      // If no markers, remove any existing centroid
      if (markers.length === 0) {
        removeCentroid();
        return;
      }

      // Calculate average lat & lng
      const sumLat = markers.reduce((acc, m) => acc + m.lat, 0);
      const sumLng = markers.reduce((acc, m) => acc + m.lng, 0);
      const avgLat = sumLat / markers.length;
      const avgLng = sumLng / markers.length;

      // Remove old centroid marker if exists
      removeCentroid();

      // Create new centroid marker (styled as a small red dot)
      centroidMarker = L.marker([avgLat, avgLng], {
        icon: L.divIcon({
          className: 'centroid-icon',
          html: '<div style="background: red; width: 16px; height: 16px; border-radius: 50%;"></div>'
        })
      }).addTo(map);

      centroidMarker.bindPopup(`Centroid of ${markers.length} points`);
    }

    // -----------------------------
    // REMOVE CENTROID MARKER
    // -----------------------------
    function removeCentroid() {
      if (centroidMarker) {
        centroidMarker.remove();
        centroidMarker = null;
      }
    }

    // -----------------------------
    // EXPORT TO CSV
    // -----------------------------
    function exportToCSV() {
      if (markers.length === 0) {
        alert("No markers to export!");
        return;
      }

      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "lat,lng,label\n"; // header row

      // Add each marker row
      markers.forEach(m => {
        csvContent += `${m.lat},${m.lng},${m.label}\n`;
      });

      // Include a "CENTROID" row so we can reload that too, if we like
      if (centroidMarker) {
        const sumLat = markers.reduce((acc, m) => acc + m.lat, 0);
        const sumLng = markers.reduce((acc, m) => acc + m.lng, 0);
        const avgLat = sumLat / markers.length;
        const avgLng = sumLng / markers.length;
        csvContent += `${avgLat},${avgLng},CENTROID\n`;
      }

      // Create a link to download
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "friends_and_centroid.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // -----------------------------
    // LOAD FROM CSV
    // -----------------------------
    function loadFromCSV(file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const csvData = event.target.result;
        processCSVData(csvData);
      };
      reader.readAsText(file);
    }

    function processCSVData(csvData) {
      // Clear existing markers from map
      markers.forEach(m => {
        map.removeLayer(m.marker);
      });
      markers = [];
      removeCentroid();

      const lines = csvData.split(/\r?\n/);

      // Assume first line is a header: lat,lng,label
      const dataLines = lines.slice(1);

      dataLines.forEach(line => {
        if (!line.trim()) return; // skip empty lines
        const [latStr, lngStr, label] = line.split(",");
        if (!latStr || !lngStr || !label) return; // skip malformed lines

        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);

        // If label is "CENTROID", treat it as the stored centroid
        if (label === "CENTROID") {
          // Put a centroid marker, or ignore it and recalc. Your choice.
          centroidMarker = L.marker([lat, lng], {
            icon: L.divIcon({
              className: 'centroid-icon',
              html: '<div style="background: red; width: 16px; height: 16px; border-radius: 50%;"></div>'
            })
          }).addTo(map);

          centroidMarker.bindPopup("Centroid (loaded from CSV)");

        } else {
          // Regular friend’s house marker
          const marker = L.marker([lat, lng]).addTo(map);
          marker.bindPopup(label);
          markers.push({ lat, lng, label, marker });
        }
      });

      // If you prefer to always recalc the centroid from the loaded markers:
      // updateCentroid();
    }

    // -----------------------------
    // SETUP EVENT LISTENERS
    // -----------------------------
    window.onload = () => {
      initMap();

      // Export button
      document.getElementById('exportBtn').addEventListener('click', exportToCSV);

      // File input for loading CSV
      document.getElementById('fileInput').addEventListener('change', (evt) => {
        const file = evt.target.files[0];
        if (file) {
          loadFromCSV(file);
        }
      });
    };
  </script>
</body>
</html>
 ````

 Key Points
Starts Fresh

The map immediately loads an OpenStreetMap view (centered on [40, -100], zoom level 4). No CSV is required at startup.
Add Pins by Clicking

Whenever you click on the map, a prompt asks for a label (your friend’s name), and then places a marker.
All marker info (lat, lng, label) is stored in the markers array.
Centroid Calculation

Each time you add a new marker, it recalculates the centroid (mean of all marker coordinates).
It places a “red dot” marker to show the centroid.
CSV Export

You can click Export to CSV to generate a file containing all friend-house markers plus an extra line for the centroid if it exists.
CSV Import

If you want to load markers from a CSV, choose a CSV file from the file input.
The code will parse it, create markers for all your friends’ houses, and optionally place a centroid if that was saved in the file.
This setup allows you to work with a blank map from the start, add as many pins as you want, and only use the CSV features if and when you wish.

---

## User

the map doesnt load - why? 

---

## O1

There are a few common reasons the map might not load when opening the index.html file directly from your file system (via file:///...). The most likely cause is that Leaflet (or the browser) is blocking requests to the map tiles when served from the local file system rather than an actual web server. Modern browsers often block certain cross-origin requests (including tile-loading) when you just open an HTML file locally.

How to fix it:
Serve the file via a local web server

The simplest approach is to open a terminal in the same folder as index.html and run:
bash
````python -m http.server 8000 ````

Then open http://localhost:8000/index.html in your browser. This way, the map tiles can be loaded properly.
Check your console/logs for errors

Open the browser’s developer console (e.g., in Chrome: Right-click → “Inspect” → “Console”) to see if there are errors about the map tiles or blocked requests.
If you see messages about “Blocked request from local file system” or “CORS error,” that confirms that local loading (file://) is being blocked.
Verify internet connection and Leaflet references

Make sure you have an active internet connection, because the code references the Leaflet and tile sources from CDNs (e.g., https://unpkg.com/leaflet/...).
Also check that you haven’t accidentally removed or misspelled the ```` <script> or <link> ```` tags for Leaflet.
By running your code on a local server instead of double-clicking the file, you’ll avoid browser security restrictions, and the OpenStreetMap tiles should load correctly.

--- 

## User 

console output:

--- 
## O1

From the error messages (“Failed to find a valid digest in the integrity attribute … The resource has been blocked.”), the issue is that your browser is blocking the Leaflet CSS and JS files because the Subresource Integrity (SRI) hash in your integrity attributes does not match the files being loaded. As soon as Leaflet is blocked, you’ll see L is not defined errors.

### Why it happens 

Why it happens
An integrity attribute (SRI) basically says: “I expect this file to have a specific SHA-256 (or SHA-384, etc.) hash.” If the file’s hash doesn’t match exactly, the browser refuses to load it.
If you copy-pasted the code from a source that had older/different SRI hashes, but you are fetching a different version from unpkg, you’ll get a mismatch.

### How to fix it

Option 1: Remove the integrity and crossorigin attributes so your ```` <link> ```` and ```` <script> ```` tags look like this (simplest fix):


```html
<link
  rel="stylesheet"
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
/>
<script
  src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
></script>
````

This bypasses SRI checks and should allow the files to load.

Option 2: Use the correct SRI hashes if you want Subresource Integrity:

Go to Leaflet’s official download page or unpkg for Leaflet 1.9.4.
Copy the exact ```` <link> ```` and ```` <script> ```` tags with the matching integrity and crossorigin attributes from there.
Make sure the version in the URL matches the integrity hash.
For example, as of Leaflet 1.9.4, the official docs might provide something like (just an example—always check the official source for current hashes):

```html
<link
  rel="stylesheet"
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  integrity="sha256-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx="
  crossorigin=""
/>
<script
  src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  integrity="sha256-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx="
  crossorigin=""
></script>
````

If your integrity attribute does not match exactly, the files will be blocked.

### Also serve over HTTP (not file://)

Finally, if you are just double-clicking the .html file (using the file:// protocol), you may run into other browser security restrictions for local files. It’s best to serve it from a local web server. For example:

````
cd /path/to/your/index.html
python -m http.server 8000
````
Then open http://localhost:8000/index.html in your browser. This avoids most local-file security issues.
Once you remove or correct the SRI attributes (and optionally serve the file via a local server), Leaflet will load properly, and you’ll no longer get L is not defined errors.

---

## User

rewrite the html to make it work

---

## O1


Below is a working example that removes the integrity and crossorigin attributes from the Leaflet ```` <link> ```` and  ```` <script> ```` tags so that Leaflet will load without being blocked. You can save this as index.html and open it via a local web server (recommended) to avoid browser security restrictions.

````
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Friends' Houses with Centroid</title>
  
  <!-- Leaflet CSS (no integrity/crossorigin) -->
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />

  <!-- Leaflet JS (no integrity/crossorigin) -->
  <script
    src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  ></script>
  
  <style>
    html, body {
      margin: 0; 
      padding: 0; 
      height: 100%; 
    }
    #map {
      width: 100%;
      height: 80%;
    }
    #controls {
      padding: 10px;
    }
  </style>
</head>

<body>
  <div id="map"></div>

  <div id="controls">
    <button id="exportBtn">Export to CSV</button>
    <input type="file" id="fileInput" accept=".csv" />
    <p>Add markers by clicking anywhere on the map. Then optionally export or load CSV.</p>
  </div>

  <script>
    // -----------------------------
    // GLOBAL VARIABLES
    // -----------------------------
    let map;
    let markers = [];  // Each element: { lat, lng, label, marker }
    let centroidMarker = null;

    // -----------------------------
    // INITIALIZE MAP
    // -----------------------------
    function initMap() {
      // Create a Leaflet map centered on the US
      map = L.map('map').setView([40, -100], 4);

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // On click, add a marker
      map.on('click', onMapClick);
    }

    // -----------------------------
    // CLICK HANDLER
    // -----------------------------
    function onMapClick(e) {
      const label = prompt("Enter your friend's name (label for this pin):");
      if (label === null || label.trim() === '') {
        return;
      }

      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      // Create marker
      const marker = L.marker([lat, lng]).addTo(map);
      marker.bindPopup(label);

      // Add to our list of markers
      markers.push({ lat, lng, label, marker });

      // Update the centroid
      updateCentroid();
    }

    // -----------------------------
    // UPDATE CENTROID
    // -----------------------------
    function updateCentroid() {
      if (markers.length === 0) {
        removeCentroid();
        return;
      }

      const sumLat = markers.reduce((acc, m) => acc + m.lat, 0);
      const sumLng = markers.reduce((acc, m) => acc + m.lng, 0);
      const avgLat = sumLat / markers.length;
      const avgLng = sumLng / markers.length;

      removeCentroid();  // remove old centroid if any

      centroidMarker = L.marker([avgLat, avgLng], {
        icon: L.divIcon({
          className: 'centroid-icon',
          html: '<div style="background: red; width: 16px; height: 16px; border-radius: 50%;"></div>'
        })
      }).addTo(map);
      centroidMarker.bindPopup(`Centroid of ${markers.length} points`);
    }

    // -----------------------------
    // REMOVE CENTROID MARKER
    // -----------------------------
    function removeCentroid() {
      if (centroidMarker) {
        centroidMarker.remove();
        centroidMarker = null;
      }
    }

    // -----------------------------
    // EXPORT TO CSV
    // -----------------------------
    function exportToCSV() {
      if (markers.length === 0) {
        alert("No markers to export!");
        return;
      }

      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "lat,lng,label\n"; // header row

      // Add each marker row
      markers.forEach(m => {
        csvContent += `${m.lat},${m.lng},${m.label}\n`;
      });

      // Include a CENTROID row so we can reload it if we like
      if (centroidMarker) {
        const sumLat = markers.reduce((acc, m) => acc + m.lat, 0);
        const sumLng = markers.reduce((acc, m) => acc + m.lng, 0);
        const avgLat = sumLat / markers.length;
        const avgLng = sumLng / markers.length;
        csvContent += `${avgLat},${avgLng},CENTROID\n`;
      }

      // Create a download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "friends_and_centroid.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // -----------------------------
    // LOAD FROM CSV
    // -----------------------------
    function loadFromCSV(file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const csvData = event.target.result;
        processCSVData(csvData);
      };
      reader.readAsText(file);
    }

    function processCSVData(csvData) {
      // Clear existing markers
      markers.forEach(m => map.removeLayer(m.marker));
      markers = [];
      removeCentroid();

      const lines = csvData.split(/\r?\n/);
      // Assume first line is a header: lat,lng,label
      const dataLines = lines.slice(1);

      dataLines.forEach(line => {
        if (!line.trim()) return; // skip empty lines
        const [latStr, lngStr, label] = line.split(",");
        if (!latStr || !lngStr || !label) return; // skip malformed lines

        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);

        if (label === "CENTROID") {
          // Optionally place a centroid marker, or ignore and recalc
          centroidMarker = L.marker([lat, lng], {
            icon: L.divIcon({
              className: 'centroid-icon',
              html: '<div style="background: red; width: 16px; height: 16px; border-radius: 50%;"></div>'
            })
          }).addTo(map);
          centroidMarker.bindPopup("Centroid (loaded from CSV)");
        } else {
          // Regular friend's house
          const marker = L.marker([lat, lng]).addTo(map);
          marker.bindPopup(label);
          markers.push({ lat, lng, label, marker });
        }
      });

      // If you prefer to always recalc centroid from loaded pins:
      // updateCentroid();
    }

    // -----------------------------
    // SETUP EVENT LISTENERS
    // -----------------------------
    window.onload = () => {
      initMap();

      document.getElementById('exportBtn').addEventListener('click', exportToCSV);
      document.getElementById('fileInput').addEventListener('change', (evt) => {
        const file = evt.target.files[0];
        if (file) {
          loadFromCSV(file);
        }
      });
    };
  </script>
</body>
</html>
````

Usage Notes
Run on a local server:

In your terminal, navigate to the folder containing index.html and run

````
python -m http.server 8000
````

Then open http://localhost:8000/index.html in your browser.
This prevents common security restrictions (file:///) from blocking tile requests or file reads.

Click to Add Markers:
Click anywhere on the map, enter a label, and a marker will appear.
Centroid:
A red dot shows the centroid of all markers. It’s updated automatically each time a new marker is added.
Export/Load CSV:
Click Export to CSV to download a CSV with all markers and the centroid.
Load a CSV by selecting it with the Choose file button. Any included centroid row will appear as a red centroid marker.
With these changes, the Subresource Integrity checks are removed, Leaflet should load, and you’ll avoid the “L is not defined” errors.

---

## User
great that works. Can you make it look a bit nicer and put a banner at the top saying - the centroid app. And at the bottom include the current long and lat of the centroid 

---

## O1

Below is an updated version that adds:
A banner at the top with “The Centroid App.”
A footer showing the current centroid latitude/longitude, automatically updated whenever markers change.
Slightly nicer styling with a centered layout and some background colors.
You can save this as index.html, run it from a local server, and it should look cleaner. (Of course, feel free to tweak colors and styling to your taste!)

````
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>The Centroid App</title>
  
  <!-- Leaflet CSS (no integrity/crossorigin) -->
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />

  <!-- Leaflet JS (no integrity/crossorigin) -->
  <script
    src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  ></script>
  
  <style>
    /* Basic reset for layout */
    html, body {
      margin: 0; 
      padding: 0; 
      height: 100%; 
      font-family: Arial, sans-serif;
    }

    /* Banner at the top */
    header {
      background-color: #f5f5f5;
      padding: 20px 0;
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      box-shadow: 0 1px 5px rgba(0,0,0,0.1);
      position: relative;
      z-index: 999;
    }

    /* The map takes up most of the screen */
    #map {
      width: 100%;
      height: calc(100% - 200px); /* reduce to make room for header & footer */
      box-sizing: border-box;
    }

    /* Controls area */
    #controls {
      padding: 10px;
      text-align: center;
    }
    #controls button,
    #controls input[type="file"] {
      margin: 5px;
    }

    /* Footer showing the current centroid */
    footer {
      background-color: #f5f5f5;
      padding: 10px 0;
      text-align: center;
      font-size: 16px;
      box-shadow: 0 -1px 5px rgba(0,0,0,0.1);
      position: relative;
      z-index: 999;
    }
  </style>
</head>

<body>
  <!-- Top banner -->
  <header>
    The Centroid App
  </header>

  <!-- The Leaflet map container -->
  <div id="map"></div>

  <!-- Controls for CSV export/load -->
  <div id="controls">
    <button id="exportBtn">Export to CSV</button>
    <input type="file" id="fileInput" accept=".csv" />
    <p>Add markers by clicking anywhere on the map. Then optionally export or load CSV.</p>
  </div>

  <!-- Footer to show centroid coordinates -->
  <footer>
    <span id="centroidCoordinates">No centroid yet</span>
  </footer>

  <script>
    // ------------------------------------------------
    // GLOBAL VARIABLES
    // ------------------------------------------------
    let map;
    let markers = [];      // Each element: { lat, lng, label, marker }
    let centroidMarker = null;

    // ------------------------------------------------
    // INITIALIZE MAP
    // ------------------------------------------------
    function initMap() {
      // Create a Leaflet map, centered on the US
      map = L.map('map').setView([40, -100], 4);

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // On click, add a marker
      map.on('click', onMapClick);
    }

    // ------------------------------------------------
    // CLICK HANDLER
    // ------------------------------------------------
    function onMapClick(e) {
      const label = prompt("Enter your friend's name (label for this pin):");
      if (label === null || label.trim() === '') {
        return; // If user canceled or left blank
      }

      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      // Create a Leaflet marker
      const marker = L.marker([lat, lng]).addTo(map);
      marker.bindPopup(label);

      // Add to our list of markers
      markers.push({ lat, lng, label, marker });

      // Update the centroid marker
      updateCentroid();
    }

    // ------------------------------------------------
    // UPDATE CENTROID
    // ------------------------------------------------
    function updateCentroid() {
      // If no markers, remove any existing centroid and update footer
      if (markers.length === 0) {
        removeCentroid();
        document.getElementById('centroidCoordinates').textContent = 'No centroid yet';
        return;
      }

      // Calculate average lat & lng
      const sumLat = markers.reduce((acc, m) => acc + m.lat, 0);
      const sumLng = markers.reduce((acc, m) => acc + m.lng, 0);
      const avgLat = sumLat / markers.length;
      const avgLng = sumLng / markers.length;

      // Remove old centroid
      removeCentroid();

      // Create new centroid marker (red dot)
      centroidMarker = L.marker([avgLat, avgLng], {
        icon: L.divIcon({
          className: 'centroid-icon',
          html: '<div style="background: red; width: 16px; height: 16px; border-radius: 50%;"></div>'
        })
      }).addTo(map);

      centroidMarker.bindPopup(`Centroid of ${markers.length} points`);

      // Update the footer with the coordinates
      document.getElementById('centroidCoordinates').textContent =
        `Centroid is at: ${avgLat.toFixed(5)}, ${avgLng.toFixed(5)}`;
    }

    // ------------------------------------------------
    // REMOVE CENTROID MARKER
    // ------------------------------------------------
    function removeCentroid() {
      if (centroidMarker) {
        centroidMarker.remove();
        centroidMarker = null;
      }
    }

    // ------------------------------------------------
    // EXPORT TO CSV
    // ------------------------------------------------
    function exportToCSV() {
      if (markers.length === 0) {
        alert("No markers to export!");
        return;
      }

      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "lat,lng,label\n"; // header row

      // Add each marker row
      markers.forEach(m => {
        csvContent += `${m.lat},${m.lng},${m.label}\n`;
      });

      // Include a CENTROID row so we can reload it if we want
      if (centroidMarker) {
        const sumLat = markers.reduce((acc, m) => acc + m.lat, 0);
        const sumLng = markers.reduce((acc, m) => acc + m.lng, 0);
        const avgLat = sumLat / markers.length;
        const avgLng = sumLng / markers.length;
        csvContent += `${avgLat},${avgLng},CENTROID\n`;
      }

      // Create a download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "friends_and_centroid.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // ------------------------------------------------
    // LOAD FROM CSV
    // ------------------------------------------------
    function loadFromCSV(file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const csvData = event.target.result;
        processCSVData(csvData);
      };
      reader.readAsText(file);
    }

    function processCSVData(csvData) {
      // Clear existing markers
      markers.forEach(m => map.removeLayer(m.marker));
      markers = [];
      removeCentroid();

      const lines = csvData.split(/\r?\n/);
      // Assume first line is a header: lat,lng,label
      const dataLines = lines.slice(1);

      dataLines.forEach(line => {
        if (!line.trim()) return; // skip empty lines
        const [latStr, lngStr, label] = line.split(",");
        if (!latStr || !lngStr || !label) return; // skip malformed lines

        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);

        if (label === "CENTROID") {
          // Place the centroid marker (or skip if you prefer to recalc)
          centroidMarker = L.marker([lat, lng], {
            icon: L.divIcon({
              className: 'centroid-icon',
              html: '<div style="background: red; width: 16px; height: 16px; border-radius: 50%;"></div>'
            })
          }).addTo(map);

          centroidMarker.bindPopup("Centroid (loaded from CSV)");

          // Update the footer text
          document.getElementById('centroidCoordinates').textContent =
            `Centroid is at: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;

        } else {
          // Regular friend’s house marker
          const marker = L.marker([lat, lng]).addTo(map);
          marker.bindPopup(label);
          markers.push({ lat, lng, label, marker });
        }
      });

      // If you prefer to recalc the centroid fresh from the loaded pins, do:
      // updateCentroid();
    }

    // ------------------------------------------------
    // SETUP EVENT LISTENERS
    // ------------------------------------------------
    window.onload = () => {
      initMap();

      document.getElementById('exportBtn')
        .addEventListener('click', exportToCSV);

      document.getElementById('fileInput')
        .addEventListener('change', (evt) => {
          const file = evt.target.files[0];
          if (file) {
            loadFromCSV(file);
          }
        });
    };
  </script>
</body>
</html>
````

Features
Top Banner: Displays “The Centroid App” in a simple, centered banner.
Map: Takes up most of the page’s vertical space, with a simple bounding box.
Controls: Centered area with the “Export to CSV” button and “Choose file” for CSV import.
Footer: Shows current centroid coordinates (“No centroid yet” initially, then updates when markers are added).

---

## User



That is good but the map should start centered on the gardeners rest please

---

## O1

Below is an updated version where the map starts centered on the Gardeners Rest in Sheffield, UK. We’ll assume the approximate coordinates:

```` 
Latitude: 53.39264
Longitude: -1.47091
Zoom Level: 15

````

Of course, feel free to adjust the coordinates or zoom to match the exact location you need.


---

## User

can you make it so that as the places are added a list appears on the right with the people who have been added so far. Also make it so in part of the list i can delete them using a red x. Remove the pub icon 

---

## O1

Below is an updated HTML that:

Removes the pub (beer) icon marker.
Keeps the map centered on Gardeners Rest by default but does not place any marker there.
Displays a sidebar on the right listing all added friends (with their labels).
Each entry in the sidebar has a red “X” button, which allows you to delete that friend’s marker from the map (and from the list).
The centroid calculation, export, and import features still work as before.

````

<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>The Centroid App</title>
  
  <!-- Leaflet CSS -->
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />

  <!-- Leaflet JS -->
  <script
    src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  ></script>
  
  <style>
    /* Basic reset for layout */
    html, body {
      margin: 0; 
      padding: 0; 
      height: 100%; 
      font-family: Arial, sans-serif;
    }

    /* Banner at the top */
    header {
      background-color: #f5f5f5;
      padding: 20px 0;
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      box-shadow: 0 1px 5px rgba(0,0,0,0.1);
      position: relative;
      z-index: 999;
    }

    /* Container holds map + sidebar side by side */
    #container {
      display: flex;
      flex-direction: row;
      height: calc(100% - 200px); /* top header + bottom footer space */
    }

    /* The map flexes to fill remaining space */
    #map {
      flex: 1;
      height: 100%;
      box-sizing: border-box;
    }

    /* Sidebar on the right */
    #sideList {
      width: 300px;
      background-color: #f0f0f0;
      padding: 10px;
      box-sizing: border-box;
      overflow-y: auto;
    }
    #sideList h2 {
      text-align: center;
      margin-top: 0;
    }
    #friendsList {
      list-style-type: none;
      padding: 0;
      margin: 0;
    }
    #friendsList li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 4px 0;
      background: #fff;
      padding: 4px 8px;
      border-radius: 4px;
    }
    .remove-btn {
      color: #fff;
      background-color: red;
      border: none;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      cursor: pointer;
      text-align: center;
      font-size: 14px;
      line-height: 18px;
      padding: 0;
    }

    /* Controls area below the container */
    #controls {
      padding: 10px;
      text-align: center;
    }
    #controls button,
    #controls input[type="file"] {
      margin: 5px;
    }

    /* Footer showing the current centroid */
    footer {
      background-color: #f5f5f5;
      padding: 10px 0;
      text-align: center;
      font-size: 16px;
      box-shadow: 0 -1px 5px rgba(0,0,0,0.1);
      position: relative;
      z-index: 999;
    }
  </style>
</head>

<body>
  <!-- Top banner -->
  <header>
    The Centroid App
  </header>

  <!-- Map + sidebar container -->
  <div id="container">
    <!-- The Leaflet map container -->
    <div id="map"></div>

    <!-- Sidebar for listing friends -->
    <div id="sideList">
      <h2>Friends</h2>
      <ul id="friendsList">
        <!-- Dynamically populated -->
      </ul>
    </div>
  </div>

  <!-- Controls for CSV export/load -->
  <div id="controls">
    <button id="exportBtn">Export to CSV</button>
    <input type="file" id="fileInput" accept=".csv" />
    <p>Add markers by clicking anywhere on the map. Then optionally export or load CSV.</p>
  </div>

  <!-- Footer to show centroid coordinates -->
  <footer>
    <span id="centroidCoordinates">No centroid yet</span>
  </footer>

  <script>
    // ------------------------------------------------
    // GLOBAL VARIABLES
    // ------------------------------------------------
    let map;
    let markers = []; // Each: { id, lat, lng, label, marker }
    let centroidMarker = null;

    // A simple counter to generate unique IDs
    let friendIdCounter = 1;

    // ------------------------------------------------
    // INITIALIZE MAP
    // ------------------------------------------------
    function initMap() {
      // Center on the Gardeners Rest (but do NOT place a marker there)
      map = L.map('map').setView([53.39264, -1.47091], 15);

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // On click, add a marker
      map.on('click', onMapClick);
    }

    // ------------------------------------------------
    // CLICK HANDLER: Add friend’s house marker
    // ------------------------------------------------
    function onMapClick(e) {
      const label = prompt("Enter your friend's name (label for this pin):");
      if (label === null || label.trim() === '') {
        return; // If user canceled or left blank
      }

      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      const id = `friend-${friendIdCounter++}`;

      // Create a Leaflet marker
      const marker = L.marker([lat, lng]).addTo(map);
      marker.bindPopup(label);

      // Add to our list of markers
      markers.push({ id, lat, lng, label, marker });

      // Update the DOM list & centroid
      updateFriendsList();
      updateCentroid();
    }

    // ------------------------------------------------
    // UPDATE FRIENDS LIST IN SIDEBAR
    // ------------------------------------------------
    function updateFriendsList() {
      const friendsList = document.getElementById('friendsList');
      friendsList.innerHTML = ''; // Clear the current list

      markers.forEach(friend => {
        const li = document.createElement('li');

        // The text portion
        const textSpan = document.createElement('span');
        textSpan.textContent = `${friend.label} (lat: ${friend.lat.toFixed(5)}, lng: ${friend.lng.toFixed(5)})`;

        // The remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = 'X';
        removeBtn.dataset.friendId = friend.id; // store ID so we know which friend to remove
        removeBtn.addEventListener('click', () => {
          removeFriendById(friend.id);
        });

        li.appendChild(textSpan);
        li.appendChild(removeBtn);

        friendsList.appendChild(li);
      });
    }

    // ------------------------------------------------
    // REMOVE A FRIEND BY ID
    // ------------------------------------------------
    function removeFriendById(friendId) {
      // Find friend in markers array
      const index = markers.findIndex(f => f.id === friendId);
      if (index === -1) return; // not found, just in case

      // Remove marker from map
      map.removeLayer(markers[index].marker);

      // Remove from array
      markers.splice(index, 1);

      // Update DOM list & centroid
      updateFriendsList();
      updateCentroid();
    }

    // ------------------------------------------------
    // UPDATE CENTROID
    // ------------------------------------------------
    function updateCentroid() {
      // If no markers, remove any existing centroid & update footer
      if (markers.length === 0) {
        removeCentroid();
        document.getElementById('centroidCoordinates').textContent = 'No centroid yet';
        return;
      }

      // Calculate average lat & lng
      const sumLat = markers.reduce((acc, m) => acc + m.lat, 0);
      const sumLng = markers.reduce((acc, m) => acc + m.lng, 0);
      const avgLat = sumLat / markers.length;
      const avgLng = sumLng / markers.length;

      // Remove old centroid
      removeCentroid();

      // Create new centroid marker (red dot)
      centroidMarker = L.marker([avgLat, avgLng], {
        icon: L.divIcon({
          className: 'centroid-icon',
          html: '<div style="background: red; width: 16px; height: 16px; border-radius: 50%;"></div>'
        })
      }).addTo(map);

      centroidMarker.bindPopup(`Centroid of ${markers.length} points`);

      // Update the footer with the coordinates
      document.getElementById('centroidCoordinates').textContent =
        `Centroid is at: ${avgLat.toFixed(5)}, ${avgLng.toFixed(5)}`;
    }

    // ------------------------------------------------
    // REMOVE CENTROID MARKER
    // ------------------------------------------------
    function removeCentroid() {
      if (centroidMarker) {
        centroidMarker.remove();
        centroidMarker = null;
      }
    }

    // ------------------------------------------------
    // EXPORT TO CSV
    // ------------------------------------------------
    function exportToCSV() {
      if (markers.length === 0) {
        alert("No markers to export!");
        return;
      }

      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "lat,lng,label\n"; // header row

      // Add each marker row
      markers.forEach(m => {
        csvContent += `${m.lat},${m.lng},${m.label}\n`;
      });

      // Include a CENTROID row if you want to store it
      if (centroidMarker) {
        const sumLat = markers.reduce((acc, m) => acc + m.lat, 0);
        const sumLng = markers.reduce((acc, m) => acc + m.lng, 0);
        const avgLat = sumLat / markers.length;
        const avgLng = sumLng / markers.length;
        csvContent += `${avgLat},${avgLng},CENTROID\n`;
      }

      // Create a download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "friends_and_centroid.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // ------------------------------------------------
    // LOAD FROM CSV
    // ------------------------------------------------
    function loadFromCSV(file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const csvData = event.target.result;
        processCSVData(csvData);
      };
      reader.readAsText(file);
    }

    function processCSVData(csvData) {
      // Clear existing markers
      markers.forEach(m => map.removeLayer(m.marker));
      markers = [];
      removeCentroid();

      const lines = csvData.split(/\r?\n/);
      // Assume first line is header: lat,lng,label
      const dataLines = lines.slice(1);

      dataLines.forEach(line => {
        if (!line.trim()) return; // skip empty lines
        const [latStr, lngStr, label] = line.split(",");
        if (!latStr || !lngStr || !label) return; // skip malformed lines

        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);

        if (label === "CENTROID") {
          // Optionally place the centroid marker, or skip & recalc
          centroidMarker = L.marker([lat, lng], {
            icon: L.divIcon({
              className: 'centroid-icon',
              html: '<div style="background: red; width: 16px; height: 16px; border-radius: 50%;"></div>'
            })
          }).addTo(map);

          centroidMarker.bindPopup("Centroid (loaded from CSV)");

          // Update the footer text
          document.getElementById('centroidCoordinates').textContent =
            `Centroid is at: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;

        } else {
          // Create an ID for the friend
          const id = `friend-${friendIdCounter++}`;
          const marker = L.marker([lat, lng]).addTo(map);
          marker.bindPopup(label);

          markers.push({ id, lat, lng, label, marker });
        }
      });

      // Update the sidebar list & centroid
      updateFriendsList();
      // If you prefer to recalc centroid from loaded pins:
      // updateCentroid();
    }

    // ------------------------------------------------
    // SETUP EVENT LISTENERS
    // ------------------------------------------------
    window.onload = () => {
      initMap();

      document.getElementById('exportBtn')
        .addEventListener('click', exportToCSV);

      document.getElementById('fileInput')
        .addEventListener('change', (evt) => {
          const file = evt.target.files[0];
          if (file) {
            loadFromCSV(file);
          }
        });
    };
  </script>
</body>
</html>

````

---

## User

make the right hand thing be an overlay over the map rather than a solid blok 

---

## O1

Below is an updated HTML that places the “friends list” in a floating overlay on top of the map (with slight transparency), rather than making it a solid block to the right. The rest of the functionality—adding markers, deleting them via a red “X,” computing the centroid, etc.—remains intact.

````

<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>The Centroid App</title>
  
  <!-- Leaflet CSS -->
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />

  <!-- Leaflet JS -->
  <script
    src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  ></script>
  
  <style>
    /* Basic reset for layout */
    html, body {
      margin: 0; 
      padding: 0; 
      height: 100%; 
      font-family: Arial, sans-serif;
    }

    /* Banner at the top */
    header {
      background-color: #f5f5f5;
      padding: 20px 0;
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      box-shadow: 0 1px 5px rgba(0,0,0,0.1);
      position: relative;
      z-index: 999;
    }

    /* Footer at the bottom */
    footer {
      background-color: #f5f5f5;
      padding: 10px 0;
      text-align: center;
      font-size: 16px;
      box-shadow: 0 -1px 5px rgba(0,0,0,0.1);
      position: relative;
      z-index: 999;
    }

    /* The map container in the middle */
    #mapContainer {
      position: relative;  /* So the overlay can be absolutely positioned */
      width: 100%;
      height: calc(100% - 200px); /* 200px for header + footer */
      box-sizing: border-box;
    }

    /* The Leaflet map itself */
    #map {
      width: 100%;
      height: 100%;
    }

    /* The overlay on the right */
    #friendsOverlay {
      position: absolute;
      top: 10px;    /* a bit of padding from the top */
      right: 10px;  /* a bit of padding from the right edge */
      width: 270px;
      background-color: rgba(255, 255, 255, 0.8); /* slight transparency */
      padding: 10px;
      border-radius: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      z-index: 9999; /* on top of the map */
    }

    #friendsOverlay h2 {
      margin-top: 0;
      text-align: center;
    }

    #friendsList {
      list-style-type: none;
      padding: 0;
      margin: 0;
      max-height: 300px; /* if you expect lots of entries */
      overflow-y: auto;  /* scroll if needed */
    }

    #friendsList li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 4px 0;
      background: #fff;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .remove-btn {
      color: #fff;
      background-color: red;
      border: none;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      cursor: pointer;
      text-align: center;
      font-size: 14px;
      line-height: 18px;
      padding: 0;
    }

    /* Controls area below the map container */
    #controls {
      padding: 10px;
      text-align: center;
    }

  </style>
</head>

<body>
  <!-- Top banner -->
  <header>
    The Centroid App
  </header>

  <!-- The map + overlay container -->
  <div id="mapContainer">
    <div id="map"></div>

    <!-- Overlay listing all friends -->
    <div id="friendsOverlay">
      <h2>Friends</h2>
      <ul id="friendsList"><!-- Filled dynamically --></ul>
    </div>
  </div>

  <!-- Controls for CSV export/load -->
  <div id="controls">
    <button id="exportBtn">Export to CSV</button>
    <input type="file" id="fileInput" accept=".csv" />
    <p>Add markers by clicking anywhere on the map. Then optionally export or load CSV.</p>
  </div>

  <!-- Footer to show centroid coordinates -->
  <footer>
    <span id="centroidCoordinates">No centroid yet</span>
  </footer>

  <script>
    // ------------------------------------------------
    // GLOBAL VARIABLES
    // ------------------------------------------------
    let map;
    let markers = []; // Each: { id, lat, lng, label, marker }
    let centroidMarker = null;

    // A simple counter to generate unique IDs
    let friendIdCounter = 1;

    // ------------------------------------------------
    // INITIALIZE MAP
    // ------------------------------------------------
    function initMap() {
      // Center on the Gardeners Rest (but no marker by default)
      map = L.map('map').setView([53.39264, -1.47091], 15);

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // On click, add a marker
      map.on('click', onMapClick);
    }

    // ------------------------------------------------
    // CLICK HANDLER: Add friend’s house marker
    // ------------------------------------------------
    function onMapClick(e) {
      const label = prompt("Enter your friend's name (label for this pin):");
      if (label === null || label.trim() === '') {
        return; // If user canceled or left blank
      }

      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      const id = `friend-${friendIdCounter++}`;

      // Create a Leaflet marker
      const marker = L.marker([lat, lng]).addTo(map);
      marker.bindPopup(label);

      // Add to our list of markers
      markers.push({ id, lat, lng, label, marker });

      // Update the DOM list & centroid
      updateFriendsList();
      updateCentroid();
    }

    // ------------------------------------------------
    // UPDATE FRIENDS LIST IN OVERLAY
    // ------------------------------------------------
    function updateFriendsList() {
      const friendsList = document.getElementById('friendsList');
      friendsList.innerHTML = ''; // Clear the current list

      markers.forEach(friend => {
        const li = document.createElement('li');

        // The text portion
        const textSpan = document.createElement('span');
        textSpan.textContent = `${friend.label} (lat: ${friend.lat.toFixed(5)}, lng: ${friend.lng.toFixed(5)})`;

        // The remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = 'X';
        removeBtn.dataset.friendId = friend.id; // store ID so we know which friend to remove
        removeBtn.addEventListener('click', () => {
          removeFriendById(friend.id);
        });

        li.appendChild(textSpan);
        li.appendChild(removeBtn);

        friendsList.appendChild(li);
      });
    }

    // ------------------------------------------------
    // REMOVE A FRIEND BY ID
    // ------------------------------------------------
    function removeFriendById(friendId) {
      // Find friend in markers array
      const index = markers.findIndex(f => f.id === friendId);
      if (index === -1) return; // not found, just in case

      // Remove marker from map
      map.removeLayer(markers[index].marker);

      // Remove from array
      markers.splice(index, 1);

      // Update DOM list & centroid
      updateFriendsList();
      updateCentroid();
    }

    // ------------------------------------------------
    // UPDATE CENTROID
    // ------------------------------------------------
    function updateCentroid() {
      // If no markers, remove any existing centroid & update footer
      if (markers.length === 0) {
        removeCentroid();
        document.getElementById('centroidCoordinates').textContent = 'No centroid yet';
        return;
      }

      // Calculate average lat & lng
      const sumLat = markers.reduce((acc, m) => acc + m.lat, 0);
      const sumLng = markers.reduce((acc, m) => acc + m.lng, 0);
      const avgLat = sumLat / markers.length;
      const avgLng = sumLng / markers.length;

      // Remove old centroid
      removeCentroid();

      // Create new centroid marker (red dot)
      centroidMarker = L.marker([avgLat, avgLng], {
        icon: L.divIcon({
          className: 'centroid-icon',
          html: '<div style="background: red; width: 16px; height: 16px; border-radius: 50%;"></div>'
        })
      }).addTo(map);

      centroidMarker.bindPopup(`Centroid of ${markers.length} points`);

      // Update the footer with the coordinates
      document.getElementById('centroidCoordinates').textContent =
        `Centroid is at: ${avgLat.toFixed(5)}, ${avgLng.toFixed(5)}`;
    }

    // ------------------------------------------------
    // REMOVE CENTROID MARKER
    // ------------------------------------------------
    function removeCentroid() {
      if (centroidMarker) {
        centroidMarker.remove();
        centroidMarker = null;
      }
    }

    // ------------------------------------------------
    // EXPORT TO CSV
    // ------------------------------------------------
    function exportToCSV() {
      if (markers.length === 0) {
        alert("No markers to export!");
        return;
      }

      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "lat,lng,label\n"; // header row

      // Add each marker row
      markers.forEach(m => {
        csvContent += `${m.lat},${m.lng},${m.label}\n`;
      });

      // Include a CENTROID row if you want to store it
      if (centroidMarker) {
        const sumLat = markers.reduce((acc, m) => acc + m.lat, 0);
        const sumLng = markers.reduce((acc, m) => acc + m.lng, 0);
        const avgLat = sumLat / markers.length;
        const avgLng = sumLng / markers.length;
        csvContent += `${avgLat},${avgLng},CENTROID\n`;
      }

      // Create a download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "friends_and_centroid.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // ------------------------------------------------
    // LOAD FROM CSV
    // ------------------------------------------------
    function loadFromCSV(file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const csvData = event.target.result;
        processCSVData(csvData);
      };
      reader.readAsText(file);
    }

    function processCSVData(csvData) {
      // Clear existing markers
      markers.forEach(m => map.removeLayer(m.marker));
      markers = [];
      removeCentroid();

      const lines = csvData.split(/\r?\n/);
      // Assume first line is header: lat,lng,label
      const dataLines = lines.slice(1);

      dataLines.forEach(line => {
        if (!line.trim()) return; // skip empty lines
        const [latStr, lngStr, label] = line.split(",");
        if (!latStr || !lngStr || !label) return; // skip malformed lines

        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);

        if (label === "CENTROID") {
          // Optionally place the centroid marker, or skip & recalc
          centroidMarker = L.marker([lat, lng], {
            icon: L.divIcon({
              className: 'centroid-icon',
              html: '<div style="background: red; width: 16px; height: 16px; border-radius: 50%;"></div>'
            })
          }).addTo(map);

          centroidMarker.bindPopup("Centroid (loaded from CSV)");
          document.getElementById('centroidCoordinates').textContent =
            `Centroid is at: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;

        } else {
          // Create an ID for the friend
          const id = `friend-${friendIdCounter++}`;
          const marker = L.marker([lat, lng]).addTo(map);
          marker.bindPopup(label);

          markers.push({ id, lat, lng, label, marker });
        }
      });

      // Update the overlay list & centroid
      updateFriendsList();
      // If you prefer to recalc centroid from loaded pins:
      // updateCentroid();
    }

    // ------------------------------------------------
    // SETUP EVENT LISTENERS
    // ------------------------------------------------
    window.onload = () => {
      initMap();

      document.getElementById('exportBtn')
        .addEventListener('click', exportToCSV);

      document.getElementById('fileInput')
        .addEventListener('change', (evt) => {
          const file = evt.target.files[0];
          if (file) {
            loadFromCSV(file);
          }
        });
    };
  </script>
</body>
</html>

````

---- 

## User

add a starter overlay that loads on first load and then you click and x or continue to get through to the map. 

It then explains how you use the app to find the centroid and clicking and exporting and things 

---

## O1

Below is an updated HTML that displays a starter overlay (a simple “modal”) on first load. It explains how to use the app, and you can click “X” or “Continue” to close the overlay and reveal the map. Everything else (map, overlay for the friends list, checkboxes, centroid calculation, etc.) works as before.

````

<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>The Centroid App</title>
  
  <!-- Leaflet CSS -->
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />

  <!-- Leaflet JS -->
  <script
    src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  ></script>
  
  <style>
    /* Basic reset for layout */
    html, body {
      margin: 0; 
      padding: 0; 
      height: 100%; 
      font-family: Arial, sans-serif;
    }

    /* Banner at the top */
    header {
      background-color: #f5f5f5;
      padding: 20px 0;
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      box-shadow: 0 1px 5px rgba(0,0,0,0.1);
      position: relative;
      z-index: 999;
    }

    /* Footer at the bottom */
    footer {
      background-color: #f5f5f5;
      padding: 10px 0;
      text-align: center;
      font-size: 16px;
      box-shadow: 0 -1px 5px rgba(0,0,0,0.1);
      position: relative;
      z-index: 999;
    }

    /* The map container in the middle */
    #mapContainer {
      position: relative;  /* So the overlay can be absolutely positioned */
      width: 100%;
      height: calc(100% - 200px); /* 200px for header + footer */
      box-sizing: border-box;
    }

    /* The Leaflet map itself */
    #map {
      width: 100%;
      height: 100%;
    }

    /* The overlay on the right (friends list) */
    #friendsOverlay {
      position: absolute;
      top: 10px;    /* a bit of padding from the top */
      right: 10px;  /* a bit of padding from the right edge */
      width: 270px;
      background-color: rgba(255, 255, 255, 0.8); /* slight transparency */
      padding: 10px;
      border-radius: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      z-index: 9999; /* on top of the map */
    }

    #friendsOverlay h2 {
      margin-top: 0;
      text-align: center;
    }

    #friendsList {
      list-style-type: none;
      padding: 0;
      margin: 0;
      max-height: 300px; /* if you expect many entries */
      overflow-y: auto;  /* scroll if needed */
    }

    #friendsList li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 4px 0;
      background: #fff;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .leftItems {
      display: flex;
      align-items: center;
      gap: 6px; /* spacing between checkbox and label text */
    }

    .remove-btn {
      color: #fff;
      background-color: red;
      border: none;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      cursor: pointer;
      text-align: center;
      font-size: 14px;
      line-height: 18px;
      padding: 0;
    }

    /* Controls area below the map container */
    #controls {
      padding: 10px;
      text-align: center;
    }

    /* -------------------------------------------
       STARTER OVERLAY (MODAL) STYLES
       ------------------------------------------- */
    #introOverlay {
      position: fixed; 
      top: 0; 
      left: 0;
      width: 100%; 
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5); /* semi-transparent backdrop */
      display: flex; 
      align-items: center; 
      justify-content: center;
      z-index: 10000; /* above everything else */
    }

    #introContent {
      background-color: #fff;
      padding: 20px;
      width: 400px;
      max-width: 90%;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      position: relative;
    }

    #closeIntroBtn {
      position: absolute; 
      top: 10px; 
      right: 10px;
      background: red; 
      color: #fff;
      border: none;
      border-radius: 50%;
      width: 30px; 
      height: 30px;
      cursor: pointer;
      font-size: 18px;
      line-height: 28px;
      text-align: center;
    }

    #continueBtn {
      margin-top: 20px;
      padding: 8px 16px;
      background-color: #2196f3;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  </style>
</head>

<body>
  <!-- Starter Overlay (modal) -->
  <div id="introOverlay">
    <div id="introContent">
      <button id="closeIntroBtn">X</button>
      <h2>Welcome to The Centroid App</h2>
      <p>
        This app lets you drop markers on a map where your friends live.  
        It then calculates the centroid (average location) of the visible friends.  
      </p>
      <p>
        <strong>How to use:</strong><br>
        • Click anywhere on the map to add a friend’s house.<br>
        • Toggle a friend’s marker on/off with the checkbox.<br>
        • Remove a friend entirely with the red “X.”<br>
        • “Export to CSV” to download a file of all markers.<br>
        • “Choose file” to import markers (and centroid) from a CSV.<br>
        • The bottom footer shows the current centroid (visible markers only).
      </p>
      <button id="continueBtn">Continue</button>
    </div>
  </div>

  <!-- Top banner -->
  <header>
    The Centroid App
  </header>

  <!-- The map + overlay container -->
  <div id="mapContainer">
    <div id="map"></div>

    <!-- Overlay listing all friends -->
    <div id="friendsOverlay">
      <h2>Friends</h2>
      <ul id="friendsList"><!-- Filled dynamically --></ul>
    </div>
  </div>

  <!-- Controls for CSV export/load -->
  <div id="controls">
    <button id="exportBtn">Export to CSV</button>
    <input type="file" id="fileInput" accept=".csv" />
    <p>Add markers by clicking anywhere on the map. Then optionally export or load CSV.</p>
  </div>

  <!-- Footer to show centroid coordinates -->
  <footer>
    <span id="centroidCoordinates">No centroid yet</span>
  </footer>

  <script>
    // ------------------------------------------------
    // GLOBAL VARIABLES
    // ------------------------------------------------
    let map;
    // Each friend is: { id, lat, lng, label, marker, visible }
    let markers = []; 
    let centroidMarker = null;

    // A simple counter to generate unique IDs
    let friendIdCounter = 1;

    // ------------------------------------------------
    // INITIALIZE MAP
    // ------------------------------------------------
    function initMap() {
      // Center on the Gardeners Rest in Sheffield
      map = L.map('map').setView([53.39264, -1.47091], 15);

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // On click, add a marker
      map.on('click', onMapClick);
    }

    // ------------------------------------------------
    // CLICK HANDLER: Add friend’s house marker
    // ------------------------------------------------
    function onMapClick(e) {
      const label = prompt("Enter your friend's name (label for this pin):");
      if (!label || label.trim() === '') {
        return; // If user canceled or left blank
      }

      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      const id = `friend-${friendIdCounter++}`;

      // Create a Leaflet marker
      const marker = L.marker([lat, lng]).addTo(map);
      marker.bindPopup(label);

      // Add to our list of markers (visible by default)
      markers.push({ id, lat, lng, label, marker, visible: true });

      // Update the DOM list & centroid
      updateFriendsList();
      updateCentroid();
    }

    // ------------------------------------------------
    // UPDATE FRIENDS LIST (OVERLAY)
    // ------------------------------------------------
    function updateFriendsList() {
      const friendsList = document.getElementById('friendsList');
      friendsList.innerHTML = ''; // Clear the current list

      markers.forEach(friend => {
        const li = document.createElement('li');

        // LEFT PART: checkbox + label text
        const leftDiv = document.createElement('div');
        leftDiv.className = 'leftItems';

        // Checkbox for showing/hiding
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = friend.visible;
        checkbox.addEventListener('change', (e) => {
          toggleFriendVisibility(friend.id, e.target.checked);
        });

        // Label text
        const labelSpan = document.createElement('span');
        labelSpan.textContent = `${friend.label} 
          (lat: ${friend.lat.toFixed(5)}, lng: ${friend.lng.toFixed(5)})`;

        leftDiv.appendChild(checkbox);
        leftDiv.appendChild(labelSpan);

        // RIGHT PART: remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = 'X';
        removeBtn.dataset.friendId = friend.id;
        removeBtn.addEventListener('click', () => {
          removeFriendById(friend.id);
        });

        li.appendChild(leftDiv);
        li.appendChild(removeBtn);
        friendsList.appendChild(li);
      });
    }

    // ------------------------------------------------
    // TOGGLE FRIEND VISIBILITY
    // ------------------------------------------------
    function toggleFriendVisibility(friendId, isVisible) {
      const friend = markers.find(f => f.id === friendId);
      if (!friend) return; // not found

      friend.visible = isVisible;

      // Show/hide the marker on the map
      if (isVisible) {
        friend.marker.addTo(map);
      } else {
        map.removeLayer(friend.marker);
      }
      // Recalculate the centroid of only the visible markers
      updateCentroid();
    }

    // ------------------------------------------------
    // REMOVE A FRIEND (FULLY)
    // ------------------------------------------------
    function removeFriendById(friendId) {
      // Find friend in markers array
      const index = markers.findIndex(f => f.id === friendId);
      if (index === -1) return; // not found, just in case

      // Remove marker from map
      map.removeLayer(markers[index].marker);

      // Remove from array
      markers.splice(index, 1);

      // Update DOM list & centroid
      updateFriendsList();
      updateCentroid();
    }

    // ------------------------------------------------
    // UPDATE CENTROID (OF VISIBLE MARKERS)
    // ------------------------------------------------
    function updateCentroid() {
      // Consider only visible markers
      const visibleMarkers = markers.filter(m => m.visible);

      if (visibleMarkers.length === 0) {
        removeCentroid();
        document.getElementById('centroidCoordinates').textContent = 'No centroid yet';
        return;
      }

      // Calculate average lat & lng
      const sumLat = visibleMarkers.reduce((acc, m) => acc + m.lat, 0);
      const sumLng = visibleMarkers.reduce((acc, m) => acc + m.lng, 0);
      const avgLat = sumLat / visibleMarkers.length;
      const avgLng = sumLng / visibleMarkers.length;

      removeCentroid();

      // Create new centroid marker (red dot)
      centroidMarker = L.marker([avgLat, avgLng], {
        icon: L.divIcon({
          className: 'centroid-icon',
          html: '<div style="background: red; width: 16px; height: 16px; border-radius: 50%;"></div>'
        })
      }).addTo(map);

      centroidMarker.bindPopup(`Centroid of ${visibleMarkers.length} visible points`);
      document.getElementById('centroidCoordinates').textContent =
        `Centroid is at: ${avgLat.toFixed(5)}, ${avgLng.toFixed(5)}`;
    }

    // ------------------------------------------------
    // REMOVE CENTROID MARKER
    // ------------------------------------------------
    function removeCentroid() {
      if (centroidMarker) {
        centroidMarker.remove();
        centroidMarker = null;
      }
    }

    // ------------------------------------------------
    // EXPORT TO CSV (ALL MARKERS, VISIBLE OR NOT)
    // ------------------------------------------------
    function exportToCSV() {
      if (markers.length === 0) {
        alert("No markers to export!");
        return;
      }

      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "lat,lng,label\n"; // header row

      // Add each marker row (regardless of visibility)
      markers.forEach(m => {
        csvContent += `${m.lat},${m.lng},${m.label}\n`;
      });

      // Optionally include the centroid row
      const visibleMarkers = markers.filter(m => m.visible);
      if (visibleMarkers.length > 0) {
        const sumLat = visibleMarkers.reduce((acc, m) => acc + m.lat, 0);
        const sumLng = visibleMarkers.reduce((acc, m) => acc + m.lng, 0);
        const avgLat = sumLat / visibleMarkers.length;
        const avgLng = sumLng / visibleMarkers.length;
        csvContent += `${avgLat},${avgLng},CENTROID\n`;
      }

      // Create a download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "friends_and_centroid.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // ------------------------------------------------
    // LOAD FROM CSV
    // ------------------------------------------------
    function loadFromCSV(file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const csvData = event.target.result;
        processCSVData(csvData);
      };
      reader.readAsText(file);
    }

    function processCSVData(csvData) {
      // Clear existing markers
      markers.forEach(m => map.removeLayer(m.marker));
      markers = [];
      removeCentroid();

      const lines = csvData.split(/\r?\n/);
      // Assume first line is header: lat,lng,label
      const dataLines = lines.slice(1);

      dataLines.forEach(line => {
        if (!line.trim()) return; // skip empty lines
        const [latStr, lngStr, label] = line.split(",");
        if (!latStr || !lngStr || !label) return; // skip malformed lines

        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);

        if (label === "CENTROID") {
          // Place the centroid marker if desired
          centroidMarker = L.marker([lat, lng], {
            icon: L.divIcon({
              className: 'centroid-icon',
              html: '<div style="background: red; width: 16px; height: 16px; border-radius: 50%;"></div>'
            })
          }).addTo(map);
          centroidMarker.bindPopup("Centroid (loaded from CSV)");

          document.getElementById('centroidCoordinates').textContent =
            `Centroid is at: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;

        } else {
          // Create an ID for the friend
          const id = `friend-${friendIdCounter++}`;
          const marker = L.marker([lat, lng]).addTo(map);
          marker.bindPopup(label);

          // By default, make them visible
          markers.push({ id, lat, lng, label, marker, visible: true });
        }
      });

      // Update the overlay list & recalc centroid from loaded pins
      updateFriendsList();
      updateCentroid();
    }

    // ------------------------------------------------
    // STARTER OVERLAY HANDLERS
    // ------------------------------------------------
    function closeIntroOverlay() {
      const introOverlay = document.getElementById('introOverlay');
      introOverlay.style.display = 'none';
    }

    // ------------------------------------------------
    // SETUP EVENT LISTENERS
    // ------------------------------------------------
    window.onload = () => {
      // Initialize the map
      initMap();

      // CSV Export
      document.getElementById('exportBtn')
        .addEventListener('click', exportToCSV);

      // CSV Import
      document.getElementById('fileInput')
        .addEventListener('change', (evt) => {
          const file = evt.target.files[0];
          if (file) {
            loadFromCSV(file);
          }
        });

      // Overlay close buttons
      document.getElementById('closeIntroBtn')
        .addEventListener('click', closeIntroOverlay);
      document.getElementById('continueBtn')
        .addEventListener('click', closeIntroOverlay);
    };
  </script>
</body>
</html>

````















