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
});// Define the navigation structure with sections
const navigationSections = [
    {   
        heading: "Design Logs",
        items: [
            { 
                href: "propulsion.html", 
                title: "Template Design Log",
                internal: true 
            },
            { 
                href: "airfilter.html", 
                title: "Office Air Filter",
                internal: true 
            },
            { 
                href: "electrospinner.html", 
                title: "Electrospinner Device",
                internal: true 
            }
        ]
    },
    {
        heading: "Case Studies",
        items: [
            {
                href: "https://www.amododesign.com/case-studies/bespoke-power-supply",
                title: "Microbial Electrolysis Power Supply",
                internal: false
            }
        ]
    },
    {
        heading: "Tools and Tips",
        items: [
            {
                href: "#version-control",
                title: "Version Control",
                internal: true
            },
            {
                href: "#electronics-equipment",
                title: "Electronics Equipment",
                internal: true
            }
        ]
    }
];

// Function to load navigation
function loadNavigation() {
    const sidebar = document.getElementById('sidebar');
    
    // Clear existing content
    sidebar.innerHTML = '';
    
    // Get current page path
    const currentPath = window.location.pathname;
    const currentPage = currentPath.substring(currentPath.lastIndexOf('/') + 1);
    
    // Add Home link at the top
    const homeNavList = document.createElement('ul');
    homeNavList.className = 'nav-list home-section';
    
    const homeListItem = document.createElement('li');
    homeListItem.className = 'nav-item home-item';
    
    if (currentPage === 'index.html' || currentPage === '') {
        homeListItem.classList.add('active');
    }
    
    const homeLink = document.createElement('a');
    homeLink.href = 'index.html';
    homeLink.textContent = 'Home';
    
    homeListItem.appendChild(homeLink);
    homeNavList.appendChild(homeListItem);
    sidebar.appendChild(homeNavList);
    
    // Load saved section states from localStorage
    let sectionStates = {};
    try {
        const savedStates = localStorage.getItem('sectionStates');
        if (savedStates) {
            sectionStates = JSON.parse(savedStates);
        }
    } catch (e) {
        console.error('Error loading saved section states:', e);
    }
    
    // Loop through each section
    navigationSections.forEach(section => {
        const sectionId = section.heading.replace(/\s+/g, '-').toLowerCase();
        
        // Create section heading with toggle indicator
        const sectionHeading = document.createElement('div');
        sectionHeading.className = 'sidebar-title collapsible';
        sectionHeading.dataset.section = sectionId;
        
        const headingText = document.createElement('span');
        headingText.textContent = section.heading;
        headingText.className = 'heading-text';
        
        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'toggle-icon';
        toggleIcon.innerHTML = '▶'; // Default to collapsed (right arrow)
        toggleIcon.style.marginLeft = '24px'; // Increase spacing between text and icon
        
        // Append text first, then icon (to position icon on the right)
        sectionHeading.appendChild(headingText);
        sectionHeading.appendChild(toggleIcon);
        sidebar.appendChild(sectionHeading);
        
        // Create navigation list for this section
        const navList = document.createElement('ul');
        navList.className = 'nav-list';
        navList.id = `section-${sectionId}`;
        
        // Check if section state is saved, otherwise default to collapsed
        const isExpanded = sectionStates[sectionId] === true;
        if (!isExpanded) {
            navList.style.display = 'none';
        } else {
            toggleIcon.innerHTML = '▼'; // Down arrow for expanded state
        }
        
        // Add click handler to toggle section
        sectionHeading.addEventListener('click', function() {
            const isCurrentlyExpanded = navList.style.display !== 'none';
            navList.style.display = isCurrentlyExpanded ? 'none' : 'block';
            toggleIcon.innerHTML = isCurrentlyExpanded ? '▶' : '▼';
            
            // Save state to localStorage
            sectionStates[sectionId] = !isCurrentlyExpanded;
            localStorage.setItem('sectionStates', JSON.stringify(sectionStates));
        });
        
        // Add each navigation item for this section
        section.items.forEach(item => {
            const listItem = document.createElement('li');
            listItem.className = 'nav-item';
            
            // Check if this is the current page to add 'active' class
            if (item.internal && (currentPage === item.href || 
                (currentPage === '' && item.href === 'index.html'))) {
                listItem.classList.add('active');
                
                // Auto-expand section if it contains the active page
                navList.style.display = 'block';
                toggleIcon.innerHTML = '▼';
                sectionStates[sectionId] = true;
                localStorage.setItem('sectionStates', JSON.stringify(sectionStates));
            }
            
            const link = document.createElement('a');
            link.href = item.href;
            link.textContent = item.title;
            
            // Add external link indicator if needed
            if (!item.internal) {
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                
                const externalIcon = document.createElement('span');
                externalIcon.innerHTML = ' ↗';
                externalIcon.className = 'external-link-icon';
                link.appendChild(externalIcon);
            }
            
            listItem.appendChild(link);
            navList.appendChild(listItem);
        });
        
        // Add the navigation list to the sidebar
        sidebar.appendChild(navList);
    });
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
    // Create a hidden container that won't be visible but will maintain functionality
    const spectrumContainer = document.createElement('div');
    spectrumContainer.className = 'spectrum-container';
    spectrumContainer.style.display = 'none'; // Make sure it's hidden
    
    // Create color spectrum bar (needed for internal functionality)
    const spectrumBar = document.createElement('div');
    spectrumBar.className = 'spectrum-bar';
    
    // Create position indicator (needed for internal functionality)
    const indicator = document.createElement('div');
    indicator.className = 'spectrum-indicator';
    spectrumBar.appendChild(indicator);
    
    // Add spectrum bar to container
    spectrumContainer.appendChild(spectrumBar);
    
    // Add container to body (but it will be hidden)
    document.body.appendChild(spectrumContainer);
    
    // Functionality is maintained, but UI is hidden
    return { indicator, spectrumBar };
}

// Function to get a color at a specific position in the spectrum
function getColorAtPosition(position) {
    // Calculate which segment of the color array we're in
    const segments = brandColors.length - 1;
    const segmentSize = 1 / segments;
    
    // Find the two colors to interpolate between
    const segmentIndex = Math.min(Math.floor(position * segments), segments - 1);
    const nextIndex = segmentIndex + 1;
    
    const color1 = brandColors[segmentIndex];
    const color2 = brandColors[nextIndex];
    
    // Calculate position within the segment (0-1)
    const segmentPosition = (position - (segmentIndex * segmentSize)) / segmentSize;
    
    // Interpolate between the two colors
    const primary = interpolateColors(color1, color2, segmentPosition);
    
    // For secondary color, use the next color in the sequence with a slight offset
    const secondaryIndex = (nextIndex + 1) % brandColors.length;
    const secondary = brandColors[secondaryIndex];
    
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

// Function to convert RGB to hex
function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Add color mode toggle function
function addColorModeToggle() {
    // Create the toggle container
    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'color-mode-toggle';
    toggleContainer.title = 'Toggle color animation';
    
    // Create the toggle switch
    const toggleSwitch = document.createElement('div');
    toggleSwitch.className = 'toggle-switch';
    
    // Get current mode from localStorage or default to 'moving'
    const currentMode = localStorage.getItem('colorMode') || 'moving';
    
    // Set initial toggle state
    if (currentMode === 'static') {
        toggleSwitch.classList.add('static');
    }
    
    // Add the toggle to the container
    toggleContainer.appendChild(toggleSwitch);
    
    // Add some text to indicate what it does
    const toggleLabel = document.createElement('span');
    toggleLabel.className = 'toggle-label';
    toggleLabel.textContent = currentMode === 'static' ? 'Static' : 'Animated';
    toggleContainer.appendChild(toggleLabel);
    
    // Add click event to toggle between modes
    toggleContainer.addEventListener('click', function() {
        const isStatic = toggleSwitch.classList.contains('static');
        
        if (isStatic) {
            // Switch to moving
            toggleSwitch.classList.remove('static');
            toggleLabel.textContent = 'Animated';
            localStorage.setItem('colorMode', 'moving');
            startColorAnimation(); // Resume animation
        } else {
            // Switch to static
            toggleSwitch.classList.add('static');
            toggleLabel.textContent = 'Static';
            localStorage.setItem('colorMode', 'static');
            stopColorAnimation(); // Stop animation
        }
    });
    
    // Add the toggle to the page
    document.body.appendChild(toggleContainer);
    
    return currentMode;
}

// Global variable to track animation frame
let animationFrameId = null;

// Stop color animation
function stopColorAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        console.log("Animation stopped");
    }
}

// Modify the startColorAnimation function to support stopping
function startColorAnimation() {
    console.log("Starting color animation");
    
    // Cancel any existing animation
    stopColorAnimation();
    
    // Check color mode
    const colorMode = localStorage.getItem('colorMode') || 'moving';
    
    // Create UI elements
    const elements = initColorSystem();
    
    // Properly scope the position variable
    let position = 0.1; // Default starting position
    
    try {
        const savedPosition = localStorage.getItem('colorPosition');
        if (savedPosition !== null) {
            position = parseFloat(savedPosition);
            console.log("Continuing animation from position:", position);
        } else {
            console.log("Starting new animation from position:", position);
            localStorage.setItem('colorPosition', position);
        }
    } catch(e) {
        console.error("Error loading saved position:", e);
    }
    
    // Force immediate render of current colors to avoid flashing
    updateInitialColors(position);
    
    // If in static mode, just render once and exit
    if (colorMode === 'static') {
        console.log("Static color mode - not starting animation");
        return;
    }
    
    // Slower animation speed for smoother transitions
    const speed = 0.000005;
    
    // Track time for smooth animation
    let lastTime = null;
    let lastSaveTime = Date.now();
    
    // Function to save position to localStorage (throttled)
    function savePosition() {
        const now = Date.now();
        // Only save every 5 seconds to reduce writes
        if (now - lastSaveTime > 5000) {
            localStorage.setItem('colorPosition', position);
            lastSaveTime = now;
        }
    }
    
    // Update function with position saving
    function updateAnimation(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const elapsed = timestamp - lastTime;
        lastTime = timestamp;
        
        // Update position
        position = position + (speed * elapsed);
        
        // Loop back to teal when we reach the end (burgundy)
        if (position >= 0.98) {
            position = 0.1;
        }
        
        // Save position occasionally
        savePosition();
        
        // Update colors every frame for smoother animation
        try {
            const { primary, secondary } = getColorAtPosition(position);
            
            // Update CSS variables with smoother transitions
            updateColors(primary, secondary);
        } catch(e) {
            console.error("Error updating colors:", e);
        }
        
        // Store animation frame ID so we can cancel it
        animationFrameId = requestAnimationFrame(updateAnimation);
    }
    
    // Start animation loop
    animationFrameId = requestAnimationFrame(updateAnimation);
    
    // Save position when page is unloaded
    window.addEventListener('beforeunload', function() {
        localStorage.setItem('colorPosition', position);
    });
}

// Helper function to update initial colors
function updateInitialColors(position) {
    try {
        const colors = getColorAtPosition(position);
        // Direct application without transitions for initial render
        document.documentElement.style.setProperty('--transition-speed', '0s');
        document.documentElement.style.setProperty('--accent-color', colors.primary);
        document.documentElement.style.setProperty('--secondary-color', colors.secondary);
        document.documentElement.style.setProperty('--border-color', colors.primary);
        
        if (document.querySelector('.header')) {
            document.querySelector('.header').style.background = 
                `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`;
        }
        
        // Force reflow to apply immediate changes
        document.body.offsetHeight;
        
        // Restore transitions after a short delay
        setTimeout(function() {
            document.documentElement.style.setProperty('--transition-speed', '1.5s');
        }, 50);
    } catch(e) {
        console.error("Error setting initial colors:", e);
    }
}

// Helper function to update colors with proper transitions
function updateColors(primary, secondary) {
    document.documentElement.style.setProperty('--accent-color', primary);
    document.documentElement.style.setProperty('--secondary-color', secondary);
    document.documentElement.style.setProperty('--border-color', primary);
    
    if (document.querySelector('.header')) {
        document.querySelector('.header').style.background = 
            `linear-gradient(90deg, ${primary}, ${secondary})`;
    }
}

// Initialize animation based on saved mode
document.addEventListener('DOMContentLoaded', function() {
    const colorMode = addColorModeToggle();
    setTimeout(startColorAnimation, 50); // Small delay for stability
});

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

// Add a demo content stamp to the header
function addDemoStamp() {
    const header = document.querySelector('.header');
    if (!header) return;
    
    const stamp = document.createElement('div');
    stamp.className = 'demo-stamp';
    stamp.innerHTML = 'Demo<br>Content';
    
    header.appendChild(stamp);
}

// Add the stamp when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add after a slight delay to ensure the header is loaded
    setTimeout(addDemoStamp, 100);
});

