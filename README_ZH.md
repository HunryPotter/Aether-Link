# Aether Link - 工业数字孪生引擎 (Aether Link)

**Aether Link** 是下一代工业数字孪生可视化与分析平台。它结合了高保真的 3D 拓扑可视化、概率贝叶斯推理以及大语言模型 (LLM) 智能，为复杂的制造系统提供全面的“数字主线 (Digital Thread)”视图。

本项目模拟了一个实时互联的工业环境，其中工程 BOM (EBOM)、制造 BOM (MBOM) 和服务 BOM (SBOM) 之间存在逻辑关联，并持续进行风险和健康置信度分析。

## 🚀 核心功能

### 1. 🌌 **3D 空间拓扑可视化**
*   **力导向神经布局**：使用 ECharts GL 清晰呈现包含数千个节点的独特 3D 结构。
*   **多层级渲染**：视觉上分离设计 (Design)、制造 (Manufacturing) 和支持 (Support) 层级。
*   **数字主线追踪**：可视化跨域逻辑链接（例如，设计变更如何影响制造工具）。
*   **影院级美学**：包含 Bloom/霓虹后期处理和自动旋转相机控制的数字原生设计。
*   **交互式图例**：实时按层级（EBOM/MBOM/SBOM/风险）筛选复杂数据集。

### 2. 🧠 **Aether Linker AI 助手**
*   **语境感知智能**：集成 **DeepSeek LLM**，AI 助手能“看见”您当前的图结构。
*   **工业推理**：支持询问“系统概况”、“优化建议”或“根因分析”。
*   **实时交互**：具备打字机效果和流式响应感的聊天界面。

### 3. 📊 **贝叶斯推理引擎**
*   **概率建模**：内置 `BayesianEngine`，计算每个节点的 `Belief` (置信度/健康度) 分数。
*   **动态模拟**：模拟“活体数字孪生”，每 5 秒进行一次心跳更新，刷新元数据并波动传感器读数。
*   **风险传导**：自动以红色高亮标记低置信度（风险 < 80%）的节点。

### 4. 🛠 **Mock 与管理**
*   **复杂多 BOM 模拟**：生成跨多个领域、深度达 4 层的丰富数据集。
*   **项目持久化**：将图状态保存并加载到本地后端。
*   **元数据丰富**：节点包含详细的工业元数据（扭矩、材料、成本、交付周期等）。

## 🛠 技术栈

**前端 (Frontend):**
*   **React 18** + **TypeScript**
*   **Vite** (构建工具)
*   **Tailwind CSS** (样式 & 玻璃拟态)
*   **ECharts** + **ECharts GL** (3D 可视化)
*   **React Flow** / 自研图引擎 (2D 视图)

**后端 (Backend):**
*   **Node.js** + **Express**
*   **File System Persistence** (基于 JSON 的存储)

**AI & 逻辑:**
*   **DeepSeek API** (LLM 集成)
*   **Custom Bayesian Engine** (概率逻辑)

## 📦 快速开始

### 前置要求
*   Node.js (v16+)
*   npm 或 yarn

### 安装

1.  克隆仓库：
    ```bash
    git clone https://github.com/your-username/aether-link.git
    cd aether-link
    ```

2.  安装依赖：
    ```bash
    npm install
    ```

3.  配置环境：
    在根目录下创建一个 `.env` 文件（参考 `.env.example`），并填入您的 DeepSeek API Key：
    ```env
    DEEPSEEK_API_KEY=your_api_key_here
    ```

### 运行应用

这是一个双进程应用（前端 + 后端）。

1.  **启动后端服务器** (API & AI 网关)：
    ```bash
    npm run server
    ```
    *服务器运行在端口 3001*

2.  **启动前端客户端** (新建一个终端窗口)：
    ```bash
    npm run dev
    ```
    *客户端运行在端口 5173/5174*

3.  在浏览器中打开 `http://localhost:5173` (或终端显示的端口)。

## 📸 使用指南

1.  **仪表盘**：主视图显示 2D 网络图。
2.  **3D 视图**：点击控制面板中的“3D View”按钮，进入沉浸式空间拓扑模式。
3.  **AI 助手**：点击右下角的悬浮球打开 Aether Linker 对话，尝试输入“系统概况”等指令。
4.  **模拟仿真**：注意图表每 5 秒会“呼吸”一次（数值更新）。这模拟了实时数字孪生数据的摄入。

## 📄 许可证

MIT License. 详见 [LICENSE](LICENSE) 文件。
