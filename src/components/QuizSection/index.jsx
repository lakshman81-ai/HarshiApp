import React, { memo, useState, useEffect, useCallback } from 'react';
import { HelpCircle, Clock, Lightbulb, ChevronLeft, ChevronRight, Check, X, CheckCircle2, RotateCcw } from 'lucide-react';

const cn = (...classes) => classes.flat().filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

/**
 * Format time in seconds to MM:SS display
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time string
 */
const formatTime = (seconds) => {
  if (seconds === null || seconds === undefined) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * QuizSection Component
 * Full-featured quiz with multiple phases
 *
 * @param {Object} props
 * @param {Array} props.questions - Array of quiz question objects
 * @param {boolean} props.darkMode - Dark mode flag
 * @param {Object} props.subjectConfig - Subject config { gradient, color }
 * @param {Function} props.onComplete - Callback when quiz is completed (score, xp, results)
 * @param {string} props.topicId - Topic ID for tracking
 * @param {boolean} props.showTimer - Enable timer (default: false)
 * @param {number} props.timeLimit - Time limit in seconds (default: null)
 * @param {boolean} props.allowHints - Enable hints (default: true)
 * @param {number} props.hintCost - XP cost per hint (default: 5)
 * @param {number} props.userXp - User's current XP (for hint cost check)
 * @param {Function} props.onUseHint - Callback when hint is used (xpCost)
 */
const QuizSection = memo(({
  questions = [],
  darkMode,
  subjectConfig,
  onComplete,
  topicId,
  showTimer = false,
  timeLimit = null,
  allowHints = true,
  hintCost = 5,
  userXp = 0,
  onUseHint
}) => {
  // Quiz state
  const [phase, setPhase] = useState('ready'); // 'ready' | 'active' | 'review' | 'complete'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [hintsUsed, setHintsUsed] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [results, setResults] = useState(null);
  const [score, setScore] = useState(null);
  const [xpEarned, setXpEarned] = useState(null);

  const currentQuestion = questions[currentIndex];
  const hasAnswered = currentQuestion && answers[currentQuestion.id] !== undefined;
  const isLastQuestion = currentIndex === questions.length - 1;

  // Timer effect
  useEffect(() => {
    if (phase !== 'active' || !showTimer || timeRemaining === null) {
      return;
    }

    if (timeRemaining <= 0) {
      handleSubmit();
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining(prev => prev !== null ? prev - 1 : null);
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, timeRemaining, showTimer]);

  // Start quiz
  const handleStart = () => {
    setPhase('active');
    setTimeRemaining(timeLimit);
  };

  // Select answer
  const handleSelectAnswer = (optionLabel) => {
    if (phase !== 'active' || !currentQuestion) return;

    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: optionLabel
    }));
  };

  // Use hint
  const handleUseHint = () => {
    if (!allowHints || !currentQuestion?.hint) return;
    if (hintsUsed[currentQuestion.id]) return;
    if (userXp < hintCost) return;

    onUseHint?.(hintCost);
    setHintsUsed(prev => ({
      ...prev,
      [currentQuestion.id]: true
    }));
  };

  // Go to next question or review
  const handleNext = () => {
    if (!hasAnswered) return;
    setPhase('review');
  };

  // Continue from review
  const handleContinueFromReview = () => {
    if (isLastQuestion) {
      handleSubmit();
    } else {
      setCurrentIndex(prev => prev + 1);
      setPhase('active');
    }
  };

  // Go to previous question
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setPhase('active');
    }
  };

  // Submit quiz
  const handleSubmit = useCallback(() => {
    const quizResults = questions.map(q => {
      const selectedAnswer = answers[q.id] || null;
      const isCorrect = selectedAnswer === q.correctAnswer;

      return {
        questionId: q.id,
        selectedAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        hintsUsed: hintsUsed[q.id] || false,
        timeSpent: 0
      };
    });

    const correctCount = quizResults.filter(r => r.isCorrect).length;
    const finalScore = Math.round((correctCount / questions.length) * 100);

    // Calculate XP
    let earnedXp = 0;
    quizResults.forEach((r, i) => {
      if (r.isCorrect) {
        let questionXP = questions[i].xpReward || 10;
        if (r.hintsUsed) {
          questionXP = Math.floor(questionXP * 0.5);
        }
        earnedXp += questionXP;
      }
    });

    // Perfect score bonus
    if (finalScore === 100) {
      earnedXp += 20;
    }

    setResults(quizResults);
    setScore(finalScore);
    setXpEarned(earnedXp);
    setPhase('complete');

    onComplete?.(finalScore, earnedXp, quizResults);
  }, [questions, answers, hintsUsed, onComplete]);

  // Retry quiz
  const handleRetry = () => {
    setPhase('ready');
    setCurrentIndex(0);
    setAnswers({});
    setHintsUsed({});
    setTimeRemaining(timeLimit);
    setResults(null);
    setScore(null);
    setXpEarned(null);
  };

  if (!questions || questions.length === 0) {
    return (
      <div
        className={cn(
          "rounded-2xl p-6 border text-center",
          darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
        )}
      >
        <HelpCircle
          className={cn(
            "w-12 h-12 mx-auto mb-4 opacity-50",
            darkMode ? "text-slate-500" : "text-slate-400"
          )}
        />
        <p className={darkMode ? "text-slate-400" : "text-slate-500"}>
          No quiz questions available for this topic yet.
        </p>
      </div>
    );
  }

  // Ready Phase
  if (phase === 'ready') {
    const maxXp = questions.reduce((sum, q) => sum + (q.xpReward || 10), 0) + 20; // +20 for perfect bonus

    return (
      <div
        className={cn(
          "rounded-2xl p-6 border",
          darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
        )}
      >
        <div className="text-center py-8">
          <div
            className={cn(
              "w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6",
              `bg-gradient-to-br ${subjectConfig.gradient}`
            )}
          >
            <HelpCircle className="w-10 h-10 text-white" />
          </div>

          <h3
            className={cn(
              "text-2xl font-bold mb-2",
              darkMode ? "text-white" : "text-slate-800"
            )}
          >
            Topic Quiz
          </h3>
          <p
            className={cn(
              "mb-6",
              darkMode ? "text-slate-400" : "text-slate-500"
            )}
          >
            Test your understanding
          </p>

          <div className="flex justify-center gap-6 mb-8">
            <div className="text-center">
              <div
                className={cn(
                  "text-2xl font-bold",
                  darkMode ? "text-white" : "text-slate-800"
                )}
              >
                {questions.length}
              </div>
              <div
                className={cn(
                  "text-sm",
                  darkMode ? "text-slate-400" : "text-slate-500"
                )}
              >
                Questions
              </div>
            </div>
            {showTimer && timeLimit && (
              <div className="text-center">
                <div
                  className={cn(
                    "text-2xl font-bold",
                    darkMode ? "text-white" : "text-slate-800"
                  )}
                >
                  {formatTime(timeLimit)}
                </div>
                <div
                  className={cn(
                    "text-sm",
                    darkMode ? "text-slate-400" : "text-slate-500"
                  )}
                >
                  Time Limit
                </div>
              </div>
            )}
            <div className="text-center">
              <div
                className={cn(
                  "text-2xl font-bold",
                  darkMode ? "text-white" : "text-slate-800"
                )}
              >
                {maxXp}
              </div>
              <div
                className={cn(
                  "text-sm",
                  darkMode ? "text-slate-400" : "text-slate-500"
                )}
              >
                Max XP
              </div>
            </div>
          </div>

          <button
            onClick={handleStart}
            className={cn(
              "px-8 py-4 rounded-xl font-bold text-white text-lg",
              `bg-gradient-to-r ${subjectConfig.gradient}`
            )}
          >
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  // Active Phase
  if (phase === 'active') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-sm font-medium",
              darkMode ? "text-slate-400" : "text-slate-500"
            )}
          >
            Question {currentIndex + 1} of {questions.length}
          </span>
          {showTimer && timeRemaining !== null && (
            <span
              className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold",
                timeRemaining < 30
                  ? "bg-red-100 text-red-600"
                  : darkMode
                    ? "bg-slate-700 text-slate-300"
                    : "bg-slate-100 text-slate-600"
              )}
            >
              <Clock className="w-4 h-4" />
              {formatTime(timeRemaining)}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div
          className={cn(
            "h-2 rounded-full overflow-hidden",
            darkMode ? "bg-slate-700" : "bg-slate-200"
          )}
        >
          <div
            className={cn(
              "h-full transition-all bg-gradient-to-r",
              subjectConfig.gradient
            )}
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question Card */}
        <div
          className={cn(
            "rounded-2xl p-6 border",
            darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
          )}
        >
          <p
            className={cn(
              "text-lg font-medium mb-6",
              darkMode ? "text-white" : "text-slate-800"
            )}
          >
            {currentQuestion.question}
          </p>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map(option => {
              const isSelected = answers[currentQuestion.id] === option.label;

              return (
                <button
                  key={option.label}
                  onClick={() => handleSelectAnswer(option.label)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all border-2",
                    isSelected
                      ? cn(`border-current text-white bg-gradient-to-r`, subjectConfig.gradient)
                      : darkMode
                        ? "border-slate-700 bg-slate-700 hover:border-slate-600"
                        : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <span
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                      isSelected
                        ? "bg-white/20"
                        : darkMode
                          ? "bg-slate-600"
                          : "bg-slate-100"
                    )}
                  >
                    {option.label}
                  </span>
                  <span className="flex-1">{option.text}</span>
                </button>
              );
            })}
          </div>

          {/* Hint */}
          {allowHints && currentQuestion.hint && (
            <div
              className={cn(
                "mt-6 pt-6 border-t",
                darkMode ? "border-slate-700" : "border-slate-200"
              )}
            >
              {hintsUsed[currentQuestion.id] ? (
                <div
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl",
                    darkMode
                      ? "bg-amber-900/30 text-amber-200"
                      : "bg-amber-50 text-amber-800"
                  )}
                >
                  <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>{currentQuestion.hint}</p>
                </div>
              ) : (
                <button
                  onClick={handleUseHint}
                  disabled={userXp < hintCost}
                  className={cn(
                    "flex items-center gap-2 transition-colors",
                    userXp >= hintCost
                      ? "text-amber-600 hover:text-amber-700"
                      : "text-slate-400 cursor-not-allowed"
                  )}
                >
                  <Lightbulb className="w-5 h-5" />
                  <span>Use Hint (-{hintCost} XP)</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-medium",
              currentIndex === 0
                ? darkMode
                  ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
                : darkMode
                  ? "bg-slate-700 hover:bg-slate-600 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            )}
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>

          <button
            onClick={handleNext}
            disabled={!hasAnswered}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-medium",
              !hasAnswered
                ? darkMode
                  ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
                : cn(`bg-gradient-to-r text-white`, subjectConfig.gradient)
            )}
          >
            {isLastQuestion ? 'Submit Quiz' : 'Next'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Review Phase
  if (phase === 'review') {
    const selectedAnswer = answers[currentQuestion.id];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    return (
      <div
        className={cn(
          "rounded-2xl p-6 border",
          darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3 p-4 rounded-xl mb-6",
            isCorrect
              ? darkMode
                ? "bg-emerald-900/30 text-emerald-300"
                : "bg-emerald-100 text-emerald-800"
              : darkMode
                ? "bg-red-900/30 text-red-300"
                : "bg-red-100 text-red-800"
          )}
        >
          {isCorrect ? (
            <>
              <CheckCircle2 className="w-6 h-6" />
              <span className="font-bold">
                Correct! +{hintsUsed[currentQuestion.id]
                  ? Math.floor((currentQuestion.xpReward || 10) * 0.5)
                  : currentQuestion.xpReward || 10} XP
              </span>
            </>
          ) : (
            <>
              <X className="w-6 h-6" />
              <span className="font-bold">
                Incorrect. The answer is {currentQuestion.correctAnswer}
              </span>
            </>
          )}
        </div>

        <p
          className={cn(
            "mb-6",
            darkMode ? "text-slate-300" : "text-slate-600"
          )}
        >
          {currentQuestion.explanation}
        </p>

        <button
          onClick={handleContinueFromReview}
          className={cn(
            "w-full py-3 rounded-xl font-bold text-white",
            `bg-gradient-to-r ${subjectConfig.gradient}`
          )}
        >
          {isLastQuestion ? 'See Results' : 'Continue'}
        </button>
      </div>
    );
  }

  // Complete Phase
  if (phase === 'complete') {
    const correctCount = results.filter(r => r.isCorrect).length;

    return (
      <div className="space-y-6">
        {/* Score Card */}
        <div
          className={cn(
            "rounded-2xl p-6 border",
            darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
          )}
        >
          <div className="text-center py-8">
            <div
              className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6",
                score >= 80
                  ? "bg-emerald-100"
                  : score >= 50
                    ? "bg-amber-100"
                    : "bg-red-100"
              )}
            >
              <span
                className={cn(
                  "text-3xl font-bold",
                  score >= 80
                    ? "text-emerald-600"
                    : score >= 50
                      ? "text-amber-600"
                      : "text-red-600"
                )}
              >
                {score}%
              </span>
            </div>

            <h3
              className={cn(
                "text-2xl font-bold mb-2",
                darkMode ? "text-white" : "text-slate-800"
              )}
            >
              {score === 100
                ? 'Perfect!'
                : score >= 80
                  ? 'Great Job!'
                  : score >= 50
                    ? 'Good Effort!'
                    : 'Keep Studying!'}
            </h3>

            <div className="flex justify-center gap-8 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">
                  {correctCount}/{questions.length}
                </div>
                <div
                  className={cn(
                    "text-sm",
                    darkMode ? "text-slate-400" : "text-slate-500"
                  )}
                >
                  Correct
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-500">
                  +{xpEarned}
                </div>
                <div
                  className={cn(
                    "text-sm",
                    darkMode ? "text-slate-400" : "text-slate-500"
                  )}
                >
                  XP Earned
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Breakdown */}
        <div
          className={cn(
            "rounded-2xl p-6 border",
            darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
          )}
        >
          <h4
            className={cn(
              "font-bold mb-4",
              darkMode ? "text-white" : "text-slate-800"
            )}
          >
            Question Review
          </h4>
          <div className="space-y-3">
            {results.map((result, i) => (
              <div
                key={result.questionId}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl",
                  result.isCorrect
                    ? darkMode
                      ? "bg-emerald-900/30"
                      : "bg-emerald-50"
                    : darkMode
                      ? "bg-red-900/30"
                      : "bg-red-50"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    result.isCorrect
                      ? "bg-emerald-500 text-white"
                      : "bg-red-500 text-white"
                  )}
                >
                  {result.isCorrect ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={cn(
                    "flex-1 text-sm",
                    darkMode ? "text-slate-300" : "text-slate-700"
                  )}
                >
                  Question {i + 1}
                </span>
                <span
                  className={cn(
                    "text-xs",
                    darkMode ? "text-slate-400" : "text-slate-500"
                  )}
                >
                  {result.selectedAnswer || 'Skipped'} → {result.correctAnswer}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleRetry}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium",
              darkMode
                ? "bg-slate-700 hover:bg-slate-600 text-white"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            )}
          >
            <RotateCcw className="w-5 h-5" />
            Retry Quiz
          </button>
        </div>
      </div>
    );
  }

  return null;
});

QuizSection.displayName = 'QuizSection';

export default QuizSection;
