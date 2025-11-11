/**
 * Assessment Entity
 * 
 * Architectural Intent:
 * - Encapsulates infrastructure and application assessment results
 * - Aggregate root for assessment data
 * - Maintains assessment integrity and business rules
 * - Supports both infrastructure and application assessments
 */

import { CloudProvider } from '../value_objects/CloudProvider.js';
import { Workload } from './Workload.js';

/**
 * Assessment Type Enum
 */
export const AssessmentType = {
  INFRASTRUCTURE: 'infrastructure',
  APPLICATION: 'application',
  COMPREHENSIVE: 'comprehensive'
};

/**
 * Assessment Entity
 * Represents assessment results for infrastructure or applications
 */
export class Assessment {
  /**
   * @param {Object} props - Assessment properties
   * @param {string} props.id - Unique identifier
   * @param {string} props.workloadId - Associated workload ID
   * @param {string} props.type - Assessment type
   * @param {Object} props.infrastructureAssessment - Infrastructure assessment data
   * @param {Object} props.applicationAssessment - Application assessment data
   * @param {Object} props.codeModResults - Google Cloud CodeMod analysis results
   * @param {number} props.complexityScore - Overall complexity score (1-10)
   * @param {string[]} props.riskFactors - Identified risk factors
   * @param {string[]} props.recommendations - Assessment recommendations
   */
  constructor(props) {
    this._validateProps(props);
    
    Object.defineProperty(this, '_id', {
      value: props.id || this._generateId(),
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_workloadId', {
      value: props.workloadId,
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_type', {
      value: props.type || AssessmentType.COMPREHENSIVE,
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_infrastructureAssessment', {
      value: props.infrastructureAssessment ? Object.freeze({ ...props.infrastructureAssessment }) : null,
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_applicationAssessment', {
      value: props.applicationAssessment ? Object.freeze({ ...props.applicationAssessment }) : null,
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_codeModResults', {
      value: props.codeModResults ? Object.freeze({ ...props.codeModResults }) : null,
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_complexityScore', {
      value: Math.max(1, Math.min(10, parseFloat(props.complexityScore) || 5)),
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_riskFactors', {
      value: Array.isArray(props.riskFactors) 
        ? Object.freeze([...props.riskFactors]) 
        : Object.freeze([]),
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_recommendations', {
      value: Array.isArray(props.recommendations) 
        ? Object.freeze([...props.recommendations]) 
        : Object.freeze([]),
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_createdAt', {
      value: props.createdAt || new Date(),
      writable: false,
      enumerable: true
    });
    
    Object.seal(this);
  }

  /**
   * Validate constructor properties
   * @private
   */
  _validateProps(props) {
    if (!props.workloadId || props.workloadId.trim() === '') {
      throw new Error('Workload ID is required for assessment');
    }
    
    if (props.type && !Object.values(AssessmentType).includes(props.type)) {
      throw new Error(`Invalid assessment type: ${props.type}`);
    }
  }

  /**
   * Generate unique ID
   * @private
   */
  _generateId() {
    return `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getters
  get id() { return this._id; }
  get workloadId() { return this._workloadId; }
  get type() { return this._type; }
  get infrastructureAssessment() { return this._infrastructureAssessment; }
  get applicationAssessment() { return this._applicationAssessment; }
  get codeModResults() { return this._codeModResults; }
  get complexityScore() { return this._complexityScore; }
  get riskFactors() { return [...this._riskFactors]; }
  get recommendations() { return [...this._recommendations]; }
  get createdAt() { return this._createdAt; }

  /**
   * Check if assessment is comprehensive (both infra and app)
   * @returns {boolean}
   */
  isComprehensive() {
    return this._type === AssessmentType.COMPREHENSIVE || 
           (this._infrastructureAssessment && this._applicationAssessment);
  }

  /**
   * Check if assessment has CodeMod results
   * @returns {boolean}
   */
  hasCodeModResults() {
    return this._codeModResults !== null && Object.keys(this._codeModResults).length > 0;
  }

  /**
   * Check if assessment indicates high complexity
   * @returns {boolean}
   */
  isHighComplexity() {
    return this._complexityScore >= 7;
  }

  /**
   * Check if assessment has high risk factors
   * @returns {boolean}
   */
  hasHighRisk() {
    return this._riskFactors.length >= 3 || this._complexityScore >= 8;
  }

  /**
   * Get assessment readiness score (0-100)
   * Higher score = more ready for migration
   * @returns {number}
   */
  getReadinessScore() {
    let score = 100;
    
    // Deduct for complexity
    score -= (this._complexityScore - 1) * 5; // 0-45 points
    
    // Deduct for risk factors
    score -= this._riskFactors.length * 10; // 0-50 points
    
    // Bonus for comprehensive assessment
    if (this.isComprehensive()) {
      score += 10;
    }
    
    // Bonus for CodeMod results
    if (this.hasCodeModResults()) {
      score += 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Convert to plain object (for serialization)
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this._id,
      workloadId: this._workloadId,
      type: this._type,
      infrastructureAssessment: this._infrastructureAssessment,
      applicationAssessment: this._applicationAssessment,
      codeModResults: this._codeModResults,
      complexityScore: this._complexityScore,
      riskFactors: this._riskFactors,
      recommendations: this._recommendations,
      createdAt: this._createdAt.toISOString()
    };
  }

  /**
   * Create from plain object
   * @param {Object} data 
   * @returns {Assessment}
   */
  static fromJSON(data) {
    return new Assessment({
      ...data,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
    });
  }
}

export default Assessment;
