# Proposal for New Skills in the Wade Ecosystem

Based on the analysis of the existing project context, repositories, and the user's vision, the following new skills are proposed to be built to create a unified and powerful AI ecosystem.

## 1. `caroline-ai` Skill

**Purpose:** To provide a dedicated interface for interacting with the Caroline AI, managing its state, and facilitating its development.

**Core Workflows:**
- **Send/Receive Messages:** A clear workflow for sending prompts to Caroline and receiving her responses.
- **State Synchronization:** A mechanism to sync the `wade-global-state.json` with Caroline's memory and personality.
- **Personality Management:** Workflows for feeding conversation history and other data into Caroline to evolve her personality.

**Key Resources:**
- `scripts/caroline_bridge.py`: The existing script for communicating with the Caroline AI endpoint.
- `references/caroline_api.md`: Documentation for the Caroline AI API endpoints.

## 2. `neurorank` Skill

**Purpose:** To implement the NeuroRank™ cognitive architecture as a reusable skill.

**Core Workflows:**
- **Decision Making:** A workflow that takes a set of inputs and uses the NeuroRank™ logic to produce a decision.
- **Cognitive Modeling:** A way to define and configure the different cognitive "regions" of the NeuroRank™ system.

**Key Resources:**
- `references/neurorank_architecture.md`: A document detailing the NeuroRank™ architecture, based on the user's design documents.

## 3. `wade-telephony` Skill

**Purpose:** To consolidate all telephony-related projects into a single, unified skill.

**Core Workflows:**
- **AI Receptionist:** A workflow for handling incoming calls, taking messages, and scheduling appointments.
- **Smart In-Call Service:** A workflow for providing in-call assistance and information retrieval.

**Key Resources:**
- `references/telephony_api.md`: Documentation for any telephony-related APIs or services.
- `templates/call_scripts.md`: Templates for common call scenarios.

## 4. `centauri-os` Skill

**Purpose:** To define the interfaces and interactions for the Centauri OS, the user's custom Android OS.

**Core Workflows:**
- **Voice Commands:** A defined set of voice commands and their corresponding actions within the OS.
- **System Integration:** Workflows for how the Caroline AI interacts with the underlying Android system.

**Key Resources:**
- `references/centauri_os_design.md`: A document based on the user's full design proposal.

## 5. `construct-ai` Skill

**Purpose:** To provide a high-level project management and business intelligence skill for the construction business.

**Core Workflows:**
- **Project Dashboard:** A workflow to generate a dashboard summarizing the status of all construction projects.
- **Business Analytics:** A workflow to analyze project data and provide insights into profitability, efficiency, and other key metrics.

**Key Resources:**
- This skill will integrate and orchestrate the `wade-custom-carpentry` and `rsmeans-cost-estimator` skills.
