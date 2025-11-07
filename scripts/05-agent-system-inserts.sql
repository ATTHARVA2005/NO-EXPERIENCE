-- Seed assessment questions for testing
INSERT INTO assessments (student_id, topic, difficulty, questions, created_at)
SELECT 
  id,
  'Mathematics',
  'medium',
  jsonb_build_array(
    jsonb_build_object(
      'id', 'q1',
      'type', 'multiple-choice',
      'question', 'What is 15 + 23?',
      'options', jsonb_build_array('35', '38', '40', '42'),
      'correctAnswer', '38',
      'difficulty', 'easy',
      'topic', 'Addition'
    ),
    jsonb_build_object(
      'id', 'q2',
      'type', 'multiple-choice',
      'question', 'Solve for x: 2x + 5 = 15',
      'options', jsonb_build_array('3', '5', '7', '10'),
      'correctAnswer', '5',
      'difficulty', 'medium',
      'topic', 'Algebra'
    ),
    jsonb_build_object(
      'id', 'q3',
      'type', 'short-answer',
      'question', 'What is the area of a circle with radius 5?',
      'correctAnswer', '78.5',
      'difficulty', 'medium',
      'topic', 'Geometry'
    ),
    jsonb_build_object(
      'id', 'q4',
      'type', 'multiple-choice',
      'question', 'What is the square root of 144?',
      'options', jsonb_build_array('10', '11', '12', '14'),
      'correctAnswer', '12',
      'difficulty', 'easy',
      'topic', 'Powers and Roots'
    )
  ),
  NOW()
FROM auth.users
WHERE email = 'test@example.com'
LIMIT 1;
