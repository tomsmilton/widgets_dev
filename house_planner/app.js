// DOM Elements
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const canvasContainer = document.getElementById('canvasContainer');
const placeholder = document.getElementById('placeholder');
const statusEl = document.getElementById('status');
const measurementsEl = document.getElementById('measurements');
const measurementsList = document.getElementById('measurementsList');

// Buttons
const imageUpload = document.getElementById('imageUpload');
const referenceBtn = document.getElementById('referenceBtn');
const measureBtn = document.getElementById('measureBtn');
const rectBtn = document.getElementById('rectBtn');
const circleBtn = document.getElementById('circleBtn');
const downloadBtn = document.getElementById('downloadBtn');
const toggleReferenceBtn = document.getElementById('toggleReferenceBtn');
const selectBtn = document.getElementById('selectBtn');
const deleteBtn = document.getElementById('deleteBtn');
const editReferenceBtn = document.getElementById('editReferenceBtn');

// Reference inputs
const referenceLengthInput = document.getElementById('referenceLength');
const referenceUnitSelect = document.getElementById('referenceUnit');

// Modal elements
const editReferenceModal = document.getElementById('editReferenceModal');
const editReferenceValue = document.getElementById('editReferenceValue');
const editReferenceUnit = document.getElementById('editReferenceUnit');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const updateReferenceBtn = document.getElementById('updateReferenceBtn');

// State variables
let image = null;
let scale = null;
let measurements = [];
let shapes = [];
let isDrawingReference = false;
let isDrawingMeasurement = false;
let isDrawingRectangle = false;
let isDrawingCircle = false;
let isSelectMode = false;
let currentLine = null;
let currentShape = null;
let selectedItem = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let showReference = true;

// Utility Functions
function setStatus(message) {
  statusEl.textContent = message;
}

function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function isPointInRectangle(x, y, rect) {
  return (
    x >= rect.startX && 
    x <= rect.endX && 
    y >= rect.startY && 
    y <= rect.endY
  );
}

function isPointInCircle(x, y, circle) {
  const distance = calculateDistance(
    x, y, 
    circle.centerX, circle.centerY
  );
  return distance <= circle.radiusPixels + 5; // Adding 5px buffer for easier selection
}

function isPointNearLine(x, y, line) {
  // Calculate the distance from point to line segment
  const A = x - line.startX;
  const B = y - line.startY;
  const C = line.endX - line.startX;
  const D = line.endY - line.startY;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  // Parameterized position on the line
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;
  
  let xx, yy;
  
  // Find the closest point on the line segment
  if (param < 0) {
    xx = line.startX;
    yy = line.startY;
  } else if (param > 1) {
    xx = line.endX;
    yy = line.endY;
  } else {
    xx = line.startX + param * C;
    yy = line.startY + param * D;
  }
  
  const distance = calculateDistance(x, y, xx, yy);
  return distance <= 5; // 5 pixels tolerance for selection
}

// Update the measurements list in the UI
function updateMeasurementsList() {
  // Clear the list
  measurementsList.innerHTML = '';
  
  // Add lines
  measurements.forEach((line, i) => {
    const li = document.createElement('li');
    li.textContent = `Line ${i+1}: ${line.realDistance} ${line.unit}`;
    measurementsList.appendChild(li);
  });
  
  // Add shapes
  shapes.forEach((shape, i) => {
    const li = document.createElement('li');
    if (shape.type === 'rectangle') {
      li.textContent = `Rectangle ${i+1}: ${shape.realWidth} × ${shape.realHeight} ${shape.unit}`;
    } else { // circle
      li.textContent = `Circle ${i+1}: ⌀ ${shape.realDiameter} ${shape.unit}`;
    }
    measurementsList.appendChild(li);
  });
  
  // Show or hide the measurements section
  if (measurements.length > 0 || shapes.length > 0) {
    measurementsEl.style.display = 'block';
  } else {
    measurementsEl.style.display = 'none';
  }
}

// Render the canvas
function renderCanvas() {
  if (!canvas || !image) return;
  
  // Resize canvas to match image dimensions but constrained to container
  const containerWidth = canvasContainer.clientWidth;
  const containerHeight = canvasContainer.clientHeight;
  
  const aspectRatio = image.width / image.height;
  let canvasWidth = image.width;
  let canvasHeight = image.height;
  
  if (canvasWidth > containerWidth) {
    canvasWidth = containerWidth;
    canvasHeight = canvasWidth / aspectRatio;
  }
  
  if (canvasHeight > containerHeight) {
    canvasHeight = containerHeight;
    canvasWidth = canvasHeight * aspectRatio;
  }
  
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw image
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  
  // Draw reference line if visible
  if (scale && showReference) {
    const isSelected = selectedItem && selectedItem.type === 'reference';
    
    ctx.beginPath();
    ctx.moveTo(scale.startX, scale.startY);
    ctx.lineTo(scale.endX, scale.endY);
    ctx.strokeStyle = isSelected ? '#00BB00' : '#00FF00'; // brighter green if selected
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.stroke();
    
    // Draw reference label
    const midX = (scale.startX + scale.endX) / 2;
    const midY = (scale.startY + scale.endY) / 2;
    ctx.fillStyle = isSelected ? '#00BB00' : '#00FF00';
    ctx.font = isSelected ? 'bold 14px Arial' : '14px Arial';
    ctx.fillText(`${scale.realLength} ${scale.unit} (reference)`, midX + 5, midY - 5);
    
    // Draw handles if selected
    if (isSelected) {
      // Start handle
      ctx.beginPath();
      ctx.arc(scale.startX, scale.startY, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#00BB00';
      ctx.fill();
      
      // End handle
      ctx.beginPath();
      ctx.arc(scale.endX, scale.endY, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#00BB00';
      ctx.fill();
    }
  }
  
  // Draw measurement lines
  measurements.forEach((line, index) => {
    const isSelected = selectedItem && selectedItem.type === 'line' && selectedItem.index === index;
    
    ctx.beginPath();
    ctx.moveTo(line.startX, line.startY);
    ctx.lineTo(line.endX, line.endY);
    ctx.strokeStyle = isSelected ? '#FF00FF' : '#FF0000'; // magenta if selected, red otherwise
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.stroke();
    
    // Draw measurement label
    const midX = (line.startX + line.endX) / 2;
    const midY = (line.startY + line.endY) / 2;
    ctx.fillStyle = isSelected ? '#FF00FF' : '#FF0000';
    ctx.font = isSelected ? 'bold 14px Arial' : '14px Arial';
    ctx.fillText(`${line.realDistance} ${line.unit}`, midX + 5, midY - 5);
    
    // Draw handles if selected
    if (isSelected) {
      // Start handle
      ctx.beginPath();
      ctx.arc(line.startX, line.startY, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#FF00FF';
      ctx.fill();
      
      // End handle
      ctx.beginPath();
      ctx.arc(line.endX, line.endY, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#FF00FF';
      ctx.fill();
    }
  });
  
  // Draw shapes
  shapes.forEach((shape, index) => {
    const isSelected = selectedItem && selectedItem.type === 'shape' && selectedItem.index === index;
    
    if (shape.type === 'rectangle') {
      // Draw rectangle
      ctx.beginPath();
      ctx.rect(
        shape.startX,
        shape.startY,
        shape.endX - shape.startX,
        shape.endY - shape.startY
      );
      ctx.strokeStyle = isSelected ? '#FF9500' : '#FFA500'; // bright orange if selected
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();
      
      // Draw dimensions
      const centerX = (shape.startX + shape.endX) / 2;
      const centerY = (shape.startY + shape.endY) / 2;
      ctx.fillStyle = isSelected ? '#FF9500' : '#FFA500';
      ctx.font = isSelected ? 'bold 14px Arial' : '14px Arial';
      ctx.fillText(
        `${shape.realWidth} × ${shape.realHeight} ${shape.unit}`,
        centerX,
        centerY
      );
      
      // Draw handles if selected
      if (isSelected) {
        // Corners
        [
          [shape.startX, shape.startY], // top-left
          [shape.endX, shape.startY],   // top-right
          [shape.startX, shape.endY],   // bottom-left
          [shape.endX, shape.endY]      // bottom-right
        ].forEach(([x, y]) => {
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#FF9500';
          ctx.fill();
        });
      }
    } else if (shape.type === 'circle') {
      // Draw circle
      ctx.beginPath();
      ctx.arc(
        shape.centerX,
        shape.centerY,
        shape.radiusPixels,
        0,
        2 * Math.PI
      );
      ctx.strokeStyle = isSelected ? '#00A5FF' : '#00BFFF'; // brighter blue if selected
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();
      
      // Draw diameter
      ctx.fillStyle = isSelected ? '#00A5FF' : '#00BFFF';
      ctx.font = isSelected ? 'bold 14px Arial' : '14px Arial';
      ctx.fillText(
        `⌀ ${shape.realDiameter} ${shape.unit}`,
        shape.centerX,
        shape.centerY
      );
      
      // Draw handles if selected
      if (isSelected) {
        // Center point
        ctx.beginPath();
        ctx.arc(shape.centerX, shape.centerY, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#00A5FF';
        ctx.fill();
        
        // Edge points (4 points on the circle)
        [0, Math.PI/2, Math.PI, 3*Math.PI/2].forEach(angle => {
          const x = shape.centerX + shape.radiusPixels * Math.cos(angle);
          const y = shape.centerY + shape.radiusPixels * Math.sin(angle);
          
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#00A5FF';
          ctx.fill();
        });
      }
    }
  });
  
  // Draw current line being drawn
  if (currentLine) {
    ctx.beginPath();
    ctx.moveTo(currentLine.startX, currentLine.startY);
    ctx.lineTo(currentLine.endX, currentLine.endY);
    ctx.strokeStyle = isDrawingReference ? '#00FF00' : '#FF0000';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Show current length while drawing
    const pixelDist = calculateDistance(
      currentLine.startX,
      currentLine.startY,
      currentLine.endX,
      currentLine.endY
    );
    
    let displayDist = pixelDist;
    let unit = 'px';
    
    if (scale && isDrawingMeasurement) {
      displayDist = (pixelDist * scale.ratio).toFixed(2);
      unit = scale.unit;
    }
    
    const midX = (currentLine.startX + currentLine.endX) / 2;
    const midY = (currentLine.startY + currentLine.endY) / 2;
    ctx.fillStyle = isDrawingReference ? '#00FF00' : '#FF0000';
    ctx.font = '14px Arial';
    ctx.fillText(`${displayDist} ${unit}`, midX + 5, midY - 5);
  }
  
  // Draw current shape being drawn
  if (currentShape) {
    if (currentShape.type === 'rectangle') {
      // Calculate normalized coordinates
      const startX = Math.min(currentShape.startX, currentShape.endX);
      const startY = Math.min(currentShape.startY, currentShape.endY);
      const width = Math.abs(currentShape.endX - currentShape.startX);
      const height = Math.abs(currentShape.endY - currentShape.startY);
      
      // Draw rectangle
      ctx.beginPath();
      ctx.rect(startX, startY, width, height);
      ctx.strokeStyle = '#FFA500'; // orange
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Display dimensions
      if (scale) {
        const realWidth = (width * scale.ratio).toFixed(2);
        const realHeight = (height * scale.ratio).toFixed(2);
        
        const centerX = startX + width / 2;
        const centerY = startY + height / 2;
        
        ctx.fillStyle = '#FFA500';
        ctx.font = '14px Arial';
        ctx.fillText(
          `${realWidth} × ${realHeight} ${scale.unit}`,
          centerX,
          centerY
        );
      }
    } else if (currentShape.type === 'circle') {
      // Calculate center and radius
      const centerX = (currentShape.startX + currentShape.endX) / 2;
      const centerY = (currentShape.startY + currentShape.endY) / 2;
      
      // Radius calculation (max of width/2 or height/2)
      const width = Math.abs(currentShape.endX - currentShape.startX);
      const height = Math.abs(currentShape.endY - currentShape.startY);
      const radius = Math.max(width, height) / 2;
      
      // Draw circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = '#00BFFF'; // light blue
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Display diameter
      if (scale) {
        const realDiameter = (radius * 2 * scale.ratio).toFixed(2);
        
        ctx.fillStyle = '#00BFFF';
        ctx.font = '14px Arial';
        ctx.fillText(
          `⌀ ${realDiameter} ${scale.unit}`,
          centerX,
          centerY
        );
      }
    }
  }
}

// Event Handlers
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    image = new Image();
    image.onload = () => {
      // Clear existing data
      scale = null;
      measurements = [];
      shapes = [];
      
      // Hide placeholder, show canvas
      placeholder.style.display = 'none';
      
      // Enable buttons
      referenceBtn.disabled = false;
      downloadBtn.disabled = false;
      
      // Update UI
      setStatus('Set reference scale by clicking "Set Reference Scale" button');
      renderCanvas();
      updateMeasurementsList();
    };
    image.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function startReferenceScale() {
  if (!image) return;
  
  isDrawingReference = true;
  isDrawingMeasurement = false;
  isDrawingRectangle = false;
  isDrawingCircle = false;
  isSelectMode = false;
  selectedItem = null;
  currentLine = null;
  currentShape = null;
  
  // Update UI
  setStatus('Click and drag to draw reference line');
  
  // Update button states
  referenceBtn.classList.add('active');
  measureBtn.classList.remove('active');
  rectBtn.classList.remove('active');
  circleBtn.classList.remove('active');
  selectBtn.classList.remove('active');
  
  // Hide action buttons
  deleteBtn.style.display = 'none';
  editReferenceBtn.style.display = 'none';
}

function startMeasuring() {
  if (!scale) {
    setStatus('Please set reference scale first');
    return;
  }
  
  isDrawingMeasurement = true;
  isDrawingReference = false;
  isDrawingRectangle = false;
  isDrawingCircle = false;
  isSelectMode = false;
  selectedItem = null;
  currentLine = null;
  currentShape = null;
  
  // Update UI
  setStatus('Click and drag to measure');
  
  // Update button states
  referenceBtn.classList.remove('active');
  measureBtn.classList.add('active');
  rectBtn.classList.remove('active');
  circleBtn.classList.remove('active');
  selectBtn.classList.remove('active');
  
  // Hide action buttons
  deleteBtn.style.display = 'none';
  editReferenceBtn.style.display = 'none';
}

function startDrawingRectangle() {
  if (!scale) {
    setStatus('Please set reference scale first');
    return;
  }
  
  isDrawingRectangle = true;
  isDrawingMeasurement = false;
  isDrawingReference = false;
  isDrawingCircle = false;
  isSelectMode = false;
  selectedItem = null;
  currentLine = null;
  currentShape = null;
  
  // Update UI
  setStatus('Click and drag to draw a rectangle');
  
  // Update button states
  referenceBtn.classList.remove('active');
  measureBtn.classList.remove('active');
  rectBtn.classList.add('active');
  circleBtn.classList.remove('active');
  selectBtn.classList.remove('active');
  
  // Hide action buttons
  deleteBtn.style.display = 'none';
  editReferenceBtn.style.display = 'none';
}

function startDrawingCircle() {
  if (!scale) {
    setStatus('Please set reference scale first');
    return;
  }
  
  isDrawingCircle = true;
  isDrawingMeasurement = false;
  isDrawingReference = false;
  isDrawingRectangle = false;
  isSelectMode = false;
  selectedItem = null;
  currentLine = null;
  currentShape = null;
  
  // Update UI
  setStatus('Click and drag to draw a circle');
  
  // Update button states
  referenceBtn.classList.remove('active');
  measureBtn.classList.remove('active');
  rectBtn.classList.remove('active');
  circleBtn.classList.add('active');
  selectBtn.classList.remove('active');
  
  // Hide action buttons
  deleteBtn.style.display = 'none';
  editReferenceBtn.style.display = 'none';
}

function toggleSelectMode() {
  isSelectMode = !isSelectMode;
  isDrawingReference = false;
  isDrawingMeasurement = false;
  isDrawingRectangle = false;
  isDrawingCircle = false;
  currentLine = null;
  currentShape = null;
  
  if (isSelectMode) {
    selectedItem = null;
    setStatus('Select mode activated. Click on an item to select it.');
    selectBtn.classList.add('active');
  } else {
    selectedItem = null;
    setStatus('Select mode deactivated.');
    selectBtn.classList.remove('active');
    
    // Hide action buttons
    deleteBtn.style.display = 'none';
    editReferenceBtn.style.display = 'none';
  }
  
  // Update button states
  referenceBtn.classList.remove('active');
  measureBtn.classList.remove('active');
  rectBtn.classList.remove('active');
  circleBtn.classList.remove('active');
  
  renderCanvas();
}

function deleteSelectedItem() {
  if (!selectedItem) {
    setStatus('No item selected.');
    return;
  }
  
  if (selectedItem.type === 'reference') {
    // Just hide the reference, don't delete it
    showReference = false;
    selectedItem = null;
    setStatus('Reference line hidden.');
    
    // Update toggle button text
    toggleReferenceBtn.textContent = 'Show Reference';
    
    // Hide action buttons
    deleteBtn.style.display = 'none';
    editReferenceBtn.style.display = 'none';
  } else if (selectedItem.type === 'line') {
    // Remove the line from measurements
    measurements.splice(selectedItem.index, 1);
    selectedItem = null;
    setStatus('Line deleted.');
    
    // Hide action buttons
    deleteBtn.style.display = 'none';
  } else {
    // Remove the shape from shapes
    shapes.splice(selectedItem.index, 1);
    selectedItem = null;
    setStatus('Shape deleted.');
    
    // Hide action buttons
    deleteBtn.style.display = 'none';
  }
  
  renderCanvas();
  updateMeasurementsList();
}

function toggleReferenceVisibility() {
  showReference = !showReference;
  toggleReferenceBtn.textContent = showReference ? 'Hide Reference' : 'Show Reference';
  
  if (selectedItem && selectedItem.type === 'reference') {
    selectedItem = null;
    deleteBtn.style.display = 'none';
    editReferenceBtn.style.display = 'none';
  }
  
  renderCanvas();
}

function openEditReferenceModal() {
  if (!scale) return;
  
  editReferenceValue.value = scale.realLength;
  editReferenceUnit.textContent = scale.unit;
  editReferenceModal.style.display = 'flex';
}

function closeEditReferenceModal() {
  editReferenceModal.style.display = 'none';
}

function updateReferenceValue() {
  if (!scale) return;
  
  const newValue = parseFloat(editReferenceValue.value);
  if (isNaN(newValue) || newValue <= 0) {
    setStatus('Please enter a valid reference length');
    return;
  }
  
  // Calculate new ratio based on the updated value
  const newRatio = newValue / scale.pixelDistance;
  
  // Calculate ratio change factor
  const ratioChange = newRatio / scale.ratio;
  
  // Update scale with new values
  scale.realLength = newValue;
  scale.ratio = newRatio;
  
  // Update measurements with new ratio
  measurements = measurements.map(measurement => ({
    ...measurement,
    realDistance: (parseFloat(measurement.realDistance) * ratioChange).toFixed(2)
  }));
  
  // Update shapes with new ratio
  shapes = shapes.map(shape => {
    if (shape.type === 'rectangle') {
      return {
        ...shape,
        realWidth: (parseFloat(shape.realWidth) * ratioChange).toFixed(2),
        realHeight: (parseFloat(shape.realHeight) * ratioChange).toFixed(2)
      };
    } else if (shape.type === 'circle') {
      return {
        ...shape,
        realDiameter: (parseFloat(shape.realDiameter) * ratioChange).toFixed(2)
      };
    }
    return shape;
  });
  
  closeEditReferenceModal();
  setStatus(`Reference scale updated to: ${newValue} ${scale.unit}`);
  renderCanvas();
  updateMeasurementsList();
}

function downloadImage() {
  if (!canvas || !image) return;
  
  try {
    // Convert canvas to data URL
    const dataUrl = canvas.toDataURL('image/png');
    
    // Create a download link
    const link = document.createElement('a');
    link.download = 'measured-image.png';
    link.href = dataUrl;
    
    // Append to body and trigger click
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(dataUrl);
    }, 100);
    
    setStatus('Image downloaded successfully!');
  } catch (err) {
    setStatus('Error downloading image: ' + err.message);
  }
}

// Canvas mouse event handlers
function handleCanvasMouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  if (isSelectMode) {
    // Check if clicked on any item
    let found = false;
    
    // Check if clicked on reference line
    if (scale && showReference && isPointNearLine(x, y, scale)) {
      selectedItem = { type: 'reference', index: -1 };
      isDragging = true;
      dragOffset = { 
        x: x - (scale.startX + scale.endX) / 2, 
        y: y - (scale.startY + scale.endY) / 2 
      };
      
      // Show action buttons
      deleteBtn.style.display = 'inline-block';
      deleteBtn.textContent = 'Hide Reference';
      editReferenceBtn.style.display = 'inline-block';
      
      found = true;
    }
    
    // If not reference, check measurements (lines)
    if (!found) {
      for (let i = 0; i < measurements.length; i++) {
        if (isPointNearLine(x, y, measurements[i])) {
          selectedItem = { type: 'line', index: i };
          isDragging = true;
          dragOffset = { 
            x: x - (measurements[i].startX + measurements[i].endX) / 2, 
            y: y - (measurements[i].startY + measurements[i].endY) / 2 
          };
          
          // Show delete button, hide edit reference button
          deleteBtn.style.display = 'inline-block';
          deleteBtn.textContent = 'Delete Selected';
          editReferenceBtn.style.display = 'none';
          
          found = true;
          break;
        }
      }
    }
    
    // If not found in lines, check shapes
    if (!found) {
      for (let i = 0; i < shapes.length; i++) {
        const shape = shapes[i];
        if (
          (shape.type === 'rectangle' && isPointInRectangle(x, y, shape)) ||
          (shape.type === 'circle' && isPointInCircle(x, y, shape))
        ) {
          selectedItem = { type: 'shape', index: i };
          isDragging = true;
          
          if (shape.type === 'rectangle') {
            dragOffset = { 
              x: x - (shape.startX + shape.endX) / 2, 
              y: y - (shape.startY + shape.endY) / 2 
            };
          } else {
            dragOffset = { 
              x: x - shape.centerX, 
              y: y - shape.centerY 
            };
          }
          
          // Show delete button, hide edit reference button
          deleteBtn.style.display = 'inline-block';
          deleteBtn.textContent = 'Delete Selected';
          editReferenceBtn.style.display = 'none';
          
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      selectedItem = null;
      
      // Hide action buttons
      deleteBtn.style.display = 'none';
      editReferenceBtn.style.display = 'none';
    }
    
    renderCanvas();
  } else if (isDrawingReference || isDrawingMeasurement) {
    currentLine = {
      startX: x,
      startY: y,
      endX: x,
      endY: y
    };
  } else if (isDrawingRectangle || isDrawingCircle) {
    currentShape = {
      startX: x,
      startY: y,
      endX: x,
      endY: y,
      type: isDrawingRectangle ? 'rectangle' : 'circle'
    };
  }
}

function handleCanvasMouseMove(e) {
  if (!canvas) return;
  
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  if (isSelectMode && isDragging && selectedItem) {
    if (selectedItem.type === 'reference') {
      // Update reference line position
      const lineWidth = scale.endX - scale.startX;
      const lineHeight = scale.endY - scale.startY;
      
      // Calculate new center position
      const centerX = x - dragOffset.x;
      const centerY = y - dragOffset.y;
      
      // Update scale position
      scale.startX = centerX - lineWidth / 2;
      scale.startY = centerY - lineHeight / 2;
      scale.endX = centerX + lineWidth / 2;
      scale.endY = centerY + lineHeight / 2;
    } else if (selectedItem.type === 'line') {
      const line = measurements[selectedItem.index];
      const lineWidth = line.endX - line.startX;
      const lineHeight = line.endY - line.startY;
      
      // Calculate new center position
      const centerX = x - dragOffset.x;
      const centerY = y - dragOffset.y;
      
      // Update line position
      measurements[selectedItem.index].startX = centerX - lineWidth / 2;
      measurements[selectedItem.index].startY = centerY - lineHeight / 2;
      measurements[selectedItem.index].endX = centerX + lineWidth / 2;
      measurements[selectedItem.index].endY = centerY + lineHeight / 2;
    } else if (selectedItem.type === 'shape') {
      const shape = shapes[selectedItem.index];
      
      if (shape.type === 'rectangle') {
        // Calculate new center position
        const centerX = x - dragOffset.x;
        const centerY = y - dragOffset.y;
        
        // Calculate dimensions
        const width = shape.endX - shape.startX;
        const height = shape.endY - shape.startY;
        
        // Update shape position
        shapes[selectedItem.index].startX = centerX - width / 2;
        shapes[selectedItem.index].startY = centerY - height / 2;
        shapes[selectedItem.index].endX = centerX + width / 2;
        shapes[selectedItem.index].endY = centerY + height / 2;
      } else if (shape.type === 'circle') {
        // Update circle center
        const newCenterX = x - dragOffset.x;
        const newCenterY = y - dragOffset.y;
        
        shapes[selectedItem.index].centerX = newCenterX;
        shapes[selectedItem.index].centerY = newCenterY;
      }
    }
    
    renderCanvas();
  } else if (currentLine) {
    currentLine.endX = x;
    currentLine.endY = y;
    renderCanvas();
  } else if (currentShape) {
    currentShape.endX = x;
    currentShape.endY = y;
    renderCanvas();
  }
}

function handleCanvasMouseUp(e) {
  if (isDragging) {
    isDragging = false;
    renderCanvas();
    return;
  }
  
  if (!currentLine && !currentShape) return;
  
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  if (currentLine) {
    const finalLine = {
      ...currentLine,
      endX: x,
      endY: y
    };
    
    const pixelDistance = calculateDistance(
      finalLine.startX,
      finalLine.startY,
      finalLine.endX,
      finalLine.endY
    );
    
    // Only process if the line has some length (not just a click)
    if (pixelDistance > 5) {
      if (isDrawingReference) {
        // Ask user for reference length
        const length = parseFloat(referenceLengthInput.value);
        if (isNaN(length) || length <= 0) {
          setStatus('Please enter a valid reference length');
          currentLine = null;
          renderCanvas();
          return;
        }
        
        // Set scale (units per pixel)
        const newScale = length / pixelDistance;
        scale = {
          ...finalLine,
          pixelDistance,
          realLength: length,
          unit: referenceUnitSelect.value,
          ratio: newScale
        };
        
        // Enable additional buttons
        measureBtn.disabled = false;
        rectBtn.disabled = false;
        circleBtn.disabled = false;
        toggleReferenceBtn.disabled = false;
        selectBtn.disabled = false;
        
        isDrawingReference = false;
        referenceBtn.classList.remove('active');
        
        setStatus(`Reference scale set: ${length} ${referenceUnitSelect.value}`);
        
        showReference = true;
        toggleReferenceBtn.textContent = 'Hide Reference';
      } else if (isDrawingMeasurement) {
        // Calculate real-world measurement based on scale
        const realDistance = pixelDistance * scale.ratio;
        
        // Add to measurements list
        measurements.push({
          ...finalLine,
          pixelDistance,
          realDistance: realDistance.toFixed(2),
          unit: scale.unit
        });
        
        updateMeasurementsList();
      }
    }
    
    currentLine = null;
  } else if (currentShape) {
    const finalShape = {
      ...currentShape,
      endX: x,
      endY: y
    };
    
    // Normalize coordinates (ensure startX < endX and startY < endY)
    const normalizedShape = {
      ...finalShape,
      startX: Math.min(finalShape.startX, finalShape.endX),
      startY: Math.min(finalShape.startY, finalShape.endY),
      endX: Math.max(finalShape.startX, finalShape.endX),
      endY: Math.max(finalShape.startY, finalShape.endY)
    };
    
    // Only process if the shape has some size (not just a click)
    const width = normalizedShape.endX - normalizedShape.startX;
    const height = normalizedShape.endY - normalizedShape.startY;
    
    if (width > 5 && height > 5) {
      // Calculate dimensions for the shape
      if (finalShape.type === 'rectangle') {
        // Convert to real measurements using scale
        const realWidth = (width * scale.ratio).toFixed(2);
        const realHeight = (height * scale.ratio).toFixed(2);
        
        shapes.push({
          ...normalizedShape,
          realWidth,
          realHeight,
          unit: scale.unit
        });
      } else if (finalShape.type === 'circle') {
        // For circles, calculate the radius based on the distance from center to edge
        const centerX = (normalizedShape.startX + normalizedShape.endX) / 2;
        const centerY = (normalizedShape.startY + normalizedShape.endY) / 2;
        
        // Get radius in pixels (average of width/2 and height/2 to handle oval dragging)
        const radiusPixels = Math.max(width, height) / 2;
        
        // Convert to real measurements
        const realDiameter = (radiusPixels * 2 * scale.ratio).toFixed(2);
        
        shapes.push({
          type: 'circle',
          centerX,
          centerY,
          radiusPixels,
          realDiameter,
          unit: scale.unit
        });
      }
      
      updateMeasurementsList();
    }
    
    currentShape = null;
  }
  
  renderCanvas();
}

// Event Listeners
imageUpload.addEventListener('change', handleImageUpload);
referenceBtn.addEventListener('click', startReferenceScale);
measureBtn.addEventListener('click', startMeasuring);
rectBtn.addEventListener('click', startDrawingRectangle);
circleBtn.addEventListener('click', startDrawingCircle);
downloadBtn.addEventListener('click', downloadImage);
toggleReferenceBtn.addEventListener('click', toggleReferenceVisibility);
selectBtn.addEventListener('click', toggleSelectMode);
deleteBtn.addEventListener('click', deleteSelectedItem);
editReferenceBtn.addEventListener('click', openEditReferenceModal);
cancelEditBtn.addEventListener('click', closeEditReferenceModal);
updateReferenceBtn.addEventListener('click', updateReferenceValue);

canvas.addEventListener('mousedown', handleCanvasMouseDown);
canvas.addEventListener('mousemove', handleCanvasMouseMove);
canvas.addEventListener('mouseup', handleCanvasMouseUp);
canvas.addEventListener('mouseleave', () => {
  if (isDragging) {
    isDragging = false;
  }
  
  currentLine = null;
  currentShape = null;
  renderCanvas();
});

// Add button active state styles
document.querySelectorAll('.btn').forEach(button => {
  button.addEventListener('click', function() {
    if (this.classList.contains('active')) {
      this.classList.remove('active');
    }
  });
});

// Initialize the app
window.addEventListener('resize', renderCanvas);