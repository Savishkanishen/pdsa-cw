from collections import deque
import heapq

# ---------------- GLOBAL DATA ----------------
graph = {}
study_order = []
progress = {}
scores = {}
syllabus_root = None


# ---------------- TREE ----------------
class TreeNode:
    def __init__(self, name):
        self.name = name
        self.children = []


def input_syllabus_tree():
    subject_name = input("Enter subject name: ")
    root = TreeNode(subject_name)

    m = int(input("Enter number of modules: "))
    for _ in range(m):
        module_name = input("Enter module name: ")
        module = TreeNode(module_name)

        t = int(input(f"Enter number of topics in {module_name}: "))
        for _ in range(t):
            topic_name = input("Enter topic name: ")
            module.children.append(TreeNode(topic_name))

        root.children.append(module)

    return root


def display_tree(node, level=0):
    print("  " * level + "- " + node.name)
    for child in node.children:
        display_tree(child, level + 1)


# ---------------- GRAPH INPUT ----------------
def input_subjects():
    n = int(input("Enter number of subjects: "))
    for _ in range(n):
        subject = input("Enter subject name: ")
        graph[subject] = []

    p = int(input("Enter number of prerequisite relations: "))
    for _ in range(p):
        src = input("Prerequisite subject: ")
        dest = input("Dependent subject: ")
        graph[src].append(dest)


# ---------------- STUDY PATH + CYCLE DETECTION ----------------
def generate_study_path():
    global study_order

    in_degree = {s: 0 for s in graph}
    for s in graph:
        for d in graph[s]:
            in_degree[d] += 1

    queue = deque([s for s in in_degree if in_degree[s] == 0])
    study_order = []

    while queue:
        current = queue.popleft()
        study_order.append(current)
        for d in graph[current]:
            in_degree[d] -= 1
            if in_degree[d] == 0:
                queue.append(d)

    if len(study_order) != len(graph):
        print("\n❌ ERROR: Cycle detected in prerequisites.")
        print("Invalid study plan.")
        exit()

    print("\n📘 Study Path Generated Successfully!")


# ---------------- MARKS + PROGRESS ----------------
def input_marks_and_progress():
    heap = []

    for s in study_order:
        score = int(input(f"Enter marks for {s}: "))
        scores[s] = score
        heapq.heappush(heap, (score, s))

    # Progress logic
    for s in study_order:
        if scores[s] >= 50:
            progress[s] = "Completed"
        else:
            progress[s] = "Pending"

    for s in study_order:
        if progress[s] == "Pending":
            progress[s] = "In Progress"
            break

    return heap


# ---------------- VIEW FUNCTIONS ----------------
def view_study_plan_by_marks():
    print("\n📘 Study Plan (Based on Marks):")
    sorted_plan = sorted(scores.items(), key=lambda x: x[1])
    for topic, mark in sorted_plan:
        print(topic, "- Marks:", mark)


def view_weak_topics(heap):
    print("\n🔥 Weak Topics (Revise First):")
    temp = heap.copy()
    while temp:
        score, topic = heapq.heappop(temp)
        print(topic, "- Marks:", score)


def view_progress():
    print("\n📊 Progress Tracker:")
    for s in study_order:
        print(s, "→", progress[s])


def save_to_file():
    with open("progress.txt", "w") as file:
        file.write("STUDY PATH\n")
        for s in study_order:
            file.write(s + "\n")

        file.write("\nMARKS\n")
        for s in scores:
            file.write(f"{s} : {scores[s]}\n")

        file.write("\nPROGRESS\n")
        for s in progress:
            file.write(f"{s} → {progress[s]}\n")

    print("\n💾 Progress saved to progress.txt")


# ================== MAIN FLOW ==================

print("===== SMART LEARNING & STUDY PATH PLANNER =====\n")

# Step 1: Input subjects & prerequisites
input_subjects()

# Step 2: Input syllabus (Tree)
syllabus_root = input_syllabus_tree()

# Step 3: Generate study path
generate_study_path()

# Step 4: Input marks & auto progress
heap = input_marks_and_progress()

# ---------------- USER OPTIONS ----------------
while True:
    print("\n----- OPTIONS -----")
    print("1. View study plan according to marks")
    print("2. View weak topics")
    print("3. View syllabus hierarchy")
    print("4. View progress")
    print("5. Save progress to file")
    print("6. Exit")

    choice = input("Enter your choice: ")

    if choice == "1":
        view_study_plan_by_marks()
    elif choice == "2":
        view_weak_topics(heap)
    elif choice == "3":
        print("\n📚 Syllabus Hierarchy:")
        display_tree(syllabus_root)
    elif choice == "4":
        view_progress()
    elif choice == "5":
        save_to_file()
    elif choice == "6":
        print("\n👋 Exiting application. Good luck!")
        break
    else:
        print("❌ Invalid choice.")
