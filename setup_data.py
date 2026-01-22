#!/usr/bin/env python3
"""
StudyHub Data Setup Script
==========================

This script helps you:
1. Create a properly formatted Google Sheet from the Excel template
2. Convert existing data to the required format
3. Validate your data structure
4. Generate sample data for testing

Usage:
    python setup_data.py --help
    python setup_data.py create-sample
    python setup_data.py validate path/to/data.xlsx
    python setup_data.py export-json path/to/data.xlsx
"""

import json
import os
import sys
from datetime import datetime

# Check for required packages
try:
    import pandas as pd
    from openpyxl import Workbook, load_workbook
    from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
except ImportError:
    print("Installing required packages...")
    os.system(f"{sys.executable} -m pip install pandas openpyxl --break-system-packages")
    import pandas as pd
    from openpyxl import Workbook, load_workbook
    from openpyxl.styles import Font, PatternFill, Border, Side, Alignment


# ============================================================================
# DATA STRUCTURE DEFINITIONS
# ============================================================================

SHEET_SCHEMAS = {
    'Subjects': {
        'columns': ['subject_id', 'subject_key', 'name', 'icon', 'color_hex', 'light_bg', 'gradient_from', 'gradient_to', 'dark_glow'],
        'required': ['subject_id', 'subject_key', 'name'],
        'description': 'Define subjects with their visual styling'
    },
    'Topics': {
        'columns': ['topic_id', 'subject_key', 'topic_name', 'duration_minutes', 'order_index'],
        'required': ['topic_id', 'subject_key', 'topic_name'],
        'description': 'List all topics per subject'
    },
    'Topic_Sections': {
        'columns': ['section_id', 'topic_id', 'section_title', 'section_icon', 'order_index', 'section_type'],
        'required': ['section_id', 'topic_id', 'section_title'],
        'description': 'Define sections/chapters within each topic'
    },
    'Learning_Objectives': {
        'columns': ['objective_id', 'topic_id', 'objective_text', 'order_index'],
        'required': ['objective_id', 'topic_id', 'objective_text'],
        'description': 'Learning objectives for each topic'
    },
    'Key_Terms': {
        'columns': ['term_id', 'topic_id', 'term', 'definition'],
        'required': ['term_id', 'topic_id', 'term', 'definition'],
        'description': 'Vocabulary terms and definitions'
    },
    'Study_Content': {
        'columns': ['content_id', 'section_id', 'content_type', 'content_title', 'content_text', 'order_index', 'image_url', 'video_url'],
        'required': ['content_id', 'section_id', 'content_type', 'content_text'],
        'description': 'Main educational content blocks'
    },
    'Formulas': {
        'columns': ['formula_id', 'topic_id', 'formula_text', 'formula_label', 
                   'variable_1_symbol', 'variable_1_name', 'variable_1_unit',
                   'variable_2_symbol', 'variable_2_name', 'variable_2_unit',
                   'variable_3_symbol', 'variable_3_name', 'variable_3_unit'],
        'required': ['formula_id', 'topic_id', 'formula_text'],
        'description': 'Mathematical/scientific formulas'
    },
    'Quiz_Questions': {
        'columns': ['question_id', 'topic_id', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d', 
                   'correct_answer', 'explanation', 'xp_reward'],
        'required': ['question_id', 'topic_id', 'question_text', 'option_a', 'option_b', 'correct_answer'],
        'description': 'Multiple choice quiz questions'
    },
    'Achievements': {
        'columns': ['achievement_id', 'icon', 'name', 'description', 'unlock_condition'],
        'required': ['achievement_id', 'name', 'description'],
        'description': 'Gamification badges and achievements'
    }
}

CONTENT_TYPES = ['introduction', 'formula', 'concept_helper', 'warning', 'real_world', 'text', 'video', 'image', 'flowchart']
SECTION_TYPES = ['objectives', 'intro', 'content', 'applications', 'quiz']
VALID_ICONS = ['Zap', 'Calculator', 'FlaskConical', 'Leaf', 'Trophy', 'Star', 'Award', 'Flame',
               'HelpCircle', 'CheckCircle2', 'Target', 'BookOpen', 'FileText', 'Clock', 'Globe',
               'Lightbulb', 'AlertTriangle', 'Atom', 'Microscope', 'Dna', 'Pi', 'Hammer', 'RefreshCw',
               'Minimize2', 'Triangle', 'Disc', 'Grid', 'ArrowDown', 'Link', 'GitCommit', 'Circle',
               'GitBranch', 'Share2']


# ============================================================================
# SAMPLE DATA
# ============================================================================

SAMPLE_DATA = {
    'Subjects': [
        {'subject_id': 'phys-001', 'subject_key': 'physics', 'name': 'Physics', 'icon': 'Zap', 
         'color_hex': '#3B82F6', 'light_bg': 'bg-blue-50', 'gradient_from': 'blue-500', 
         'gradient_to': 'blue-600', 'dark_glow': 'shadow-blue-500/20'},
        {'subject_id': 'math-001', 'subject_key': 'math', 'name': 'Mathematics', 'icon': 'Calculator',
         'color_hex': '#10B981', 'light_bg': 'bg-emerald-50', 'gradient_from': 'emerald-500',
         'gradient_to': 'emerald-600', 'dark_glow': 'shadow-emerald-500/20'},
        {'subject_id': 'chem-001', 'subject_key': 'chemistry', 'name': 'Chemistry', 'icon': 'FlaskConical',
         'color_hex': '#F59E0B', 'light_bg': 'bg-amber-50', 'gradient_from': 'amber-500',
         'gradient_to': 'amber-600', 'dark_glow': 'shadow-amber-500/20'},
        {'subject_id': 'bio-001', 'subject_key': 'biology', 'name': 'Biology', 'icon': 'Leaf',
         'color_hex': '#8B5CF6', 'light_bg': 'bg-violet-50', 'gradient_from': 'violet-500',
         'gradient_to': 'violet-600', 'dark_glow': 'shadow-violet-500/20'},
    ],
    'Topics': [
        # PHYSICS
        {'topic_id': 'phys-t1', 'subject_key': 'physics', 'topic_name': "Newton's Laws", 'duration_minutes': 30, 'order_index': 1},
        {'topic_id': 'phys-t2', 'subject_key': 'physics', 'topic_name': 'Work & Energy', 'duration_minutes': 45, 'order_index': 2},
        {'topic_id': 'phys-t3', 'subject_key': 'physics', 'topic_name': 'Electricity', 'duration_minutes': 40, 'order_index': 3},

        # MATH
        {'topic_id': 'math-t1', 'subject_key': 'math', 'topic_name': 'Algebraic Expressions', 'duration_minutes': 35, 'order_index': 1},
        {'topic_id': 'math-t2', 'subject_key': 'math', 'topic_name': 'Geometry: Triangles', 'duration_minutes': 30, 'order_index': 2},
        {'topic_id': 'math-t3', 'subject_key': 'math', 'topic_name': 'Probability', 'duration_minutes': 25, 'order_index': 3},

        # CHEMISTRY
        {'topic_id': 'chem-t1', 'subject_key': 'chemistry', 'topic_name': 'Atomic Structure', 'duration_minutes': 40, 'order_index': 1},
        {'topic_id': 'chem-t2', 'subject_key': 'chemistry', 'topic_name': 'The Periodic Table', 'duration_minutes': 35, 'order_index': 2},
        {'topic_id': 'chem-t3', 'subject_key': 'chemistry', 'topic_name': 'Chemical Bonding', 'duration_minutes': 45, 'order_index': 3},

        # BIOLOGY
        {'topic_id': 'bio-t1', 'subject_key': 'biology', 'topic_name': 'Cell Biology', 'duration_minutes': 30, 'order_index': 1},
        {'topic_id': 'bio-t2', 'subject_key': 'biology', 'topic_name': 'Genetics & DNA', 'duration_minutes': 40, 'order_index': 2},
        {'topic_id': 'bio-t3', 'subject_key': 'biology', 'topic_name': 'Ecosystems', 'duration_minutes': 35, 'order_index': 3},
    ],
    'Topic_Sections': [],
    'Learning_Objectives': [],
    'Key_Terms': [],
    'Study_Content': [],
    'Formulas': [],
    'Quiz_Questions': [],
    'Achievements': [
        {'achievement_id': 'first-login', 'icon': 'Zap', 'name': 'First Login', 'description': 'Welcome to StudyHub!', 'unlock_condition': 'Login for the first time'},
        {'achievement_id': 'first-quiz', 'icon': 'HelpCircle', 'name': 'First Quiz', 'description': 'Complete your first quiz', 'unlock_condition': 'Complete any quiz'},
        {'achievement_id': 'streak-5', 'icon': 'Flame', 'name': '5-Day Streak', 'description': 'Study 5 days in a row', 'unlock_condition': 'streak >= 5'},
        {'achievement_id': 'streak-10', 'icon': 'Flame', 'name': '10-Day Streak', 'description': 'Study 10 days in a row', 'unlock_condition': 'streak >= 10'},
        {'achievement_id': 'topic-complete', 'icon': 'CheckCircle2', 'name': 'Topic Master', 'description': 'Complete any topic', 'unlock_condition': 'Any topic progress = 100'},
        {'achievement_id': 'subject-50', 'icon': 'Trophy', 'name': 'Halfway There', 'description': '50% in any subject', 'unlock_condition': 'Any subject progress >= 50'},
        {'achievement_id': 'perfect-quiz', 'icon': 'Star', 'name': 'Perfect Score', 'description': 'Score 100% on a quiz', 'unlock_condition': 'Any quiz score = 100'},
        {'achievement_id': 'all-subjects', 'icon': 'Award', 'name': 'Well Rounded', 'description': 'Study all 4 subjects', 'unlock_condition': 'All subjects accessed'},
    ]
}

# Helper to add a topic's data
def add_topic_data(topic_id, sections, objectives, terms, content, formulas, questions):
    # Add sections
    for i, section in enumerate(sections, 1):
        SAMPLE_DATA['Topic_Sections'].append({
            'section_id': f"{topic_id}-s{i}",
            'topic_id': topic_id,
            'section_title': section['title'],
            'section_icon': section.get('icon', 'FileText'),
            'order_index': i,
            'section_type': section.get('type', 'content')
        })

    # Add objectives
    for i, obj in enumerate(objectives, 1):
        SAMPLE_DATA['Learning_Objectives'].append({
            'objective_id': f"obj-{topic_id}-{i}",
            'topic_id': topic_id,
            'objective_text': obj,
            'order_index': i
        })

    # Add key terms
    for i, term in enumerate(terms, 1):
        SAMPLE_DATA['Key_Terms'].append({
            'term_id': f"term-{topic_id}-{i}",
            'topic_id': topic_id,
            'term': term['term'],
            'definition': term['def']
        })

    # Add content
    for c in content:
        SAMPLE_DATA['Study_Content'].append({
            'content_id': f"cont-{topic_id}-{len(SAMPLE_DATA['Study_Content'])+1}",
            'section_id': f"{topic_id}-s{c['sec_idx']}",
            'content_type': c['type'],
            'content_title': c.get('title', ''),
            'content_text': c['text'],
            'order_index': c.get('order', 1),
            'image_url': c.get('image_url', ''),
            'video_url': c.get('video_url', '')
        })

    # Add formulas
    for i, f in enumerate(formulas, 1):
        SAMPLE_DATA['Formulas'].append({
            'formula_id': f"form-{topic_id}-{i}",
            'topic_id': topic_id,
            'formula_text': f['text'],
            'formula_label': f['label'],
            'variable_1_symbol': f.get('v1s', ''), 'variable_1_name': f.get('v1n', ''), 'variable_1_unit': f.get('v1u', ''),
            'variable_2_symbol': f.get('v2s', ''), 'variable_2_name': f.get('v2n', ''), 'variable_2_unit': f.get('v2u', ''),
            'variable_3_symbol': f.get('v3s', ''), 'variable_3_name': f.get('v3n', ''), 'variable_3_unit': f.get('v3u', ''),
        })

    # Add quizzes
    for i, q in enumerate(questions, 1):
        SAMPLE_DATA['Quiz_Questions'].append({
            'question_id': f"quiz-{topic_id}-{i}",
            'topic_id': topic_id,
            'question_text': q['text'],
            'option_a': q['a'], 'option_b': q['b'], 'option_c': q['c'], 'option_d': q['d'],
            'correct_answer': q['ans'],
            'explanation': q['exp'],
            'xp_reward': 10
        })

# ==========================================
# POPULATE DETAILED CONTENT
# ==========================================

# 1. PHYSICS - Newton's Laws
add_topic_data('phys-t1',
    sections=[
        {'title': 'Objectives', 'icon': 'Target', 'type': 'objectives'},
        {'title': 'Introduction', 'icon': 'BookOpen', 'type': 'intro'},
        {'title': 'First Law (Inertia)', 'icon': 'Zap', 'type': 'content'},
        {'title': 'Second Law (F=ma)', 'icon': 'Calculator', 'type': 'content'},
        {'title': 'Third Law (Action-Reaction)', 'icon': 'Zap', 'type': 'content'},
        {'title': 'Assessment', 'icon': 'HelpCircle', 'type': 'quiz'}
    ],
    objectives=['Define inertia and its relationship to mass', 'Apply F=ma to solve problems', 'Identify action-reaction pairs'],
    terms=[
        {'term': 'Inertia', 'def': 'Resistance of any physical object to any change in its velocity'},
        {'term': 'Force', 'def': 'A push or pull upon an object resulting from interaction with another object'},
        {'term': 'Mass', 'def': 'A measure of the amount of matter in an object'}
    ],
    content=[
        {'sec_idx': 2, 'type': 'introduction', 'title': 'The Foundations of Dynamics', 'text': "Isaac Newton's three laws of motion describe the relationship between the motion of an object and the forces acting on it.", 'image_url': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800'},
        {'sec_idx': 3, 'type': 'concept_helper', 'title': 'Law of Inertia', 'text': 'An object at rest stays at rest and an object in motion stays in motion unless acted upon by an unbalanced force.'},
        {'sec_idx': 3, 'type': 'real_world', 'title': 'Seatbelts', 'text': 'When a car stops suddenly, your body keeps moving forward due to inertia. Seatbelts provide the unbalanced force to stop you.'},
        {'sec_idx': 4, 'type': 'formula', 'title': 'The Equation', 'text': 'F = ma'},
        {'sec_idx': 4, 'type': 'text', 'title': 'Explanation', 'text': 'Force equals mass times acceleration. The more mass an object has, the more force is needed to accelerate it.'},
        {'sec_idx': 5, 'type': 'text', 'title': 'Symmetry in Forces', 'text': 'For every action, there is an equal and opposite reaction. Forces always come in pairs.'},
        {'sec_idx': 5, 'type': 'warning', 'title': 'Common Mistake', 'text': 'Action and reaction forces act on DIFFERENT objects, so they do not cancel each other out!'}
    ],
    formulas=[
        {'text': 'F = m \\cdot a', 'label': "Newton's Second Law", 'v1s': 'F', 'v1n': 'Force', 'v1u': 'N', 'v2s': 'm', 'v2n': 'Mass', 'v2u': 'kg', 'v3s': 'a', 'v3n': 'Acceleration', 'v3u': 'm/s²'}
    ],
    questions=[
        {'text': 'Which property of an object determines its inertia?', 'a': 'Volume', 'b': 'Mass', 'c': 'Weight', 'd': 'Velocity', 'ans': 'B', 'exp': 'Mass is a direct measure of inertia.'},
        {'text': 'If you double the force on an object, what happens to its acceleration?', 'a': 'Doubles', 'b': 'Halves', 'c': 'Quadruples', 'd': 'Stays same', 'ans': 'A', 'exp': 'Acceleration is directly proportional to force (F=ma).'}
    ]
)

# 2. PHYSICS - Work & Energy
add_topic_data('phys-t2',
    sections=[
        {'title': 'Objectives', 'icon': 'Target', 'type': 'objectives'},
        {'title': 'Work', 'icon': 'Hammer', 'type': 'content'},
        {'title': 'Energy Types', 'icon': 'Zap', 'type': 'content'},
        {'title': 'Conservation', 'icon': 'RefreshCw', 'type': 'content'},
        {'title': 'Quiz', 'icon': 'HelpCircle', 'type': 'quiz'}
    ],
    objectives=['Define Work in physics', 'Distinguish between kinetic and potential energy', 'Apply conservation of energy principle'],
    terms=[
        {'term': 'Work', 'def': 'Force applied over a distance (Joules)'},
        {'term': 'Kinetic Energy', 'def': 'Energy of motion'},
        {'term': 'Potential Energy', 'def': 'Stored energy due to position or state'}
    ],
    content=[
        {'sec_idx': 2, 'type': 'introduction', 'title': 'Physics Definition of Work', 'text': 'In physics, work is done only when a force moves an object. Pushing a wall and not moving it means zero work is done!', 'image_url': 'https://images.unsplash.com/photo-1516937941348-c096b542b9c9?w=800'},
        {'sec_idx': 2, 'type': 'formula', 'title': 'Work Formula', 'text': 'W = F \\cdot d'},
        {'sec_idx': 3, 'type': 'text', 'title': 'Kinetic vs Potential', 'text': 'A roller coaster at the top has high Potential Energy. As it falls, it converts to Kinetic Energy.'},
        {'sec_idx': 3, 'type': 'video', 'title': 'Roller Coaster Physics', 'text': 'Watch how energy transforms.', 'video_url': 'https://www.youtube.com/watch?v=Jnj8mc04r9E'},
        {'sec_idx': 4, 'type': 'concept_helper', 'title': 'Law of Conservation', 'text': 'Energy cannot be created or destroyed, only transformed.'},
        {'sec_idx': 4, 'type': 'flowchart', 'title': 'Energy Transformation', 'text': 'Visualizing how Potential Energy converts to Kinetic Energy.', 'image_url': 'https://mermaid.ink/img/pako:eNpVkMtqwzAQRX9FzKqF_IAeCqWbQsFQAqG7tciyxBZiS0ZSCyX_Xsdf4tJldTPn3DszGtToFCpoeD3pW_QeXwZ0h8-z_sQ12p05sB_tQ4B794dY6_tHj9F59GfW_4E-sB-sO9Z_sBfsC_vAPrAf7IA11v2wF-wL-8A-sB_s4J-x0k5bCg0ZylJyoOQYpZJMy5qrpRCSk0pWUp5S8oOQnJSkC_lLyU_2z7-Xw6GgUCqVbLhQ0pCpkHJYl0qJ4uO6Ff_2B2HqSgM?type=png'}
    ],
    formulas=[
        {'text': 'W = F \\cdot d', 'label': 'Work', 'v1s': 'W', 'v1n': 'Work', 'v1u': 'J', 'v2s': 'F', 'v2n': 'Force', 'v2u': 'N', 'v3s': 'd', 'v3n': 'Distance', 'v3u': 'm'},
        {'text': 'KE = \\frac{1}{2}mv^2', 'label': 'Kinetic Energy', 'v1s': 'KE', 'v1n': 'Energy', 'v1u': 'J', 'v2s': 'm', 'v2n': 'Mass', 'v2u': 'kg', 'v3s': 'v', 'v3n': 'Velocity', 'v3u': 'm/s'},
        {'text': 'PE_g = mgh', 'label': 'Gravitational Potential Energy', 'v1s': 'PE', 'v1n': 'Potential Energy', 'v1u': 'J', 'v2s': 'm', 'v2n': 'Mass', 'v2u': 'kg', 'v3s': 'h', 'v3n': 'Height', 'v3u': 'm'}
    ],
    questions=[
        {'text': 'What is the unit for Work?', 'a': 'Newton', 'b': 'Watt', 'c': 'Joule', 'd': 'Meter', 'ans': 'C', 'exp': 'Work is measured in Joules (N·m).'},
        {'text': 'A ball held 2m high has what type of energy?', 'a': 'Kinetic', 'b': 'Gravitational Potential', 'c': 'Elastic', 'd': 'Thermal', 'ans': 'B', 'exp': 'It has potential due to gravity.'}
    ]
)

# 3. PHYSICS - Electricity
add_topic_data('phys-t3',
    sections=[
        {'title': 'Objectives', 'icon': 'Target', 'type': 'objectives'},
        {'title': 'Circuits', 'icon': 'Zap', 'type': 'content'},
        {'title': "Ohm's Law", 'icon': 'Calculator', 'type': 'content'},
        {'title': 'Quiz', 'icon': 'HelpCircle', 'type': 'quiz'}
    ],
    objectives=['Understand circuit components', "Calculate using Ohm's Law"],
    terms=[
        {'term': 'Voltage', 'def': 'Electrical potential difference (Volts)'},
        {'term': 'Current', 'def': 'Flow of electric charge (Amps)'},
        {'term': 'Resistance', 'def': 'Opposition to current flow (Ohms)'}
    ],
    content=[
        {'sec_idx': 2, 'type': 'introduction', 'title': 'Electric Circuits', 'text': 'A closed loop that allows current to flow. Requires a source (battery), load (bulb), and wires.', 'image_url': 'https://images.unsplash.com/photo-1549419163-e380e22784cb?w=800'},
        {'sec_idx': 3, 'type': 'formula', 'title': "Ohm's Law", 'text': 'V = I \\cdot R'},
        {'sec_idx': 3, 'type': 'real_world', 'title': 'Resistors', 'text': 'Electronics use resistors to control current so delicate components don\'t burn out.'}
    ],
    formulas=[
        {'text': 'V = I \\cdot R', 'label': "Ohm's Law", 'v1s': 'V', 'v1n': 'Voltage', 'v1u': 'V', 'v2s': 'I', 'v2n': 'Current', 'v2u': 'A', 'v3s': 'R', 'v3n': 'Resistance', 'v3u': 'Ω'}
    ],
    questions=[
        {'text': 'What flows in a circuit?', 'a': 'Protons', 'b': 'Neutrons', 'c': 'Electrons', 'd': 'Atoms', 'ans': 'C', 'exp': 'Current is the flow of electrons.'}
    ]
)

# 4. MATH - Algebraic Expressions
add_topic_data('math-t1',
    sections=[
        {'title': 'Objectives', 'icon': 'Target', 'type': 'objectives'},
        {'title': 'Basics', 'icon': 'BookOpen', 'type': 'content'},
        {'title': 'Simplifying', 'icon': 'Minimize2', 'type': 'content'},
        {'title': 'Quiz', 'icon': 'HelpCircle', 'type': 'quiz'}
    ],
    objectives=['Identify variables and coefficients', 'Simplify like terms'],
    terms=[
        {'term': 'Variable', 'def': 'A letter representing an unknown number'},
        {'term': 'Coefficient', 'def': 'Number multiplying a variable'}
    ],
    content=[
        {'sec_idx': 2, 'type': 'text', 'title': 'What is Algebra?', 'text': 'Algebra is generalized arithmetic. We use letters to represent numbers we don\'t know yet.'},
        {'sec_idx': 3, 'type': 'concept_helper', 'title': 'Like Terms', 'text': 'You can only add terms if they have the same variable part. 2x + 3x = 5x, but 2x + 3y cannot be combined.'},
        {'sec_idx': 3, 'type': 'warning', 'title': 'Watch the powers', 'text': 'x and x² are NOT like terms!'}
    ],
    formulas=[],
    questions=[
        {'text': 'Simplify: 3x + 4y - x', 'a': '7xy', 'b': '2x + 4y', 'c': '6xy', 'd': '3x + 3y', 'ans': 'B', 'exp': 'Combine 3x and -x to get 2x. 4y stays separate.'}
    ]
)

# 5. MATH - Geometry: Triangles
add_topic_data('math-t2',
    sections=[
        {'title': 'Objectives', 'icon': 'Target', 'type': 'objectives'},
        {'title': 'Types', 'icon': 'Triangle', 'type': 'content'},
        {'title': 'Pythagoras', 'icon': 'Calculator', 'type': 'content'},
        {'title': 'Quiz', 'icon': 'HelpCircle', 'type': 'quiz'}
    ],
    objectives=['Classify triangles', 'Use Pythagorean theorem'],
    terms=[
        {'term': 'Hypotenuse', 'def': 'Longest side of a right triangle'},
        {'term': 'Isosceles', 'def': 'Triangle with 2 equal sides'}
    ],
    content=[
        {'sec_idx': 2, 'type': 'introduction', 'title': 'Triangle Types', 'text': 'Triangles can be classified by sides (equilateral, isosceles, scalene) or angles (acute, obtuse, right).', 'image_url': 'https://images.unsplash.com/photo-1616469829941-c7200ed5dabd?w=800'},
        {'sec_idx': 3, 'type': 'formula', 'title': 'Pythagorean Theorem', 'text': 'a^2 + b^2 = c^2'},
        {'sec_idx': 3, 'type': 'text', 'title': 'Usage', 'text': 'Used to find a missing side in a right-angled triangle.'}
    ],
    formulas=[
        {'text': 'a^2 + b^2 = c^2', 'label': 'Pythagorean Theorem', 'v1s': 'c', 'v1n': 'Hypotenuse', 'v1u': '', 'v2s': 'a', 'v2n': 'Side A', 'v2u': '', 'v3s': 'b', 'v3n': 'Side B', 'v3u': ''}
    ],
    questions=[
        {'text': 'Which triangle has all equal sides?', 'a': 'Isosceles', 'b': 'Scalene', 'c': 'Equilateral', 'd': 'Right', 'ans': 'C', 'exp': 'Equi-lateral means equal sides.'}
    ]
)

# 6. MATH - Probability
add_topic_data('math-t3',
    sections=[
        {'title': 'Objectives', 'icon': 'Target', 'type': 'objectives'},
        {'title': 'Chance', 'icon': 'HelpCircle', 'type': 'content'},
        {'title': 'Calculating', 'icon': 'Calculator', 'type': 'content'},
        {'title': 'Quiz', 'icon': 'HelpCircle', 'type': 'quiz'}
    ],
    objectives=['Understand probability scale', 'Calculate simple probabilities'],
    terms=[
        {'term': 'Event', 'def': 'An outcome or set of outcomes'},
        {'term': 'Sample Space', 'def': 'Set of all possible outcomes'}
    ],
    content=[
        {'sec_idx': 2, 'type': 'text', 'title': 'The Scale', 'text': 'Probability ranges from 0 (Impossible) to 1 (Certain).'},
        {'sec_idx': 3, 'type': 'formula', 'title': 'Basic Probability', 'text': 'P(A) = \\frac{\\text{favorable outcomes}}{\\text{total outcomes}}'},
        {'sec_idx': 3, 'type': 'real_world', 'title': 'Dice', 'text': 'Rolling a 6 on a standard die has a 1/6 chance.', 'image_url': 'https://images.unsplash.com/photo-1595113316349-9fa4eb24f884?w=800'}
    ],
    formulas=[
        {'text': 'P(A) = \\frac{n(A)}{n(S)}', 'label': 'Probability', 'v1s': 'P', 'v1n': 'Probability', 'v1u': '', 'v2s': 'n(A)', 'v2n': 'Favorable', 'v2u': '', 'v3s': 'n(S)', 'v3n': 'Total', 'v3u': ''}
    ],
    questions=[
        {'text': 'Probability of flipping heads?', 'a': '0.25', 'b': '0.5', 'c': '0.75', 'd': '1.0', 'ans': 'B', 'exp': '1 favorable (heads) / 2 total (heads, tails) = 0.5'}
    ]
)

# 7. CHEMISTRY - Atomic Structure
add_topic_data('chem-t1',
    sections=[
        {'title': 'Objectives', 'icon': 'Target', 'type': 'objectives'},
        {'title': 'The Atom', 'icon': 'Atom', 'type': 'content'},
        {'title': 'Subatomic Particles', 'icon': 'Disc', 'type': 'content'},
        {'title': 'Quiz', 'icon': 'HelpCircle', 'type': 'quiz'}
    ],
    objectives=['Describe the structure of an atom', 'Identify protons, neutrons, electrons'],
    terms=[
        {'term': 'Nucleus', 'def': 'Central part of atom containing protons/neutrons'},
        {'term': 'Electron Shell', 'def': 'Region where electrons orbit'}
    ],
    content=[
        {'sec_idx': 2, 'type': 'introduction', 'title': 'Building Blocks', 'text': 'All matter is made of atoms. They are the smallest unit of an element.', 'image_url': 'https://images.unsplash.com/photo-1614730341194-75c60740a070?w=800'},
        {'sec_idx': 3, 'type': 'text', 'title': 'Inside the Atom', 'text': 'Protons (+ charge) and Neutrons (no charge) are in the center. Electrons (- charge) zoom around the outside.'},
        {'sec_idx': 3, 'type': 'video', 'title': 'Atomic Model', 'text': 'Visualizing the atom.', 'video_url': 'https://www.youtube.com/watch?v=IO9WS_HNmyg'}
    ],
    formulas=[],
    questions=[
        {'text': 'Which particle has a positive charge?', 'a': 'Electron', 'b': 'Neutron', 'c': 'Proton', 'd': 'Photon', 'ans': 'C', 'exp': 'Protons are positive (+)'}
    ]
)

# 8. CHEMISTRY - Periodic Table
add_topic_data('chem-t2',
    sections=[
        {'title': 'Objectives', 'icon': 'Target', 'type': 'objectives'},
        {'title': 'Organization', 'icon': 'Grid', 'type': 'content'},
        {'title': 'Groups & Periods', 'icon': 'ArrowDown', 'type': 'content'},
        {'title': 'Quiz', 'icon': 'HelpCircle', 'type': 'quiz'}
    ],
    objectives=['Read the Periodic Table', 'Understand Groups and Periods'],
    terms=[
        {'term': 'Atomic Number', 'def': 'Number of protons in an atom'},
        {'term': 'Element', 'def': 'Pure substance of one type of atom'}
    ],
    content=[
        {'sec_idx': 2, 'type': 'introduction', 'title': 'The Map of Elements', 'text': 'The periodic table organizes all known elements by atomic number and chemical properties.', 'image_url': 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=800'},
        {'sec_idx': 3, 'type': 'concept_helper', 'title': 'Navigation', 'text': 'Columns are called Groups (elements behave similarly). Rows are called Periods.'},
        {'sec_idx': 3, 'type': 'real_world', 'title': 'Noble Gases', 'text': 'Group 18 elements are "Noble Gases" - they are very stable and don\'t like to react (like Neon signs).'}
    ],
    formulas=[],
    questions=[
        {'text': 'Elements in the same column usually have...', 'a': 'Same mass', 'b': 'Similar properties', 'c': 'Same atomic number', 'd': 'Different states', 'ans': 'B', 'exp': 'Groups (columns) share chemical properties.'}
    ]
)

# 9. CHEMISTRY - Bonding
add_topic_data('chem-t3',
    sections=[
        {'title': 'Objectives', 'icon': 'Target', 'type': 'objectives'},
        {'title': 'Why Bond?', 'icon': 'Link', 'type': 'content'},
        {'title': 'Ionic vs Covalent', 'icon': 'GitCommit', 'type': 'content'},
        {'title': 'Quiz', 'icon': 'HelpCircle', 'type': 'quiz'}
    ],
    objectives=['Explain why atoms bond', 'Distinguish ionic and covalent bonds'],
    terms=[
        {'term': 'Ion', 'def': 'Atom with a charge (lost or gained electrons)'},
        {'term': 'Molecule', 'def': 'Group of atoms bonded together'}
    ],
    content=[
        {'sec_idx': 2, 'type': 'text', 'title': 'Stability', 'text': 'Atoms bond to become stable, usually by getting a full outer shell of electrons.'},
        {'sec_idx': 3, 'type': 'text', 'title': 'Ionic Bonding', 'text': 'One atom STEALS electrons from another. Creates + and - ions that attract.'},
        {'sec_idx': 3, 'type': 'text', 'title': 'Covalent Bonding', 'text': 'Atoms SHARE electrons. Like two people holding hands.', 'image_url': 'https://images.unsplash.com/photo-1532634993-15f421e42ec0?w=800'}
    ],
    formulas=[],
    questions=[
        {'text': 'In a covalent bond, electrons are...', 'a': 'Transferred', 'b': 'Destroyed', 'c': 'Shared', 'd': 'Doubled', 'ans': 'C', 'exp': 'Co-valent means sharing valence electrons.'}
    ]
)

# 10. BIOLOGY - Cell Structure
add_topic_data('bio-t1',
    sections=[
        {'title': 'Objectives', 'icon': 'Target', 'type': 'objectives'},
        {'title': 'Cell Theory', 'icon': 'BookOpen', 'type': 'content'},
        {'title': 'Organelles', 'icon': 'Circle', 'type': 'content'},
        {'title': 'Quiz', 'icon': 'HelpCircle', 'type': 'quiz'}
    ],
    objectives=['State Cell Theory', 'Identify function of nucleus, mitochondria, cell membrane'],
    terms=[
        {'term': 'Organelle', 'def': 'Specialized structure within a cell'},
        {'term': 'Prokaryote', 'def': 'Simple cell without nucleus (bacteria)'}
    ],
    content=[
        {'sec_idx': 2, 'type': 'introduction', 'title': 'Unit of Life', 'text': 'Cells are the basic structural and functional units of life.', 'image_url': 'https://images.unsplash.com/photo-1530210124550-912dc1381cb8?w=800'},
        {'sec_idx': 3, 'type': 'text', 'title': 'Mitochondria', 'text': 'The POWERHOUSE of the cell. Generates energy (ATP).'},
        {'sec_idx': 3, 'type': 'text', 'title': 'Nucleus', 'text': 'The BRAIN. Contains DNA and controls cell activity.'}
    ],
    formulas=[],
    questions=[
        {'text': 'Which organelle produces energy?', 'a': 'Ribosome', 'b': 'Nucleus', 'c': 'Mitochondria', 'd': 'Vacuole', 'ans': 'C', 'exp': 'Mitochondria perform cellular respiration to make ATP.'}
    ]
)

# 11. BIOLOGY - Genetics
add_topic_data('bio-t2',
    sections=[
        {'title': 'Objectives', 'icon': 'Target', 'type': 'objectives'},
        {'title': 'DNA', 'icon': 'Dna', 'type': 'content'},
        {'title': 'Heredity', 'icon': 'GitBranch', 'type': 'content'},
        {'title': 'Quiz', 'icon': 'HelpCircle', 'type': 'quiz'}
    ],
    objectives=['Describe DNA structure', 'Understand basic inheritance'],
    terms=[
        {'term': 'Gene', 'def': 'Unit of heredity'},
        {'term': 'Allele', 'def': 'Variant form of a gene'}
    ],
    content=[
        {'sec_idx': 2, 'type': 'introduction', 'title': 'Blueprint of Life', 'text': 'DNA holds the instructions for building and operating an organism.', 'image_url': 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800'},
        {'sec_idx': 3, 'type': 'concept_helper', 'title': 'Dominant vs Recessive', 'text': 'Dominant traits (like brown eyes) often hide recessive traits (like blue eyes).'}
    ],
    formulas=[],
    questions=[
        {'text': 'What molecule carries genetic info?', 'a': 'Protein', 'b': 'Carbohydrate', 'c': 'DNA', 'd': 'Lipid', 'ans': 'C', 'exp': 'Deoxyribonucleic Acid.'}
    ]
)

# 12. BIOLOGY - Ecosystems
add_topic_data('bio-t3',
    sections=[
        {'title': 'Objectives', 'icon': 'Target', 'type': 'objectives'},
        {'title': 'Components', 'icon': 'Globe', 'type': 'content'},
        {'title': 'Food Webs', 'icon': 'Share2', 'type': 'content'},
        {'title': 'Quiz', 'icon': 'HelpCircle', 'type': 'quiz'}
    ],
    objectives=['Define ecosystem', 'Trace energy flow in food webs'],
    terms=[
        {'term': 'Biotic', 'def': 'Living components (plants, animals)'},
        {'term': 'Abiotic', 'def': 'Non-living components (sun, water, soil)'}
    ],
    content=[
        {'sec_idx': 2, 'type': 'introduction', 'title': 'Web of Life', 'text': 'An ecosystem includes all living things in an area interacting with each other and their environment.', 'image_url': 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800'},
        {'sec_idx': 3, 'type': 'text', 'title': 'Producers vs Consumers', 'text': 'Plants produce energy from sun. Animals consume plants or other animals.'}
    ],
    formulas=[],
    questions=[
        {'text': 'Which is an abiotic factor?', 'a': 'Tree', 'b': 'Bacteria', 'c': 'Sunlight', 'd': 'Wolf', 'ans': 'C', 'exp': 'Sunlight is non-living.'}
    ]
)


# ============================================================================
# FUNCTIONS
# ============================================================================

def create_sample_excel(output_path='public/StudyHub_Complete_Data.xlsx'):
    """Create a sample Excel file with all the required sheets and data."""
    print(f"Creating sample Excel file: {output_path}")
    
    wb = Workbook()
    
    # Styling
    header_font = Font(bold=True, color='FFFFFF', size=11)
    header_fill = PatternFill('solid', fgColor='4472C4')
    thin_border = Border(
        left=Side(style='thin'), right=Side(style='thin'),
        top=Side(style='thin'), bottom=Side(style='thin')
    )
    
    for i, (sheet_name, data) in enumerate(SAMPLE_DATA.items()):
        if i == 0:
            ws = wb.active
            ws.title = sheet_name
        else:
            ws = wb.create_sheet(sheet_name)
        
        schema = SHEET_SCHEMAS.get(sheet_name, {})
        columns = schema.get('columns', list(data[0].keys()) if data else [])
        
        # Write headers
        for col, header in enumerate(columns, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.border = thin_border
            cell.alignment = Alignment(horizontal='center')
        
        # Write data
        for row_idx, row_data in enumerate(data, 2):
            for col_idx, col_name in enumerate(columns, 1):
                cell = ws.cell(row=row_idx, column=col_idx, value=row_data.get(col_name, ''))
                cell.border = thin_border
        
        # Auto-adjust column widths
        for col_idx, col_name in enumerate(columns, 1):
            max_length = max(len(str(col_name)), max(len(str(row.get(col_name, ''))) for row in data) if data else 0)
            ws.column_dimensions[ws.cell(row=1, column=col_idx).column_letter].width = min(max_length + 2, 50)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    wb.save(output_path)
    print(f"✅ Sample Excel file created: {output_path}")
    print(f"   Sheets created: {', '.join(SAMPLE_DATA.keys())}")
    return output_path


def validate_excel(file_path):
    """Validate an Excel file against the required schema."""
    print(f"Validating: {file_path}")
    errors = []
    warnings = []
    
    try:
        wb = load_workbook(file_path)
    except Exception as e:
        print(f"❌ Error opening file: {e}")
        return False
    
    # Check for required sheets
    for sheet_name, schema in SHEET_SCHEMAS.items():
        if sheet_name not in wb.sheetnames:
            errors.append(f"Missing required sheet: {sheet_name}")
            continue
        
        ws = wb[sheet_name]
        
        # Get headers from first row
        headers = [cell.value for cell in ws[1] if cell.value]
        headers_lower = [h.lower().replace(' ', '_') if h else '' for h in headers]
        
        # Check required columns
        for required_col in schema.get('required', []):
            if required_col not in headers_lower:
                errors.append(f"{sheet_name}: Missing required column '{required_col}'")
        
        # Check for data
        if ws.max_row < 2:
            warnings.append(f"{sheet_name}: No data rows found")
        
        # Validate content types for Study_Content
        if sheet_name == 'Study_Content' and 'content_type' in headers_lower:
            type_col = headers_lower.index('content_type') + 1
            for row in range(2, ws.max_row + 1):
                cell_value = ws.cell(row=row, column=type_col).value
                if cell_value and cell_value not in CONTENT_TYPES:
                    warnings.append(f"{sheet_name} row {row}: Invalid content_type '{cell_value}'. Valid: {CONTENT_TYPES}")
        
        # Validate icons
        if sheet_name in ['Subjects', 'Topic_Sections', 'Achievements']:
            icon_col_name = 'icon' if sheet_name != 'Topic_Sections' else 'section_icon'
            if icon_col_name in headers_lower:
                icon_col = headers_lower.index(icon_col_name) + 1
                for row in range(2, ws.max_row + 1):
                    cell_value = ws.cell(row=row, column=icon_col).value
                    if cell_value and cell_value not in VALID_ICONS:
                        warnings.append(f"{sheet_name} row {row}: Unknown icon '{cell_value}'")
    
    # Print results
    print("\n" + "="*50)
    if errors:
        print("❌ ERRORS:")
        for error in errors:
            print(f"   • {error}")
    
    if warnings:
        print("⚠️  WARNINGS:")
        for warning in warnings:
            print(f"   • {warning}")
    
    if not errors and not warnings:
        print("✅ Validation passed! No issues found.")
    elif not errors:
        print("✅ Validation passed with warnings.")
    else:
        print("❌ Validation failed. Please fix errors before using.")
    
    print("="*50)
    return len(errors) == 0


def export_to_json(file_path, output_path=None):
    """Export Excel data to JSON format for use without Google Sheets."""
    print(f"Exporting to JSON: {file_path}")
    
    if output_path is None:
        output_path = file_path.replace('.xlsx', '.json')
    
    wb = load_workbook(file_path)
    data = {}
    
    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        
        # Get headers
        headers = [cell.value.lower().replace(' ', '_') if cell.value else f'col_{i}' 
                   for i, cell in enumerate(ws[1])]
        
        # Get data
        rows = []
        for row in ws.iter_rows(min_row=2, values_only=True):
            if any(cell is not None for cell in row):
                row_dict = {}
                for i, value in enumerate(row):
                    if i < len(headers):
                        row_dict[headers[i]] = value if value is not None else ''
                rows.append(row_dict)
        
        data[sheet_name] = rows
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ JSON exported: {output_path}")
    return output_path


def print_schema():
    """Print the data schema for reference."""
    print("\n" + "="*60)
    print("STUDYHUB DATA SCHEMA")
    print("="*60)
    
    for sheet_name, schema in SHEET_SCHEMAS.items():
        print(f"\n📄 {sheet_name}")
        print(f"   Description: {schema['description']}")
        print(f"   Columns: {', '.join(schema['columns'])}")
        print(f"   Required: {', '.join(schema['required'])}")
    
    print("\n" + "-"*60)
    print("VALID CONTENT TYPES:", ', '.join(CONTENT_TYPES))
    print("VALID SECTION TYPES:", ', '.join(SECTION_TYPES))
    print("VALID ICONS:", ', '.join(VALID_ICONS))
    print("="*60)


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description='StudyHub Data Setup Script')
    parser.add_argument('command', choices=['create-sample', 'validate', 'export-json', 'schema'],
                       help='Command to run')
    parser.add_argument('file', nargs='?', help='Input file path (for validate/export-json)')
    parser.add_argument('-o', '--output', help='Output file path')
    
    args = parser.parse_args()
    
    if args.command == 'create-sample':
        output = args.output or 'public/StudyHub_Complete_Data.xlsx'
        create_sample_excel(output)
    
    elif args.command == 'validate':
        if not args.file:
            print("Error: Please provide a file path to validate")
            sys.exit(1)
        success = validate_excel(args.file)
        sys.exit(0 if success else 1)
    
    elif args.command == 'export-json':
        if not args.file:
            print("Error: Please provide a file path to export")
            sys.exit(1)
        export_to_json(args.file, args.output)
    
    elif args.command == 'schema':
        print_schema()


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        print("\nQuick start:")
        print("  python setup_data.py create-sample   # Create sample Excel file")
        print("  python setup_data.py schema          # Show data schema")
    else:
        main()
