const https = require('https');
const fs = require('fs');
const path = require('path');

const TOURNAMENT_ID = '34ca357d-bed6-4501-b8cd-aa94e5f7ff16';
const BASE_URL = 'https://tournaments.snooker.web.gc.wstservices.co.uk/v2';

function fetchData(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

async function fetchLatestData() {
    try {
        console.log('Fetching latest tournament data...');
        
        // Fetch draw data
        const drawUrl = `${BASE_URL}/${TOURNAMENT_ID}/draws?format=json`;
        const drawData = await fetchData(drawUrl);
        
        // Fetch tournament data
        const tournamentUrl = `${BASE_URL}/${TOURNAMENT_ID}?format=json`;
        const tournamentData = await fetchData(tournamentUrl);
        
        // Save draw data
        const drawPath = path.join(__dirname, 'data', 'api_draws.json');
        fs.writeFileSync(drawPath, JSON.stringify(drawData, null, 2));
        console.log('✅ Draw data saved to data/api_draws.json');
        
        // Save tournament data
        const tournamentPath = path.join(__dirname, 'data', 'api_tournament.json');
        fs.writeFileSync(tournamentPath, JSON.stringify(tournamentData, null, 2));
        console.log('✅ Tournament data saved to data/api_tournament.json');
        
        // Check for completed matches
        let completedMatches = 0;
        if (drawData.data && drawData.data.attributes && drawData.data.attributes.rounds) {
            drawData.data.attributes.rounds.forEach(round => {
                if (round.matches) {
                    round.matches.forEach(match => {
                        if (match.winningPlayerID) {
                            completedMatches++;
                            console.log(`🏆 Match completed: ${match.player1Name} vs ${match.player2Name} - Winner: ${match.winningPlayerID === match.homePlayerID ? match.player1Name : match.player2Name}`);
                        }
                    });
                }
            });
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`- Total completed matches: ${completedMatches}`);
        console.log(`- Data files updated successfully`);
        console.log(`\n🔄 Refresh your browser at http://localhost:8000 to see the latest results!`);
        
    } catch (error) {
        console.error('❌ Error fetching data:', error.message);
    }
}

fetchLatestData();
