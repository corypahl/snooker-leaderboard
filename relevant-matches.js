// Relevant Matches Component
class RelevantMatches {
    constructor() {
        this.participants = [];
        this.matches = [];
        this.players = [];
        this.pickedPlayers = new Set();
        this.init();
    }

    async init() {
        try {
            await this.loadParticipants();
            await this.loadMatches();
            await this.loadPlayers();
            this.identifyPickedPlayers();
            this.renderRelevantMatches();
        } catch (error) {
            console.error('Error initializing relevant matches:', error);
            this.showError();
        }
    }

    async loadParticipants() {
        try {
            this.participants = await ParticipantsLoader.loadParticipants();
        } catch (error) {
            console.error('Error loading participants:', error);
            throw error;
        }
    }

    async loadMatches() {
        let dataSource = 'Static';
        
        // Try to load live matches data first, fallback to static data
        try {
            console.log('Attempting to load live matches data...');
            const liveData = await WSTFetcher.getLiveTournamentData();
            this.matches = this.extractMatchesFromTournamentData(liveData);
            dataSource = 'Live';
            console.log('Loaded live matches data from WST API');
        } catch (apiError) {
            console.warn('Failed to load live data, falling back to static data:', apiError);
            try {
                const response = await fetch('data/bracket.json');
                if (!response.ok) {
                    throw new Error(`Failed to load bracket: ${response.status}`);
                }
                const bracketData = await response.json();
                this.matches = this.extractMatchesFromBracketData(bracketData);
                console.log('Loaded static matches data');
            } catch (error) {
                console.error('Error loading matches data:', error);
                throw error;
            }
        }
    }

    async loadPlayers() {
        try {
            // Try to load live player data first, fallback to static data
            try {
                const liveData = await WSTFetcher.getLiveTournamentData();
                this.players = Object.values(liveData.players);
            } catch (apiError) {
                console.warn('Failed to load live player data, falling back to static data:', apiError);
                const response = await fetch('data/players.json');
                if (!response.ok) {
                    throw new Error(`Failed to load players: ${response.status}`);
                }
                this.players = await response.json();
            }
        } catch (error) {
            console.error('Error loading players data:', error);
            // Don't throw error, just use fallback names
        }
    }

    extractMatchesFromTournamentData(tournamentData) {
        const matches = [];
        
        if (tournamentData.draw) {
            Object.keys(tournamentData.draw).forEach(roundKey => {
                const roundMatches = tournamentData.draw[roundKey];
                roundMatches.forEach(match => {
                    matches.push({
                        ...match,
                        round: roundKey
                    });
                });
            });
        }
        
        return matches;
    }

    extractMatchesFromBracketData(bracketData) {
        const matches = [];
        
        if (bracketData.draw) {
            Object.keys(bracketData.draw).forEach(roundKey => {
                const roundMatches = bracketData.draw[roundKey];
                roundMatches.forEach(match => {
                    matches.push({
                        ...match,
                        round: roundKey
                    });
                });
            });
        }
        
        return matches;
    }

    identifyPickedPlayers() {
        this.pickedPlayers.clear();
        
        this.participants.forEach(participant => {
            if (participant.picks) {
                participant.picks.forEach(pick => {
                    if (pick && pick !== null) {
                        this.pickedPlayers.add(pick);
                    }
                });
            }
        });
        
        console.log('Picked players:', Array.from(this.pickedPlayers));
    }

    filterRelevantMatches() {
        if (!this.matches || this.matches.length === 0) {
            return [];
        }

        return this.matches.filter(match => {
            // Check if either player in the match is picked by a participant
            const player1Id = this.normalizePlayerId(match.player1);
            const player2Id = this.normalizePlayerId(match.player2);
            
            return this.pickedPlayers.has(player1Id) || this.pickedPlayers.has(player2Id);
        });
    }

    normalizePlayerId(playerName) {
        if (!playerName || playerName === 'tbd' || playerName === 'TBD') {
            return null;
        }
        
        // Convert player name to ID format (lowercase, underscores)
        return playerName.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_');
    }

    getPlayerDisplayName(playerId) {
        if (!playerId) return 'TBD';
        
        // Try to find in players data first
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            return player.name;
        }
        
        // Fallback: convert ID back to readable name
        return playerId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    getParticipantsWhoPicked(playerId) {
        if (!playerId) return [];
        
        const participants = [];
        this.participants.forEach(participant => {
            if (participant.picks && participant.picks.includes(playerId)) {
                participants.push(participant.name);
            }
        });
        
        return participants;
    }

    getStatusDisplay(match) {
        if (!match.status) return { text: 'Scheduled', class: 'status-scheduled' };
        
        const status = match.status.toLowerCase();
        if (status.includes('live') || status.includes('playing')) {
            return { text: '🔴 Live', class: 'status-live' };
        } else if (status.includes('completed') || status.includes('finished')) {
            return { text: '✅ Completed', class: 'status-completed' };
        } else if (status.includes('winner')) {
            return { text: '🏆 Winner', class: 'status-winner' };
        } else {
            return { text: '⏰ Scheduled', class: 'status-scheduled' };
        }
    }

    renderRelevantMatches() {
        const container = document.getElementById('relevantMatchesContainer');
        if (!container) {
            console.error('Relevant matches container not found');
            return;
        }

        const relevantMatches = this.filterRelevantMatches();
        
        if (relevantMatches.length === 0) {
            container.innerHTML = `
                <div class="no-relevant-matches">
                    <p>No relevant matches found.</p>
                    <p>This could mean:</p>
                    <ul style="text-align: left; display: inline-block; margin-top: 1rem;">
                        <li>No participants have made their picks yet</li>
                        <li>The tournament hasn't started</li>
                        <li>All picked players have been eliminated</li>
                    </ul>
                </div>
            `;
            return;
        }

        const matchesHTML = relevantMatches.map(match => this.renderMatchCard(match)).join('');
        container.innerHTML = matchesHTML;
    }

    renderMatchCard(match) {
        const player1Id = this.normalizePlayerId(match.player1);
        const player2Id = this.normalizePlayerId(match.player2);
        
        const player1Name = this.getPlayerDisplayName(player1Id);
        const player2Name = this.getPlayerDisplayName(player2Id);
        
        const player1PickedBy = this.getParticipantsWhoPicked(player1Id);
        const player2PickedBy = this.getParticipantsWhoPicked(player2Id);
        
        const status = this.getStatusDisplay(match);
        
        return `
            <div class="match-card">
                <div class="match-header">
                    <span class="match-round">${this.formatRoundName(match.round)}</span>
                    <span class="match-number">Match ${match.match || 'N/A'}</span>
                </div>
                
                <div class="match-players">
                    <div class="player-row">
                        <span class="player-name">${player1Name}</span>
                        ${player1PickedBy.length > 0 ? 
                            `<span class="player-picked-by">Picked by: ${player1PickedBy.join(', ')}</span>` : 
                            '<span class="player-picked-by"></span>'
                        }
                    </div>
                    <div class="player-row">
                        <span class="player-name">${player2Name}</span>
                        ${player2PickedBy.length > 0 ? 
                            `<span class="player-picked-by">Picked by: ${player2PickedBy.join(', ')}</span>` : 
                            '<span class="player-picked-by"></span>'
                        }
                    </div>
                </div>
                
                <div class="match-status">
                    <div class="status-indicator ${status.class}">
                        ${status.text}
                    </div>
                    ${match.score ? `<div class="match-score">${match.score}</div>` : ''}
                </div>
            </div>
        `;
    }

    formatRoundName(roundKey) {
        const roundNames = {
            'last32': 'Last 32',
            'last16': 'Last 16',
            'quarterfinals': 'Quarter-finals',
            'semifinals': 'Semi-finals',
            'final': 'Final',
            'round1': 'Round 1',
            'round2': 'Round 2',
            'round3': 'Round 3',
            'round4': 'Round 4',
            'round5': 'Round 5'
        };
        
        return roundNames[roundKey] || roundKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }

    showError() {
        const container = document.getElementById('relevantMatchesContainer');
        if (container) {
            container.innerHTML = `
                <div class="no-relevant-matches">
                    <p>Error loading relevant matches.</p>
                    <p>Please try refreshing the page.</p>
                </div>
            `;
        }
    }

    refresh() {
        this.init();
    }
}

// Initialize the relevant matches component when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.relevantMatches = new RelevantMatches();
    
    // Add refresh functionality to the refresh button
    const refreshBtn = document.getElementById('refreshData');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (window.relevantMatches) {
                window.relevantMatches.refresh();
            }
        });
    }
}); 