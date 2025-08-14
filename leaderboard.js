/**
 * Snooker Leaderboard Class
 * 
 * Manages the leaderboard display and calculations for the Snooker Draft Order Contest.
 * Uses tournament API data to calculate points based on player progression through rounds.
 */

class SnookerLeaderboard {
    constructor() {
        this.participants = [];
        this.init();
    }

    async init() {
        console.log('Initializing Snooker Leaderboard...');
        await this.loadData();
    }

    async loadData() {
        console.log('=== LEADERBOARD: Starting loadData ===');
        
        try {
            // Load participants first using static method
            this.participants = await ParticipantsLoader.loadParticipants();
            console.log('Participants loaded:', this.participants);
            
            if (CONFIG.API_ENABLED) {
                console.log('API is enabled - fetching tournament data...');
                
                try {
                    // Always try to fetch fresh tournament data first
                    console.log('Fetching fresh tournament data from API...');
                    const tournamentData = await WSTFetcher.fetchTournamentData();
                    console.log('Fresh tournament data loaded:', tournamentData);
                    
                    if (tournamentData && tournamentData.data && tournamentData.data.attributes && tournamentData.data.attributes.matches) {
                        console.log('Processing tournament matches from fresh API data...');
                        this.calculatePointsFromTournamentData(tournamentData.data.attributes.matches);
                        return;
                    }
                } catch (apiError) {
                    console.log('API fetch failed, trying local data...', apiError);
                }
                
                try {
                    // Fallback to local tournament data
                    console.log('Attempting to load local tournament data...');
                    const localResponse = await fetch('data/api_tournament.json');
                    if (localResponse.ok) {
                        const tournamentData = await localResponse.json();
                        console.log('Local tournament data loaded:', tournamentData);
                        
                        if (tournamentData && tournamentData.data && tournamentData.data.attributes && tournamentData.data.attributes.matches) {
                            console.log('Processing tournament matches from local data...');
                            this.calculatePointsFromTournamentData(tournamentData.data.attributes.matches);
                            return;
                        }
                    }
                } catch (localError) {
                    console.log('Local tournament data not available...');
                }
                
                try {
                    // Fetch tournament data directly from API
                    console.log('Fetching tournament data from API...');
                    const tournamentData = await WSTFetcher.fetchTournamentData();
                    console.log('Tournament data fetched from API:', tournamentData);
                    
                    if (tournamentData && tournamentData.data && tournamentData.data.attributes && tournamentData.data.attributes.matches) {
                        console.log('Processing tournament matches from API...');
                        this.calculatePointsFromTournamentData(tournamentData.data.attributes.matches);
                    } else {
                        console.error('No valid tournament data found in API response');
                        this.renderLeaderboard();
                    }
                } catch (apiError) {
                    console.error('API fetch failed:', apiError);
                    this.renderLeaderboard();
                }
            } else {
                console.log('API is disabled - using static data');
                this.renderLeaderboard();
            }
        } catch (error) {
            console.error('Error loading data:', error);
            this.renderLeaderboard();
        }
    }

    calculatePointsFromTournamentData(matches) {
        console.log('=== LEADERBOARD: calculatePointsFromTournamentData ===');
        console.log('Total matches:', matches.length);
        
        // Step 1: Group matches by round
        const matchesByRound = this.groupMatchesByRound(matches);
        console.log('Matches by round:', matchesByRound);
        
        // Step 2: Determine which players are in each round
        const playersByRound = this.getPlayersByRound(matchesByRound);
        console.log('Players by round:', playersByRound);
        
        // Step 3: Calculate points for each participant based on their picks
        this.calculateParticipantPoints(playersByRound);
        
        // Step 4: Render the leaderboard
        this.renderLeaderboard();
    }

    groupMatchesByRound(matches) {
        const matchesByRound = {};
        
        matches.forEach(match => {
            const round = match.round;
            if (!matchesByRound[round]) {
                matchesByRound[round] = [];
            }
            matchesByRound[round].push(match);
        });
        
        return matchesByRound;
    }

    getPlayersByRound(matchesByRound) {
        const playersByRound = {};
        
        // Process rounds in order (Round 1, Round 2, Round 3, etc.)
        const roundOrder = ['Round 1', 'Round 2', 'Round 3', 'Round 4', 'Round 5', 'Round 6', 'Quarter Finals', 'Semi Finals', 'Final'];
        
        roundOrder.forEach(roundName => {
            if (matchesByRound[roundName]) {
                const playersInRound = new Set();
                
                matchesByRound[roundName].forEach(match => {
                    // Check if both players are available (not null)
                    if (!match.homePlayer || !match.awayPlayer) {
                        console.log(`Skipping match with null players: ${match.name || 'Unknown match'}`);
                        return; // Skip this match
                    }
                    
                    // Add both players to the round
                    const homePlayerName = `${match.homePlayer.firstName} ${match.homePlayer.surname}`;
                    const awayPlayerName = `${match.awayPlayer.firstName} ${match.awayPlayer.surname}`;
                    
                    playersInRound.add(homePlayerName);
                    playersInRound.add(awayPlayerName);
                    
                    // Debug: Log Mark Williams specifically
                    if (homePlayerName === 'Mark Williams' || awayPlayerName === 'Mark Williams') {
                        console.log(`🔍 Found Mark Williams in ${roundName}: ${match.name}, status: ${match.status}, home: ${match.homePlayerScore}, away: ${match.awayPlayerScore}`);
                    }
                    
                    // If match is completed, determine winner and loser
                    if (match.status === 'Completed') {
                        const winner = match.homePlayerScore > match.awayPlayerScore ? homePlayerName : awayPlayerName;
                        const loser = match.homePlayerScore > match.awayPlayerScore ? awayPlayerName : homePlayerName;
                        
                        // Mark loser as eliminated in this round
                        if (!playersByRound.eliminated) {
                            playersByRound.eliminated = {};
                        }
                        playersByRound.eliminated[loser] = roundName;
                        
                        // Debug: Log eliminations for Mark Williams
                        if (loser === 'Mark Williams') {
                            console.log(`❌ Mark Williams eliminated in ${roundName}`);
                        }
                    }
                });
                
                playersByRound[roundName] = Array.from(playersInRound);
                
                // Debug: Log all players in this round
                if (playersByRound[roundName].includes('Mark Williams')) {
                    console.log(`✅ Mark Williams found in ${roundName} players:`, playersByRound[roundName]);
                }
            }
        });
        
        return playersByRound;
    }

    calculateParticipantPoints(playersByRound) {
        console.log('=== LEADERBOARD: calculateParticipantPoints ===');
        console.log('Players by round:', playersByRound);
        
        // Store playersByRound data for use in rendering
        this.playersByRound = playersByRound;
        
        // Round to points mapping
        const roundPoints = {
            'Round 1': 0,
            'Round 2': 0,
            'Round 3': 0,
            'Round 4': 0,  // Last 32
            'Round 5': 0,  // Last 32
            'Round 6': 2,  // Last 16
            'Quarter Finals': 4,
            'Semi Finals': 6,
            'Final': 10,
            'Winner': 14
        };
        
        this.participants.forEach(participant => {
            console.log(`Processing participant: ${participant.name}`);
            participant.totalPoints = 0;
            
            participant.picks.forEach(pick => {
                console.log(`  Processing pick: ${pick}`);
                
                // Debug: Check if this is Mark Williams
                if (pick === 'Mark Williams') {
                    console.log(`🎯 Found Mark Williams in ${participant.name}'s picks!`);
                }
                
                let playerPoints = 0;
                let playerStatus = 'Eliminated';
                let eliminatedIn = null;
                
                // Check if player is eliminated
                if (playersByRound.eliminated && playersByRound.eliminated[pick]) {
                    eliminatedIn = playersByRound.eliminated[pick];
                    playerPoints = roundPoints[eliminatedIn] || 0;
                    console.log(`    ${pick} eliminated in ${eliminatedIn}, points: ${playerPoints}`);
                } else {
                    // Player is still active, find their highest round
                    const roundOrder = ['Round 1', 'Round 2', 'Round 3', 'Round 4', 'Round 5', 'Round 6', 'Quarter Finals', 'Semi Finals', 'Final'];
                    
                    for (let i = roundOrder.length - 1; i >= 0; i--) {
                        const round = roundOrder[i];
                        if (playersByRound[round] && playersByRound[round].includes(pick)) {
                            playerPoints = roundPoints[round] || 0;
                            playerStatus = 'Active';
                            console.log(`    ${pick} active in ${round}, points: ${playerPoints}`);
                            break;
                        }
                    }
                    
                    // Debug: If Mark Williams wasn't found, log what rounds are available
                    if (pick === 'Mark Williams' && playerPoints === 0) {
                        console.log(`🔍 Mark Williams not found in any round. Available rounds:`, Object.keys(playersByRound));
                        Object.keys(playersByRound).forEach(round => {
                            if (playersByRound[round] && playersByRound[round].length > 0) {
                                console.log(`  ${round}:`, playersByRound[round]);
                            }
                        });
                    }
                }
                
                // Update participant's total points
                participant.totalPoints += playerPoints;
                console.log(`    ${pick} contributes ${playerPoints} points to ${participant.name}'s total`);
            });
            
            console.log(`  ${participant.name} total points: ${participant.totalPoints}`);
        });
        
        // Sort participants by total points (descending), then by previous rank (reverse order) as tiebreaker
        this.participants.sort((a, b) => {
            // First sort by total points (descending)
            if (b.totalPoints !== a.totalPoints) {
                return b.totalPoints - a.totalPoints;
            }
            // If points are equal, sort by previous rank (reverse order - higher previous rank wins)
            return b.previousRank - a.previousRank;
        });
        
        console.log('Final participant points:', this.participants.map(p => ({ name: p.name, points: p.totalPoints })));
    }

    // Method to refresh leaderboard data
    async refreshData() {
        console.log('🔄 Refreshing leaderboard data...');
        await this.loadData();
    }

    // Calculate proper ranks accounting for ties
    calculateRanks(participants) {
        const ranks = [];
        let currentRank = 1;
        let currentPoints = null;
        let currentPreviousRank = null;

        participants.forEach((participant, index) => {
            const points = participant.totalPoints || 0;
            const previousRank = participant.previousRank || 999;
            
            // If this is a new point value or different previous rank, update the rank
            if (points !== currentPoints || previousRank !== currentPreviousRank) {
                currentRank = index + 1;
                currentPoints = points;
                currentPreviousRank = previousRank;
            }
            
            ranks.push(currentRank);
        });

        return ranks;
    }

    renderLeaderboard() {
        console.log('Rendering leaderboard...');
        const tbody = document.getElementById('leaderboardBody');
        
        if (!tbody) {
            console.error('Leaderboard table body not found');
            return;
        }

        // Get participants from the loader
        const participants = this.participants;
        
        if (!participants || participants.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="loading">Loading participants...</td></tr>';
            return;
        }

        tbody.innerHTML = '';

        // Calculate proper ranks accounting for ties
        const ranks = this.calculateRanks(participants);

        participants.forEach((participant, index) => {
            const row = document.createElement('tr');
            const rank = ranks[index];
            const points = participant.totalPoints || 0;
            
            // Check if all picks are eliminated
            const allPicksEliminated = this.areAllPicksEliminated(participant.picks);
            
            // Add CSS classes for better styling
            row.className = 'leaderboard-row';
            if (allPicksEliminated) {
                row.className += ' all-eliminated';
            }
            
            // Debug: Log what we're about to render
            console.log(`Rendering row ${rank}: ${participant.name} - Points: ${points} - All eliminated: ${allPicksEliminated}`);
            
            // Create detailed pick cells with status icons and points
            const pick1Html = this.renderPlayerPick(participant.picks[0], this.playersByRound);
            const pick2Html = this.renderPlayerPick(participant.picks[1], this.playersByRound);
            const pick3Html = this.renderPlayerPick(participant.picks[2], this.playersByRound);
            
            // Calculate max points for this participant
            const maxPoints = this.calculateMaxPoints(participant.picks);
            
            row.innerHTML = `
                <td class="rank">${rank}</td>
                <td class="participant">${participant.name}</td>
                <td class="pick">${pick1Html}</td>
                <td class="pick">${pick2Html}</td>
                <td class="pick">${pick3Html}</td>
                <td class="points">${points}</td>
                <td class="max-points">${maxPoints}</td>
                <td class="previous-rank">${participant.previousRank || 'N/A'}</td>
            `;
            
            tbody.appendChild(row);
        });
        
        console.log(`Rendered ${participants.length} participants`);
    }

    renderPlayerPick(playerName, playersByRound) {
        if (!playerName) {
            return '<span class="no-pick">No Pick</span>';
        }

        // Determine player status and points
        let statusClass = 'active';
        let playerPoints = 0;
        let eliminatedIn = null;

        // Check if player is eliminated
        if (playersByRound.eliminated && playersByRound.eliminated[playerName]) {
            eliminatedIn = playersByRound.eliminated[playerName];
            statusClass = 'eliminated';
            
            // Get points for the round they were eliminated in
            const roundPoints = {
                'Round 1': 0,
                'Round 2': 0,
                'Round 3': 0,
                'Round 4': 0,  // Last 32
                'Round 5': 0,  // Last 32
                'Round 6': 2,  // Last 16
                'Quarter Finals': 4,
                'Semi Finals': 6,
                'Final': 10,
                'Winner': 14
            };
            playerPoints = roundPoints[eliminatedIn] || 0;
        } else {
            // Player is still active, find their current round and points
            const roundOrder = ['Round 1', 'Round 2', 'Round 3', 'Round 4', 'Round 5', 'Round 6', 'Quarter Finals', 'Semi Finals', 'Final'];
            const roundPoints = {
                'Round 1': 0,
                'Round 2': 0,
                'Round 3': 0,
                'Round 4': 0,  // Last 32
                'Round 5': 0,  // Last 32
                'Round 6': 2,  // Last 16
                'Quarter Finals': 4,
                'Semi Finals': 6,
                'Final': 10,
                'Winner': 14
            };
            
            for (let i = roundOrder.length - 1; i >= 0; i--) {
                const round = roundOrder[i];
                if (playersByRound[round] && playersByRound[round].includes(playerName)) {
                    playerPoints = roundPoints[round] || 0;
                    break;
                }
            }
        }

        return `
            <div class="player-pick ${statusClass}">
                <span class="player-name">${playerName}</span>
                <span class="player-points">${playerPoints}</span>
            </div>
        `;
    }

    calculateMaxPoints(picks) {
        if (!picks || picks.length === 0) {
            return 0;
        }

        let maxPoints = 0;
        let playersStillIn = [];

        // First pass: collect players still in and add earned points
        picks.forEach(pick => {
            if (!pick) {
                return; // Skip null picks
            }

            // Check if player is eliminated
            if (this.playersByRound.eliminated && this.playersByRound.eliminated[pick]) {
                const eliminatedIn = this.playersByRound.eliminated[pick];
                const roundPoints = {
                    'Round 1': 0,
                    'Round 2': 0,
                    'Round 3': 0,
                    'Round 4': 0,  // Last 32
                    'Round 5': 0,  // Last 32
                    'Round 6': 2,  // Last 16
                    'Quarter Finals': 4,
                    'Semi Finals': 6,
                    'Final': 10,
                    'Winner': 14
                };
                maxPoints += roundPoints[eliminatedIn] || 0;
            } else {
                // Player is still active
                playersStillIn.push(pick);
            }
        });

        // If no players still in, return current points
        if (playersStillIn.length === 0) {
            return maxPoints;
        }

        // Calculate potential max points for remaining players
        // Simple calculation: assume best possible outcome
        if (playersStillIn.length === 1) {
            maxPoints += 14; // Can win
        } else if (playersStillIn.length === 2) {
            maxPoints += 14 + 10; // One winner, one finalist
        } else if (playersStillIn.length === 3) {
            maxPoints += 14 + 10 + 6; // One winner, one finalist, one semi-finalist
        } else {
            // More than 3 players - calculate optimal scenario
            maxPoints += 14 + 10 + 6 + 6; // Winner, finalist, two semi-finalists
        }

        return maxPoints;
    }

    areAllPicksEliminated(picks) {
        if (!picks || picks.length === 0) {
            return true; // No picks = all eliminated
        }

        // Check if all non-null picks are eliminated
        const validPicks = picks.filter(pick => pick !== null && pick !== undefined);
        if (validPicks.length === 0) {
            return true; // No valid picks = all eliminated
        }

        return validPicks.every(pick => 
            this.playersByRound.eliminated && this.playersByRound.eliminated[pick]
        );
    }
}

// Initialize the leaderboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.snookerLeaderboard = new SnookerLeaderboard();
});

// Global refresh function for the leaderboard refresh button
async function refreshLeaderboardData() {
    const refreshBtn = document.getElementById('refreshLeaderboardBtn');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = '🔄 Updating...';
    }
    
    try {
        console.log('🔄 Manual leaderboard refresh requested...');
        
        // Refresh the leaderboard data
        if (window.snookerLeaderboard) {
            await window.snookerLeaderboard.refreshData();
        }
        
        // Show success message
        if (refreshBtn) {
            refreshBtn.textContent = '✅ Updated!';
            setTimeout(() => {
                refreshBtn.disabled = false;
                refreshBtn.textContent = '🔄 Refresh Leaderboard';
            }, 2000);
        }
    } catch (error) {
        console.error('Error refreshing leaderboard data:', error);
        
        // Show error message
        if (refreshBtn) {
            refreshBtn.textContent = '❌ Error';
            setTimeout(() => {
                refreshBtn.disabled = false;
                refreshBtn.textContent = '🔄 Refresh Leaderboard';
            }, 3000);
        }
    }
} 