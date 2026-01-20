import { KnowledgeGraph } from '../logic/GraphModel';
import type { GraphNode, GraphEdge } from '../logic/GraphModel';

export const generateMockData = (): KnowledgeGraph => {
    const graph = new KnowledgeGraph();

    // Helper to streamline node creation
    const createNode = (
        id: string,
        labelEn: string,
        labelZh: string,
        type: 'part' | 'process',
        context: 'design' | 'manufacturing' | 'support',
        x: number,
        y: number,
        confidence: number = 0.99,
        tags: Record<string, string> = {},
        attributes: Record<string, { value: number; confidence: number }> = {}
    ): GraphNode => ({
        id,
        label: labelEn,
        labelEn,
        labelZh,
        type,
        context,
        beliefs: { 'working': confidence },
        position: { x, y },
        tags,
        customAttributes: attributes
    });

    const createEdge = (source: string, target: string, type: 'structural' | 'logical', bomType: any = undefined, weight: number = 1.0): GraphEdge => ({
        id: `e-${source}-${target}-${Math.random().toString(36).substr(2, 5)}`,
        source,
        target,
        type,
        weight,
        bomType
    });

    // =========================================================================
    // TREE 1: PHYSICAL STRUCTURE (LEFT SIDE) - Vertical Hierarchy
    // Context: Design / EBOM
    // =========================================================================

    // Root
    graph.addNode(createNode(
        'D-WingBox', 'Wing Box Assembly', '机翼翼盒总成', 'part', 'design',
        -200, 0, 0.98,
        {
            "Material": "CFRP/Al-Li Hybrid",
            "Weight": "2500kg",
            "Supplier": "Main-Tier1"
        },
        {
            "FatigueLife": { value: 0.98, confidence: 0.98 },
            "AerodynamicEff": { value: 0.99, confidence: 0.99 }
        }
    ));

    // Level 1 Nodes
    graph.addNode(createNode(
        'D-FrontSpar', 'Front Spar', '前梁', 'part', 'design',
        -400, 200, 0.96, // Degradation start
        {
            "Material": "Al-Li 2099",
            "Criticality": "A",
            "ProcessType": "Machined Extrusion"
        },
        {
            "YieldStrength": { value: 0.96, confidence: 0.96 },
            "DimAccuracy": { value: 0.98, confidence: 0.98 }
        }
    ));

    graph.addNode(createNode(
        'D-RearSpar', 'Rear Spar', '后梁', 'part', 'design',
        -200, 200, 0.94, // Degradation
        {
            "Material": "Carbon Fiber M21/T800",
            "Criticality": "A",
            "Layup": "Auto-Tape Laying"
        },
        {
            "CompositeCure": { value: 0.94, confidence: 0.94 },
            "VoidContent": { value: 0.97, confidence: 0.97 }
        }
    ));

    graph.addNode(createNode(
        'D-RibSet', 'Rib Assys', '翼肋组件', 'part', 'design',
        0, 200, 0.99, // New batch, high confidence
        {
            "Quantity": "28",
            "Standard": "AS9100"
        },
        {
            "SupplyChainHealth": { value: 0.99, confidence: 0.99 }
        }
    ));

    // EBOM Edges (Vertical)
    graph.addEdge(createEdge('D-WingBox', 'D-FrontSpar', 'structural', 'EBOM'));
    graph.addEdge(createEdge('D-WingBox', 'D-RearSpar', 'structural', 'EBOM'));
    graph.addEdge(createEdge('D-WingBox', 'D-RibSet', 'structural', 'EBOM'));

    // Level 2 Nodes (Deep Hierarchy)
    graph.addNode(createNode(
        'D-Rib-1', 'Root Rib 1', '根部翼肋 #1', 'part', 'design',
        -50, 400, 0.88, // Significant wear/aging
        {
            "LoadCase": "High-G Maneuver",
            "Thickness": "11.8mm" // Degraded thickness
        },
        {
            "MaterialFatigue": { value: 0.88, confidence: 0.85 },
            "MachiningTol": { value: 0.92, confidence: 0.92 }
        }
    ));
    // CRITICAL RISK NODE
    graph.addNode(createNode(
        'D-Fastener', 'Ti-Fastener', '钛合金紧固件', 'part', 'design',
        -50, 600, 0.45, // FAILURE RISK
        {
            "Batch": "LOT-992-BAD",
            "Issue": "Fatigue Crack",
            "Standard": "EN6115"
        },
        {
            "ShearStrength": { value: 0.45, confidence: 0.45 },
            "CoatingIntegrity": { value: 0.60, confidence: 0.60 },
            "DiameterTol": { value: 0.99, confidence: 0.99 }
        }
    ));

    graph.addEdge(createEdge('D-RibSet', 'D-Rib-1', 'structural', 'EBOM'));
    graph.addEdge(createEdge('D-Rib-1', 'D-Fastener', 'structural', 'EBOM'));

    // Level 3 Nodes (More Detail)
    graph.addNode(createNode(
        'D-Spar-Web', 'Spar Web', '梁腹板', 'part', 'design',
        -450, 400, 0.92,
        {
            "Thickness": "4.9mm",
            "Tolerance": "+/-0.1mm"
        },
        {
            "SurfaceRoughness": { value: 0.92, confidence: 0.92 }
        }
    ));
    graph.addNode(createNode(
        'D-Spar-Cap', 'Spar Cap', '梁缘条', 'part', 'design',
        -350, 400, 0.95,
        {
            "Material": "Ti-6Al-4V",
            "GrainDir": "Longitudinal"
        },
        {
            "GrainStructure": { value: 0.95, confidence: 0.95 }
        }
    ));

    graph.addEdge(createEdge('D-FrontSpar', 'D-Spar-Web', 'structural', 'EBOM'));
    graph.addEdge(createEdge('D-FrontSpar', 'D-Spar-Cap', 'structural', 'EBOM'));

    // Level 4 Nodes (Raw Material / Deepest Level)
    graph.addNode(createNode(
        'D-Raw-Ti', 'Raw Titanium Billet', '钛合金棒材原料', 'part', 'design',
        -50, 800, 0.98, // Raw material is good
        {
            "Supplier": "MetalsInc Global",
            "CertID": "ISO9001-2024-X"
        },
        {
            "PurityLevel": { value: 0.98, confidence: 0.98 },
            "InclusionRate": { value: 0.99, confidence: 0.99 }
        }
    ));

    graph.addEdge(createEdge('D-Fastener', 'D-Raw-Ti', 'structural', 'EBOM')); // Fastener made from Raw Ti


    // =========================================================================
    // TREE 2: MANUFACTURING PROCESS (RIGHT SIDE) - Vertical Hierarchy
    // Context: Manufacturing / MBOM
    // =========================================================================

    // Manufacturing Root
    graph.addNode(createNode(
        'M-Line-Final', 'Wing Final Line', '机翼总装脉动线', 'process', 'manufacturing',
        600, 0, 0.95,
        { "takt_time": "4h", "location": "Hamburg" },
        {
            "LineVelocity": { value: 0.95, confidence: 0.95 },
            "WorkerCert": { value: 0.99, confidence: 0.99 }
        }
    ));

    // Level 1 Process Blocks
    graph.addNode(createNode(
        'M-St-10', 'St 10: Struct Join', '工位10: 结构合拢', 'process', 'manufacturing',
        400, 200, 0.82, // Process efficiency drop
        { "machine": "Auto-Driller", "shift": "Day" },
        { "Calibration": { value: 0.90, confidence: 0.90 } } // Calibration drifted
    ));

    graph.addNode(createNode(
        'M-St-20', 'St 20: Sys Install', '工位20: 系统安装', 'process', 'manufacturing',
        800, 200, 0.94,
        { "hazard": "Flammable" },
        { "SafetyCompliance": { value: 0.94, confidence: 0.94 } }
    ));

    // MBOM Edges
    graph.addEdge(createEdge('M-Line-Final', 'M-St-10', 'structural'));
    graph.addEdge(createEdge('M-Line-Final', 'M-St-20', 'structural'));

    // Level 2 Operations
    graph.addNode(createNode(
        'M-Op-Drill', 'Op 10.1: Drilling', '工序10.1: 钻孔', 'process', 'manufacturing',
        300, 400, 0.98, // New tool bit
        { "rpm": "5000" },
        { "SpindleVibration": { value: 0.98, confidence: 0.98 } }
    ));
    graph.addNode(createNode(
        'M-Op-Bolt', 'Op 10.2: Bolting', '工序10.2: 栓接', 'process', 'manufacturing',
        500, 400, 0.55, // Impacted by Risk Item heavily
        { "torque": "45Nm" },
        {
            "TorqueAccuracy": { value: 0.55, confidence: 0.55 }, // Tool failure or Part defect
            "RobotUpTime": { value: 0.92, confidence: 0.92 }
        }
    ));

    graph.addEdge(createEdge('M-St-10', 'M-Op-Drill', 'structural'));
    graph.addEdge(createEdge('M-St-10', 'M-Op-Bolt', 'structural'));


    // =========================================================================
    // TREE 3: DIGITAL/DOCUMENTATION BOM (FAR RIGHT) - Vertical Hierarchy
    // Context: Digital Twin / DBOM
    // =========================================================================

    // DBOM Root
    graph.addNode(createNode(
        'DB-Model-Root', 'A320 Digital Twin', 'A320 数字孪生模型', 'part', 'support',
        1200, 0, 0.99,
        { "version": "v2.5", "software": "Siemens NX" }
    ));

    // Level 1: Digital Assemblies
    graph.addNode(createNode(
        'DB-Sim-Wing', 'Wing Simulation Model', '机翼仿真模型', 'part', 'support',
        1100, 200, 0.99,
        { "type": "FEM", "mesh_size": "2mm" }
    ));

    graph.addNode(createNode(
        'DB-Doc-Cert', 'Cert Documentation', '适航认证文档', 'part', 'support',
        1300, 200, 0.99,
        { "regulator": "EASA", "status": "Approved" }
    ));

    // DBOM Edges (Vertical)
    graph.addEdge(createEdge('DB-Model-Root', 'DB-Sim-Wing', 'structural', 'DBOM'));
    graph.addEdge(createEdge('DB-Model-Root', 'DB-Doc-Cert', 'structural', 'DBOM'));

    // Level 2: Linked Data
    graph.addNode(createNode(
        'DB-Data-Stress', 'Stress Analysis Rpt', '应力分析报告', 'part', 'support',
        1050, 400, 0.99,
        { "margin_of_safety": "1.5" }
    ));

    graph.addNode(createNode(
        'DB-Doc-Checklist', 'Compliance List', '合规性检查表', 'part', 'support',
        1300, 400, 0.99,
        { "clauses": "25.603" }
    ));

    graph.addEdge(createEdge('DB-Sim-Wing', 'DB-Data-Stress', 'structural', 'DBOM'));
    graph.addEdge(createEdge('DB-Doc-Cert', 'DB-Doc-Checklist', 'structural', 'DBOM'));

    // Level 3: Raw Data Files (Deep DBOM)
    graph.addNode(createNode(
        'DB-File-Mesh', 'mesh_vfinal.inp', '网格源文件', 'part', 'support',
        1000, 600, 0.99,
        { "size": "4GB", "format": "Abaqus" }
    ));
    graph.addNode(createNode(
        'DB-File-Result', 'job_output.odb', '计算结果库', 'part', 'support',
        1150, 600, 0.99,
        { "size": "120GB", "status": "Solv_Ok" }
    ));

    graph.addEdge(createEdge('DB-Data-Stress', 'DB-File-Mesh', 'structural', 'DBOM'));
    graph.addEdge(createEdge('DB-Data-Stress', 'DB-File-Result', 'structural', 'DBOM'));

    // Level 4: Script & Logs (Deepest DBOM)
    graph.addNode(createNode(
        'DB-Log-Run', 'solver_run.log', '求解器日志', 'part', 'support',
        1150, 800, 0.99,
        { "error_count": "3", "wall_time": "14h" }
    ));
    graph.addEdge(createEdge('DB-File-Result', 'DB-Log-Run', 'structural', 'DBOM'));

    // =========================================================================
    // LOGICAL LINKS (HORIZONTAL) - No BOM Definitions
    // =========================================================================

    // 1. Wing Box -> Final Line (Project start dependency)
    graph.addEdge(createEdge('D-WingBox', 'M-Line-Final', 'logical'));

    // 2. Front Spar -> Drilling (Spar is drilled)
    graph.addEdge(createEdge('D-FrontSpar', 'M-Op-Drill', 'logical'));

    // 3. Fastener -> Bolting (Fastener is used in bolting)
    // RISK PROPAGATION PATH
    graph.addEdge(createEdge('D-Fastener', 'M-Op-Bolt', 'logical'));

    // 4. Manufacturing Op -> Digital Simulation (Digital Twin Feedback)
    // The drilling operation feeds data into the Wing Simulation
    graph.addEdge(createEdge('M-Op-Drill', 'DB-Sim-Wing', 'logical'));

    // 5. Physical Wing Box -> Digital Model (Representation)
    graph.addEdge(createEdge('D-WingBox', 'DB-Model-Root', 'logical'));

    return graph;
};
