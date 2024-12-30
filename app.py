from flask import Flask, request, jsonify, render_template
import os

app = Flask(__name__)


# Route to display the web interface
@app.route("/")
def index():
    return render_template("index.html")


# Route to handle file uploads
@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    # Save file locally (or process it)
    file.save(os.path.join("uploads", file.filename))

    # Process file (placeholder)
    stats = {"message": "File uploaded successfully", "filename": file.filename}
    return jsonify(stats)


# Route to handle user input
@app.route("/input", methods=["POST"])
def handle_input():
    user_data = request.get_json()
    if not user_data or "user_input" not in user_data:
        return jsonify({"error": "Invalid input"}), 400

    # Process user input (example placeholder)
    response = {"message": f"Received input: {user_data['user_input']}"}
    return jsonify(response)


if __name__ == "__main__":
    app.run(debug=True)
