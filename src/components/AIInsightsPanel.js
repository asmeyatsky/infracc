/**
 * AI Insights Panel
 * Advanced AI-powered recommendations and insights
 */

import React, { useState, useEffect } from 'react';
import CloudPricingAPI from '../utils/cloudPricingAPI';
import AdvancedAnalytics from '../utils/advancedAnalytics';

const AIInsightsPanel = ({ tcoResults, workloadData, onRecommendationSelect }) => {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);

  // Generate AI insights based on TCO results and workload data
  useEffect(() => {
    if (tcoResults || workloadData) {
      generateInsights();
    }
  }, [tcoResults, workloadData]);

  const generateInsights = async () => {
    setLoading(true);
    
    // Simulate AI analysis
    const newInsights = [];
    
    // Cost optimization insights
    if (tcoResults && tcoResults.totalCloudTCO > tcoResults.onPremiseTCO * 0.8) {
      newInsights.push({
        id: 1,
        category: 'costOptimization',
        title: 'High Cloud Costs Identified',
        description: 'Your cloud costs are approaching on-premise levels. Consider reserved instances or commitment discounts.',
        priority: 'high',
        potentialSavings: '$50K - $100K annually',
        recommendation: 'Commit to 1-3 year reserved instances for 30-60% savings'
      });
    } else if (tcoResults && tcoResults.roi > 50) {
      newInsights.push({
        id: 2,
        category: 'roi',
        title: 'Excellent ROI Opportunity',
        description: 'Your migration shows exceptional ROI potential. Consider accelerating the timeline.',
        priority: 'medium',
        potentialSavings: 'Strong business case',
        recommendation: 'Move forward with migration planning'
      });
    }
    
    // Performance insights
    if (workloadData && workloadData.length > 50) {
      newInsights.push({
        id: 3,
        category: 'performance',
        title: 'Large-Scale Migration',
        description: 'Your workload portfolio is substantial. Consider a phased migration approach.',
        priority: 'medium',
        potentialSavings: 'Reduced risk',
        recommendation: 'Implement wave-based migration strategy'
      });
    }
    
    // Risk insights
    if (tcoResults && tcoResults.migrationCost > tcoResults.totalCloudTCO * 0.3) {
      newInsights.push({
        id: 4,
        category: 'risk',
        title: 'High Migration Costs',
        description: 'Migration costs represent a significant portion of total cloud investment.',
        priority: 'high',
        potentialSavings: 'Reduce migration costs by 20-30%',
        recommendation: 'Optimize migration tools and approach'
      });
    }
    
    // Industry benchmark insights
    newInsights.push({
      id: 5,
      category: 'benchmark',
      title: 'Industry Best Practice',
      description: 'Based on similar organizations, most see 25-35% cost reduction within 2 years.',
      priority: 'low',
      potentialSavings: 'Industry average improvement',
      recommendation: 'Set realistic expectations for cost reduction'
    });
    
    // Add more insights based on detailed analysis
    if (workloadData) {
      const computeIntensiveApps = workloadData.filter(app => 
        app.category === 'compute' || app.cpuUtilization > 70
      );
      
      if (computeIntensiveApps.length > 0) {
        newInsights.push({
          id: 6,
          category: 'computeOptimization',
          title: 'Compute-Intensive Applications',
          description: `${computeIntensiveApps.length} applications are compute-intensive and may benefit from specialized instances.`,
          priority: 'medium',
          potentialSavings: '15-25% performance improvement',
          recommendation: 'Use high-CPU or compute-optimized instances'
        });
      }
    }
    
    setInsights(newInsights);
    setLoading(false);
  };

  // Get detailed analysis for an insight
  const getDetailedAnalysis = (insight) => {
    // In a real implementation, this would call an AI service for detailed analysis
    const analysis = {
      insightId: insight.id,
      detailedExplanation: `This insight is based on advanced analysis of your workload patterns and cost structure. Our system has identified that ${insight.description.toLowerCase()} through pattern matching with similar successful migrations.`,
      supportingData: [
        'Historical migration data from 1000+ similar organizations',
        'Real-time cloud pricing and performance metrics',
        'Industry best practices and optimization patterns'
      ],
      implementationSteps: [
        'Assessment of current configuration',
        'Identification of optimization opportunities',
        'Development of implementation plan',
        'Execution and monitoring'
      ],
      expectedTimeline: '2-4 weeks for implementation',
      confidenceLevel: '85%'
    };
    
    return analysis;
  };

  // Handle recommendation selection
  const handleRecommendationSelect = (insight) => {
    if (onRecommendationSelect) {
      onRecommendationSelect({
        insight,
        analysis: getDetailedAnalysis(insight)
      });
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="ai-insights-panel">
        <div className="panel-header">
          <h3>AI-Powered Insights</h3>
          <div className="loading-spinner">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Analyzing...</span>
            </div>
          </div>
        </div>
        <p>Analyzing your cloud migration data...</p>
      </div>
    );
  }

  return (
    <div className="ai-insights-panel">
      <div className="panel-header">
        <h3>🤖 AI-Powered Insights & Recommendations</h3>
        <button 
          className="btn btn-sm btn-outline-primary"
          onClick={generateInsights}
        >
          Regenerate Insights
        </button>
      </div>

      {insights.length === 0 ? (
        <div className="insights-empty">
          <p>No insights available. Provide TCO results or workload data to generate insights.</p>
        </div>
      ) : (
        <div className="insights-container">
          {insights.map(insight => (
            <div 
              key={insight.id} 
              className={`insight-card ${getPriorityClass(insight.priority)}`}
            >
              <div className="insight-header">
                <div className="insight-category">
                  <span className="insight-icon">
                    {insight.category === 'costOptimization' && '💰'}
                    {insight.category === 'roi' && '📈'}
                    {insight.category === 'performance' && '⚡'}
                    {insight.category === 'risk' && '⚠️'}
                    {insight.category === 'benchmark' && '🎯'}
                    {insight.category === 'computeOptimization' && '💻'}
                  </span>
                  <span className="insight-title">{insight.title}</span>
                </div>
                <div className="insight-priority">
                  <span className={`badge ${insight.priority === 'high' ? 'bg-danger' : insight.priority === 'medium' ? 'bg-warning' : 'bg-success'}`}>
                    {insight.priority}
                  </span>
                </div>
              </div>
              
              <div className="insight-body">
                <p className="insight-description">{insight.description}</p>
                <div className="insight-metrics">
                  <span className="potential-savings">Potential Savings: {insight.potentialSavings}</span>
                </div>
                <div className="insight-recommendation">
                  <strong>Recommendation:</strong> {insight.recommendation}
                </div>
              </div>
              
              <div className="insight-actions">
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={() => handleRecommendationSelect(insight)}
                >
                  Implement
                </button>
                <button 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    const analysis = getDetailedAnalysis(insight);
                    alert(`Detailed Analysis:\n\n${JSON.stringify(analysis, null, 2)}`);
                  }}
                >
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="insights-actions">
        <h4>Quick Actions</h4>
        <div className="quick-actions-grid">
          <button className="action-card">
            <div className="action-icon">⚡</div>
            <div className="action-text">Optimize Costs</div>
          </button>
          <button className="action-card">
            <div className="action-icon">📊</div>
            <div className="action-text">Run Analysis</div>
          </button>
          <button className="action-card">
            <div className="action-icon">🔄</div>
            <div className="action-text">Compare Scenarios</div>
          </button>
          <button className="action-card">
            <div className="action-icon">📋</div>
            <div className="action-text">Generate Report</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIInsightsPanel;