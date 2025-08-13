# Snooker Draft Contest Leaderboard

A live leaderboard for a fantasy football draft contest that uses the 2025 Saudi Arabia Snooker Masters tournament as the scoring mechanism with **live data integration** from WST.tv.

## 🚀 New Features

- **Live Tournament Data**: Automatically fetches real-time tournament information from the official WST.tv website
- **Automatic Updates**: Data refreshes automatically every 5 minutes with intelligent caching
- **Manual Refresh**: Click the refresh button to get the latest data immediately
- **Fallback System**: Gracefully falls back to static data if live data is unavailable
- **Visual Indicators**: Shows data source (Live vs Static) with color-coded status
- **Smart Caching**: Reduces server load with 5-minute cache intervals
- **Relevant Matches Section**: New section displays matches involving players picked by participants
- **Match Filtering**: Automatically filters tournament matches to show only those with picked players
- **Participant Tracking**: Shows which participants picked each player in relevant matches

## 🏆 Overview

This site displays a live leaderboard of 12 participants, each with 3 snooker player picks. Points are awarded based on how far each player advances in the tournament.

### Scoring System
- **14 points** - Winner
- **10 points** - Finalist  
- **6 points** - Semi-finalist
- **4 points** - Quarter-finalist
- **2 points** - Round of 16

## 📁 File Structure

```
snooker-leaderboard/
├── index.html              # Main HTML page
├── style.css               # Styling and responsive design
├── leaderboard.js          # Leaderboard logic and data processing
├── participants-loader.js  # Google Apps Script participants data loader
├── bracket.js              # Tournament bracket component
├── wst-fetcher.js          # WST.tv live data integration
├── relevant-matches.js     # Relevant matches filtering and display
├── test-wst.html           # Test page for WST fetcher
├── test-relevant-matches.html # Test page for relevant matches
├── data/
│   ├── players.json        # Player data with seeding (fallback)
│   └── bracket.json        # Tournament structure and draw (fallback)
├── .github/workflows/
│   └── deploy.yml          # GitHub Pages deployment workflow
└── README.md               # This file
```

## 🚀 Deployment

### GitHub Pages (Recommended)

This repository includes a GitHub Actions workflow for automatic deployment to GitHub Pages.

#### Setup Instructions:

1. **Enable GitHub Pages:**
   - Go to your repository Settings
   - Navigate to "Pages" in the sidebar
   - Under "Source", select "GitHub Actions"

2. **Push to Main Branch:**
   - The workflow will automatically trigger on pushes to `main` or `master`
   - Your site will be available at: `https://[username].github.io/snooker-leaderboard`

3. **Manual Deployment:**
   - Go to Actions tab in your repository
   - Select "Deploy to GitHub Pages" workflow
   - Click "Run workflow" to manually trigger deployment

#### Workflow Features:
- ✅ Automatic deployment on push to main branch
- ✅ Pull request previews
- ✅ Manual deployment option
- ✅ Concurrent deployment protection

### Local Development

For local development and testing:

```bash
# Start a local server (Python 3)
python -m http.server 8000

# Or using Node.js (if you have it installed)
npx serve .

# Then visit: http://localhost:8000
```

**Note:** A local server is required due to CORS restrictions when loading JSON files.

## 🔄 Keeping Data Updated

The tournament data is **automatically fetched from the official WST.tv API every time the page loads**. This ensures you always see the latest match results without any manual intervention.

### Automatic Updates (Default Behavior)
- ✅ **Live API calls on page load** - Fresh data every time you visit the page
- ✅ **Real-time match results** - No need to manually update anything
- ✅ **Smart fallback system** - Falls back to local data if API is unavailable
- ✅ **Visual feedback** - Shows loading states and data source indicators

### Manual Refresh (Optional)
If you want to refresh the data while the page is open, you can use the refresh button in the tournament bracket section.

### Legacy Manual Update (No longer needed)
The following scripts are still available but no longer necessary for normal operation:

```bash
# Using Node.js
node fetch-data.js

# Or on Windows, double-click the batch file
update-data.bat
```

### Check Match Status
You can check the status of specific matches or all matches:

```bash
# Check all matches
node check-matches.js

# Check a specific match (e.g., Match 121)
node check-matches.js 121
```

### Automatic Updates
You can enable automatic data updates by modifying `config.js`:

```javascript
AUTO_REFRESH_ENABLED: true,  // Enable auto-refresh
AUTO_REFRESH_INTERVAL: 5 * 60 * 1000,  // 5 minutes
```

### What Gets Updated
- ✅ Match results and winners
- ✅ Player progression through the tournament
- ✅ Tournament bracket status
- ✅ Leaderboard points calculation

### Troubleshooting
If the bracket isn't showing the latest results:
1. **Refresh the page** - The page automatically fetches fresh data on load
2. **Use the refresh button** - Click the "🔄 Refresh Data" button in the bracket section
3. **Check the data source indicator** - Should show "Live API" with a timestamp
4. **Check browser console** - Look for any error messages
5. **Check internet connection** - The API requires an active internet connection

**Note**: The page now automatically fetches live data on every page load, so manual updates are no longer required.

## 📊 Features

### Live Data Integration
- **Google Apps Script Integration**: Automatically fetches participant data from Google Apps Script endpoint
- **WST.tv Integration**: Automatically fetches live tournament data from the official World Snooker Tour website
- **Smart Caching**: 5-minute cache intervals to reduce server load while keeping data fresh
- **Fallback System**: Seamlessly falls back to static data if live data is unavailable
- **Data Source Indicator**: Visual indicator showing whether data is live or static
- **Manual Refresh**: One-click refresh button for immediate updates

### Leaderboard
- Real-time score calculation
- Player status indicators (🎱 playing, ❌ eliminated)
- Max Points calculation based on bracket structure

### Relevant Matches
- **Smart Filtering**: Automatically shows only matches involving picked players
- **Participant Tracking**: Displays which participants picked each player
- **Match Status**: Shows live status, scheduled, or completed matches
- **Round Information**: Displays match round and number
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- Tie handling and proper ranking
- Responsive design for mobile devices

### Tournament Bracket
- Complete tournament structure visualization
- Accurate seeding information
- Bracket-based Max Points calculation
- Match progression tracking
- Traditional bracket layout with connecting lines

### Data Management
- JSON-based data storage
- Easy participant and player updates
- Seeding information display
- Tournament structure configuration

## 🛠️ Customization

### Adding Participants
Participants data is now loaded live from Google Apps Script. The data is automatically fetched from the Google Apps Script endpoint and transformed to match the local format.

To update participant picks, modify the Google Apps Script source data. The application will automatically reflect changes when refreshed.
  "id": 13,
  "name": "New Participant",
  "picks": ["player_id_1", "player_id_2", "player_id_3"]
}
```

### Updating Player Status
Edit `data/players.json`:
```json
{
  "id": "player_id",
  "name": "Player Name",
  "status": "eliminated",
  "points": 4,
  "seed": 5
}
```

### Tournament Structure
Modify `data/bracket.json` to update:
- Tournament dates and venue
- Round structure and scoring
- Bracket draw and seeding
- Match progression paths

## 🎨 Styling

The site features:
- Dark theme with gradient backgrounds
- Glass-morphism effects
- Responsive design for all devices
- Smooth animations and transitions
- Professional bracket visualization

## 📱 Mobile Support

Fully responsive design that works on:
- Desktop computers
- Tablets
- Mobile phones
- All modern browsers

## 🔧 Technical Details

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Data**: JSON files for easy updates
- **Deployment**: GitHub Pages with GitHub Actions
- **Bracket Logic**: Advanced Max Points calculation based on tournament structure
- **Responsive**: Mobile-first design approach

## 📈 Future Enhancements

Potential improvements:
- Real-time data updates via API
- Live match results integration
- Historical tournament data
- Advanced statistics and analytics
- Social sharing features
- Email notifications for updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

**Live Site**: [https://[username].github.io/snooker-leaderboard](https://[username].github.io/snooker-leaderboard)

**Last Updated**: The site automatically updates when changes are pushed to the main branch. 