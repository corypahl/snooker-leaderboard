// Debug script to check participant data
async function debugParticipants() {
    try {
        console.log('🔍 Debugging participant data...');
        
        // Load participants
        const participants = await ParticipantsLoader.loadParticipants();
        console.log('Participants loaded:', participants);
        
        // Check for Mark Williams in picks
        participants.forEach(participant => {
            participant.picks.forEach((pick, index) => {
                if (pick && pick.includes('Williams')) {
                    console.log(`🎯 Found Williams in ${participant.name}'s pick ${index + 1}: "${pick}"`);
                }
            });
        });
        
        // Check for any Williams
        const allPicks = participants.flatMap(p => p.picks).filter(p => p);
        console.log('All picks:', allPicks);
        
        const williamsPicks = allPicks.filter(pick => pick.includes('Williams'));
        console.log('Williams picks:', williamsPicks);
        
    } catch (error) {
        console.error('Error debugging participants:', error);
    }
}

// Run the debug function
debugParticipants();
