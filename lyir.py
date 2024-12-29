import chess.pgn
import matplotlib.pyplot as plt
from collections import Counter, defaultdict
from datetime import datetime
import numpy as np


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
            if result == "1-0":
                stats["monthly_performance"][date.month]["wins"] += 1
                stats["monthly_performance"][date.month]["rating_change"] += int(
                    headers.get("WhiteRatingDiff", "0")
                )
            elif result == "0-1":
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


def display_stats(stats):
    # Previous stats display...

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


def plot_rating_progression(stats):
    # Determine the most played game type
    most_played = max(stats["game_types"], key=stats["game_types"].get)

    # Map input choices to game types
    game_type_mapping = {"1": "Bullet", "2": "Blitz", "3": "Rapid", "4": "Classical"}

    # Prompt user to select a game type, defaulting to the most played game type
    print("\nSelect Game Type for Rating Progression:")
    print("1. Bullet")
    print("2. Blitz")
    print("3. Rapid")
    print("4. Classical")

    game_type_choice = input(f"Enter your choice (default: {most_played}): ").strip()

    # If the input is invalid, use the most played game type as default
    game_type = game_type_mapping.get(game_type_choice, most_played)

    # Check if there is any rating data available for the selected game type
    if game_type in stats["ratings"] and stats["ratings"][game_type]:
        # Extract dates and ratings for the selected game type
        dates = stats["dates"][game_type]
        ratings = stats["ratings"][game_type]

        # Filter out games with missing or invalid dates
        valid_data = [
            (date, rating) for date, rating in zip(dates, ratings) if date and rating
        ]

        if valid_data:
            # Sort the valid data by date
            valid_data.sort(key=lambda x: x[0])

            # Unzip the sorted valid data into separate lists for dates and ratings
            dates, ratings = zip(*valid_data)

            # Plot the rating progression
            plt.plot(dates, ratings, marker="o", label=game_type, color="blue")
            plt.title(f"Rating Progression ({game_type})")
            plt.xlabel("Date")
            plt.ylabel("Rating")
            plt.grid(True)
            plt.legend()
            plt.xticks(rotation=45)  # Rotate x-axis labels for readability
            plt.tight_layout()  # Ensure the plot fits well within the figure area
            plt.show()
        else:
            print(f"No valid rating data available for {game_type}.")
    else:
        print(f"No rating data available for {game_type}. Please check your PGN file.")


if __name__ == "__main__":
    pgn_file = input("Enter the path to your PGN file: ")
    username = input("Enter your username: ")

    games = parse_pgn(pgn_file)
    stats = analyze_games(games, username)
    display_stats(stats)
    plot_rating_progression(stats)
