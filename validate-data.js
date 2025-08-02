/**
 * Data Validation Script
 * Compares static files with live API data
 */

async function validateData() {
    console.log('🔍 Starting data validation...\n');

    try {
        // Load static files
        const staticBracketResponse = await fetch('data/bracket.json');
        const staticBracket = await staticBracketResponse.json();
        
        const staticPlayersResponse = await fetch('data/players.json');
        const staticPlayers = await staticPlayersResponse.json();

        // Load API data
        const apiDrawsResponse = await fetch('data/api_draws.json');
        const apiDraws = await apiDrawsResponse.json();

        const apiTournamentResponse = await fetch('data/api_tournament.json');
        const apiTournament = await apiTournamentResponse.json();

        console.log('✅ All data loaded successfully\n');

        // Validate bracket structure
        validateBracketStructure(staticBracket, apiDraws);
        
        // Validate player data
        validatePlayerData(staticPlayers, apiDraws);
        
        // Validate match numbers
        validateMatchNumbers(staticBracket, apiDraws);

    } catch (error) {
        console.error('❌ Error during validation:', error);
    }
}

function validateBracketStructure(staticBracket, apiDraws) {
    console.log('📋 Validating Bracket Structure...');
    
    const apiRounds = apiDraws.data.attributes.rounds;
    const staticRounds = staticBracket.rounds;
    
    console.log(`API Rounds: ${apiRounds.length}`);
    console.log(`Static Rounds: ${Object.keys(staticRounds).length}`);
    
    // Check round names
    const apiRoundNames = apiRounds.map(r => r.roundName);
    const staticRoundNames = Object.values(staticRounds).map(r => r.name);
    
    console.log('\nRound Names Comparison:');
    apiRoundNames.forEach((apiName, index) => {
        const staticName = staticRoundNames[index];
        const match = apiName === staticName ? '✅' : '❌';
        console.log(`${match} API: "${apiName}" | Static: "${staticName}"`);
    });
    
    console.log('\n');
}

function validatePlayerData(staticPlayers, apiDraws) {
    console.log('👥 Validating Player Data...');
    
    // Extract players from API
    const apiPlayers = new Set();
    apiDraws.data.attributes.rounds.forEach(round => {
        round.matches.forEach(match => {
            if (match.player1Name && match.player1Name !== 'tbd') {
                apiPlayers.add(match.player1Name);
            }
            if (match.player2Name && match.player2Name !== 'tbd') {
                apiPlayers.add(match.player2Name);
            }
        });
    });
    
    const staticPlayerNames = staticPlayers.map(p => p.name);
    
    console.log(`API Players: ${apiPlayers.size}`);
    console.log(`Static Players: ${staticPlayerNames.length}`);
    
    // Check for missing players in static data
    const missingInStatic = Array.from(apiPlayers).filter(name => 
        !staticPlayerNames.includes(name)
    );
    
    if (missingInStatic.length > 0) {
        console.log('\n❌ Players missing in static data:');
        missingInStatic.forEach(name => console.log(`  - ${name}`));
    } else {
        console.log('\n✅ All API players found in static data');
    }
    
    // Check for extra players in static data
    const extraInStatic = staticPlayerNames.filter(name => 
        !apiPlayers.has(name)
    );
    
    if (extraInStatic.length > 0) {
        console.log('\n⚠️  Extra players in static data:');
        extraInStatic.forEach(name => console.log(`  - ${name}`));
    }
    
    console.log('\n');
}

function validateMatchNumbers(staticBracket, apiDraws) {
    console.log('🔢 Validating Match Numbers...');
    
    // Extract match numbers from API
    const apiMatchNumbers = new Set();
    apiDraws.data.attributes.rounds.forEach(round => {
        round.matches.forEach(match => {
            apiMatchNumbers.add(match.tournamentMatchNumber);
        });
    });
    
    // Extract match numbers from static data
    const staticMatchNumbers = new Set();
    Object.values(staticBracket.draw).forEach(roundMatches => {
        roundMatches.forEach(match => {
            staticMatchNumbers.add(match.match);
        });
    });
    
    console.log(`API Match Numbers: ${apiMatchNumbers.size}`);
    console.log(`Static Match Numbers: ${staticMatchNumbers.size}`);
    
    // Check for missing match numbers in static data
    const missingInStatic = Array.from(apiMatchNumbers).filter(num => 
        !staticMatchNumbers.has(num)
    );
    
    if (missingInStatic.length > 0) {
        console.log('\n❌ Match numbers missing in static data:');
        missingInStatic.slice(0, 10).forEach(num => console.log(`  - ${num}`));
        if (missingInStatic.length > 10) {
            console.log(`  ... and ${missingInStatic.length - 10} more`);
        }
    } else {
        console.log('\n✅ All API match numbers found in static data');
    }
    
    // Check for extra match numbers in static data
    const extraInStatic = Array.from(staticMatchNumbers).filter(num => 
        !apiMatchNumbers.has(num)
    );
    
    if (extraInStatic.length > 0) {
        console.log('\n⚠️  Extra match numbers in static data:');
        extraInStatic.slice(0, 10).forEach(num => console.log(`  - ${num}`));
        if (extraInStatic.length > 10) {
            console.log(`  ... and ${extraInStatic.length - 10} more`);
        }
    }
    
    console.log('\n');
}

function validateSeededPlayers(staticBracket, apiDraws) {
    console.log('🏆 Validating Seeded Players...');
    
    const staticSeeded = staticBracket.seeding.top16;
    
    // Find seeded players in API (players in Last 32)
    const last32Round = apiDraws.data.attributes.rounds.find(r => r.roundName === 'Last 32');
    const apiSeeded = new Set();
    
    if (last32Round) {
        last32Round.matches.forEach(match => {
            if (match.player1Name && match.player1Name !== 'tbd') {
                apiSeeded.add(match.player1Name);
            }
            if (match.player2Name && match.player2Name !== 'tbd') {
                apiSeeded.add(match.player2Name);
            }
        });
    }
    
    console.log(`API Seeded Players: ${apiSeeded.size}`);
    console.log(`Static Seeded Players: ${staticSeeded.length}`);
    
    // Check for missing seeded players in static data
    const missingInStatic = Array.from(apiSeeded).filter(name => 
        !staticSeeded.includes(name)
    );
    
    if (missingInStatic.length > 0) {
        console.log('\n❌ Seeded players missing in static data:');
        missingInStatic.forEach(name => console.log(`  - ${name}`));
    } else {
        console.log('\n✅ All API seeded players found in static data');
    }
    
    console.log('\n');
}

// Run validation when script is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (CONFIG && CONFIG.DEBUG && CONFIG.DEBUG.VALIDATE_DATA) {
        validateData();
    }
});

// Export for manual testing
window.validateData = validateData; 