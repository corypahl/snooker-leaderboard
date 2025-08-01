/**
 * Utility class for loading participants data from Google Apps Script
 */
class ParticipantsLoader {
    static GOOGLE_SCRIPT_URL = 'https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLgFPdWM7s8zmfw-4i8y0z_iuxbrjd8kJd52djwkdX_BWryHVhocHPsw40csXN2llAlQw9WUwFMoxWuz1yLWASVyW618l-UuRUlr-tlcSmJc5bBRwSAtb9vTn294OvrmOTL8xS_PDacbjfMWlk_ShSf_WaNpIOzVKJrCFW_BXf_512Iys-dQIEDvoq8K92eX9ylOYLrRC9a_E6vxgT21B6near9E7Ww707gnjjiKToi_0hNE2halEZz11BNh0csIjAzp-ebT9Xm4kaypMmTYeESRw1K_Pg&lib=MDg6EEbpVkSmbIeGxqEAbGyTRpxoN5lQD';

    /**
     * Load participants data from Google Apps Script and transform to local format
     * @returns {Promise<Array>} Array of participants in local format
     */
    static async loadParticipants() {
        try {
            const response = await fetch(this.GOOGLE_SCRIPT_URL);
            if (!response.ok) {
                throw new Error(`Failed to load participants from Google Script: ${response.status}`);
            }
            const data = await response.json();
            
            // Transform the Google Apps Script format to match our local format
            return data.Participants.map((participant, index) => ({
                id: index + 1,
                name: participant.Participant,
                picks: [
                    participant.Pick1 || null,
                    participant.Pick2 || null,
                    participant.Pick3 || null
                ]
            }));
        } catch (error) {
            console.error('Error loading participants from Google Script:', error);
            throw error;
        }
    }
} 