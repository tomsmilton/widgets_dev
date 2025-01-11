/**
 * We parse the CSV (with Papa Parse), then do a custom "insertion sort"
 * where top of the array = most preferred. If user picks "current job"
 * over the existing job, we move further left. Otherwise, we insert it
 * just below the job that "wins."
 */

let jobs = [];
let sortedJobs = [];      // final sorted array (index 0 = most preferred)
let currentIndex = 0;     // which job from 'jobs' we're currently placing
let compareIndex = 0;     // position in 'sortedJobs' to compare against

// 1. Listen for file input -> parse with Papa Parse
document.getElementById("fileInput").addEventListener("change", function(event) {
  const file = event.target.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,        // first row is headers
    skipEmptyLines: true,
    dynamicTyping: false,
    complete: (results) => {
      jobs = results.data; // array of row objects
      console.log("Parsed jobs:", jobs);

      // Validate columns
      if (!jobs.length || !("Location" in jobs[0]) || !("Level" in jobs[0]) || !("Specialty" in jobs[0])) {
        alert("CSV must have headers: Location, Level, Specialty.");
        return;
      }
      startInsertionSort();
    },
    error: (err) => {
      console.error("Papa Parse error:", err);
      alert("Error parsing CSV. Check console for details.");
    }
  });
});

// 2. Start insertion sort
function startInsertionSort() {
  // Put first job into the sorted array
  sortedJobs = [ jobs[0] ];
  currentIndex = 1;
  insertionSortStep();
}

// 3. insertionSortStep
function insertionSortStep() {
  if (currentIndex >= jobs.length) {
    // Done
    hideComparisonArea();
    showFinalRankingUI();
    return;
  }
  // We are inserting 'jobs[currentIndex]'
  const currentJob = jobs[currentIndex];
  compareIndex = sortedJobs.length - 1; // start from the right (lowest in the ranking)
  compareAndInsert(currentJob, compareIndex);
}

// 4. compareAndInsert
function compareAndInsert(currentJob, cIndex) {
  if (cIndex < 0) {
    // We've reached the top => place currentJob at front (most preferred).
    sortedJobs.unshift(currentJob);
    currentIndex++;
    insertionSortStep();
    return;
  }

  showComparisonUI(
    currentJob,
    sortedJobs[cIndex],
    (userPrefersCurrent) => {
      if (userPrefersCurrent) {
        // user says currentJob is "better" => keep going left
        compareAndInsert(currentJob, cIndex - 1);
      } else {
        // user says sortedJobs[cIndex] is better => insert just below it
        sortedJobs.splice(cIndex + 1, 0, currentJob);
        currentIndex++;
        insertionSortStep();
      }
    }
  );
}

// 5. showComparisonUI with clickable cards
function showComparisonUI(jobA, jobB, callback) {
  const comparisonArea = document.getElementById("comparisonArea");
  comparisonArea.classList.remove("hidden");

  const cardA = document.getElementById("cardA");
  const cardB = document.getElementById("cardB");

  cardA.innerHTML = makeJobHTML(jobA);
  cardB.innerHTML = makeJobHTML(jobB);

  // Clear old listeners
  cardA.onclick = null;
  cardB.onclick = null;

  // If user clicks A => user prefers jobA
  cardA.onclick = () => callback(true);
  // If user clicks B => user prefers jobB
  cardB.onclick = () => callback(false);
}

// 5a. Format the job's info as HTML
function makeJobHTML(job) {
  return `
    <strong>${escapeHTML(job.Location)}</strong><br>
    <em>${escapeHTML(job.Level)}</em><br>
    ${escapeHTML(job.Specialty)}
  `;
}

// Utility: Simple function to escape HTML special chars
function escapeHTML(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, '&quot;');
}

// 6. Hide comparison area
function hideComparisonArea() {
  document.getElementById("comparisonArea").classList.add("hidden");
}

// 7. Show final ranking (most preferred at top) with drag-and-drop + handle
function showFinalRankingUI() {
  const finalListDiv = document.getElementById("finalList");
  finalListDiv.classList.remove("hidden");

  const rankingUl = document.getElementById("ranking");
  rankingUl.innerHTML = ""; // clear

  // Render each job as an <li> so Sortable can reorder them
  // We'll include a "drag-handle" icon (e.g., a triple-bar or "grip" icon)
  for (let i = 0; i < sortedJobs.length; i++) {
    const li = document.createElement("li");
    li.className = "ranking-item";
    li.dataset.index = i.toString(); // track the item index

    // A small handle icon (Unicode: "⠿" or a simple vertical dots, etc.)
    const handleSpan = document.createElement("span");
    handleSpan.className = "drag-handle";
    handleSpan.textContent = "⠿"; // or "☰", "≡", or an actual SVG/icon

    // The job text
    const textSpan = document.createElement("span");
    textSpan.textContent = displayJob(sortedJobs[i]);

    li.appendChild(handleSpan);
    li.appendChild(textSpan);
    rankingUl.appendChild(li);
  }

  // Enable Sortable on the final list, specifying the handle
  new Sortable(rankingUl, {
    animation: 150,
    handle: ".drag-handle", // only drag by the handle
    onEnd: () => {
      // After drag ends, rebuild sortedJobs[] from new positions
      const newOrder = [];
      const lis = rankingUl.querySelectorAll("li");
      lis.forEach(li => {
        const oldIndex = parseInt(li.dataset.index, 10);
        newOrder.push(sortedJobs[oldIndex]);
      });
      sortedJobs = newOrder;
      // Update data-index so further drags reflect new order
      lis.forEach((li, idx) => {
        li.dataset.index = idx.toString();
      });
    }
  });

  // Export button
  document.getElementById("exportBtn").onclick = () => exportCSV(sortedJobs);
}

// Helper to display a job in a single line
function displayJob(job) {
  return `${job.Location}, ${job.Level}, ${job.Specialty}`;
}

// 8. Export final sorted array to CSV
function exportCSV(finalArray) {
  const headers = ["Location", "Level", "Specialty"];
  const lines = [headers.join(",")];

  finalArray.forEach(job => {
    const row = headers.map(h => {
      const val = job[h] ?? "";
      // If val has commas/newlines, wrap in quotes & escape internal quotes
      if (/[,\r\n"]/.test(val)) {
        return `"${val.replace(/"/g, '""')}"`;
      } else {
        return val;
      }
    });
    lines.push(row.join(","));
  });

  const csvContent = lines.join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "final_jobs_order.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
