import chess.pgn
import matplotlib.pyplot as plt
from collections import Counter, defaultdict
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
    }

    for game in games:
        headers = game.headers
        time_control = headers.get("TimeControl", "Unknown")
        category = categorize_time_control(time_control)
        stats["game_types"][category] += 1

        result = headers.get("Result", "*")
        if result == "1-0" and headers["White"] == username:
            stats["results"]["wins"] += 1
            stats["opening_success"][headers["Opening"]]["wins"] += 1
        elif result == "0-1" and headers["Black"] == username:
            stats["results"]["wins"] += 1
            stats["opening_success"][headers["Opening"]]["wins"] += 1
        elif result == "1-0" or result == "0-1":
            stats["results"]["losses"] += 1
            stats["opening_success"][headers["Opening"]]["losses"] += 1
        elif result == "1/2-1/2":
            stats["results"]["draws"] += 1
            stats["opening_success"][headers["Opening"]]["draws"] += 1

        rating = int(
            headers["WhiteElo"] if headers["White"] == username else headers["BlackElo"]
        )
        date = headers.get("Date", "????.??.??")
        try:
            date = datetime.strptime(date, "%Y.%m.%d")
        except ValueError:
            date = None

        stats["ratings"][category].append(rating)
        stats["dates"][category].append(date)
        stats["openings"][headers["Opening"]] += 1

    return stats


def display_stats(stats):
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


def plot_rating_progression(stats):
    # Determine the most played game type
    most_played = max(stats["game_types"], key=stats["game_types"].get)
    game_type_mapping = {"1": "Bullet", "2": "Blitz", "3": "Rapid", "4": "Classical"}
    print("\nSelect Game Type for Rating Progression:")
    print("1. Bullet")
    print("2. Blitz")
    print("3. Rapid")
    print("4. Classical")
    game_type_choice = input(f"Enter your choice (default: {most_played}): ")
    game_type = game_type_mapping.get(game_type_choice, most_played)

    if game_type in stats["ratings"] and stats["ratings"][game_type]:
        dates = stats["dates"][game_type]
        ratings = stats["ratings"][game_type]

        # Filter out games with missing dates
        valid_data = [(date, rating) for date, rating in zip(dates, ratings) if date]
        valid_data.sort(key=lambda x: x[0])  # Sort by date

        dates, ratings = zip(*valid_data)

        plt.plot(dates, ratings, marker="o", label=game_type, color="blue")
        plt.title(f"Rating Progression ({game_type})")
        plt.xlabel("Date")
        plt.ylabel("Rating")
        plt.grid(True)
        plt.legend()
        plt.show()
    else:
        print(f"No rating data available for {game_type}.")


if __name__ == "__main__":
    pgn_file = input("Enter the path to your PGN file: ")
    username = input("Enter your username: ")

    games = parse_pgn(pgn_file)
    stats = analyze_games(games, username)
    display_stats(stats)
    plot_rating_progression(stats)
