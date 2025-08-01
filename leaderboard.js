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
            // Load participants data
            const participantsResponse = await fetch('data/participants.json');
            if (!participantsResponse.ok) {
                throw new Error(`Failed to load participants: ${participantsResponse.status}`);
            }
            this.participants = await participantsResponse.json();

            // Load players data
            const playersResponse = await fetch('data/players.json');
            if (!playersResponse.ok) {
                throw new Error(`Failed to load players: ${playersResponse.status}`);
            }
            this.players = await playersResponse.json();

        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    calculateLeaderboard() {
        this.leaderboardData = this.participants.map(participant => {
            const picks = participant.picks.map(pickId => {
                const player = this.players.find(p => p.id === pickId);
                return player || { name: 'Unknown Player', points: 0, status: 'eliminated' };
            });

            const totalPoints = picks.reduce((sum, pick) => sum + (pick.points || 0), 0);
            
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

        // Sort by total points descending
        this.leaderboardData.sort((a, b) => b.totalPoints - a.totalPoints);
    }

    // Fallback simple max points calculation
    calculateSimpleMaxPoints(picks) {
        let maxPoints = 0;
        let playersStillIn = 0;
        
        picks.forEach(pick => {
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
        if (!player) {
            return '<span class="player-name">No pick</span>';
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
        // Handle ties - same rank for same points
        if (index === 0) return 1;
        
        const currentPoints = this.leaderboardData[index].totalPoints;
        const previousPoints = this.leaderboardData[index - 1].totalPoints;
        
        if (currentPoints === previousPoints) {
            // Find the first occurrence of this score
            for (let i = 0; i < index; i++) {
                if (this.leaderboardData[i].totalPoints === currentPoints) {
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