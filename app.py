from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

experiment_data = []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/phytheory')
def phytheory():
    return render_template('phytheory.html')

@app.route('/quiz')
def quiz():
    return render_template('quiz.html')


@app.route('/add_data', methods=['POST'])
def add_data():
    try:
        data = request.get_json()
        experiment_data.append({
            'n': int(data['n']),
            't': float(data['t']),
            'T': float(data['T'])
        })
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route('/get_average', methods=['GET'])
def get_average():
    try:
        if not experiment_data:
            return jsonify({"average": 0, "count": 0})
        
        total = sum(item['T'] for item in experiment_data)
        average = total / len(experiment_data)
        return jsonify({
            "average": average,
            "count": len(experiment_data),
            "status": "success"
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=8000)
