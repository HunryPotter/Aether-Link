# Aether Link - Industrial Digital Twin Engine (Aether Link)

**Aether Link** is a next-generation Industrial Digital Twin visualization and analysis platform. It combines high-fidelity 3D topology visualization, probabilistic Bayesian reasoning, and Large Language Model (LLM) intelligence to provide a comprehensive "Digital Thread" view of complex manufacturing systems.

This project simulates a real-time connected environment where Engineering BOM (EBOM), Manufacturing BOM (MBOM), and Service BOM (SBOM) are logically linked and continuously analyzed for risk and health confidence.

## 🚀 Key Features

### 1. 🌌 **3D Space Topology Visualization**
*   **Force-Directed Neural Layout**: distinct 3D visualization of thousands of nodes using ECharts GL.
*   **Multi-Layer Rendering**: Visual separation of Design, Manufacturing, and Support layers.
*   **Digital Thread Tracking**: Visualizes logical cross-domain links (e.g., how a design change impacts a manufacturing tool).
*   **Cinematic Aesthetics**: Digital-native design with Bloom/Neon post-processing and auto-rotating camera control.
*   **Interactive Legend**: Filter complex datasets by layer (EBOM/MBOM/SBOM/Risk) in real-time.

### 2. 🧠 **Aether Linker AI Assistant**
*   **Context-Aware Intelligence**: Integrated with **DeepSeek LLM**, the AI assistant "sees" your current graph structure.
*   **Industrial Reasoning**: Ask about "System Summary", "Optimization Suggestions", or "Root Cause Analysis".
*   **Real-time Interaction**: Chat interface with typewriter effects and streaming-like responsiveness.

### 3. 📊 **Bayesian Inference Engine**
*   **Probabilistic Modeling**: Built-in `BayesianEngine` that calculates `Belief` (Confidence/Health) scores for every node.
*   **Dynamic Simulation**: Simulates a "Living Digital Twin" with a 5-second heartbeat that updates metadata and fluctuates sensor readings.
*   **Risk Propagation**: Automatically flags low-confidence nodes (Risk < 80%) visually in red.

### 4. 🛠 **mock & Management**
*   **Complex Multi-BOM Mocking**: Generates rich datasets with up to 4 levels of depth across multiple domains.
*   **Project Persistence**: Save and Load graph states to the local backend.
*   **Metadata Enrichment**: Nodes carry detailed industrial metadata (Torque, Material, Cost, Lead Time, etc.).

## 🛠 Tech Stack

**Frontend:**
*   **React 18** + **TypeScript**
*   **Vite** (Build Tool)
*   **Tailwind CSS** (Styling & Glassmorphism)
*   **ECharts** + **ECharts GL** (3D Visualization)
*   **React Flow** / Custom Graph Engines (2D Views)

**Backend:**
*   **Node.js** + **Express**
*   **File System Persistence** (JSON-based saves)

**AI & Logic:**
*   **DeepSeek API** (LLM Integration)
*   **Custom Bayesian Engine** (Probabilistic Logic)

## 📦 Getting Started

### Prerequisites
*   Node.js (v16+)
*   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/aether-link.git
    cd aether-link
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure Environment:
    Create a `.env` file in the root directory and add your DeepSeek API Key:
    ```env
    DEEPSEEK_API_KEY=your_api_key_here
    ```

### Running the Application

This is a dual-process application (Frontend + Backend).

1.  **Start the Backend Server** (API & AI Gateway):
    ```bash
    npm run server
    ```
    *Server runs on port 3001*

2.  **Start the Frontend Client** (in a new terminal):
    ```bash
    npm run dev
    ```
    *Client runs on port 5173/5174*

3.  Open your browser at `http://localhost:5173` (or the port shown in terminal).

## 📸 Usage Guide

1.  **Dashboard**: The main view shows the 2D network graph.
2.  **3D View**: Click the "3D View" button in the control panel to enter the immersive space topology mode.
3.  **AI Assistant**: Click the floating orb in the bottom-right to open the Aether Linker chat. Try commands like "System Summary".
4.  **Simulation**: Notice the graph breathing (values updating) every 5 seconds. This simulates real-time Digital Twin data ingestion.

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
