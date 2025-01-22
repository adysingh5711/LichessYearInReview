# LichessYearInReview

## Overview

LichessYearInReview is an innovative tool designed to provide chess players with a comprehensive summary of their annual performance on Lichess. This project aims to enhance user engagement by offering personalized insights, global trends, and interactive features that celebrate the chess community's achievements over the year.

### 1. Download Lichess History

- Visit the following link to download your Lichess history:
  - [https://lichess.org/@/username/download](https://lichess.org/@/username/download)
    - Replace `username` with your own Lichess username (e.g., [https://lichess.org/@/AdityaSingh_IIITR/download](https://lichess.org/@/AdityaSingh_IIITR/download)).

### For Python Script

1.  Install the required dependencies by running the following command:

    ```bash
    pip install -r requirements.txt
    ```

2.  Run the script:

    ```bash
    python lyir.py
    ```

3.  You will be prompted to:

- **Enter the path to your PGN file**: Provide the location of your PGN file containing your Lichess game history. This can typically be found in the downloads section after exporting from your Lichess account.
- **Enter your Lichess username**: Input your Lichess username to associate the analysis with your account and personal game data.

### For Website Users

1. **Upload your PGN file**: On the website, simply drag and drop or select the file from your computer.
2. **Enter your Lichess username**: Type your Lichess username to allow the system to fetch relevant data tied to your account.
3. **Click the Analyse button**: Once you've uploaded your file and entered your username, click the **Analyse** button to generate your year-in-review summary.

The analysis will then begin, and within a few moments, you'll be presented with a detailed report about your yearly performance on Lichess.

## Getting Started with Development

To get started with LichessYearInReview, follow these steps to run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Once the server is running, open [http://localhost:3000](http://localhost:3000) in your web browser to view the application. You can start editing the page by modifying `components/chess-analyzer.tsx`, and it will auto-update as you make changes.

## Implemented Features (In Python File)

1. **Game Breakdown**

   - Categorizes games played by type: Blitz, Rapid, Bullet.
   - Displays total games and results (wins, losses, draws).

2. **Game Results**

   - Total games played, wins, losses, and draws with win percentage calculations.

3. **Top Openings Analysis**

   - Lists the top 5 most played openings with the number of games played, wins, and success rates.
   - Identifies the top 5 most successful openings based on wins and win percentages.

4. **Performance by Color**

   - Analyzes performance based on whether the user played as White or Black, including win/loss/draw rates.

5. **Longest Streaks**

   - Tracks the longest winning, losing, and drawing streaks throughout the year.

6. **Struggling Openings**

   - Identifies openings where the user has the most losses.

7. **Game Length Analysis**

   - Provides average game lengths for wins, losses, and draws, along with shortest and longest game statistics.

8. **Monthly Performance Tracking**

   - Summarizes performance metrics (games played, wins, win rates) on a monthly basis.

9. **Head-to-Head Analysis**

   - Analyzes performance against specific opponents, including win/loss records and win rates.

10. **Overall Game Length Analysis**

    - Calculates average number of moves per game across all games played.

11. **Rating Progression Visualization**
    - Allows users to visualize rating progression based on selected game types (defaulting to Blitz if no input is provided).

## Future Scope of the Project

1. **Enhanced Data Visualization**

   - Implement graphical representations (charts/graphs) for various statistics such as monthly performance trends and rating progression over time using libraries like Matplotlib or Plotly.

2. **User Interface Improvements**

   - Develop a web-based interface using frameworks like Flask or Django to make it more user-friendly and accessible for users who may not be comfortable with command-line interfaces.

3. **Integration with Lichess API**

   - Use libraries like `berserk` or `python-lichess` to fetch real-time data directly from Lichess instead of relying solely on PGN files for analysis.
     - Not used now as the API is currently taking 12+ min to send the data of the user with like 700 games and thus making it look like a dead app.

4. **Additional Metrics**

   - Include more detailed statistics such as blunders and inaccuracies in games using Lichess's analysis features.
   - Track puzzle-solving performance if integrated with Lichess's puzzle features.

5. **Social Features**

   - Implement sharing options that allow users to share their yearly summaries on social media platforms.
   - Enable community features where users can compare their statistics with friends or the broader Lichess community.

6. **Learning Recommendations**

   - Provide personalized recommendations for improvement based on user performance metrics (e.g., suggesting openings to study or tactics to practice).

7. **Mobile App Development**

   - Consider developing a mobile application that allows users to access their year-in-review statistics on-the-go.

8. **Gamification Elements**
   - Introduce achievements or badges for milestones reached during the year to enhance user engagement.

## Contributors

<!-- readme: collaborators,contributors -start -->
<table>
	<tbody>
		<tr>
            <td align="center">
                <a href="https://github.com/adysingh5711">
                    <img src="https://avatars.githubusercontent.com/u/124086655?v=4" width="100;" alt="adysingh5711"/>
                    <br />
                    <sub><b>Aditya Singh</b></sub>
                </a>
            </td>
		</tr>
	<tbody>
</table>
<!-- readme: collaborators,contributors -end -->

Contributions are welcome!

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.

## Acknowledgments

Thank you to all contributors who make this project possible. Your support helps foster a vibrant chess community!

---

Feel free to explore, contribute, and enjoy your journey through chess with LichessYearInReview!
