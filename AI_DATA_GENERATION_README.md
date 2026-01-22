# AI Data Generation Guide for StudyHub

This guide is designed for AI agents to generate compatible data for the StudyHub application. The system ingests data from a specific Excel/JSON schema.

## Schema Overview

The data is organized into several sheets (tables). When generating data, you must maintain referential integrity between these sheets using IDs.

### 1. Subjects
Defines the main subject areas.
*   **Columns**: `subject_id`, `subject_key`, `name`, `icon`, `color_hex`, `light_bg`, `gradient_from`, `gradient_to`, `dark_glow`

### 2. Topics
Lists topics belonging to a subject.
*   **Columns**: `topic_id`, `subject_key`, `topic_name`, `duration_minutes`, `order_index`
*   **Key**: `subject_key` links to Subjects.
*   *Note: Topics do not have direct media URLs. Use Study_Content for media.*

### 3. Topic_Sections
Defines the chapters or sections within a topic.
*   **Columns**: `section_id`, `topic_id`, `section_title`, `section_icon`, `order_index`, `section_type`
*   **Key**: `topic_id` links to Topics.
*   **Types**: `objectives`, `intro`, `content`, `applications`, `quiz`

### 4. Learning_Objectives
Specific goals for a topic.
*   **Columns**: `objective_id`, `topic_id`, `objective_text`, `order_index`

### 5. Key_Terms
Vocabulary words for the topic.
*   **Columns**: `term_id`, `topic_id`, `term`, `definition`

### 6. Study_Content
The actual educational content blocks for a section.
*   **Columns**: `content_id`, `section_id`, `content_type`, `content_title`, `content_text`, `order_index`, `image_url`, `video_url`
*   **Types**: `introduction`, `formula`, `concept_helper`, `warning`, `real_world`, `text`, `video`
*   **Media**:
    *   `image_url`: Displayed as a clickable thumbnail.
    *   `video_url`: Displayed as a text link (title) to the external video.

### 7. Formulas
Mathematical or scientific formulas.
*   **Columns**: `formula_id`, `topic_id`, `formula_text`, `formula_label`, `variable_1_symbol`, `variable_1_name`, `variable_1_unit`, ... (up to 5 vars)

### 8. Quiz_Questions
Multiple choice questions.
*   **Columns**: `question_id`, `topic_id`, `question_text`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_answer` (A/B/C/D), `explanation`, `xp_reward`

## Valid Values

### Icons (Lucide React names)
`Zap`, `Calculator`, `FlaskConical`, `Leaf`, `Trophy`, `Star`, `Award`, `Flame`, `HelpCircle`, `CheckCircle2`, `Target`, `BookOpen`, `FileText`, `Clock`, `Globe`, `Lightbulb`, `AlertTriangle`, `Atom`, `Microscope`, `Dna`, 'Pi`, `Hammer`, `RefreshCw`, `Minimize2`, `Triangle`, `Disc`, `Grid`, `ArrowDown`, `Link`, `GitCommit`, `Circle`, `GitBranch`, `Share2`

### Content Types
`introduction`, `formula`, `concept_helper`, `warning`, `real_world`, `text`, `video`

## Generation Instructions

1.  **Define IDs First**: Create unique IDs for subjects, topics, and sections (e.g., `subj-01`, `top-01`, `sec-01`).
2.  **Maintain Hierarchy**: Ensure every Content item points to a valid Section, every Section points to a valid Topic, and every Topic points to a valid Subject.
3.  **Rich Media**: Include `image_url` for visual concepts. Include `video_url` for deeper explanations (e.g., YouTube links).
4.  **Formatting**:
    *   Formulas should be LaTeX compatible if complex, or standard text.
    *   Content text can include basic markdown-like formatting if supported by the frontend renderer (mostly plain text currently).
