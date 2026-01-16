from flask import Flask, request, jsonify
from flask_cors import CORS
from logic import StudyPlannerBackend

app = Flask(__name__)
CORS(app)

planner = StudyPlannerBackend()

# --- EXISTING GRAPH & HEAP ENDPOINTS (Keep these as is) ---
@app.route('/add-subject', methods=['POST'])
def add_subject():
    data = request.json
    if planner.add_subject(data.get('subject')):
        return jsonify({"message": "Added"}), 200
    return jsonify({"error": "Exists"}), 400

@app.route('/add-dependency', methods=['POST'])
def add_dependency():
    data = request.json
    success, msg = planner.add_dependency(data.get('prerequisite'), data.get('dependent'))
    return jsonify({"message": msg} if success else {"error": msg})

@app.route('/generate-path', methods=['GET'])
def get_path():
    path = planner.generate_study_path()
    return jsonify({"path": path}) if path else jsonify({"error": "Cycle detected!"})

@app.route('/get-graph', methods=['GET'])
def get_graph():
    nodes = [{"id": n, "label": n} for n in planner.graph.keys()]
    edges = [{"source": src, "target": dest} for src, neighbors in planner.graph.items() for dest in neighbors]
    return jsonify({"nodes": nodes, "edges": edges})

@app.route('/submit-marks', methods=['POST'])
def submit_marks():
    data = request.json
    for subject, score in data.items():
        planner.add_mark(subject, int(score))
    return jsonify({"message": "Marks updated!"})

@app.route('/get-weak-topics', methods=['GET'])
def get_weakness():
    return jsonify(planner.get_weak_topics())

# --- UPDATED TREE ENDPOINTS (Strict Compliance) ---
@app.route('/add-syllabus', methods=['POST'])
def add_syllabus():
    data = request.json
    subject = data.get('subject')
    modules = data.get('modules') 
    # Structure expected: 
    # modules = [ {"name": "Algebra", "topics": ["Eq 1", "Eq 2"]} ]
    
    planner.add_syllabus_tree(subject, modules)
    return jsonify({"message": "Syllabus Tree Created"})

@app.route('/get-syllabus/<subject>', methods=['GET'])
def get_syllabus(subject):
    tree_data = planner.get_syllabus_json(subject)
    if tree_data:
        return jsonify(tree_data)
    return jsonify({"error": "Syllabus not found"}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)