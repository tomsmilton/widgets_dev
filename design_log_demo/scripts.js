// Handle window resize for mobile/desktop transitions
window.addEventListener('resize', function() {
    const sidebar = document.getElementById('sidebar');
    
    // Reset sidebar state when transitioning between mobile and desktop
    if (window.innerWidth > 768) {
        sidebar.classList.remove('expanded');
        // Default to visible sidebar on desktop
        sidebar.classList.remove('collapsed');
    } else {
        // Reset to closed dropdown on mobile
        sidebar.classList.remove('expanded');
    }
    
    // Recreate floating toggle if needed
    createFloatingToggle();
});// Define the navigation structure
const navigationItems = [
    { 
        href: "index.html", 
        title: "Home" 
    },
    { 
        href: "propulsion.html", 
        title: "Propulsion System Optimization" 
    },
    { 
        href: "electrospinner.html", 
        title: "Electrospinner Device" 
    }
];

// Function to load navigation
function loadNavigation() {
    const sidebar = document.getElementById('sidebar');
    
    // Create the title element
    const sidebarTitle = document.createElement('div');
    sidebarTitle.className = 'sidebar-title';
    sidebarTitle.textContent = 'NAVIGATION';
    sidebar.appendChild(sidebarTitle);
    
    // Create the navigation list
    const navList = document.createElement('ul');
    navList.className = 'nav-list';
    
    // Get current page path
    const currentPath = window.location.pathname;
    const currentPage = currentPath.substring(currentPath.lastIndexOf('/') + 1);
    
    // Add each navigation item
    navigationItems.forEach(item => {
        const listItem = document.createElement('li');
        listItem.className = 'nav-item';
        
        // Check if this is the current page to add 'active' class
        if (currentPage === item.href || 
            (currentPage === '' && item.href === 'index.html')) {
            listItem.classList.add('active');
        }
        
        const link = document.createElement('a');
        link.href = item.href;
        link.textContent = item.title;
        
        listItem.appendChild(link);
        navList.appendChild(listItem);
    });
    
    // Add the navigation list to the sidebar
    sidebar.appendChild(navList);
}

// Load navigation when the DOM is ready
document.addEventListener('DOMContentLoaded', loadNavigation);

// Toggle sidebar with mobile support
document.getElementById('sidebar-toggle').addEventListener('click', function() {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');
    
    // Mobile behavior - dropdown
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('expanded');
    } 
    // Desktop behavior - slide
    else {
        sidebar.classList.toggle('collapsed');
        content.classList.toggle('expanded');
    }
});

// Create floating toggle button
const createFloatingToggle = function() {
    // Check if it already exists
    if (document.querySelector('.floating-toggle')) return;
    
    // Only create on desktop
    if (window.innerWidth <= 768) return;
    
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'sidebar-toggle floating-toggle';
    toggleBtn.textContent = 'Toggle Sidebar';
    toggleBtn.addEventListener('click', function() {
        const sidebar = document.getElementById('sidebar');
        const content = document.getElementById('content');
        
        sidebar.classList.toggle('collapsed');
        content.classList.toggle('expanded');
    });
    
    document.body.appendChild(toggleBtn);
};

// Create the floating toggle when the page loads
window.addEventListener('load', createFloatingToggle);

// Create and initialize the color spectrum system
function initColorSystem() {
    // Remove old theme selector if it exists
    const oldSelector = document.querySelector('.theme-selector');
    if (oldSelector) {
        oldSelector.remove();
    }

    // Create spectrum container
    const spectrumContainer = document.createElement('div');
    spectrumContainer.className = 'spectrum-container';
    
    // Create color spectrum bar
    const spectrum = document.createElement('div');
    spectrum.className = 'color-spectrum';
    spectrumContainer.appendChild(spectrum);
    
    // Create position indicator
    const positionIndicator = document.createElement('div');
    positionIndicator.className = 'spectrum-position';
    spectrumContainer.appendChild(positionIndicator);
    
    // Add to document
    document.body.appendChild(spectrumContainer);
    
    return {
        container: spectrumContainer,
        spectrum: spectrum,
        indicator: positionIndicator
    };
}

// Function to convert HSL to RGB
function hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Function to convert RGB to hex
function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Define the brand colors
const brandColors = [
    "#79BCBA", // Teal
    "#4D9FB1", // Blue-teal
    "#3984C2", // Medium blue
    "#314492", // Deep blue
    "#403577", // Purple
    "#6A3866", // Purple-magenta
    "#924157"  // Burgundy
];

// Function to get a color at a specific position in the spectrum
function getColorAtPosition(position) {
    // Calculate which segment of the color array we're in
    const segments = brandColors.length;
    const segmentSize = 1 / segments;
    
    // Find the two colors to interpolate between
    const segmentIndex = Math.floor(position * segments);
    const nextIndex = (segmentIndex + 1) % segments;
    
    const color1 = brandColors[segmentIndex];
    const color2 = brandColors[nextIndex];
    
    // Calculate position within the segment (0-1)
    const segmentPosition = (position - (segmentIndex * segmentSize)) / segmentSize;
    
    // Interpolate between the two colors
    const primary = interpolateColors(color1, color2, segmentPosition);
    
    // For secondary color, use the next color in the sequence with a slight offset
    const secondaryIndex1 = (segmentIndex + 1) % segments;
    const secondaryIndex2 = (segmentIndex + 2) % segments;
    const secondaryColor1 = brandColors[secondaryIndex1];
    const secondaryColor2 = brandColors[secondaryIndex2];
    
    const secondary = interpolateColors(secondaryColor1, secondaryColor2, segmentPosition);
    
    return { primary, secondary };
}

// Function to interpolate between two hex colors
function interpolateColors(color1, color2, factor) {
    // Convert hex to rgb
    const r1 = parseInt(color1.substring(1, 3), 16);
    const g1 = parseInt(color1.substring(3, 5), 16);
    const b1 = parseInt(color1.substring(5, 7), 16);
    
    const r2 = parseInt(color2.substring(1, 3), 16);
    const g2 = parseInt(color2.substring(3, 5), 16);
    const b2 = parseInt(color2.substring(5, 7), 16);
    
    // Interpolate
    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));
    
    // Convert back to hex
    return rgbToHex(r, g, b);
}

// Apply the current color based on position
function updateColors(position, elements) {
    // Get colors at the current position
    const { primary, secondary } = getColorAtPosition(position);
    
    // Update CSS variables
    document.documentElement.style.setProperty('--accent-color', primary);
    document.documentElement.style.setProperty('--secondary-color', secondary);
    document.documentElement.style.setProperty('--border-color', primary);
    
    // Update header gradient
    document.querySelector('.header').style.background = 
        `linear-gradient(90deg, ${primary}, ${secondary})`;
    
    // Update position indicator
    elements.indicator.style.left = `${position * 100}%`;
}

// Start the color animation
function startColorAnimation() {
    // Create UI elements
    const elements = initColorSystem();
    
    // Starting position
    let position = 0;
    
    // Speed (lower = slower)
    const speed = 0.0002; 
    
    // Update function
    function updateAnimation() {
        // Update position
        position = (position + speed) % 1;
        
        // Update colors
        updateColors(position, elements);
        
        // Schedule next frame
        requestAnimationFrame(updateAnimation);
    }
    
    // Start animation
    updateAnimation();
}

