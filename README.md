# Snooker Draft Contest Leaderboard

A live leaderboard for a fantasy football draft contest that uses the 2025 Saudi Arabia Snooker Masters tournament as the scoring mechanism.

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
├── bracket.js              # Tournament bracket component
├── data/
│   ├── participants.json   # Participant names and picks
│   ├── players.json        # Player data with seeding
│   └── bracket.json        # Tournament structure and draw
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

## 📊 Features

### Leaderboard
- Real-time score calculation
- Player status indicators (🎱 playing, ❌ eliminated)
- Max Points calculation based on bracket structure
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
Edit `data/participants.json`:
```json
{
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