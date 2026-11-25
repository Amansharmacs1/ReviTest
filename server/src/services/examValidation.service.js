import { Question, QUESTION_STATUS, QUESTION_TYPES } from '../models/Question.js';
import { Organization } from '../models/Organization.js';

/**
 * Validates an examination structure, questions, and policies
 *
 * @param {Object} params
 * @param {Object} params.exam - The exam document (with sections and questions)
 * @param {string|Object} params.organizationId - Tenant ID
 * @param {boolean} [params.isPublishing=false] - Whether this is a pre-publication check
 * @returns {Promise<{ isValid: boolean, errors: string[], warnings: string[], summary: Object }>}
 */
export const validateExam = async ({ exam, organizationId, isPublishing = false }) => {
  const errors = [];
  const warnings = [];

  // 1. Fetch organization policies
  const organization = await Organization.findById(organizationId);
  if (!organization) {
    errors.push('Organization not found.');
    return { isValid: false, errors, warnings, summary: null };
  }

  const orgPolicies = organization.settings || {};
  const minDuration = orgPolicies.minExamDurationMinutes || 5;
  const maxDuration = orgPolicies.maxExamDurationMinutes || 360;
  const requireInstructions = orgPolicies.requireExamInstructions || false;
  const allowNegative = orgPolicies.allowNegativeMarking !== false;
  const permittedTypes =
    orgPolicies.permittedQuestionTypes || Object.values(QUESTION_TYPES);

  // 2. Validate Basic Metadata
  if (!exam.title || exam.title.trim().length < 3) {
    errors.push('Exam title must be at least 3 characters long.');
  }

  if (!exam.durationMinutes || exam.durationMinutes < 1) {
    errors.push('Exam duration must be at least 1 minute.');
  } else if (exam.durationMinutes < minDuration) {
    errors.push(
      `Exam duration cannot be less than organization minimum of ${minDuration} minutes.`
    );
  } else if (exam.durationMinutes > maxDuration) {
    errors.push(
      `Exam duration cannot exceed organization maximum of ${maxDuration} minutes.`
    );
  }

  if (
    requireInstructions &&
    (!exam.instructions || exam.instructions.trim().length === 0)
  ) {
    errors.push('Organization policy requires exam instructions to be provided.');
  }

  // Check negative marking policy
  if (exam.settings?.allowNegativeMarking && !allowNegative) {
    errors.push('Negative marking is prohibited by organization policy.');
  }

  // 3. Validate Sections
  if (!exam.sections || exam.sections.length === 0) {
    errors.push('Exam must contain at least one section.');
  }

  let totalQuestionsCount = 0;
  let computedTotalMarks = 0;
  const allQuestionIds = [];
  const questionSectionMap = new Map();

  const difficultyCounts = { EASY: 0, MEDIUM: 0, HARD: 0 };
  const questionTypeCounts = {
    MCQ_SINGLE: 0,
    MCQ_MULTIPLE: 0,
    TRUE_FALSE: 0,
    DESCRIPTIVE: 0,
  };

  if (exam.sections && exam.sections.length > 0) {
    exam.sections.forEach((section, sIndex) => {
      const sectionNum = sIndex + 1;
      if (!section.title || section.title.trim().length === 0) {
        errors.push(`Section ${sectionNum} must have a title.`);
      }

      if (!section.questions || section.questions.length === 0) {
        errors.push(
          `Section "${section.title || sectionNum}" must contain at least one question.`
        );
      } else {
        section.questions.forEach((qRef) => {
          totalQuestionsCount += 1;
          const qIdStr = qRef.questionId?.toString() || qRef.toString();
          allQuestionIds.push(qIdStr);
          questionSectionMap.set(qIdStr, section.title || `Section ${sectionNum}`);
        });
      }
    });
  }

  // 4. Verify Questions in Database
  if (allQuestionIds.length > 0) {
    // Check for duplicates within the exam
    const uniqueIds = new Set(allQuestionIds);
    if (uniqueIds.size !== allQuestionIds.length) {
      warnings.push('Exam contains duplicate questions across sections.');
    }

    const fetchedQuestions = await Question.find({
      _id: { $in: Array.from(uniqueIds) },
    }).lean();

    const fetchedMap = new Map(fetchedQuestions.map((q) => [q._id.toString(), q]));

    // Check each referenced question
    for (const qId of uniqueIds) {
      const question = fetchedMap.get(qId);
      const sectionName = questionSectionMap.get(qId);

      if (!question) {
        errors.push(
          `Question (${qId}) referenced in section "${sectionName}" does not exist.`
        );
        continue;
      }

      // Cross-tenant verification
      if (question.organizationId.toString() !== organizationId.toString()) {
        errors.push(
          `Security violation: Question "${question.statement.substring(0, 30)}..." belongs to another organization.`
        );
        continue;
      }

      // Check if question is archived (cannot publish with archived questions)
      if (isPublishing && question.status === QUESTION_STATUS.ARCHIVED) {
        errors.push(
          `Cannot publish exam with archived question: "${question.statement.substring(0, 40)}...".`
        );
      }

      // Check if question type is permitted
      if (!permittedTypes.includes(question.questionType)) {
        errors.push(
          `Question type ${question.questionType} is not permitted by organization policy.`
        );
      }

      // Tally distributions
      if (difficultyCounts[question.difficulty] !== undefined) {
        difficultyCounts[question.difficulty] += 1;
      }
      if (questionTypeCounts[question.questionType] !== undefined) {
        questionTypeCounts[question.questionType] += 1;
      }
    }

    // 5. Calculate and verify Section & Total Marks
    if (exam.sections) {
      exam.sections.forEach((section) => {
        let sectionMarks = 0;
        if (section.questions) {
          section.questions.forEach((qRef) => {
            const qIdStr = qRef.questionId?.toString() || qRef.toString();
            const question = fetchedMap.get(qIdStr);
            const marksToUse =
              qRef.marks !== undefined ? Number(qRef.marks) : question?.marks || 0;
            sectionMarks += marksToUse;
          });
        }
        section.sectionMarks = Math.round(sectionMarks * 100) / 100;
        computedTotalMarks += section.sectionMarks;
      });
    }
  }

  computedTotalMarks = Math.round(computedTotalMarks * 100) / 100;

  // 6. Validate Marks
  if (computedTotalMarks <= 0) {
    errors.push('Exam total marks must be greater than zero.');
  }

  const passingMarks = Number(exam.passingMarks) || 0;
  if (passingMarks <= 0) {
    warnings.push(
      'Passing marks is set to 0. All candidates will pass regardless of score.'
    );
  } else if (passingMarks > computedTotalMarks) {
    errors.push(
      `Passing marks (${passingMarks}) cannot exceed total marks (${computedTotalMarks}).`
    );
  }

  const summary = {
    totalQuestions: totalQuestionsCount,
    totalMarks: computedTotalMarks,
    passingMarks,
    durationMinutes: exam.durationMinutes,
    sectionCount: exam.sections ? exam.sections.length : 0,
    difficultyCounts,
    questionTypeCounts,
  };

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary,
  };
};

export default validateExam;
