/**
 * WST API Fetcher for live tournament data
 */
class WSTFetcher {
    static TOURNAMENT_ID = '34ca357d-bed6-4501-b8cd-aa94e5f7ff16';
    static BASE_URL = 'https://tournaments.snooker.web.gc.wstservices.co.uk/v2';
    
    /**
     * Fetch live tournament data from WST API
     * @returns {Promise<Object>} Tournament data
     */
    static async fetchTournamentData() {
        if (!CONFIG.API_ENABLED) {
            throw new Error('API integration is disabled in configuration');
        }
        
        try {
            const response = await fetch(`${this.BASE_URL}/${this.TOURNAMENT_ID}?format=json`);
            if (!response.ok) {
                throw new Error(`Failed to fetch tournament data: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            if (CONFIG.DEBUG.SHOW_API_ERRORS) {
                console.error('Error fetching tournament data:', error);
            }
            throw error;
        }
    }

    /**
     * Fetch live draw data from WST API
     * @returns {Promise<Object>} Draw data with all rounds and matches
     */
    static async fetchDrawData() {
        if (!CONFIG.API_ENABLED) {
            throw new Error('API integration is disabled in configuration');
        }
        
        try {
            const response = await fetch(`${this.BASE_URL}/${this.TOURNAMENT_ID}/draws?format=json`);
            if (!response.ok) {
                throw new Error(`Failed to fetch draw data: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            if (CONFIG.DEBUG.SHOW_API_ERRORS) {
                console.error('Error fetching draw data:', error);
            }
            throw error;
        }
    }

    /**
     * Transform WST API data to our local format
     * @param {Object} drawData - Raw draw data from API
     * @returns {Object} Transformed data in our format
     */
    static transformDrawData(drawData) {
        const transformed = {
            rounds: {},
            draw: {},
            players: {},
            lastUpdated: new Date().toISOString()
        };

        if (!drawData.data?.attributes?.rounds) {
            throw new Error('Invalid draw data structure');
        }

        const rounds = drawData.data.attributes.rounds;

        // Process each round
        rounds.forEach(round => {
            const roundName = this.normalizeRoundName(round.roundName);
            const roundKey = this.getRoundKey(roundName);
            
            // Store round info
            transformed.rounds[roundKey] = {
                name: round.roundName,
                roundNumber: round.roundNumber,
                matches: round.matches?.length || 0,
                players: this.calculatePlayersInRound(round.matches)
            };

            // Transform matches
            if (round.matches) {
                transformed.draw[roundKey] = round.matches.map(match => ({
                    match: match.tournamentMatchNumber,
                    player1: match.player1Name || 'tbd',
                    player2: match.player2Name || 'tbd',
                    winner: match.winningPlayerID ? 
                        (match.homePlayerID === match.winningPlayerID ? match.player1Name : match.player2Name) : null,
                    status: match.match?.status || 'Scheduled',
                    frames: match.frames,
                    fixtureDate: match.fixtureDate,
                    homePlayerID: match.homePlayerID,
                    awayPlayerID: match.awayPlayerID
                }));

                // Extract player information from each match
                round.matches.forEach(match => {
                    if (match.homePlayer) {
                        transformed.players[match.homePlayerID] = {
                            id: match.homePlayerID,
                            name: match.player1Name,
                            slug: match.homePlayer.playerSlug,
                            country: match.homePlayer.country,
                            ranking: this.getCurrentRanking(match.homePlayer.seasonStats)
                        };
                    }
                    if (match.awayPlayer) {
                        transformed.players[match.awayPlayerID] = {
                            id: match.awayPlayerID,
                            name: match.player2Name,
                            slug: match.awayPlayer.playerSlug,
                            country: match.awayPlayer.country,
                            ranking: this.getCurrentRanking(match.awayPlayer.seasonStats)
                        };
                    }
                });
            }
        });

        return transformed;
    }

    /**
     * Normalize round names to our format
     * @param {string} roundName - Round name from API
     * @returns {string} Normalized round name
     */
    static normalizeRoundName(roundName) {
        const mappings = {
            'Round 1': 'round1',
            'Round 2': 'round2', 
            'Round 3': 'round3',
            'Round 4': 'round4',
            'Last 32': 'last32',
            'Last 16': 'last16',
            'Quarter Finals': 'quarterfinals',
            'Semi Finals': 'semifinals',
            'Final': 'final'
        };
        return mappings[roundName] || roundName.toLowerCase().replace(/\s+/g, '');
    }

    /**
     * Get round key for our data structure
     * @param {string} roundName - Normalized round name
     * @returns {string} Round key
     */
    static getRoundKey(roundName) {
        return roundName;
    }

    /**
     * Calculate number of players in a round
     * @param {Array} matches - Matches in the round
     * @returns {number} Number of players
     */
    static calculatePlayersInRound(matches) {
        if (!matches) return 0;
        return matches.length * 2; // Each match has 2 players
    }

    /**
     * Get current ranking from season stats
     * @param {Array} seasonStats - Player season statistics
     * @returns {number} Current ranking
     */
    static getCurrentRanking(seasonStats) {
        if (!seasonStats || seasonStats.length === 0) return 999;
        
        // Get the most recent season (2025)
        const currentSeason = seasonStats.find(stat => stat.season === 2025);
        return currentSeason ? currentSeason.ranking : 999;
    }

    /**
     * Get player status based on match results
     * @param {string} playerName - Player name
     * @param {Array} allMatches - All matches from all rounds
     * @returns {Object} Player status
     */
    static getPlayerStatus(playerName, allMatches) {
        // Find all matches involving this player
        const playerMatches = allMatches.filter(match => 
            match.player1 === playerName || match.player2 === playerName
        );

        if (playerMatches.length === 0) {
            return { status: 'unknown', currentRound: null, eliminated: false };
        }

        // Sort matches by round to find current status
        const sortedMatches = playerMatches.sort((a, b) => {
            const roundOrder = ['round1', 'round2', 'round3', 'round4', 'last32', 'last16', 'quarterfinals', 'semifinals', 'final'];
            return roundOrder.indexOf(a.round) - roundOrder.indexOf(b.round);
        });

        const lastMatch = sortedMatches[sortedMatches.length - 1];
        
        if (lastMatch.winner === playerName) {
            // Player won their last match
            if (lastMatch.round === 'final') {
                return { status: 'winner', currentRound: 'final', eliminated: false, points: 14 };
            } else if (lastMatch.round === 'semifinals') {
                return { status: 'finalist', currentRound: 'final', eliminated: false, points: 10 };
            } else if (lastMatch.round === 'quarterfinals') {
                return { status: 'semifinalist', currentRound: 'semifinals', eliminated: false, points: 6 };
            } else if (lastMatch.round === 'last16') {
                return { status: 'quarterfinalist', currentRound: 'quarterfinals', eliminated: false, points: 4 };
            } else if (lastMatch.round === 'last32') {
                return { status: 'last16', currentRound: 'last16', eliminated: false, points: 2 };
            } else {
                return { status: 'playing', currentRound: lastMatch.round, eliminated: false, points: 0 };
            }
        } else {
            // Player lost their last match
            if (lastMatch.round === 'final') {
                return { status: 'finalist', currentRound: 'final', eliminated: true, points: 10 };
            } else if (lastMatch.round === 'semifinals') {
                return { status: 'semifinalist', currentRound: 'semifinals', eliminated: true, points: 6 };
            } else if (lastMatch.round === 'quarterfinals') {
                return { status: 'quarterfinalist', currentRound: 'quarterfinals', eliminated: true, points: 4 };
            } else if (lastMatch.round === 'last16') {
                return { status: 'last16', currentRound: 'last16', eliminated: true, points: 2 };
            } else if (lastMatch.round === 'last32') {
                return { status: 'last32', currentRound: 'last32', eliminated: true, points: 0 };
            } else {
                return { status: 'eliminated', currentRound: lastMatch.round, eliminated: true, points: 0 };
            }
        }
    }

    /**
     * Get all matches from all rounds
     * @param {Object} drawData - Transformed draw data
     * @returns {Array} All matches with round information
     */
    static getAllMatches(drawData) {
        const allMatches = [];
        
        Object.entries(drawData.draw).forEach(([roundKey, matches]) => {
            matches.forEach(match => {
                allMatches.push({
                    ...match,
                    round: roundKey
                });
            });
        });

        return allMatches;
    }

    /**
     * Fetch and transform live tournament data
     * @returns {Promise<Object>} Live tournament data in our format
     */
    static async getLiveTournamentData() {
        try {
            const drawData = await this.fetchDrawData();
            const transformedData = this.transformDrawData(drawData);
            
            // Add player status information
            const allMatches = this.getAllMatches(transformedData);
            Object.keys(transformedData.players).forEach(playerId => {
                const player = transformedData.players[playerId];
                const status = this.getPlayerStatus(player.name, allMatches);
                transformedData.players[playerId] = {
                    ...player,
                    ...status
                };
            });

            return transformedData;
        } catch (error) {
            console.error('Error getting live tournament data:', error);
            throw error;
        }
    }
} 