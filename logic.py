import heapq
from collections import deque

# --- TREE NODE CLASS (Required for Proposal) ---
class TreeNode:
    def __init__(self, name):
        self.name = name
        self.children = [] # List of TreeNode objects

    def add_child(self, child_node):
        self.children.append(child_node)

    def to_dict(self):
        # Recursive function to convert Tree to JSON for React
        return {
            "name": self.name,
            "children": [child.to_dict() for child in self.children]
        }

class StudyPlannerBackend:
    def __init__(self):
        self.graph = {}          # Graph (Adjacency List)
        self.scores = {}         # Stores marks
        self.study_order = []    # Stores path
        self.syllabus_trees = {} # Dictionary of TreeNodes (Subject -> Root Node)

    # --- GRAPH LOGIC ---
    def add_subject(self, subject):
        if subject not in self.graph:
            self.graph[subject] = []
            return True
        return False

    def add_dependency(self, prerequisite, dependent):
        if prerequisite in self.graph and dependent in self.graph:
            if dependent not in self.graph[prerequisite]:
                self.graph[prerequisite].append(dependent)
                return True, "Added"
            return False, "Relation already exists"
        return False, "Subject not found"

    def generate_study_path(self):
        # Kahn's Algorithm (Topological Sort)
        in_degree = {u: 0 for u in self.graph}
        for u in self.graph:
            for v in self.graph[u]:
                in_degree[v] += 1
        
        queue = deque([u for u in in_degree if in_degree[u] == 0])
        path = []
        
        while queue:
            u = queue.popleft()
            path.append(u)
            for v in self.graph[u]:
                in_degree[v] -= 1
                if in_degree[v] == 0:
                    queue.append(v)
                    
        if len(path) != len(self.graph):
            return None # Cycle detected
        
        self.study_order = path
        return path

    # --- HEAP LOGIC ---
    def add_mark(self, subject, mark):
        self.scores[subject] = mark

    def get_weak_topics(self):
        # Min-Heap to find lowest marks efficiently
        heap = []
        for subject, score in self.scores.items():
            heapq.heappush(heap, (score, subject))
        
        sorted_weak = []
        while heap:
            sorted_weak.append(heapq.heappop(heap))
        return sorted_weak

    # --- TREE LOGIC (New) ---
    def add_syllabus_tree(self, subject, modules):
        # modules format: [{"name": "Module 1", "topics": ["Topic A", "Topic B"]}]
        root = TreeNode(subject)
        for mod_data in modules:
            module_node = TreeNode(mod_data['name'])
            for topic_name in mod_data['topics']:
                module_node.add_child(TreeNode(topic_name))
            root.add_child(module_node)
        
        self.syllabus_trees[subject] = root

    def get_syllabus_json(self, subject):
        if subject in self.syllabus_trees:
            return self.syllabus_trees[subject].to_dict()
        return None