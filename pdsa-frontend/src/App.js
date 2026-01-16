import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState, 
  MarkerType 
} from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css';

const API = "http://127.0.0.1:5000";

function App() {
  const [activeTab, setActiveTab] = useState("graph"); // Tabs: graph, marks, syllabus

  // --- STATE: GRAPH (Study Path) ---
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [subject, setSubject] = useState("");
  const [prereq, setPrereq] = useState("");
  const [dependent, setDependent] = useState("");
  const [path, setPath] = useState([]);

  // --- STATE: MARKS (Heap) ---
  const [marksInput, setMarksInput] = useState({});
  const [weakTopics, setWeakTopics] = useState([]);

  // --- STATE: SYLLABUS (Tree) ---
  const [sylSubject, setSylSubject] = useState("");
  const [sylModule, setSylModule] = useState(""); 
  const [sylTopic, setSylTopic] = useState("");
  const [viewTree, setViewTree] = useState(null); // Stores the fetched tree from backend
  
  // tempStructure stores: { "Algebra": ["Linear Eq", "Quadratics"], "Calculus": ["Limits"] }
  const [tempStructure, setTempStructure] = useState({}); 

  // =========================================================================
  // 1. GRAPH FUNCTIONS (Study Path & Prerequisites)
  // =========================================================================
  const refreshGraph = useCallback(async () => {
    try {
      const res = await fetch(`${API}/get-graph`);
      const data = await res.json();
      
      // Convert backend data to React Flow nodes
      setNodes(data.nodes.map((n, i) => ({
        id: n.id,
        // Simple positioning algorithm to spiral nodes so they don't overlap
        position: { x: (i * 200) % 800 + 50, y: Math.floor(i / 4) * 150 + 50 },
        data: { label: n.label },
        style: { background: '#1e1e1e', color: '#fff', border: '1px solid #bb86fc', width: 150, borderRadius: '8px', textAlign: 'center' }
      })));

      // Convert backend edges to React Flow edges
      setEdges(data.edges.map((e, i) => ({
        id: `e${i}`,
        source: e.source,
        target: e.target,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#03dac6' },
        style: { stroke: '#03dac6', strokeWidth: 2 }
      })));
    } catch (error) {
      console.error("Error connecting to backend:", error);
    }
  }, [setNodes, setEdges]);

  // Load graph on startup
  useEffect(() => { refreshGraph(); }, [refreshGraph]);

  const addSubject = async () => {
    if (!subject) return;
    await fetch(`${API}/add-subject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject })
    });
    setSubject(""); 
    refreshGraph();
  };

  const addDependency = async () => {
    if (!prereq || !dependent) return;
    await fetch(`${API}/add-dependency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prerequisite: prereq, dependent })
    });
    setPrereq("");
    setDependent("");
    refreshGraph();
  };

  const generatePath = async () => {
    const res = await fetch(`${API}/generate-path`);
    const data = await res.json();
    
    if (data.path) {
      setPath(data.path);
      // Auto-initialize marks inputs for the generated path subjects
      const initMarks = {};
      data.path.forEach(s => initMarks[s] = 0);
      setMarksInput(initMarks);
    } else {
      alert("Error: " + data.error);
    }
  };

  // =========================================================================
  // 2. HEAP FUNCTIONS (Marks & Weakness Analysis)
  // =========================================================================
  const submitMarks = async () => {
    await fetch(`${API}/submit-marks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(marksInput)
    });
    
    // Fetch the sorted "Weak Topics" list from the backend Heap
    const res = await fetch(`${API}/get-weak-topics`);
    const data = await res.json();
    setWeakTopics(data);
  };

  // =========================================================================
  // 3. TREE FUNCTIONS (Syllabus Hierarchy)
  // =========================================================================
  const addTopicToModule = () => {
    if (!sylModule || !sylTopic) return;
    const currentTopics = tempStructure[sylModule] || [];
    setTempStructure({
      ...tempStructure,
      [sylModule]: [...currentTopics, sylTopic]
    });
    setSylTopic("");
  };

  const saveSyllabus = async () => {
    if (!sylSubject) {
      alert("Please enter a Subject Name first.");
      return;
    }

    // Convert tempStructure object to the Array format backend expects
    const modulesArray = Object.keys(tempStructure).map(modName => ({
      name: modName,
      topics: tempStructure[modName]
    }));

    await fetch(`${API}/add-syllabus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: sylSubject, modules: modulesArray })
    });
    
    alert(`Syllabus Tree for '${sylSubject}' saved successfully!`);
    // Reset form
    setTempStructure({});
    setSylModule("");
    setSylSubject("");
    setViewTree(null); // Clear view
  };

  // NEW: Function to load a saved tree
  const loadSyllabus = async () => {
    if (!sylSubject) {
      alert("Enter a subject name (e.g. Maths) to load.");
      return;
    }
    try {
      const res = await fetch(`${API}/get-syllabus/${sylSubject}`);
      const data = await res.json();
      if (data.name) {
         setViewTree(data);
      } else {
         alert("Syllabus not found!");
      }
    } catch (e) { console.error(e); }
  };

  // =========================================================================
  // RENDER UI
  // =========================================================================
  return (
    <div className="app-container">
      
      {/* --- LEFT SIDEBAR (Controls) --- */}
      <div className="sidebar">
        <h1>🎓 Study Planner</h1>
        
        {/* Tab Navigation */}
        <div className="nav-buttons" style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
          <button className={activeTab === 'graph' ? 'active-btn' : ''} onClick={() => setActiveTab("graph")}>🕸️ Graph</button>
          <button className={activeTab === 'marks' ? 'active-btn' : ''} onClick={() => setActiveTab("marks")}>📊 Marks</button>
          <button className={activeTab === 'syllabus' ? 'active-btn' : ''} onClick={() => setActiveTab("syllabus")}>🌳 Syllabus</button>
        </div>

        {/* TAB 1: GRAPH CONTROLS */}
        {activeTab === "graph" && (
          <>
            <div className="panel">
              <h3>1. Add Subject</h3>
              <div className="input-group">
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject Name" />
                <button onClick={addSubject}>+</button>
              </div>
            </div>

            <div className="panel">
              <h3>2. Add Dependency</h3>
              <input value={prereq} onChange={e => setPrereq(e.target.value)} placeholder="Prerequisite (From)" style={{marginBottom:'5px'}}/>
              <input value={dependent} onChange={e => setDependent(e.target.value)} placeholder="Dependent (To)" />
              <button onClick={addDependency} style={{marginTop:'10px', width:'100%'}}>Link Subjects 🔗</button>
            </div>

            <button className="generate-btn" onClick={generatePath}>🚀 Generate Path</button>
          </>
        )}

        {/* TAB 2: MARKS CONTROLS */}
        {activeTab === "marks" && (
          <div className="panel">
            <h3>Enter Marks</h3>
            {Object.keys(marksInput).length === 0 && (
              <p style={{ fontSize:'0.85rem', color:'#aaa', fontStyle:'italic' }}>
                * Generate a study path first to populate this list.
              </p>
            )}
            
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {Object.keys(marksInput).map(sub => (
                <div key={sub} style={{ marginBottom:'10px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <label>{sub}</label>
                  <input 
                    type="number" 
                    value={marksInput[sub]} 
                    onChange={e => setMarksInput({...marksInput, [sub]: e.target.value})}
                    style={{ width:'60px', padding:'5px' }}
                  />
                </div>
              ))}
            </div>
            
            {Object.keys(marksInput).length > 0 && (
              <button onClick={submitMarks} style={{ width:'100%', marginTop:'15px', background:'#ff9800', color:'black' }}>
                Analyze Weakness 📉
              </button>
            )}
          </div>
        )}

        {/* TAB 3: SYLLABUS CONTROLS */}
        {activeTab === "syllabus" && (
          <div className="panel">
            <h3>Build Syllabus Tree</h3>
            
            <label style={{ fontSize:'0.8rem', color:'#bb86fc' }}>ROOT (Subject)</label>
            <input 
              value={sylSubject} 
              onChange={e => setSylSubject(e.target.value)} 
              placeholder="e.g. Computer Science" 
              style={{ marginBottom:'15px' }}
            />
            
            <div style={{ borderLeft: '3px solid #03dac6', paddingLeft: '10px', marginBottom: '15px' }}>
              <label style={{ fontSize:'0.8rem', color:'#03dac6' }}>BRANCH (Module)</label>
              <input 
                value={sylModule} 
                onChange={e => setSylModule(e.target.value)} 
                placeholder="e.g. Algorithms" 
                style={{ marginBottom:'5px' }}
              />
              
              <div style={{ display:'flex', gap:'5px' }}>
                <input 
                  value={sylTopic} 
                  onChange={e => setSylTopic(e.target.value)} 
                  placeholder="Leaf (Topic)" 
                />
                <button onClick={addTopicToModule}>+</button>
              </div>
            </div>

            <button onClick={saveSyllabus} style={{ width:'100%', background:'#03dac6', color:'black' }}>
              💾 Save Tree Structure
            </button>
          </div>
        )}
      </div>

      {/* --- RIGHT MAIN AREA (Visuals) --- */}
      <div className="graph-area">
        
        {/* VIEW 1: GRAPH */}
        {activeTab === "graph" && (
          <>
            <ReactFlow 
              nodes={nodes} 
              edges={edges} 
              onNodesChange={onNodesChange} 
              onEdgesChange={onEdgesChange} 
              fitView
            >
              <Background color="#555" gap={20} />
              <Controls />
            </ReactFlow>

            {/* Floating Path Result */}
            {path.length > 0 && (
              <div className="path-result">
                <strong>Start</strong>
                {path.map((step, i) => (
                  <React.Fragment key={i}>
                    <span className="arrow">→</span>
                    <div className="step">{step}</div>
                  </React.Fragment>
                ))}
                <span className="arrow">→</span>
                <strong>Finish</strong>
              </div>
            )}
          </>
        )}

        {/* VIEW 2: MARKS (Heap Visualization) */}
        {activeTab === "marks" && (
          <div style={{ padding:'40px', color:'white', overflowY:'auto', height:'100%' }}>
            <h2>📊 Performance Analysis</h2>
            <p>Topics are sorted by priority (Weakest First) using a <strong>Min-Heap</strong>.</p>
            
            {weakTopics.length > 0 ? (
              <div style={{ display:'flex', flexWrap:'wrap', gap:'20px', marginTop:'20px' }}>
                {weakTopics.map(([score, sub], i) => (
                  <div key={i} className="card-animation" style={{ 
                    background: score < 50 ? 'linear-gradient(135deg, #cf6679 0%, #b00020 100%)' : 'linear-gradient(135deg, #03dac6 0%, #018786 100%)', 
                    padding:'20px', 
                    borderRadius:'12px', 
                    width:'180px', 
                    textAlign:'center', 
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                  }}>
                    <h3 style={{ margin:'0 0 10px 0', borderBottom:'1px solid rgba(255,255,255,0.3)', paddingBottom:'5px' }}>{sub}</h3>
                    <h1 style={{ fontSize:'3rem', margin:'0' }}>{score}%</h1>
                    <p style={{ fontWeight:'bold', marginTop:'10px' }}>{score < 50 ? "⚠️ WEAK" : "✅ STRONG"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginTop:'50px', opacity: 0.5 }}>
                <h3>No marks submitted yet.</h3>
                <p>Go to the sidebar to enter marks for your subjects.</p>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: SYLLABUS (Tree Preview & Load) */}
        {activeTab === "syllabus" && (
          <div style={{ padding:'40px', color:'white', overflowY:'auto', height:'100%' }}>
            
            {/* Header with Load Button */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '20px' }}>
              <h2>🌳 Syllabus Hierarchy</h2>
              <button onClick={loadSyllabus} style={{ background:'#bb86fc', color:'black', padding:'10px 20px', fontSize:'0.9rem', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                 🔍 Load Saved Tree
              </button>
            </div>

            {/* AREA A: The Saved Tree (Loaded from Backend) */}
            {viewTree && (
               <div style={{ marginBottom: '40px', padding: '20px', border: '1px solid #03dac6', borderRadius: '10px', background: '#121212' }}>
                  <h3 style={{ color: '#03dac6', marginTop: 0 }}>📂 Saved Tree: {viewTree.name}</h3>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                     {viewTree.children.map((mod, i) => (
                        <div key={i} style={{ background: '#1e1e1e', padding: '15px', borderRadius: '8px', border: '1px solid #333', minWidth: '150px' }}>
                           <strong style={{ color: '#e0e0e0', display: 'block', marginBottom: '5px', borderBottom: '1px solid #444' }}>{mod.name}</strong>
                           <ul style={{ margin: '5px 0 0 20px', color: '#aaa', paddingLeft: '0' }}>
                              {mod.children.map((topic, j) => <li key={j}>{topic.name}</li>)}
                           </ul>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {/* AREA B: The Construction Zone (Temp) */}
            <h4 style={{ borderBottom: '1px solid #333', paddingBottom: '10px', color: '#777' }}>🚧 Construction Zone (New)</h4>
            <p style={{ fontSize: '0.8rem', color: '#aaa' }}>Use the sidebar to add Modules and Topics here before saving.</p>
            
            <div style={{ marginTop:'20px', display:'flex', gap:'30px', flexWrap:'wrap' }}>
              {Object.keys(tempStructure).length > 0 ? (
                Object.keys(tempStructure).map((mod, i) => (
                  <div key={i} style={{ 
                    border:'1px solid #bb86fc', 
                    background: '#1e1e1e', 
                    borderRadius:'10px', 
                    padding:'20px', 
                    minWidth:'250px' 
                  }}>
                    <h3 style={{ color: '#bb86fc', marginTop:0 }}>📂 {mod}</h3>
                    <ul style={{ paddingLeft:'20px', color:'#e0e0e0' }}>
                      {tempStructure[mod].map((topic, j) => (
                        <li key={j} style={{ marginBottom:'5px' }}>📄 {topic}</li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <div style={{ border:'2px dashed #555', padding:'40px', borderRadius:'10px', color:'#777', width: '100%', textAlign: 'center' }}>
                  Your new tree structure will appear here as you build it.
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;