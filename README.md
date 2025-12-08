### **Project Title: SOTC Hybrid TRPG System Tool (Sword of the Crystalia)**

### **1. Core Concept and Goal**

This project aims to create a **browser-based System Management Tool** for the tabletop RPG **"Sword of the Crystalia (SOTC)"** using **HTML, CSS, and JavaScript**. The ultimate goal is to enable a **hybrid TRPG experience** where a human player uses this tool for accurate system processing while utilizing an **external AI (e.g., Gemini Custom Gem)** as the Game Master (GM) for narrative and descriptive generation. The core function is to ensure **strict adherence to the SOTC Rulebook** for all mechanics, which is currently a weakness of AI-only solutions.

### **2. Key System Features to Implement**

The tool will manage and process all complex game mechanics that are difficult for an AI to handle accurately, focusing on combat and data persistence.

* **Character and Status Management (PC and Party):**
    * Input interface for up to **4 Player Characters (PCs)**, including class-specific stats (HP/SP, Attack/Defense/Spell Modifiers).
    * Real-time tracking of current HP, SP, Gold (Silver, S), and Inventory (Consumables limit of 10).
* **Dice Roll Engine:**
    * A robust function to generate **D6 2-dice rolls** (2D6) and calculate the total plus relevant modifiers.
    * Display the result against the Target Number (TN), which is typically **7**.
* **Structured Monster Data Generation:**
    * Internal database (JSON/JavaScript Array) containing all Monster Templates (Humanoid, Elemental, Unique) and their corresponding stats by Tier (T1-T5).
    * A logic function to generate final monster stats based on **3 elements**: Base Stats, Race Traits, and Rank Enhancement (General, Elite, Boss).
* **Core Combat Logic (Turn-Based Command Battle):**
    * **Initiative Tracker:** Logic to determine the **fixed 2-group combat order** (G1, G2, Rearguard PC, Slow Enemy).
    * **Damage Calculation:** Functions to accurately calculate damage based on **PC Attack Success Value** (TN 10+ / TN 13+ bonuses) and apply **Defense/Damage Reduction** rules (e.g., Armor DMG Reduction, Defense Success Fixed Reduction).

### **3. AI (Gem) Interfacing Protocol**

The primary function of the output is to provide the external AI with clean, structured data for narrative generation, acting as a **persistent external memory** for the Gem.

* **System Data Output:** A dedicated output area that generates a **compact, structured status report** (e.g., in a Markdown format) for easy copy-pasting to the AI GM. This data must include: **Current PC Stats, Dice Roll Results, and the Player's Intended Action.**
* **Log/Memory Buffer:** A persistent area to manually paste and accumulate summarized story logs and NPC information outputted by the AI, compensating for the AI's limited context window.

This tool aims to provide the system's "truth" to the AI, ensuring a smooth and rule-compliant narrative experience.

Log/Memory Buffer: A persistent area to manually paste and accumulate summarized story logs and NPC information outputted by the AI, compensating for the AI's limited context window.

This tool aims to provide the system's "truth" to the AI, ensuring a smooth and rule-compliant narrative experience.
