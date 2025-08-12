/**
 * Application Configuration
 * 
 * This file contains all the configurable settings for the Snooker Draft Order Contest.
 * Update these values to change the application behavior.
 */

const CONFIG = {
    // Display Settings
    SHOW_PLAYER_PICKS: true,  // Set to true to show player picks, false to hide them
    
    // Auto-refresh Settings
    AUTO_REFRESH_ENABLED: false,  // Enable/disable auto-refresh functionality
    AUTO_REFRESH_INTERVAL: 5 * 60 * 1000,  // Refresh interval in milliseconds (5 minutes)
    
                // API Settings
            API_ENABLED: true,  // Enable/disable live API integration
            API_FALLBACK_ENABLED: true,  // Enable fallback to static data if API fails
    
    // Tournament Settings
    TOURNAMENT_NAME: "2025 Saudi Arabia Snooker Masters",
    TOURNAMENT_DATES: "8-16 August 2025",
    TOURNAMENT_VENUE: "Green Halls, Jeddah",
    
    // Points System
    POINTS: {
        WINNER: 14,
        FINALIST: 10,
        SEMIFINALIST: 6,
        QUARTERFINALIST: 4,
        LAST16: 2,
        LAST32: 0, // Players get 0 points for reaching Last 32
        ELIMINATED_EARLY: 0
    },
    
    // UI Settings
    UI: {
        SHOW_STATUS_LEGEND: true,
        SHOW_AUTO_REFRESH_STATUS: true,
        SHOW_TOURNAMENT_BRACKET: true,
        SHOW_HOW_IT_WORKS: true
    },
    
    // Debug Settings
    DEBUG: {
        ENABLE_LOGGING: true,
        SHOW_API_ERRORS: true,
        VALIDATE_DATA: false  // Enable data validation on load
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} 