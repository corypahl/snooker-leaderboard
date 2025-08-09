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

            // Always load static data first to ensure we have complete player data
            console.log('Loading static player data for complete dataset...');
            const playersResponse = await fetch('data/players.json');
            if (!playersResponse.ok) {
                throw new Error(`Failed to load players: ${playersResponse.status}`);
            }
            this.players = await playersResponse.json();
            console.log('Loaded static player data with', this.players.length, 'players');

            // Update data source indicator
            this.updateDataSource('Static');

        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    calculateLeaderboard() {
        // Debug: Log available player IDs and names
        console.log('Available player IDs:', this.players.map(p => p.id).slice(0, 10));
        console.log('Available player names:', this.players.map(p => p.name).slice(0, 10));
        
        this.leaderboardData = this.participants.map(participant => {
            console.log(`Processing participant: ${participant.name} with picks:`, participant.picks);
            const picks = participant.picks.map(pickId => {
                // Handle null picks
                if (pickId === null || pickId === undefined) {
                    return null;
                }
                
                // Simple name-based lookup (case-insensitive)
                const player = this.players.find(p => 
                    p.name && p.name.toLowerCase() === pickId.toLowerCase()
                );
                
                if (!player) {
                    console.log(`Player not found: ${pickId}`);
                    // Return a fallback object with the original name for display
                    return { name: pickId, points: 0, status: 'unknown', id: pickId };
                }
                return player;
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
                console.log(`Using bracket-based max points calculation for ${participant.name}`);
                maxPoints = window.tournamentBracket.calculateAccurateMaxPoints(picks);
            } else {
                console.log(`Using simple max points calculation for ${participant.name} (bracket not available)`);
                // Fallback to simple calculation
                maxPoints = this.calculateSimpleMaxPoints(picks);
            }
            
            console.log(`${participant.name}: totalPoints=${totalPoints}, maxPoints=${maxPoints}`);

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
            case 'unknown':
                return '❓';
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




}

// Initialize the leaderboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.snookerLeaderboard = new SnookerLeaderboard();
}); 