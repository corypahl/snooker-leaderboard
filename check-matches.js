const fs = require('fs');
const path = require('path');

function checkMatchStatus() {
    try {
        // Read the API draws data
        const drawDataPath = path.join(__dirname, 'data', 'api_draws.json');
        const drawData = JSON.parse(fs.readFileSync(drawDataPath, 'utf8'));
        
        console.log('🔍 Checking match status...\n');
        
        let completedMatches = 0;
        let totalMatches = 0;
        
        // Process each round
        if (drawData.data && drawData.data.attributes && drawData.data.attributes.rounds) {
            drawData.data.attributes.rounds.forEach(round => {
                if (round.matches) {
                    round.matches.forEach(match => {
                        totalMatches++;
                        const hasWinner = match.winningPlayerID !== null;
                        
                        if (hasWinner) {
                            completedMatches++;
                            const winner = match.winningPlayerID === match.homePlayerID ? 
                                match.player1Name : match.player2Name;
                            console.log(`✅ Match ${match.tournamentMatchNumber}: ${match.player1Name} vs ${match.player2Name} - Winner: ${winner}`);
                        } else {
                            console.log(`⏳ Match ${match.tournamentMatchNumber}: ${match.player1Name} vs ${match.player2Name} - Pending`);
                        }
                    });
                }
            });
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`- Completed matches: ${completedMatches}`);
        console.log(`- Total matches: ${totalMatches}`);
        console.log(`- Completion rate: ${((completedMatches / totalMatches) * 100).toFixed(1)}%`);
        
    } catch (error) {
        console.error('❌ Error checking match status:', error.message);
    }
}

// Check for specific match if provided as argument
function checkSpecificMatch(matchNumber) {
    try {
        const drawDataPath = path.join(__dirname, 'data', 'api_draws.json');
        const drawData = JSON.parse(fs.readFileSync(drawDataPath, 'utf8'));
        
        console.log(`🔍 Checking Match ${matchNumber}...\n`);
        
        let found = false;
        
        if (drawData.data && drawData.data.attributes && drawData.data.attributes.rounds) {
            drawData.data.attributes.rounds.forEach(round => {
                if (round.matches) {
                    round.matches.forEach(match => {
                        if (match.tournamentMatchNumber === parseInt(matchNumber)) {
                            found = true;
                            const hasWinner = match.winningPlayerID !== null;
                            const winner = hasWinner ? 
                                (match.winningPlayerID === match.homePlayerID ? match.player1Name : match.player2Name) : 'TBD';
                            
                            console.log(`Match ${match.tournamentMatchNumber}:`);
                            console.log(`  ${match.player1Name} vs ${match.player2Name}`);
                            console.log(`  Status: ${hasWinner ? 'Completed' : 'Pending'}`);
                            console.log(`  Winner: ${winner}`);
                            console.log(`  Date: ${match.fixtureDate}`);
                            console.log(`  Frames: ${match.frames}`);
                        }
                    });
                }
            });
        }
        
        if (!found) {
            console.log(`❌ Match ${matchNumber} not found in the tournament data.`);
        }
        
    } catch (error) {
        console.error('❌ Error checking specific match:', error.message);
    }
}

// Main execution
const args = process.argv.slice(2);

if (args.length > 0) {
    // Check specific match
    checkSpecificMatch(args[0]);
} else {
    // Check all matches
    checkMatchStatus();
}
