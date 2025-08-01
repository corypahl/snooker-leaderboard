// Tournament Bracket Component
class TournamentBracket {
    constructor() {
        this.bracketData = null;
        this.players = [];
        this.init();
    }

    async init() {
        try {
            await this.loadBracketData();
            await this.loadPlayersData();
            this.renderBracket();
        } catch (error) {
            console.error('Error initializing bracket:', error);
        }
    }

    async loadBracketData() {
        try {
            const response = await fetch('data/bracket.json');
            if (!response.ok) {
                throw new Error(`Failed to load bracket: ${response.status}`);
            }
            this.bracketData = await response.json();
        } catch (error) {
            console.error('Error loading bracket data:', error);
            throw error;
        }
    }

    async loadPlayersData() {
        try {
            const response = await fetch('data/players.json');
            if (!response.ok) {
                throw new Error(`Failed to load players: ${response.status}`);
            }
            this.players = await response.json();
        } catch (error) {
            console.error('Error loading players data:', error);
            // Don't throw error, just use fallback names
        }
    }

    // Calculate accurate max points based on complete tournament bracket structure
    calculateAccurateMaxPoints(picks) {
        let maxPoints = 0;
        let playersStillIn = [];

        // First pass: collect players still in and add earned points
        picks.forEach(pick => {
            if (pick.status === 'playing') {
                playersStillIn.push(pick);
            } else {
                maxPoints += pick.points; // Add earned points
            }
        });

        if (playersStillIn.length === 0) {
            return maxPoints;
        }

        // Use the most sophisticated calculation method
        return maxPoints + this.calculateAdvancedBracketMaxPoints(playersStillIn);
    }

    // Advanced bracket-based max points calculation
    calculateAdvancedBracketMaxPoints(players) {
        // Get player match positions and bracket paths
        const playerPaths = this.getPlayerBracketPaths(players);
        
        // Calculate max points based on bracket conflicts
        return this.calculateMaxPointsFromPaths(playerPaths);
    }

    // Get each player's bracket path through the tournament
    getPlayerBracketPaths(players) {
        const paths = [];

        players.forEach(player => {
            const path = this.getPlayerPath(player);
            if (path) {
                paths.push({
                    player: player,
                    path: path,
                    maxPoints: this.getPlayerMaxPointsFromPath(path)
                });
            }
        });

        return paths;
    }

    // Get a player's complete bracket path
    getPlayerPath(player) {
        // Find which Last 32 match this player is in
        const last32Match = this.findPlayerLast32Match(player.id);
        if (!last32Match) return null;

        return {
            last32Match: last32Match,
            last16Match: this.bracketData.bracketStructure.matchProgression.last32[last32Match].last16,
            quarterfinalMatch: this.bracketData.bracketStructure.matchProgression.last32[last32Match].quarterfinals,
            semifinalMatch: this.bracketData.bracketStructure.matchProgression.last32[last32Match].semifinals,
            finalMatch: this.bracketData.bracketStructure.matchProgression.last32[last32Match].final
        };
    }

    // Find which Last 32 match a player is in
    findPlayerLast32Match(playerId) {
        const last32Matches = this.bracketData.draw.last32;
        for (let i = 0; i < last32Matches.length; i++) {
            if (last32Matches[i].player1 === playerId) {
                return (i + 1).toString();
            }
        }
        return null;
    }

    // Get max points for a player based on their path
    getPlayerMaxPointsFromPath(path) {
        // All players can theoretically win (14 points)
        // But we need to check conflicts with other players
        return 14;
    }

    // Calculate max points considering bracket conflicts
    calculateMaxPointsFromPaths(playerPaths) {
        if (playerPaths.length === 0) return 0;
        if (playerPaths.length === 1) return 14; // Can win

        // Group players by their bracket paths to identify conflicts
        const conflicts = this.identifyBracketConflicts(playerPaths);
        
        // Calculate max points based on conflicts
        return this.calculateMaxPointsWithConflicts(conflicts);
    }

    // Identify which players have conflicting bracket paths
    identifyBracketConflicts(playerPaths) {
        const conflicts = {
            semifinal1: [],
            semifinal2: [],
            final: []
        };

        playerPaths.forEach(playerPath => {
            const path = playerPath.path;
            
            // Group by semifinal match
            if (path.semifinalMatch === 1) {
                conflicts.semifinal1.push(playerPath);
            } else if (path.semifinalMatch === 2) {
                conflicts.semifinal2.push(playerPath);
            }
        });

        return conflicts;
    }

    // Calculate max points considering bracket conflicts
    calculateMaxPointsWithConflicts(conflicts) {
        let totalMaxPoints = 0;

        // Only one player can win (14 points)
        // Only one player can be finalist (10 points)
        // Two players can be semi-finalists (6 points each)

        const semifinal1Count = conflicts.semifinal1.length;
        const semifinal2Count = conflicts.semifinal2.length;

        if (semifinal1Count === 0 && semifinal2Count === 0) {
            return 0;
        } else if (semifinal1Count === 1 && semifinal2Count === 0) {
            return 14; // Can win
        } else if (semifinal1Count === 0 && semifinal2Count === 1) {
            return 14; // Can win
        } else if (semifinal1Count === 1 && semifinal2Count === 1) {
            return 14 + 10; // One winner, one finalist
        } else if (semifinal1Count === 2 && semifinal2Count === 0) {
            return 14 + 6; // One winner, one semi-finalist
        } else if (semifinal1Count === 0 && semifinal2Count === 2) {
            return 14 + 6; // One winner, one semi-finalist
        } else if (semifinal1Count === 2 && semifinal2Count === 1) {
            return 14 + 10 + 6; // One winner, one finalist, one semi-finalist
        } else if (semifinal1Count === 1 && semifinal2Count === 2) {
            return 14 + 10 + 6; // One winner, one finalist, one semi-finalist
        } else if (semifinal1Count === 2 && semifinal2Count === 2) {
            return 14 + 10 + 6 + 6; // One winner, one finalist, two semi-finalists
        } else {
            // For more complex scenarios, use a more sophisticated calculation
            return this.calculateComplexMaxPoints(conflicts);
        }
    }

    // Calculate max points for complex scenarios
    calculateComplexMaxPoints(conflicts) {
        const semifinal1Count = conflicts.semifinal1.length;
        const semifinal2Count = conflicts.semifinal2.length;
        const totalPlayers = semifinal1Count + semifinal2Count;

        // Sort players by seed to prioritize better players
        const allPlayers = [...conflicts.semifinal1, ...conflicts.semifinal2]
            .sort((a, b) => {
                const seedA = typeof a.player.seed === 'number' ? a.player.seed : 999;
                const seedB = typeof b.player.seed === 'number' ? b.player.seed : 999;
                return seedA - seedB;
            });

        let maxPoints = 0;
        let playersAssigned = 0;

        // Assign winner (14 points) to best player
        if (totalPlayers >= 1) {
            maxPoints += 14;
            playersAssigned++;
        }

        // Assign finalist (10 points) to second best player if in different semifinal
        if (totalPlayers >= 2 && semifinal1Count > 0 && semifinal2Count > 0) {
            maxPoints += 10;
            playersAssigned++;
        }

        // Assign semi-finalists (6 points each) to remaining players
        const remainingPlayers = totalPlayers - playersAssigned;
        maxPoints += Math.min(remainingPlayers, 2) * 6;

        return maxPoints;
    }

    // Group players by their bracket sections
    groupPlayersBySections(players) {
        const sections = {
            section1: [],
            section2: [],
            section3: [],
            section4: []
        };

        players.forEach(player => {
            // Find which section this player is in
            for (const [sectionKey, section] of Object.entries(this.bracketData.bracketStructure.sections)) {
                if (section.players.includes(player.id)) {
                    sections[sectionKey].push(player);
                    break;
                }
            }
        });

        return sections;
    }

    // Calculate max points based on bracket structure
    calculateBracketBasedMaxPoints(sectionGroups) {
        let totalMaxPoints = 0;
        const sectionMaxPoints = {};

        // Calculate max points for each section
        for (const [sectionKey, players] of Object.entries(sectionGroups)) {
            if (players.length === 0) continue;

            // Each section can only produce one semi-finalist (6 points max)
            // The best player in each section can reach semi-finals
            const bestPlayer = this.getBestPlayerInSection(players, sectionKey);
            sectionMaxPoints[sectionKey] = {
                maxPoints: 6, // Semi-finalist points
                bestPlayer: bestPlayer
            };
        }

        // Now calculate realistic combinations across sections
        const sectionsWithPlayers = Object.keys(sectionGroups).filter(key => sectionGroups[key].length > 0);
        
        if (sectionsWithPlayers.length === 1) {
            // All players in same section - only one can reach semi-finals
            const section = sectionsWithPlayers[0];
            totalMaxPoints = 6; // Semi-finalist points
        } else if (sectionsWithPlayers.length === 2) {
            // Players in two different sections
            // One can reach final (10 points), one can reach semi-finals (6 points)
            totalMaxPoints = 10 + 6;
        } else if (sectionsWithPlayers.length === 3) {
            // Players in three different sections
            // One can win (14 points), one can reach final (10 points), one can reach semi-finals (6 points)
            totalMaxPoints = 14 + 10 + 6;
        } else if (sectionsWithPlayers.length === 4) {
            // Players in all four sections
            // One can win (14 points), one can reach final (10 points), two can reach semi-finals (6 points each)
            totalMaxPoints = 14 + 10 + 6 + 6;
        }

        return totalMaxPoints;
    }

    // Get the best player in a section (highest seed)
    getBestPlayerInSection(players, sectionKey) {
        if (players.length === 0) return null;
        
        // Sort by seed (lower number = better seed)
        return players.sort((a, b) => {
            const seedA = typeof a.seed === 'number' ? a.seed : 999;
            const seedB = typeof b.seed === 'number' ? b.seed : 999;
            return seedA - seedB;
        })[0];
    }

    // Alternative method: Calculate max points based on quadrant structure
    calculateQuadrantBasedMaxPoints(picks) {
        let maxPoints = 0;
        let playersStillIn = [];

        // First pass: collect players still in and add earned points
        picks.forEach(pick => {
            if (pick.status === 'playing') {
                playersStillIn.push(pick);
            } else {
                maxPoints += pick.points;
            }
        });

        if (playersStillIn.length === 0) {
            return maxPoints;
        }

        // Group players by quadrants
        const quadrantGroups = this.groupPlayersByQuadrants(playersStillIn);
        
        // Calculate based on quadrant structure
        return maxPoints + this.calculateQuadrantMaxPoints(quadrantGroups);
    }

    // Group players by their bracket quadrants
    groupPlayersByQuadrants(players) {
        const quadrants = {
            topLeft: [],
            topRight: []
        };

        players.forEach(player => {
            for (const [quadrantKey, quadrant] of Object.entries(this.bracketData.bracketStructure.quadrants)) {
                if (quadrant.players.includes(player.id)) {
                    quadrants[quadrantKey].push(player);
                    break;
                }
            }
        });

        return quadrants;
    }

    // Calculate max points based on quadrant structure
    calculateQuadrantMaxPoints(quadrantGroups) {
        const topLeftCount = quadrantGroups.topLeft.length;
        const topRightCount = quadrantGroups.topRight.length;

        // Only one player can win (14 points)
        // Only one player can be finalist (10 points)
        // Two players can be semi-finalists (6 points each)

        if (topLeftCount === 0 && topRightCount === 0) {
            return 0;
        } else if (topLeftCount === 1 && topRightCount === 0) {
            return 14; // Can win
        } else if (topLeftCount === 0 && topRightCount === 1) {
            return 14; // Can win
        } else if (topLeftCount === 1 && topRightCount === 1) {
            return 14 + 10; // One winner, one finalist
        } else if (topLeftCount === 2 && topRightCount === 0) {
            return 14 + 6; // One winner, one semi-finalist
        } else if (topLeftCount === 0 && topRightCount === 2) {
            return 14 + 6; // One winner, one semi-finalist
        } else if (topLeftCount === 2 && topRightCount === 1) {
            return 14 + 10 + 6; // One winner, one finalist, one semi-finalist
        } else if (topLeftCount === 1 && topRightCount === 2) {
            return 14 + 10 + 6; // One winner, one finalist, one semi-finalist
        } else if (topLeftCount === 2 && topRightCount === 2) {
            return 14 + 10 + 6 + 6; // One winner, one finalist, two semi-finalists
        } else {
            // For more complex scenarios, use section-based calculation
            const allPlayers = quadrantGroups.topLeft.concat(quadrantGroups.topRight);
            return this.calculateBracketBasedMaxPoints(this.groupPlayersBySections(allPlayers));
        }
    }

    // Get player's current round based on status
    getPlayerCurrentRound(player) {
        if (player.status === 'eliminated' || player.status === 'eliminated_early') {
            return 'eliminated';
        }
        
        // For players still in, determine their current round
        // This would need to be updated as the tournament progresses
        if (this.bracketData.seeding.top16.includes(player.id)) {
            return 'last32'; // Top 16 are seeded through to Last 32
        } else if (this.bracketData.seeding.seeded17to48.includes(player.id)) {
            return 'round3'; // Players 17-48 are seeded through to Round 3
        } else {
            return 'round1'; // All other players start in Round 1
        }
    }

    // Get maximum possible points for a player based on their current round
    getPlayerMaxPoints(player) {
        const currentRound = this.getPlayerCurrentRound(player);
        
        switch (currentRound) {
            case 'eliminated':
                return player.points; // Already earned points
            case 'last32':
                return 14; // Can win the tournament
            case 'round3':
                return 14; // Can win the tournament
            case 'round2':
                return 14; // Can win the tournament
            case 'round1':
                return 14; // Can win the tournament
            default:
                return 14; // Default to maximum
        }
    }

    renderBracket() {
        const bracketContainer = document.getElementById('bracketContainer');
        if (!bracketContainer) {
            console.error('Bracket container not found');
            return;
        }

        bracketContainer.innerHTML = `
            <div class="bracket-structure">
                <div class="tournament-draw">
                    <h4>Tournament Draw</h4>
                    <div class="draw-container">
                        ${this.renderTournamentDraw()}
                    </div>
                </div>
                <div class="round-info">
                    <h4>Tournament Structure</h4>
                    <div class="rounds-grid">
                        ${this.renderRoundsInfo()}
                    </div>
                </div>
                <div class="seeding-info">
                    <h4>Seeding Information</h4>
                    <p>• Top 16 players seeded through to Last 32</p>
                    <p>• Players ranked 17-48 seeded through to Round 3</p>
                    <p>• Players ranked 49-80 seeded through to Round 2</p>
                    <p>• All other players start in Round 1</p>
                </div>
            </div>
        `;
    }

    renderRoundsInfo() {
        const rounds = this.bracketData.rounds;
        return Object.entries(rounds).map(([key, round]) => `
            <div class="round-item">
                <div class="round-name">${round.name}</div>
                <div class="round-details">
                    <span class="frames">${round.frames}</span>
                    <span class="players">${round.players} players</span>
                    <span class="dates">${round.dates}</span>
                </div>
            </div>
        `).join('');
    }

    renderTournamentDraw() {
        return `
            <div class="bracket-container">
                <div class="bracket-rounds">
                    <div class="bracket-round last32">
                        <div class="round-header">
                            <h5>Last 32</h5>
                            <span class="round-dates">${this.bracketData.rounds.round5.dates}</span>
                        </div>
                        <div class="bracket-matches">
                            ${this.renderBracketMatches('last32')}
                        </div>
                    </div>
                    <div class="bracket-round last16">
                        <div class="round-header">
                            <h5>Last 16</h5>
                            <span class="round-dates">${this.bracketData.rounds.round6.dates}</span>
                        </div>
                        <div class="bracket-matches">
                            ${this.renderBracketMatches('last16')}
                        </div>
                    </div>
                    <div class="bracket-round quarterfinals">
                        <div class="round-header">
                            <h5>Quarter-finals</h5>
                            <span class="round-dates">${this.bracketData.rounds.quarterfinals.dates}</span>
                        </div>
                        <div class="bracket-matches">
                            ${this.renderBracketMatches('quarterfinals')}
                        </div>
                    </div>
                    <div class="bracket-round semifinals">
                        <div class="round-header">
                            <h5>Semi-finals</h5>
                            <span class="round-dates">${this.bracketData.rounds.semifinals.dates}</span>
                        </div>
                        <div class="bracket-matches">
                            ${this.renderBracketMatches('semifinals')}
                        </div>
                    </div>
                    <div class="bracket-round final">
                        <div class="round-header">
                            <h5>Final</h5>
                            <span class="round-dates">${this.bracketData.rounds.final.dates}</span>
                        </div>
                        <div class="bracket-matches">
                            ${this.renderBracketMatches('final')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderBracketMatches(round) {
        const matches = this.bracketData.draw[round];
        if (!matches) return '<p>No matches available</p>';
        
        return matches.map(match => `
            <div class="bracket-match">
                <div class="match-slot">
                    <div class="player-slot ${match.player1 !== 'tbd' ? 'seeded' : 'tbd'}">
                        ${this.getPlayerDisplayName(match.player1)}
                    </div>
                    <div class="player-slot ${match.player2 !== 'tbd' ? 'seeded' : 'tbd'}">
                        ${this.getPlayerDisplayName(match.player2)}
                    </div>
                </div>
            </div>
        `).join('');
    }

    getPlayerDisplayName(playerId) {
        if (playerId === 'tbd') return 'TBD';
        
        // Find player in our players data
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            const seedText = player.seed ? ` (${player.seed})` : '';
            return player.name + seedText;
        }
        
        // Fallback to formatted ID
        return playerId.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    // Method to update player status and recalculate max points
    updatePlayerStatus(playerId, status, points = 0) {
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            player.status = status;
            player.points = points;
        }
    }
}

// Initialize bracket when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.tournamentBracket = new TournamentBracket();
}); 