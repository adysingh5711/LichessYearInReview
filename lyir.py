import chess.pgn
import matplotlib.pyplot as plt
from collections import Counter, defaultdict
from datetime import datetime
import numpy as np
from datetime import datetime


# Categorize time controls
def categorize_time_control(time_control):
    base_time, increment = map(int, time_control.split("+"))
    if base_time < 180:
        return "Bullet"
    elif base_time <= 480:
        return "Blitz"
    elif base_time <= 1500:
        return "Rapid"
    else:
        return "Classical"


def parse_pgn(file_path):
    with open(file_path, "r") as file:
        games = []
        while True:
            game = chess.pgn.read_game(file)
            if game is None:
                break
            games.append(game)
    return games


def analyze_games(games, username):
    stats = {
        "game_types": Counter(),
        "results": {"wins": 0, "losses": 0, "draws": 0},
        "ratings": {"Bullet": [], "Blitz": [], "Rapid": [], "Classical": []},
        "dates": {"Bullet": [], "Blitz": [], "Rapid": [], "Classical": []},
        "openings": Counter(),
        "opening_success": defaultdict(lambda: {"wins": 0, "losses": 0, "draws": 0}),
        "color_stats": {
            "White": {"wins": 0, "losses": 0, "draws": 0},
            "Black": {"wins": 0, "losses": 0, "draws": 0},
        },
        "streaks": {"win_streak": 0, "loss_streak": 0, "draw_streak": 0},
        "game_lengths": [],
        "monthly_performance": defaultdict(
            lambda: {"games": 0, "wins": 0, "rating_change": 0}
        ),
        "head_to_head": defaultdict(lambda: {"wins": 0, "losses": 0, "draws": 0}),
    }

    current_streak = {"wins": 0, "losses": 0, "draws": 0}

    for game in games:
        headers = game.headers
        time_control = headers.get("TimeControl", "Unknown")
        category = categorize_time_control(time_control)
        stats["game_types"][category] += 1

        result = headers.get("Result", "*")
        white_player = headers["White"]
        black_player = headers["Black"]

        # Track results by color
        if result == "1-0":
            if white_player == username:
                stats["results"]["wins"] += 1
                stats["color_stats"]["White"]["wins"] += 1
                current_streak["wins"] += 1
                current_streak["losses"] = 0
                current_streak["draws"] = 0
            else:
                stats["results"]["losses"] += 1
                stats["color_stats"]["Black"]["losses"] += 1
                current_streak["losses"] += 1
                current_streak["wins"] = 0
                current_streak["draws"] = 0
        elif result == "0-1":
            if black_player == username:
                stats["results"]["wins"] += 1
                stats["color_stats"]["Black"]["wins"] += 1
                current_streak["wins"] += 1
                current_streak["losses"] = 0
                current_streak["draws"] = 0
            else:
                stats["results"]["losses"] += 1
                stats["color_stats"]["White"]["losses"] += 1
                current_streak["losses"] += 1
                current_streak["wins"] = 0
                current_streak["draws"] = 0
        elif result == "1/2-1/2":
            stats["results"]["draws"] += 1
            if white_player == username:
                stats["color_stats"]["White"]["draws"] += 1
            else:
                stats["color_stats"]["Black"]["draws"] += 1
            current_streak["draws"] += 1
            current_streak["wins"] = 0
            current_streak["losses"] = 0

        # Track streaks
        if current_streak["wins"] > stats["streaks"]["win_streak"]:
            stats["streaks"]["win_streak"] = current_streak["wins"]
        if current_streak["losses"] > stats["streaks"]["loss_streak"]:
            stats["streaks"]["loss_streak"] = current_streak["losses"]
        if current_streak["draws"] > stats["streaks"]["draw_streak"]:
            stats["streaks"]["draw_streak"] = current_streak["draws"]

        # Track monthly performance
        date = headers.get("Date", "????.??.??")
        try:
            date = datetime.strptime(date, "%Y.%m.%d")
            stats["monthly_performance"][date.month]["games"] += 1
            if result == "1-0" and white_player == username:
                stats["monthly_performance"][date.month]["wins"] += 1
                stats["monthly_performance"][date.month]["rating_change"] += int(
                    headers.get("WhiteRatingDiff", "0")
                )
            elif result == "0-1" and black_player == username:
                stats["monthly_performance"][date.month]["wins"] += 1
                stats["monthly_performance"][date.month]["rating_change"] += int(
                    headers.get("BlackRatingDiff", "0")
                )

        except ValueError:
            pass

        # Track game length (number of moves)
        game_length = len(list(game.mainline_moves()))  # Corrected line
        stats["game_lengths"].append(
            (game_length, result)
        )  # Store as tuple of (game_length, result)

        # Track head-to-head
        opponent = white_player if black_player == username else black_player
        if opponent:
            stats["head_to_head"][opponent]["wins"] += 1 if result == "1-0" else 0
            stats["head_to_head"][opponent]["losses"] += 1 if result == "0-1" else 0
            stats["head_to_head"][opponent]["draws"] += 1 if result == "1/2-1/2" else 0

        # Track openings
        opening = headers.get("Opening", "Unknown")
        stats["openings"][opening] += 1
        stats["opening_success"][opening]["wins"] += 1 if result == "1-0" else 0
        stats["opening_success"][opening]["losses"] += 1 if result == "0-1" else 0
        stats["opening_success"][opening]["draws"] += 1 if result == "1/2-1/2" else 0

    return stats


# Function to visualize Monthly Performance
def plot_monthly_performance(monthly_performance):
    # Define month names
    month_names = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ]

    # Extract data for plotting
    months = [month_names[month - 1] for month in sorted(monthly_performance.keys())]
    games = [
        monthly_performance[month]["games"]
        for month in sorted(monthly_performance.keys())
    ]
    wins = [
        monthly_performance[month]["wins"]
        for month in sorted(monthly_performance.keys())
    ]
    win_rates = [
        (
            monthly_performance[month]["wins"]
            / monthly_performance[month]["games"]
            * 100
            if monthly_performance[month]["games"] > 0
            else 0
        )
        for month in sorted(monthly_performance.keys())
    ]

    # Create a figure with two subplots: one for win rate and one for games/wins
    fig, ax1 = plt.subplots(figsize=(10, 6))

    # Plot Win Rate per Month
    ax1.set_xlabel("Month")
    ax1.set_ylabel("Win Rate (%)", color="tab:blue")
    ax1.plot(
        months,
        win_rates,
        marker="o",
        color="tab:blue",
        label="Win Rate",
        linestyle="-",
        linewidth=2,
    )
    ax1.tick_params(axis="y", labelcolor="tab:blue")

    # Add a second y-axis to show number of games and wins
    ax2 = ax1.twinx()
    ax2.set_ylabel("Games and Wins", color="tab:green")
    ax2.bar(months, games, color="tab:green", alpha=0.6, label="Games Played")
    ax2.bar(months, wins, color="tab:orange", alpha=0.6, label="Wins")
    ax2.tick_params(axis="y", labelcolor="tab:green")

    # Title and grid
    plt.title("Monthly Performance: Win Rate, Games Played, and Wins")
    fig.tight_layout()  # Ensure no overlap of labels
    ax1.legend(loc="upper left", bbox_to_anchor=(0.1, 1), fontsize="small")
    ax2.legend(loc="upper right", bbox_to_anchor=(0.9, 1), fontsize="small")
    plt.xticks(rotation=45)
    plt.grid(True)
    plt.show()


# New function for getting rating progression
# Mapping for input values to game types
GAME_TYPE_MAP = {1: "Bullet", 2: "Blitz", 3: "Rapid", 4: "Classical"}

# Default maximum number of games to consider if not specified
DEFAULT_MAX_GAMES = 1000


def get_rating_progression(
    games, username, game_type_number, max_games=DEFAULT_MAX_GAMES
):
    """
    Function to get the rating progression of the user over time for a specific game type.
    - games: List of games in PGN format
    - username: The username of the player whose rating progression is being analyzed
    - game_type_number: Integer (1: Bullet, 2: Blitz, 3: Rapid, 4: Classical)
    - max_games: Maximum number of games to process (default 1000)
    """
    # Get the corresponding game type from the number
    game_type = GAME_TYPE_MAP.get(
        game_type_number, "Blitz"
    )  # Default to Blitz if invalid type

    dates = []
    ratings = []

    # Counter to limit the number of games processed
    games_processed = 0

    for game in games:
        headers = game.headers
        time_control = headers.get("TimeControl", "Unknown")

        # Skip games that are not of the selected type
        if game_type not in categorize_time_control(time_control):
            continue

        # Initialize rating variable
        rating = None

        # Check if the username played White or Black and fetch the corresponding Elo rating
        if headers.get("White") == username:
            rating = headers.get(
                "WhiteElo", None
            )  # Get White's Elo if the user is White
        elif headers.get("Black") == username:
            rating = headers.get(
                "BlackElo", None
            )  # Get Black's Elo if the user is Black

        date = headers.get("Date", "????.??.??")

        if rating and date != "????.??.??":
            try:
                date_obj = datetime.strptime(date, "%Y.%m.%d")
                dates.append(date_obj)
                ratings.append(int(rating))
                games_processed += 1
            except ValueError:
                continue  # Skip invalid dates

        # If we've reached the maximum games, break the loop
        if games_processed >= max_games:
            break

    return dates, ratings


# Function to plot rating progression
def plot_rating_progression(dates, ratings, game_type):
    if not dates or not ratings:
        print("No Stats Available")
        return

    plt.figure(figsize=(10, 6))
    plt.plot(dates, ratings, marker="o", color="blue", label=game_type)
    plt.title(f"Rating Progression ({game_type})")
    plt.xlabel("Date")
    plt.ylabel("Rating")
    plt.xticks(rotation=45)
    plt.grid(True)
    plt.legend()
    plt.tight_layout()
    plt.show()


def display_stats(stats, games, username):

    print("\nGame Breakdown:")
    for game_type, count in stats["game_types"].items():
        print(f"{game_type}: {count}")

    total_games = sum(stats["game_types"].values())
    print("\nGame Results:")
    print(f"Total Games: {total_games}")
    print(
        f"Wins: {stats['results']['wins']} ({stats['results']['wins'] / total_games:.2%})"
    )
    print(
        f"Losses: {stats['results']['losses']} ({stats['results']['losses'] / total_games:.2%})"
    )
    print(
        f"Draws: {stats['results']['draws']} ({stats['results']['draws'] / total_games:.2%})"
    )

    print("\nTop 5 Most Played Openings:")
    for opening, count in stats["openings"].most_common(5):
        wins = stats["opening_success"][opening]["wins"]
        total = sum(stats["opening_success"][opening].values())
        success_rate = wins / total if total > 0 else 0
        print(f"{opening}: {count} games, {wins} wins, {success_rate:.2%} success rate")

    print("\nTop 5 Most Successful Openings by Wins:")
    success_rates = sorted(
        stats["opening_success"].items(), key=lambda item: item[1]["wins"], reverse=True
    )
    for opening, success in success_rates[:5]:
        wins = success["wins"]
        total = sum(success.values())
        print(f"{opening}: {total} games, {wins} wins, {wins / total:.2%} success rate")

    print("\nTop 5 Most Successful Openings by Win Percentage:")
    success_rates = [
        (
            opening,
            success["wins"] / (success["wins"] + success["losses"] + success["draws"]),
        )
        for opening, success in stats["opening_success"].items()
        if (success["wins"] + success["losses"] + success["draws"]) > 0
    ]
    success_rates.sort(key=lambda x: x[1], reverse=True)
    for opening, rate in success_rates[:5]:
        wins = stats["opening_success"][opening]["wins"]
        total = sum(stats["opening_success"][opening].values())
        print(f"{opening}: {total} games, {wins} wins, {rate:.2%} success rate")

    # Performance by Color
    print("\nPerformance by Color:")
    for color, record in stats["color_stats"].items():
        total_games = sum(record.values())
        win_rate = record["wins"] / total_games if total_games > 0 else 0
        loss_rate = record["losses"] / total_games if total_games > 0 else 0
        draw_rate = record["draws"] / total_games if total_games > 0 else 0
        print(
            f"{color}: {record['wins']} wins, {record['losses']} losses, {record['draws']} draws"
        )
        print(
            f"Win Rate: {win_rate:.2%}, Loss Rate: {loss_rate:.2%}, Draw Rate: {draw_rate:.2%}"
        )

    # Streaks
    print("\nLongest Streaks:")
    print(f"Longest Win Streak: {stats['streaks']['win_streak']}")
    print(f"Longest Loss Streak: {stats['streaks']['loss_streak']}")
    print(f"Longest Draw Streak: {stats['streaks']['draw_streak']}")

    # Openings You Struggle With (based on loss rate)
    print("\nOpenings You Struggle With (by Losses):")
    sorted_openings = sorted(
        stats["opening_success"].items(),
        key=lambda item: item[1]["losses"],
        reverse=True,
    )
    for opening, success in sorted_openings[:5]:
        print(f"{opening}: {success['losses']} losses")

    # Result Distribution by Game Length
    def display_result_distribution_by_game_length(stats):
        # Extract game lengths for each result type (win, loss, draw)
        win_lengths = [
            length for length, result in stats["game_lengths"] if result == "1-0"
        ]
        loss_lengths = [
            length for length, result in stats["game_lengths"] if result == "0-1"
        ]
        draw_lengths = [
            length for length, result in stats["game_lengths"] if result == "1/2-1/2"
        ]

        # Filter out the game lengths that are 1 move
        win_lengths = [length for length in win_lengths if length > 1]
        loss_lengths = [length for length in loss_lengths if length > 1]
        draw_lengths = [length for length in draw_lengths if length > 1]

        # Calculate the averages
        avg_win_length = np.mean(win_lengths) if win_lengths else 0
        avg_loss_length = np.mean(loss_lengths) if loss_lengths else 0
        avg_draw_length = np.mean(draw_lengths) if draw_lengths else 0

        # Find the shortest and longest game lengths
        shortest_win = min(win_lengths) if win_lengths else None
        longest_win = max(win_lengths) if win_lengths else None
        shortest_loss = min(loss_lengths) if loss_lengths else None
        longest_loss = max(loss_lengths) if loss_lengths else None
        shortest_draw = min(draw_lengths) if draw_lengths else None
        longest_draw = max(draw_lengths) if draw_lengths else None

        # Display result distribution by game length
        print("\nResult Distribution by Game Length (average moves):")
        print(f"Average length of wins: {avg_win_length:.2f} moves")
        print(f"Average length of losses: {avg_loss_length:.2f} moves")
        print(f"Average length of draws: {avg_draw_length:.2f} moves")

        # Display shortest and longest game lengths for each result type
        if shortest_win is not None:
            print(f"Shortest win: {shortest_win} moves")
        if longest_win is not None:
            print(f"Longest win: {longest_win} moves")

        if shortest_loss is not None:
            print(f"Shortest loss: {shortest_loss} moves")
        if longest_loss is not None:
            print(f"Longest loss: {longest_loss} moves")

        if shortest_draw is not None:
            print(f"Shortest draw: {shortest_draw} moves")
        if longest_draw is not None:
            print(f"Longest draw: {longest_draw} moves")

    display_result_distribution_by_game_length(stats)

    # Monthly Performance
    print("\nMonthly Performance:")
    # List of month names
    month_names = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ]

    # Sort months in ascending order
    for month in sorted(stats["monthly_performance"].keys()):
        record = stats["monthly_performance"][month]
        print(
            f"{month_names[month - 1]}: {record['games']} games, Win Rate: {record['wins']/record['games']:.2%}"
        )

    # Now plot the monthly performance data
    plot_monthly_performance(stats["monthly_performance"])

    # Head-to-Head Analysis
    print("\nHead-to-Head Analysis:")
    # Sort opponents by total number of games (wins + losses + draws)
    sorted_head_to_head = sorted(
        stats["head_to_head"].items(),
        key=lambda item: sum(item[1].values()),  # Sort by total games
        reverse=True,
    )

    # Display the top 5 opponents
    for opponent, record in sorted_head_to_head[:5]:
        total_games = sum(record.values())
        win_rate = record["wins"] / total_games if total_games > 0 else 0
        print(
            f"Against {opponent}: {total_games} total games, {record['wins']} wins, "
            f"{record['losses']} losses, {record['draws']} draws, Win Rate: {win_rate:.2%}"
        )

    # Game Length Analysis (Number of Moves)
    print("\nGame Length Analysis (Number of Moves):")

    # Extract only the game lengths (the first element of each tuple)
    game_lengths = [length for length, _ in stats["game_lengths"]]

    if game_lengths:
        avg_moves = np.mean(
            game_lengths
        )  # Now calculating the mean of just the lengths (integers)
        print(f"Average number of moves per game: {avg_moves}")
    else:
        print("No game lengths available.")

    # Find the most played game type by checking the highest count in game_types
    most_played_game_type = stats["game_types"].most_common(1)
    if most_played_game_type:
        most_played_game_type = most_played_game_type[0][0]
    else:
        most_played_game_type = "Blitz"  # Default to 'Blitz' if no games are played

    # Prompt for the game type to visualize rating progression
    game_type_input = input(
        "\nEnter the game type number to visualize rating progression (1: Bullet, 2: Blitz, 3: Rapid, 4: Classical): "
    )

    # If the user doesn't enter anything, use the most played game type
    if game_type_input.strip() == "":
        print(
            f"No input provided. Using the most played game type: {most_played_game_type}."
        )
        # Map the most played game type to its corresponding number
        game_type_number = {
            "Bullet": 1,
            "Blitz": 2,
            "Rapid": 3,
            "Classical": 4,
        }[most_played_game_type]
    else:
        try:
            # Convert input to an integer and validate
            game_type_number = int(game_type_input)
            if game_type_number not in [1, 2, 3, 4]:
                raise ValueError
        except ValueError:
            print("Invalid input. Using the most played game type instead.")
            game_type_number = {
                "Bullet": 1,
                "Blitz": 2,
                "Rapid": 3,
                "Classical": 4,
            }[most_played_game_type]

    # Call the function to get rating progression
    dates, ratings = get_rating_progression(games, username, game_type_number)
    game_type_name = GAME_TYPE_MAP[game_type_number]
    plot_rating_progression(dates, ratings, game_type_name)


if __name__ == "__main__":
    pgn_file = input("Enter the path to your PGN file: ")
    username = input("Enter your username: ")

    games = parse_pgn(pgn_file)
    stats = analyze_games(games, username)
    display_stats(stats, games, username)
