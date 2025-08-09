/**
 * Auto-refresh manager for live tournament data
 */
class AutoRefreshManager {
    constructor() {
        this.refreshInterval = CONFIG.AUTO_REFRESH_INTERVAL;
        this.refreshTimer = null;
        this.lastRefreshTime = null;
        this.isEnabled = CONFIG.AUTO_REFRESH_ENABLED;
        this.init();
    }

    init() {
        this.updateStatusDisplay();
        // Auto-refresh disabled - removed startAutoRefresh() and setupRefreshButton()
    }

    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.refreshTimer = setInterval(() => {
            this.performRefresh();
        }, this.refreshInterval);

        console.log('Auto-refresh started - will refresh every 5 minutes');
    }

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        this.isEnabled = false;
        this.updateStatusDisplay();
        console.log('Auto-refresh stopped');
    }

    async performRefresh() {
        try {
            console.log('Auto-refreshing tournament data...');
            this.lastRefreshTime = new Date();

            // Refresh all components
            if (window.leaderboard) {
                await window.leaderboard.refresh();
            }
            if (window.tournamentBracket) {
                await window.tournamentBracket.init();
            }

            this.updateStatusDisplay();
            console.log('Auto-refresh completed successfully');
        } catch (error) {
            console.error('Auto-refresh failed:', error);
            this.updateStatusDisplay('Error');
        }
    }

    updateStatusDisplay(status = null) {
        const statusElement = document.getElementById('autoRefreshStatus');
        if (!statusElement) return;

        if (status === 'Error') {
            statusElement.textContent = 'Auto-refresh: Error';
            statusElement.style.color = '#ff6b6b';
        } else if (!this.isEnabled) {
            statusElement.textContent = 'Auto-refresh: Disabled';
            statusElement.style.color = '#888';
        } else {
            const nextRefresh = this.getNextRefreshTime();
            statusElement.textContent = `Auto-refresh: ${nextRefresh}`;
            statusElement.style.color = '#4ecdc4';
        }
    }

    getNextRefreshTime() {
        if (!this.lastRefreshTime) {
            return '5 min';
        }

        const now = new Date();
        const timeSinceLastRefresh = now - this.lastRefreshTime;
        const timeUntilNextRefresh = this.refreshInterval - timeSinceLastRefresh;

        if (timeUntilNextRefresh <= 0) {
            return 'Refreshing...';
        }

        const minutes = Math.ceil(timeUntilNextRefresh / (60 * 1000));
        return `${minutes} min`;
    }

    setupRefreshButton() {
        const refreshButton = document.getElementById('refreshData');
        if (refreshButton) {
            refreshButton.addEventListener('click', async () => {
                await this.performRefresh();
            });
        }
    }

    // Public method to manually trigger refresh
    async manualRefresh() {
        await this.performRefresh();
    }

    // Public method to toggle auto-refresh
    toggleAutoRefresh() {
        if (this.isEnabled) {
            this.stopAutoRefresh();
        } else {
            this.isEnabled = true;
            this.startAutoRefresh();
        }
    }
} 