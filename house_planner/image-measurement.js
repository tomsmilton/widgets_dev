// DOM Elements
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const canvasContainer = document.getElementById('canvasContainer');
const placeholder = document.getElementById('placeholder');
const statusEl = document.getElementById('status');
const propertiesPanel = document.getElementById('propertiesPanel');
const propertiesContent = document.querySelector('.properties-content');
const emptyPropertiesState = document.querySelector('.empty-state');
const emptyMeasurements = document.getElementById('emptyMeasurements');
const measurementGroups = document.getElementById('measurementGroups');

// Lists
const linesList = document.getElementById('linesList');
const rectanglesList = document.getElementById('rectanglesList');
const circlesList = document.getElementById('circlesList');
const linesCount = document.getElementById('linesCount');
const rectanglesCount = document.getElementById('rectanglesCount');
const circlesCount = document.getElementById('circlesCount');

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
const clearAllBtn = document.getElementById('clearAllBtn');
const editReferenceBtn = document.getElementById('editReferenceBtn');
const collapseAllBtn = document.getElementById('collapseAllBtn');
const expandAllBtn = document.getElementById('expandAllBtn');

// Reference inputs
const referenceLengthInput = document.getElementById('referenceLength');
const referenceUnitSelect = document.getElementById('referenceUnit');

// Property inputs
const fillOptionsContainer = document.querySelector('.fill-options');
const itemName = document.getElementById('itemName');
const itemColor = document.getElementById('itemColor');
const itemFill = document.getElementById('itemFill');
const itemOpacity = document.getElementById('itemOpacity');
const opacityValue = document.getElementById('opacityValue');

// Modal elements
const editReferenceModal = document.getElementById('editReferenceModal');
const editReferenceValue = document.getElementById('editReferenceValue');
const editReferenceUnit = document.getElementById('editReferenceUnit');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const updateReferenceBtn = document.getElementById('updateReferenceBtn');
const closeModalBtn = document.getElementById('closeModalBtn');

// Default colors
const DEFAULT_COLORS = {
  line: '#FF0000',      // Red
  rectangle: '#FFA500', // Orange
  circle: '#00BFFF'     // Light blue
};

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

// Generate a unique ID for each measurement
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Convert hex color to rgba
function hexToRgba(hex, opacity) {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// Function to adjust color brightness
function adjustColor(hex, percent) {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert to RGB
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  
  // Adjust brightness
  r = Math.max(0, Math.min(255, r + percent));
  g = Math.max(0, Math.min(255, g + percent));
  b = Math.max(0, Math.min(255, b + percent));
  
  // Convert back to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Toggle active state for tool buttons
function setActiveButton(button) {
  // Remove active class from all buttons
  [referenceBtn, measureBtn, rectBtn, circleBtn, selectBtn].forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Add active class to the selected button
  if (button) {
    button.classList.add('active');
  }
}

// Reset all active drawing states
function resetDrawingStates() {
  isDrawingReference = false;
  isDrawingMeasurement = false;
  isDrawingRectangle = false;
  isDrawingCircle = false;
  isSelectMode = false;
  currentLine = null;
  currentShape = null;
  
  setActiveButton(null);
}

// Update the opacity display when slider changes
itemOpacity.addEventListener('input', function() {
  opacityValue.textContent = `${this.value}%`;
});

// Toggle group collapse/expand
function toggleGroup(header, list) {
  if (list.style.display === 'none') {
    list.style.display = 'block';
    header.classList.remove('collapsed');
  } else {
    list.style.display = 'none';
    header.classList.add('collapsed');
  }
}

// Add click listeners to group headers
document.querySelectorAll('.measurement-group-header').forEach(header => {
  const groupId = header.parentElement.id;
  const list = document.getElementById(groupId === 'linesGroup' ? 'linesList' : 
                                       groupId === 'rectanglesGroup' ? 'rectanglesList' : 
                                       'circlesList');
  
  header.addEventListener('click', () => toggleGroup(header, list));
});

// Collapse all groups
collapseAllBtn.addEventListener('click', () => {
  [linesList, rectanglesList, circlesList].forEach(list => {
    list.style.display = 'none';
  });
  document.querySelectorAll('.measurement-group-header').forEach(header => {
    header.classList.add('collapsed');
  });
});

// Expand all groups
expandAllBtn.addEventListener('click', () => {
  [linesList, rectanglesList, circlesList].forEach(list => {
    list.style.display = 'block';
  });
  document.querySelectorAll('.measurement-group-header').forEach(header => {
    header.classList.remove('collapsed');
  });
});

// Update the measurements lists in the UI
function updateMeasurementsList() {
  // Clear the lists
  linesList.innerHTML = '';
  rectanglesList.innerHTML = '';
  circlesList.innerHTML = '';
  
  // Filter out deleted items
  const linesFiltered = measurements.filter(m => !m.deleted);
  const rectanglesFiltered = shapes.filter(s => s.type === 'rectangle' && !s.deleted);
  const circlesFiltered = shapes.filter(s => s.type === 'circle' && !s.deleted);
  
  // Update counts
  linesCount.textContent = linesFiltered.length;
  rectanglesCount.textContent = rectanglesFiltered.length;
  circlesCount.textContent = circlesFiltered.length;
  
  // Show/hide empty state
  if (linesFiltered.length === 0 && rectanglesFiltered.length === 0 && circlesFiltered.length === 0) {
    emptyMeasurements.style.display = 'flex';
    measurementGroups.style.display = 'none';
    clearAllBtn.disabled = true;
  } else {
    emptyMeasurements.style.display = 'none';
    measurementGroups.style.display = 'block';
    clearAllBtn.disabled = false;
  }
  
  // Add lines
  linesFiltered.forEach((line, index) => {
    const li = document.createElement('li');
    li.id = `line-${line.id}`;
    if (selectedItem && selectedItem.type === 'line' && selectedItem.id === line.id) {
      li.classList.add('selected');
    }
    
    const colorPreview = document.createElement('div');
    colorPreview.className = 'color-preview';
    colorPreview.style.backgroundColor = line.color || DEFAULT_COLORS.line;
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'measurement-name';
    const label = line.name || `Line ${index + 1}`;
    nameSpan.textContent = `${label}: ${line.realDistance} ${line.unit}`;
    
    const itemInfo = document.createElement('div');
    itemInfo.className = 'measurement-item';
    itemInfo.appendChild(colorPreview);
    itemInfo.appendChild(nameSpan);
    
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    
    const deleteAction = document.createElement('button');
    deleteAction.className = 'item-btn delete';
    deleteAction.innerHTML = '<i class="fas fa-times"></i>';
    deleteAction.title = 'Delete';
    deleteAction.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteMeasurement('line', line.id);
    });
    
    actions.appendChild(deleteAction);
    
    li.appendChild(itemInfo);
    li.appendChild(actions);
    
    li.addEventListener('click', () => {
      selectMeasurement('line', line.id);
    });
    
    linesList.appendChild(li);
  });
  
  // Add rectangles
  rectanglesFiltered.forEach((rect, index) => {
    const li = document.createElement('li');
    li.id = `rectangle-${rect.id}`;
    if (selectedItem && selectedItem.type === 'shape' && selectedItem.id === rect.id) {
      li.classList.add('selected');
    }
    
    const colorPreview = document.createElement('div');
    colorPreview.className = 'color-preview';
    colorPreview.style.backgroundColor = rect.color || DEFAULT_COLORS.rectangle;
    if (rect.fill) {
      colorPreview.style.border = `1px solid ${rect.color || DEFAULT_COLORS.rectangle}`;
      colorPreview.style.backgroundColor = hexToRgba(rect.color || DEFAULT_COLORS.rectangle, rect.fillOpacity || 0.3);
    }
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'measurement-name';
    const label = rect.name || `Rectangle ${index + 1}`;
    nameSpan.textContent = `${label}: ${rect.realWidth} × ${rect.realHeight} ${rect.unit}`;
    
    const itemInfo = document.createElement('div');
    itemInfo.className = 'measurement-item';
    itemInfo.appendChild(colorPreview);
    itemInfo.appendChild(nameSpan);
    
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    
    const deleteAction = document.createElement('button');
    deleteAction.className = 'item-btn delete';
    deleteAction.innerHTML = '<i class="fas fa-times"></i>';
    deleteAction.title = 'Delete';
    deleteAction.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteMeasurement('rectangle', rect.id);
    });
    
    actions.appendChild(deleteAction);
    
    li.appendChild(itemInfo);
    li.appendChild(actions);
    
    li.addEventListener('click', () => {
      selectMeasurement('rectangle', rect.id);
    });
    
    rectanglesList.appendChild(li);
  });
  
  // Add circles
  circlesFiltered.forEach((circle, index) => {
    const li = document.createElement('li');
    li.id = `circle-${circle.id}`;
    if (selectedItem && selectedItem.type === 'shape' && selectedItem.id === circle.id) {
      li.classList.add('selected');
    }
    
    const colorPreview = document.createElement('div');
    colorPreview.className = 'color-preview';
    colorPreview.style.backgroundColor = circle.color || DEFAULT_COLORS.circle;
    colorPreview.style.borderRadius = '50%';
    if (circle.fill) {
      colorPreview.style.border = `1px solid ${circle.color || DEFAULT_COLORS.circle}`;
      colorPreview.style.backgroundColor = hexToRgba(circle.color || DEFAULT_COLORS.circle, circle.fillOpacity || 0.3);
    }
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'measurement-name';
    const label = circle.name || `Circle ${index + 1}`;
    nameSpan.textContent = `${label}: ⌀ ${circle.realDiameter} ${circle.unit}`;
    
    const itemInfo = document.createElement('div');
    itemInfo.className = 'measurement-item';
    itemInfo.appendChild(colorPreview);
    itemInfo.appendChild(nameSpan);
    
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    
    const deleteAction = document.createElement('button');
    deleteAction.className = 'item-btn delete';
    deleteAction.innerHTML = '<i class="fas fa-times"></i>';
    deleteAction.title = 'Delete';
    deleteAction.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteMeasurement('circle', circle.id);
    });
    
    actions.appendChild(deleteAction);
    
    li.appendChild(itemInfo);
    li.appendChild(actions);
    
    li.addEventListener('click', () => {
      selectMeasurement('circle', circle.id);
    });
    
    circlesList.appendChild(li);
  });
}

// Select a measurement by ID
function selectMeasurement(type, id) {
  // Exit any drawing mode and enter select mode
  resetDrawingStates();
  isSelectMode = true;
  setActiveButton(selectBtn);
  
  if (type === 'line') {
    const lineIndex = measurements.findIndex(m => m.id === id);
    if (lineIndex !== -1) {
      selectedItem = {
        type: 'line',
        id: id,
        index: lineIndex
      };
      
      // Update properties panel
      showPropertiesPanel();
      
      // Update form values
      itemName.value = measurements[lineIndex].name || '';
      itemColor.value = measurements[lineIndex].color || DEFAULT_COLORS.line;
      
      // Hide fill options for lines
      fillOptionsContainer.classList.remove('visible');
    }
  } else if (type === 'rectangle' || type === 'circle') {
    const shapeIndex = shapes.findIndex(s => s.id === id);
    if (shapeIndex !== -1) {
      selectedItem = {
        type: 'shape',
        id: id,
        index: shapeIndex
      };
      
      // Update properties panel
      showPropertiesPanel();
      
      // Update form values
      itemName.value = shapes[shapeIndex].name || '';
      itemColor.value = shapes[shapeIndex].color || (type === 'rectangle' ? DEFAULT_COLORS.rectangle : DEFAULT_COLORS.circle);
      itemFill.checked = shapes[shapeIndex].fill || false;
      itemOpacity.value = shapes[shapeIndex].fillOpacity !== undefined ? shapes[shapeIndex].fillOpacity * 100 : 30;
      opacityValue.textContent = `${itemOpacity.value}%`;
      
      // Show fill options for shapes
      fillOptionsContainer.classList.add('visible');
      itemOpacity.disabled = !itemFill.checked;
    }
  }
  
  updateMeasurementsList();
  renderCanvas();
}

// Delete a measurement by ID
function deleteMeasurement(type, id) {
  if (type === 'line') {
    const index = measurements.findIndex(m => m.id === id);
    if (index !== -1) {
      // Mark as deleted instead of removing from array to preserve indexes
      measurements[index].deleted = true;
      
      if (selectedItem && selectedItem.type === 'line' && selectedItem.id === id) {
        selectedItem = null;
        hidePropertiesPanel();
      }
    }
  } else if (type === 'rectangle' || type === 'circle') {
    const index = shapes.findIndex(s => s.id === id);
    if (index !== -1) {
      // Mark as deleted instead of removing from array to preserve indexes
      shapes[index].deleted = true;
      
      if (selectedItem && selectedItem.type === 'shape' && selectedItem.id === id) {
        selectedItem = null;
        hidePropertiesPanel();
      }
    }
  }
  
  updateMeasurementsList();
  renderCanvas();
}

// Clear all measurements
function clearAllMeasurements() {
  if (confirm('Are you sure you want to delete all measurements?')) {
    measurements = [];
    shapes = [];
    selectedItem = null;
    hidePropertiesPanel();
    updateMeasurementsList();
    renderCanvas();
    setStatus('All measurements cleared');
  }
}

// Show properties panel with content
function showPropertiesPanel() {
  emptyPropertiesState.style.display = 'none';
  propertiesContent.style.display = 'block';

  // Show reference edit button if reference is selected
  if (selectedItem && selectedItem.type === 'reference') {
    editReferenceBtn.style.display = 'inline-flex';
  } else {
    editReferenceBtn.style.display = 'none';
  }
}

// Hide properties panel content and show empty state
function hidePropertiesPanel() {
  emptyPropertiesState.style.display = 'block';
  propertiesContent.style.display = 'none';
}

// Apply style changes to the selected item
function applyStyleChanges() {
  if (!selectedItem) return;
  
  if (selectedItem.type === 'line') {
    const line = measurements[selectedItem.index];
    line.name = itemName.value;
    line.color = itemColor.value;
  } else if (selectedItem.type === 'shape') {
    const shape = shapes[selectedItem.index];
    shape.name = itemName.value;
    shape.color = itemColor.value;
    shape.fill = itemFill.checked;
    shape.fillOpacity = itemFill.checked ? itemOpacity.value / 100 : 0.3;
  }
  
  updateMeasurementsList();
  renderCanvas();
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
  measurements.forEach((line) => {
    // Skip deleted measurements
    if (line.deleted) return;
    
    const isSelected = selectedItem && selectedItem.type === 'line' && selectedItem.id === line.id;
    const lineColor = line.color || DEFAULT_COLORS.line;
    
    ctx.beginPath();
    ctx.moveTo(line.startX, line.startY);
    ctx.lineTo(line.endX, line.endY);
    ctx.strokeStyle = isSelected ? adjustColor(lineColor, -30) : lineColor; // Darker if selected
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.stroke();
    
    // Draw measurement label
    const midX = (line.startX + line.endX) / 2;
    const midY = (line.startY + line.endY) / 2;
    ctx.fillStyle = isSelected ? adjustColor(lineColor, -30) : lineColor;
    ctx.font = isSelected ? 'bold 14px Arial' : '14px Arial';
    
    const label = line.name ? `${line.name}: ${line.realDistance} ${line.unit}` : `${line.realDistance} ${line.unit}`;
    
    // Background for text
    const textWidth = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(midX + 5, midY - 20, textWidth + 6, 20);
    
    // Draw text
    ctx.fillStyle = isSelected ? adjustColor(lineColor, -30) : lineColor;
    ctx.fillText(label, midX + 8, midY - 5);
    
    // Draw handles if selected
    if (isSelected) {
      // Start handle
      ctx.beginPath();
      ctx.arc(line.startX, line.startY, 4, 0, 2 * Math.PI);
      ctx.fillStyle = adjustColor(lineColor, -30);
      ctx.fill();
      
      // End handle
      ctx.beginPath();
      ctx.arc(line.endX, line.endY, 4, 0, 2 * Math.PI);
      ctx.fillStyle = adjustColor(lineColor, -30);
      ctx.fill();
    }
  });
  
  // Draw shapes
  shapes.forEach((shape) => {
    // Skip deleted shapes
    if (shape.deleted) return;
    
    const isSelected = selectedItem && selectedItem.type === 'shape' && selectedItem.id === shape.id;
    
    if (shape.type === 'rectangle') {
      const rectColor = shape.color || DEFAULT_COLORS.rectangle;
      
      // Draw rectangle fill if enabled
      if (shape.fill) {
        ctx.beginPath();
        ctx.rect(
          shape.startX,
          shape.startY,
          shape.endX - shape.startX,
          shape.endY - shape.startY
        );
        ctx.fillStyle = hexToRgba(rectColor, shape.fillOpacity || 0.3);
        ctx.fill();
      }
      
      // Draw rectangle outline
      ctx.beginPath();
      ctx.rect(
        shape.startX,
        shape.startY,
        shape.endX - shape.startX,
        shape.endY - shape.startY
      );
      ctx.strokeStyle = isSelected ? adjustColor(rectColor, -30) : rectColor; // Darker if selected
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();
      
      // Draw dimensions
      const centerX = (shape.startX + shape.endX) / 2;
      const centerY = (shape.startY + shape.endY) / 2;
      
      const label = shape.name ? 
        `${shape.name}: ${shape.realWidth} × ${shape.realHeight} ${shape.unit}` : 
        `${shape.realWidth} × ${shape.realHeight} ${shape.unit}`;
      
      // Background for text
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(centerX - textWidth/2 - 3, centerY - 10, textWidth + 6, 20);
      
      // Draw text
      ctx.fillStyle = isSelected ? adjustColor(rectColor, -30) : rectColor;
      ctx.font = isSelected ? 'bold 14px Arial' : '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(label, centerX, centerY + 5);
      ctx.textAlign = 'left'; // Reset alignment
      
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
          ctx.fillStyle = adjustColor(rectColor, -30);
          ctx.fill();
        });
      }
    } else if (shape.type === 'circle') {
      const circleColor = shape.color || DEFAULT_COLORS.circle;
      
      // Draw circle fill if enabled
      if (shape.fill) {
        ctx.beginPath();
        ctx.arc(
          shape.centerX,
          shape.centerY,
          shape.radiusPixels,
          0,
          2 * Math.PI
        );
        ctx.fillStyle = hexToRgba(circleColor, shape.fillOpacity || 0.3);
        ctx.fill();
      }
      
      // Draw circle outline
      ctx.beginPath();
      ctx.arc(
        shape.centerX,
        shape.centerY,
        shape.radiusPixels,
        0,
        2 * Math.PI
      );
      ctx.strokeStyle = isSelected ? adjustColor(circleColor, -30) : circleColor; // Darker if selected
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();
      
      // Draw diameter text
      const label = shape.name ? 
        `${shape.name}: ⌀ ${shape.realDiameter} ${shape.unit}` : 
        `⌀ ${shape.realDiameter} ${shape.unit}`;
      
      // Background for text
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(shape.centerX - textWidth/2 - 3, shape.centerY - 10, textWidth + 6, 20);
      
      // Draw text
      ctx.fillStyle = isSelected ? adjustColor(circleColor, -30) : circleColor;
      ctx.font = isSelected ? 'bold 14px Arial' : '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(label, shape.centerX, shape.centerY + 5);
      ctx.textAlign = 'left'; // Reset alignment
      
      // Draw handles if selected
      if (isSelected) {
        // Center point
        ctx.beginPath();
        ctx.arc(shape.centerX, shape.centerY, 4, 0, 2 * Math.PI);
        ctx.fillStyle = adjustColor(circleColor, -30);
        ctx.fill();
        
        // Edge points (4 points on the circle)
        [0, Math.PI/2, Math.PI, 3*Math.PI/2].forEach(angle => {
          const x = shape.centerX + shape.radiusPixels * Math.cos(angle);
          const y = shape.centerY + shape.radiusPixels * Math.sin(angle);
          
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = adjustColor(circleColor, -30);
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
    ctx.strokeStyle = isDrawingReference ? '#00FF00' : DEFAULT_COLORS.line;
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
    
    // Background for text
    const label = `${displayDist} ${unit}`;
    const textWidth = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(midX + 5, midY - 20, textWidth + 6, 20);
    
    // Draw text
    ctx.fillStyle = isDrawingReference ? '#00FF00' : DEFAULT_COLORS.line;
    ctx.font = '14px Arial';
    ctx.fillText(label, midX + 8, midY - 5);
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
      ctx.strokeStyle = DEFAULT_COLORS.rectangle;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Display dimensions
      if (scale) {
        const realWidth = (width * scale.ratio).toFixed(2);
        const realHeight = (height * scale.ratio).toFixed(2);
        
        const centerX = startX + width / 2;
        const centerY = startY + height / 2;
        
        const label = `${realWidth} × ${realHeight} ${scale.unit}`;
        
        // Background for text
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(centerX - textWidth/2 - 3, centerY - 10, textWidth + 6, 20);
        
        // Draw text
        ctx.fillStyle = DEFAULT_COLORS.rectangle;
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, centerX, centerY + 5);
        ctx.textAlign = 'left'; // Reset alignment
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
      ctx.strokeStyle = DEFAULT_COLORS.circle;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Display diameter
      if (scale) {
        const realDiameter = (radius * 2 * scale.ratio).toFixed(2);
        
        const label = `⌀ ${realDiameter} ${scale.unit}`;
        
        // Background for text
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(centerX - textWidth/2 - 3, centerY - 10, textWidth + 6, 20);
        
        // Draw text
        ctx.fillStyle = DEFAULT_COLORS.circle;
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, centerX, centerY + 5);
        ctx.textAlign = 'left'; // Reset alignment
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
      selectedItem = null;
      hidePropertiesPanel();
      
      // Hide placeholder, show canvas
      placeholder.style.display = 'none';
      
      // Enable buttons
      referenceBtn.disabled = false;
      downloadBtn.disabled = false;
      
      // Reset all drawing states
      resetDrawingStates();
      
      // Update UI
      setStatus('Set a reference scale by clicking the ruler icon');
      renderCanvas();
      updateMeasurementsList();
    };
    image.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function startReferenceScale() {
  if (!image) return;
  
  // Reset all drawing states
  resetDrawingStates();
  
  isDrawingReference = true;
  currentLine = null;
  currentShape = null;
  selectedItem = null;
  hidePropertiesPanel();
  
  // Update UI
  setStatus('Click and drag to draw a reference line');
  setActiveButton(referenceBtn);
}

function startMeasuring() {
  if (!scale) {
    setStatus('Please set a reference scale first');
    return;
  }
  
  // Reset all drawing states
  resetDrawingStates();
  
  isDrawingMeasurement = true;
  currentLine = null;
  currentShape = null;
  selectedItem = null;
  hidePropertiesPanel();
  
  // Update UI
  setStatus('Click and drag to measure a distance');
  setActiveButton(measureBtn);
}

function startDrawingRectangle() {
  if (!scale) {
    setStatus('Please set a reference scale first');
    return;
  }
  
  // Reset all drawing states
  resetDrawingStates();
  
  isDrawingRectangle = true;
  currentLine = null;
  currentShape = null;
  selectedItem = null;
  hidePropertiesPanel();
  
  // Update UI
  setStatus('Click and drag to draw a rectangle');
  setActiveButton(rectBtn);
}

function startDrawingCircle() {
  if (!scale) {
    setStatus('Please set a reference scale first');
    return;
  }
  
  // Reset all drawing states
  resetDrawingStates();
  
  isDrawingCircle = true;
  currentLine = null;
  currentShape = null;
  selectedItem = null;
  hidePropertiesPanel();
  
  // Update UI
  setStatus('Click and drag to draw a circle');
  setActiveButton(circleBtn);
}

function toggleSelectMode() {
  // Reset all drawing states
  resetDrawingStates();
  
  isSelectMode = !isSelectMode;
  
  if (isSelectMode) {
    if (!selectedItem) {
      hidePropertiesPanel();
    }
    setStatus('Click on an item to select and edit it');
    setActiveButton(selectBtn);
  } else {
    selectedItem = null;
    hidePropertiesPanel();
    setStatus('Select a tool to continue');
    setActiveButton(null);
  }
  
  renderCanvas();
  updateMeasurementsList();
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
    hidePropertiesPanel();
    setStatus('Reference line hidden');
    
    // Update toggle button icon
    toggleReferenceBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
  } else if (selectedItem.type === 'line') {
    // Mark as deleted
    measurements[selectedItem.index].deleted = true;
    selectedItem = null;
    hidePropertiesPanel();
    setStatus('Line deleted');
  } else if (selectedItem.type === 'shape') {
    // Mark as deleted
    shapes[selectedItem.index].deleted = true;
    selectedItem = null;
    hidePropertiesPanel();
    setStatus('Shape deleted');
  }
  
  renderCanvas();
  updateMeasurementsList();
}

function toggleReferenceVisibility() {
  if (!scale) return;
  
  showReference = !showReference;
  
  // Update button icon
  toggleReferenceBtn.innerHTML = showReference ? 
    '<i class="fas fa-eye"></i>' : 
    '<i class="fas fa-eye-slash"></i>';
  
  // Update tooltip
  toggleReferenceBtn.title = showReference ? 
    'Hide Reference Scale' : 
    'Show Reference Scale';
  
  if (selectedItem && selectedItem.type === 'reference') {
    selectedItem = null;
    hidePropertiesPanel();
  }
  
  if (showReference) {
    setStatus('Reference scale visible');
  } else {
    setStatus('Reference scale hidden');
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
  measurements.forEach(measurement => {
    if (!measurement.deleted) {
      measurement.realDistance = (parseFloat(measurement.realDistance) * ratioChange).toFixed(2);
    }
  });
  
  // Update shapes with new ratio
  shapes.forEach(shape => {
    if (!shape.deleted) {
      if (shape.type === 'rectangle') {
        shape.realWidth = (parseFloat(shape.realWidth) * ratioChange).toFixed(2);
        shape.realHeight = (parseFloat(shape.realHeight) * ratioChange).toFixed(2);
      } else if (shape.type === 'circle') {
        shape.realDiameter = (parseFloat(shape.realDiameter) * ratioChange).toFixed(2);
      }
    }
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
      selectedItem = { type: 'reference' };
      isDragging = true;
      dragOffset = { 
        x: x - (scale.startX + scale.endX) / 2, 
        y: y - (scale.startY + scale.endY) / 2 
      };
      
      // Show properties panel with edit reference button
      showPropertiesPanel();
      editReferenceBtn.style.display = 'inline-flex';
      fillOptionsContainer.classList.remove('visible');
      
      found = true;
    }
    
    // If not reference, check measurements (lines)
    if (!found) {
      for (let i = 0; i < measurements.length; i++) {
        if (measurements[i].deleted) continue;
        
        if (isPointNearLine(x, y, measurements[i])) {
          selectedItem = { 
            type: 'line',
            id: measurements[i].id,
            index: i
          };
          isDragging = true;
          dragOffset = { 
            x: x - (measurements[i].startX + measurements[i].endX) / 2, 
            y: y - (measurements[i].startY + measurements[i].endY) / 2 
          };
          
          // Show properties panel
          showPropertiesPanel();
          
          // Update form values
          itemName.value = measurements[i].name || '';
          itemColor.value = measurements[i].color || DEFAULT_COLORS.line;
          
          // Hide fill options for lines
          fillOptionsContainer.classList.remove('visible');
          
          found = true;
          break;
        }
      }
    }
    
    // If not found in lines, check shapes
    if (!found) {
      for (let i = 0; i < shapes.length; i++) {
        if (shapes[i].deleted) continue;
        
        const shape = shapes[i];
        if (
          (shape.type === 'rectangle' && isPointInRectangle(x, y, shape)) ||
          (shape.type === 'circle' && isPointInCircle(x, y, shape))
        ) {
          selectedItem = { 
            type: 'shape',
            id: shape.id,
            index: i
          };
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
          
          // Show properties panel
          showPropertiesPanel();
          
          // Update form values
          itemName.value = shape.name || '';
          itemColor.value = shape.color || (shape.type === 'rectangle' ? DEFAULT_COLORS.rectangle : DEFAULT_COLORS.circle);
          itemFill.checked = shape.fill || false;
          itemOpacity.value = shape.fillOpacity !== undefined ? shape.fillOpacity * 100 : 30;
          opacityValue.textContent = `${itemOpacity.value}%`;
          
          // Show fill options for shapes
          fillOptionsContainer.classList.add('visible');
          itemOpacity.disabled = !itemFill.checked;
          
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      selectedItem = null;
      hidePropertiesPanel();
    }
    
    updateMeasurementsList();
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
        clearAllBtn.disabled = false;
        
        isDrawingReference = false;
        setActiveButton(null);
        
        setStatus(`Reference scale set: ${length} ${referenceUnitSelect.value}`);
        
        showReference = true;
        toggleReferenceBtn.innerHTML = '<i class="fas fa-eye"></i>';
      } else if (isDrawingMeasurement) {
        // Calculate real-world measurement based on scale
        const realDistance = pixelDistance * scale.ratio;
        
        // Add to measurements list
        const id = generateId();
        measurements.push({
          id,
          ...finalLine,
          pixelDistance,
          realDistance: realDistance.toFixed(2),
          unit: scale.unit,
          color: DEFAULT_COLORS.line,
          deleted: false
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
      // Generate a unique ID
      const id = generateId();
      
      // Calculate dimensions for the shape
      if (finalShape.type === 'rectangle') {
        // Convert to real measurements using scale
        const realWidth = (width * scale.ratio).toFixed(2);
        const realHeight = (height * scale.ratio).toFixed(2);
        
        shapes.push({
          id,
          ...normalizedShape,
          realWidth,
          realHeight,
          unit: scale.unit,
          color: DEFAULT_COLORS.rectangle,
          fill: false,
          fillOpacity: 0.3,
          deleted: false
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
          id,
          type: 'circle',
          centerX,
          centerY,
          radiusPixels,
          realDiameter,
          unit: scale.unit,
          color: DEFAULT_COLORS.circle,
          fill: false,
          fillOpacity: 0.3,
          deleted: false
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
clearAllBtn.addEventListener('click', clearAllMeasurements);
editReferenceBtn.addEventListener('click', openEditReferenceModal);

// Modal event listeners
cancelEditBtn.addEventListener('click', closeEditReferenceModal);
closeModalBtn.addEventListener('click', closeEditReferenceModal);
updateReferenceBtn.addEventListener('click', updateReferenceValue);

// Property change listeners
itemName.addEventListener('input', applyStyleChanges);
itemColor.addEventListener('input', applyStyleChanges);
itemFill.addEventListener('change', function() {
  itemOpacity.disabled = !this.checked;
  applyStyleChanges();
});
itemOpacity.addEventListener('input', function() {
  opacityValue.textContent = `${this.value}%`;
});
itemOpacity.addEventListener('change', applyStyleChanges);

// Canvas event listeners
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

// Initialize the app
window.addEventListener('resize', renderCanvas);