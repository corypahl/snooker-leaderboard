// Leaderboard functionality for Snooker Draft Order Contest

class SnookerLeaderboard {
    constructor() {
        this.participants = [];
        this.players = [];
        this.leaderboardData = [];
        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.calculateLeaderboard();
            this.renderLeaderboard();
            this.updateLastUpdated();
        } catch (error) {
            console.error('Error initializing leaderboard:', error);
            this.showError('Failed to load leaderboard data');
        }
    }

    async loadData() {
        try {
            // Load participants data from Google Apps Script
            this.participants = await ParticipantsLoader.loadParticipants();

            // Try to load live player data first, fallback to static data
            let dataSource = 'Static';
            try {
                console.log('Attempting to load live player data...');
                const liveData = await WSTFetcher.getLiveTournamentData();
                this.players = Object.values(liveData.players);
                dataSource = 'Live';
                console.log('Loaded live player data from WST API');
            } catch (apiError) {
                console.warn('Failed to load live data, falling back to static data:', apiError);
                const playersResponse = await fetch('data/players.json');
                if (!playersResponse.ok) {
                    throw new Error(`Failed to load players: ${playersResponse.status}`);
                }
                this.players = await playersResponse.json();
                console.log('Loaded static player data');
            }

            // Update data source indicator
            this.updateDataSource(dataSource);

        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    calculateLeaderboard() {
        this.leaderboardData = this.participants.map(participant => {
            console.log(`Processing participant: ${participant.name} with picks:`, participant.picks);
            const picks = participant.picks.map(pickId => {
                // Handle null picks
                if (pickId === null || pickId === undefined) {
                    return null;
                }
                const player = this.players.find(p => p.id === pickId);
                if (!player) {
                    console.log(`Player not found for ID: ${pickId}`);
                }
                return player || { name: 'Unknown Player', points: 0, status: 'eliminated' };
            });

            const totalPoints = picks.reduce((sum, pick) => {
                // Handle null picks in points calculation
                if (!pick || pick === null) {
                    return sum;
                }
                return sum + (pick.points || 0);
            }, 0);
            
            // Use bracket-based max points calculation if available
            let maxPoints;
            if (window.tournamentBracket && window.tournamentBracket.bracketData) {
                maxPoints = window.tournamentBracket.calculateAccurateMaxPoints(picks);
            } else {
                // Fallback to simple calculation
                maxPoints = this.calculateSimpleMaxPoints(picks);
            }

            return {
                ...participant,
                picks,
                totalPoints,
                maxPoints
            };
        });

        // Sort by max points descending
        this.leaderboardData.sort((a, b) => b.maxPoints - a.maxPoints);
    }

    // Fallback simple max points calculation
    calculateSimpleMaxPoints(picks) {
        let maxPoints = 0;
        let playersStillIn = 0;
        
        picks.forEach(pick => {
            // Handle null picks
            if (!pick || pick === null) {
                return; // Skip null picks
            }
            
            if (pick.status === 'playing') {
                playersStillIn++;
            } else {
                maxPoints += pick.points;
            }
        });
        
        if (playersStillIn > 0) {
            if (playersStillIn === 1) {
                maxPoints += 14;
            } else if (playersStillIn === 2) {
                maxPoints += 14 + 10;
            } else {
                maxPoints += 14 + 10 + (6 * (playersStillIn - 2));
            }
        }
        
        return maxPoints;
    }

    renderLeaderboard() {
        const tbody = document.getElementById('leaderboardBody');
        
        if (!tbody) {
            console.error('Leaderboard table body not found');
            return;
        }

        tbody.innerHTML = '';

        this.leaderboardData.forEach((participant, index) => {
            const row = document.createElement('tr');
            
            // Rank (with tie handling)
            const rank = this.getRank(index);
            row.innerHTML = `
                <td>${rank}</td>
                <td>${participant.name}</td>
                <td>${this.renderPlayerPick(participant.picks[0])}</td>
                <td>${this.renderPlayerPick(participant.picks[1])}</td>
                <td>${this.renderPlayerPick(participant.picks[2])}</td>
                <td>${participant.totalPoints}</td>
                <td>${participant.maxPoints}</td>
            `;
            
            tbody.appendChild(row);
        });
    }

    renderPlayerPick(player) {
        // Handle null/undefined picks
        if (!player || player === null) {
            return '<span class="no-pick">No Pick</span>';
        }

        if (!CONFIG.SHOW_PLAYER_PICKS) {
            return '<span class="pick-hidden">👁️ Hidden</span>';
        }

        const statusIcon = this.getStatusIcon(player.status);
        const isEliminated = player.status === 'eliminated' || player.status === 'eliminated_early';
        
        return `
            <span class="status-icon">${statusIcon}</span>
            <span class="player-name">${player.name}</span>
            ${isEliminated ? `<span class="player-points">(${player.points})</span>` : ''}
        `;
    }

    getStatusIcon(status) {
        switch (status) {
            case 'playing':
                return '🎱';
            case 'eliminated':
            case 'eliminated_early':
                return '❌';
            default:
                return '❓';
        }
    }

    getRank(index) {
        // Handle ties - same rank for same max points
        if (index === 0) return 1;
        
        const currentMaxPoints = this.leaderboardData[index].maxPoints;
        const previousMaxPoints = this.leaderboardData[index - 1].maxPoints;
        
        if (currentMaxPoints === previousMaxPoints) {
            // Find the first occurrence of this max score
            for (let i = 0; i < index; i++) {
                if (this.leaderboardData[i].maxPoints === currentMaxPoints) {
                    return i + 1;
                }
            }
        }
        
        return index + 1;
    }

    updateLastUpdated() {
        const lastUpdatedElement = document.getElementById('lastUpdated');
        if (lastUpdatedElement) {
            const now = new Date();
            lastUpdatedElement.textContent = now.toLocaleString();
        }
    }

    updateDataSource(source) {
        const dataSourceElement = document.getElementById('dataSource');
        if (dataSourceElement) {
            dataSourceElement.textContent = source;
            
            // Add visual styling based on data source
            const dataSourceContainer = dataSourceElement.closest('.data-source');
            if (dataSourceContainer) {
                dataSourceContainer.classList.remove('live', 'static');
                if (source.includes('Live')) {
                    dataSourceContainer.classList.add('live');
                } else {
                    dataSourceContainer.classList.add('static');
                }
            }
        }
    }

    showError(message) {
        const tbody = document.getElementById('leaderboardBody');
        if (tbody) {
                    tbody.innerHTML = `
            <tr>
                <td colspan="7" class="loading" style="color: #ff6b6b;">
                    ${message}
                </td>
            </tr>
        `;
        }
    }

    // Method to refresh data (useful for manual updates)
    async refresh() {
        try {
            await this.loadData();
            this.calculateLeaderboard();
            this.renderLeaderboard();
            this.updateLastUpdated();
        } catch (error) {
            console.error('Error refreshing leaderboard:', error);
            this.showError('Failed to refresh data');
        }
    }


}

// Initialize the leaderboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.snookerLeaderboard = new SnookerLeaderboard();
    
    // Add refresh button functionality
    const refreshBtn = document.getElementById('refreshData');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            refreshBtn.textContent = '🔄 Refreshing...';
            
            try {
                await window.snookerLeaderboard.refresh();
                if (window.tournamentBracket) {
                    await window.tournamentBracket.refresh();
                }
            } catch (error) {
                console.error('Error refreshing data:', error);
            } finally {
                refreshBtn.disabled = false;
                refreshBtn.textContent = '🔄 Refresh';
            }
        });
    }
});

// Add refresh functionality (optional - can be called manually)
window.refreshLeaderboard = () => {
    if (window.snookerLeaderboard) {
        window.snookerLeaderboard.refresh();
    }
};

// Auto-refresh every 5 minutes (optional)
setInterval(() => {
    if (window.snookerLeaderboard) {
        window.snookerLeaderboard.refresh();
    }
}, 5 * 60 * 1000); 