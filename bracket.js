// Tournament Bracket Component
class TournamentBracket {
    constructor() {
        this.bracketData = null;
        this.players = [];
        // Wait for leaderboard to be ready before initializing
        this.waitForLeaderboard();
    }

    async waitForLeaderboard() {
        // Wait for leaderboard to be available
        let attempts = 0;
        while (!window.snookerLeaderboard && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (window.snookerLeaderboard) {
            console.log('Leaderboard ready, initializing bracket');
            this.init();
        } else {
            console.log('Leaderboard not available, initializing bracket with static data');
            this.init();
        }
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
        let dataSource = 'Static';
        
        // Try to load live data first, fallback to static data
        try {
            console.log('Attempting to load live tournament data...');
            const liveData = await WSTFetcher.getLiveTournamentData();
            
            // Check if live data contains the players we need (if leaderboard is available)
            if (window.snookerLeaderboard && window.snookerLeaderboard.participants) {
                const participantPicks = window.snookerLeaderboard.participants.flatMap(p => p.picks).filter(p => p !== null);
                const livePlayerNames = Object.values(liveData.players).map(p => p.name);
                const missingPlayers = participantPicks.filter(pick => 
                    !livePlayerNames.some(name => name.toLowerCase() === pick.toLowerCase())
                );
                
                if (missingPlayers.length > 0) {
                    console.log('Live bracket data missing key players, falling back to static data:', missingPlayers);
                    throw new Error('Live bracket data incomplete');
                }
            }
            
            this.bracketData = liveData;
            dataSource = 'Live';
            console.log('Loaded live tournament data from WST API');
            this.updateDataSource(dataSource);
        } catch (apiError) {
            if (CONFIG.DEBUG.SHOW_API_ERRORS) {
                console.warn('Failed to load live data, falling back to static data:', apiError);
            }
            
            if (!CONFIG.API_FALLBACK_ENABLED) {
                throw new Error('API fallback is disabled in configuration');
            }
            
            try {
                const response = await fetch('data/bracket.json');
                if (!response.ok) {
                    throw new Error(`Failed to load bracket: ${response.status}`);
                }
                this.bracketData = await response.json();
                if (CONFIG.DEBUG.ENABLE_LOGGING) {
                    console.log('Loaded static bracket data');
                }
                this.updateDataSource(dataSource);
            } catch (error) {
                console.error('Error loading bracket data:', error);
                throw error;
            }
        }
    }

    async loadPlayersData() {
        try {
            // Try to use the same player data as the leaderboard if available
            if (window.snookerLeaderboard && window.snookerLeaderboard.players) {
                this.players = window.snookerLeaderboard.players;
                console.log('Using player data from leaderboard');
            } else {
                // Fallback to static data
                const response = await fetch('data/players.json');
                if (!response.ok) {
                    throw new Error(`Failed to load players: ${response.status}`);
                }
                this.players = await response.json();
                console.log('Loaded static player data for bracket');
            }
        } catch (error) {
            console.error('Error loading players data:', error);
            // Don't throw error, just use fallback names
        }
    }

    // Calculate accurate max points based on complete tournament bracket structure
    calculateAccurateMaxPoints(picks) {
        console.log('Bracket calculating max points for picks:', picks.map(p => p ? p.name : 'null'));
        
        let maxPoints = 0;
        let playersStillIn = [];

        // First pass: collect players still in and add earned points
        picks.forEach(pick => {
            // Handle null picks
            if (!pick || pick === null) {
                return; // Skip null picks
            }
            
            console.log(`Player ${pick.name}: status=${pick.status}, points=${pick.points}`);
            
            if (pick.status === 'playing') {
                playersStillIn.push(pick);
            } else {
                maxPoints += pick.points; // Add earned points
            }
        });

        console.log(`Players still in: ${playersStillIn.length}, Current max points: ${maxPoints}`);

        if (playersStillIn.length === 0) {
            console.log('No players still in, returning current max points:', maxPoints);
            return maxPoints;
        }

        // Use the most sophisticated calculation method
        try {
            const advancedPoints = this.calculateAdvancedBracketMaxPoints(playersStillIn);
            console.log('Advanced bracket calculation result:', advancedPoints);
            return maxPoints + advancedPoints;
        } catch (error) {
            console.warn('Advanced bracket calculation failed, using fallback:', error);
            const simplePoints = this.calculateSimpleMaxPoints(playersStillIn);
            console.log('Simple fallback calculation result:', simplePoints);
            return maxPoints + simplePoints;
        }
    }

    // Advanced bracket-based max points calculation
    calculateAdvancedBracketMaxPoints(players) {
        // Check if bracket data is available
        if (!this.bracketData || !this.bracketData.bracketStructure || !this.bracketData.draw) {
            throw new Error('Bracket data not available');
        }
        
        // Get player match positions and bracket paths
        const playerPaths = this.getPlayerBracketPaths(players);
        
        // Debug logging
        console.log('Players for max points calculation:', players.map(p => ({ id: p.id, name: p.name, matches: p.matches })));
        console.log('Player paths:', playerPaths.map(pp => ({ 
            player: pp.player.name, 
            path: pp.path,
            semifinal: pp.path.semifinalMatch
        })));
        
        // Calculate max points based on bracket conflicts
        const maxPoints = this.calculateMaxPointsFromPaths(playerPaths);
        console.log('Calculated max points:', maxPoints);
        
        return maxPoints;
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
        // Use the player's match progression data if available
        if (player.matches) {
            console.log(`Player ${player.name} has matches data:`, player.matches);
            return {
                last32Match: player.matches.last32.toString(),
                last16Match: player.matches.last16,
                quarterfinalMatch: player.matches.quarterfinals,
                semifinalMatch: player.matches.semifinals,
                finalMatch: player.matches.final
            };
        } else {
            console.log(`Player ${player.name} has NO matches data`);
        }

        // Fallback to bracket data if player doesn't have match progression
        const last32Match = this.findPlayerLast32Match(player.id);
        if (!last32Match) return null;

        const progression = this.bracketData.bracketStructure.matchProgression.last32[last32Match];
        if (!progression) return null;

        return {
            last32Match: last32Match,
            last16Match: progression.last16,
            quarterfinalMatch: progression.quarterfinals,
            semifinalMatch: progression.semifinals,
            finalMatch: progression.final
        };
    }

    // Find which Last 32 match a player is in
    findPlayerLast32Match(playerId) {
        const last32Matches = this.bracketData.draw.last32;
        for (let i = 0; i < last32Matches.length; i++) {
            if (last32Matches[i].player1 === playerId) {
                return last32Matches[i].match.toString();
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

    // Simple fallback max points calculation
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
            semifinal1: [], // Match 15
            semifinal2: [], // Match 16
            final: []
        };

        // Group players by their actual semifinal matches
        playerPaths.forEach(playerPath => {
            const path = playerPath.path;
            
            if (path.semifinalMatch === 141) {
                conflicts.semifinal1.push(playerPath);
            } else if (path.semifinalMatch === 142) {
                conflicts.semifinal2.push(playerPath);
            }
        });

        // Debug logging
        console.log('Bracket conflicts:', {
            semifinal1: conflicts.semifinal1.map(p => p.player.name),
            semifinal2: conflicts.semifinal2.map(p => p.player.name)
        });

        return conflicts;
    }

    // Calculate max points considering bracket conflicts
    calculateMaxPointsWithConflicts(conflicts) {
        const semifinal1Count = conflicts.semifinal1.length;
        const semifinal2Count = conflicts.semifinal2.length;
        const totalPlayers = semifinal1Count + semifinal2Count;

        console.log('Max points calculation:', {
            semifinal1Count,
            semifinal2Count,
            totalPlayers
        });

        if (totalPlayers === 0) {
            return 0;
        } else if (totalPlayers === 1) {
            return 14; // Can win
        } else if (totalPlayers === 2) {
            // Check if they're in the same semifinal (conflict) or different semifinals
            if (semifinal1Count === 2 || semifinal2Count === 2) {
                console.log('2 players in same semifinal - max points: 20');
                return 14 + 6; // One winner, one semi-finalist
            } else {
                console.log('2 players in different semifinals - max points: 24');
                return 14 + 10; // One winner, one finalist
            }
        } else if (totalPlayers === 3) {
            // Three players across two semifinals
            if (semifinal1Count === 2 && semifinal2Count === 1) {
                console.log('3 players: 2 in semifinal1, 1 in semifinal2 - max points: 30');
                return 14 + 10 + 6; // One winner, one finalist, one semi-finalist
            } else if (semifinal1Count === 1 && semifinal2Count === 2) {
                console.log('3 players: 1 in semifinal1, 2 in semifinal2 - max points: 30');
                return 14 + 10 + 6; // One winner, one finalist, one semi-finalist
            } else {
                console.log('3 players in different semifinals - max points: 30');
                return 14 + 10 + 6; // One winner, one finalist, one semi-finalist
            }
        } else {
            // Four or more players - calculate optimal scenario
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
            section4: [],
            section5: [],
            section6: [],
            section7: [],
            section8: []
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
        } else if (sectionsWithPlayers.length >= 4) {
            // Players in four or more sections
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
            </div>
        `;
        
        // Populate the rounds information in the "How It Works" section
        this.populateRoundsInfo();
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

    populateRoundsInfo() {
        const roundsInfoContainer = document.getElementById('roundsInfo');
        if (roundsInfoContainer) {
            roundsInfoContainer.innerHTML = this.renderRoundsInfo();
        }
    }

    renderTournamentDraw() {
        return `
            <div class="bracket-container">
                <div class="bracket-rounds">
                    <div class="bracket-round last32">
                        <div class="round-header">
                            <h5>Last 32</h5>
                            <span class="round-dates">${this.bracketData.rounds.last32?.dates || 'Aug 13'}</span>
                        </div>
                        <div class="bracket-matches">
                            ${this.renderBracketMatches('last32')}
                        </div>
                    </div>
                    <div class="bracket-round last16">
                        <div class="round-header">
                            <h5>Last 16</h5>
                            <span class="round-dates">${this.bracketData.rounds.last16?.dates || 'Aug 14'}</span>
                        </div>
                        <div class="bracket-matches">
                            ${this.renderBracketMatches('last16')}
                        </div>
                    </div>
                    <div class="bracket-round quarterfinals">
                        <div class="round-header">
                            <h5>Quarter-finals</h5>
                            <span class="round-dates">${this.bracketData.rounds.quarterfinals?.dates || 'Aug 15'}</span>
                        </div>
                        <div class="bracket-matches">
                            ${this.renderBracketMatches('quarterfinals')}
                        </div>
                    </div>
                    <div class="bracket-round semifinals">
                        <div class="round-header">
                            <h5>Semi-finals</h5>
                            <span class="round-dates">${this.bracketData.rounds.semifinals?.dates || 'Aug 16'}</span>
                        </div>
                        <div class="bracket-matches">
                            ${this.renderBracketMatches('semifinals')}
                        </div>
                    </div>
                    <div class="bracket-round final">
                        <div class="round-header">
                            <h5>Final</h5>
                            <span class="round-dates">${this.bracketData.rounds.final?.dates || 'Aug 16'}</span>
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
}

// Initialize bracket when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.tournamentBracket = new TournamentBracket();
});

// Add refresh method to TournamentBracket class
TournamentBracket.prototype.refresh = async function() {
    try {
        await this.loadBracketData();
        await this.loadPlayersData();
        this.renderBracket();
        console.log('Bracket data refreshed successfully');
    } catch (error) {
        console.error('Error refreshing bracket:', error);
        throw error;
    }
}; 