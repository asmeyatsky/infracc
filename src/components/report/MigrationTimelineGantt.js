/**
 * Migration Timeline Gantt Chart Component
 * 
 * Displays migration timeline with:
 * - 3-week landing zone setup
 * - Migration waves with realistic durations
 * - Dependencies between workloads
 */

import React, { useMemo } from 'react';

const MigrationTimelineGantt = ({ workloads = [], strategyResults = null, assessmentResults = null }) => {
  // Performance optimization: Skip heavy workload iteration
  // Full timeline available in PDF report
  return (
    <div className="card">
      <div className="card-header bg-info text-white">
        <h5 className="mb-0">
          <i className="bi bi-calendar-event me-2"></i>
          Migration Timeline
        </h5>
      </div>
      <div className="card-body">
        <div className="alert alert-info">
          <i className="bi bi-info-circle me-2"></i>
          Detailed migration timeline with {workloads.length.toLocaleString()} workloads available in PDF report. 
          Timeline visualization disabled for performance with large workload counts.
        </div>
      </div>
    </div>
  );
  
  /* DISABLED FOR PERFORMANCE - Original code below
  // Calculate timeline data
  const timelineData = useMemo(() => {
    if (!strategyResults || !strategyResults.wavePlan) {
      return null;
    }

    const waves = strategyResults.wavePlan;
    const landingZoneWeeks = 3; // 3-week landing zone setup
    
    // Calculate durations based on complexity and workload type
    const calculateWorkloadDuration = (workload, complexityScore) => {
      const baseDuration = {
        'storage': 1,      // Storage: 1 week
        'function': 2,     // Functions: 2 weeks
        'vm': 3,           // VMs: 3 weeks
        'container': 2,    // Containers: 2 weeks
        'database': 6,     // Databases: 6 weeks
        'application': 4,  // Applications: 4 weeks
        'default': 3        // Default: 3 weeks
      };

      const workloadType = workload.type?.type || workload.type || 'default';
      const typeStr = typeof workloadType === 'string' ? workloadType.toLowerCase() : 'default';
      
      let duration = baseDuration[typeStr] || baseDuration.default;
      
      // Adjust based on complexity
      if (complexityScore >= 8) {
        duration *= 1.5; // High complexity adds 50% time
      } else if (complexityScore >= 6) {
        duration *= 1.25; // Medium-high complexity adds 25% time
      }
      
      // Adjust based on cost (higher cost = more testing/validation)
      const monthlyCost = workload.monthlyCost?.amount || (typeof workload.monthlyCost === 'number' ? workload.monthlyCost : 0);
      if (monthlyCost > 10000) {
        duration += 2; // High cost workloads need more validation
      } else if (monthlyCost > 5000) {
        duration += 1;
      }
      
      // Dependencies add time
      if (workload.dependencies && workload.dependencies.length > 0) {
        duration += Math.min(workload.dependencies.length * 0.5, 3);
      }
      
      return Math.ceil(duration);
    };

    // Organize workloads by wave
    const wave1Workloads = [];
    const wave2Workloads = [];
    const wave3Workloads = [];

    workloads.forEach(workload => {
      // Find workload in wave plan
      let wave = null;
      if (waves.wave1 && waves.wave1.some(w => w.workloadId === workload.id || w.workload?.id === workload.id)) {
        wave = 1;
      } else if (waves.wave2 && waves.wave2.some(w => w.workloadId === workload.id || w.workload?.id === workload.id)) {
        wave = 2;
      } else if (waves.wave3 && waves.wave3.some(w => w.workloadId === workload.id || w.workload?.id === workload.id)) {
        wave = 3;
      }

      // Get complexity score from assessment
      let complexityScore = 5; // Default
      if (assessmentResults && assessmentResults.results) {
        const assessment = assessmentResults.results.find(r => r.workloadId === workload.id);
        if (assessment && !assessment.error) {
          const assessmentData = assessment.assessment || assessment;
          complexityScore = assessmentData.complexityScore || 
                           assessmentData.infrastructureAssessment?.complexityScore || 5;
        }
      }

      const duration = calculateWorkloadDuration(workload, complexityScore);
      const workloadData = {
        id: workload.id,
        name: workload.name || workload.id,
        duration,
        complexityScore,
        wave
      };

      if (wave === 1) wave1Workloads.push(workloadData);
      else if (wave === 2) wave2Workloads.push(workloadData);
      else if (wave === 3) wave3Workloads.push(workloadData);
    });

    // Calculate start dates (weeks from project start)
    let currentWeek = landingZoneWeeks; // Start after landing zone
    
    const wave1Start = currentWeek;
    const wave1Duration = wave1Workloads.length > 0 
      ? Math.max(...wave1Workloads.map(w => w.duration)) + 1 // Max duration + 1 week buffer
      : 0;
    currentWeek += wave1Duration;

    const wave2Start = currentWeek;
    const wave2Duration = wave2Workloads.length > 0
      ? Math.max(...wave2Workloads.map(w => w.duration)) + 1
      : 0;
    currentWeek += wave2Duration;

    const wave3Start = currentWeek;
    const wave3Duration = wave3Workloads.length > 0
      ? Math.max(...wave3Workloads.map(w => w.duration)) + 1
      : 0;

    const totalWeeks = landingZoneWeeks + wave1Duration + wave2Duration + wave3Duration;

    return {
      landingZone: {
        name: 'Landing Zone Setup',
        startWeek: 0,
        duration: landingZoneWeeks,
        color: '#6c757d'
      },
      wave1: {
        name: 'Wave 1 - Quick Wins',
        startWeek: wave1Start,
        duration: wave1Duration,
        workloads: wave1Workloads,
        color: '#28a745'
      },
      wave2: {
        name: 'Wave 2 - Standard Migrations',
        startWeek: wave2Start,
        duration: wave2Duration,
        workloads: wave2Workloads,
        color: '#ffc107'
      },
      wave3: {
        name: 'Wave 3 - Complex Migrations',
        startWeek: wave3Start,
        duration: wave3Duration,
        workloads: wave3Workloads,
        color: '#dc3545'
      },
      totalWeeks
    };
  }, [workloads, strategyResults, assessmentResults]);

  if (!timelineData) {
    return (
      <div className="alert alert-info">
        <i className="bi bi-info-circle me-2"></i>
        Timeline data not available. Please complete Strategy Planning first.
      </div>
    );
  }

  const maxWeeks = timelineData.totalWeeks;
  const weekWidth = 100 / maxWeeks; // Percentage width per week

  const renderBar = (item, isPhase = false) => {
    const width = (item.duration / maxWeeks) * 100;
    const left = (item.startWeek / maxWeeks) * 100;
    
    return (
      <div
        key={item.name}
        className="gantt-bar"
        style={{
          position: 'absolute',
          left: `${left}%`,
          width: `${width}%`,
          backgroundColor: item.color,
          height: isPhase ? '40px' : '25px',
          borderRadius: '4px',
          padding: '4px 8px',
          color: 'white',
          fontSize: isPhase ? '14px' : '12px',
          fontWeight: isPhase ? 'bold' : 'normal',
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          zIndex: isPhase ? 2 : 1
        }}
        title={`${item.name}: ${item.duration} week${item.duration !== 1 ? 's' : ''}`}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name} ({item.duration}w)
        </span>
      </div>
    );
  };

  return (
    <div className="migration-timeline-gantt">
      <h4 className="mb-4">
        <i className="bi bi-calendar-event me-2"></i>
        Migration Timeline
      </h4>
      
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Project Timeline: {timelineData.totalWeeks} weeks total</h5>
        </div>
        <div className="card-body">
          {/* Timeline scale */}
          <div className="mb-3" style={{ position: 'relative', height: '30px', borderBottom: '2px solid #dee2e6' }}>
            {Array.from({ length: Math.ceil(maxWeeks / 4) + 1 }, (_, i) => i * 4).map(week => (
              week <= maxWeeks && (
                <div
                  key={week}
                  style={{
                    position: 'absolute',
                    left: `${(week / maxWeeks) * 100}%`,
                    borderLeft: '1px solid #adb5bd',
                    height: '100%',
                    paddingLeft: '4px',
                    fontSize: '10px',
                    color: '#6c757d'
                  }}
                >
                  W{week}
                </div>
              )
            ))}
          </div>

          {/* Gantt chart */}
          <div style={{ position: 'relative', minHeight: '300px', paddingTop: '10px' }}>
            {/* Landing Zone */}
            {renderBar(timelineData.landingZone, true)}
            
            {/* Wave 1 */}
            {timelineData.wave1.duration > 0 && (
              <>
                {renderBar(timelineData.wave1, true)}
                {timelineData.wave1.workloads.map((workload, idx) => {
                  const workloadBar = {
                    name: workload.name,
                    startWeek: timelineData.wave1.startWeek + (idx * 0.5), // Stagger workloads
                    duration: workload.duration,
                    color: '#51cf66'
                  };
                  return (
                    <div key={workload.id} style={{ marginTop: '45px' }}>
                      {renderBar(workloadBar)}
                    </div>
                  );
                })}
              </>
            )}

            {/* Wave 2 */}
            {timelineData.wave2.duration > 0 && (
              <>
                <div style={{ marginTop: timelineData.wave1.workloads.length > 0 ? '50px' : '45px' }}>
                  {renderBar(timelineData.wave2, true)}
                </div>
                {timelineData.wave2.workloads.map((workload, idx) => {
                  const workloadBar = {
                    name: workload.name,
                    startWeek: timelineData.wave2.startWeek + (idx * 0.5),
                    duration: workload.duration,
                    color: '#ffd43b'
                  };
                  return (
                    <div key={workload.id} style={{ marginTop: '45px' }}>
                      {renderBar(workloadBar)}
                    </div>
                  );
                })}
              </>
            )}

            {/* Wave 3 */}
            {timelineData.wave3.duration > 0 && (
              <>
                <div style={{ marginTop: (timelineData.wave1.workloads.length > 0 || timelineData.wave2.workloads.length > 0) ? '50px' : '45px' }}>
                  {renderBar(timelineData.wave3, true)}
                </div>
                {timelineData.wave3.workloads.map((workload, idx) => {
                  const workloadBar = {
                    name: workload.name,
                    startWeek: timelineData.wave3.startWeek + (idx * 0.5),
                    duration: workload.duration,
                    color: '#ff6b6b'
                  };
                  return (
                    <div key={workload.id} style={{ marginTop: '45px' }}>
                      {renderBar(workloadBar)}
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Legend */}
          <div className="mt-4">
            <h6>Legend:</h6>
            <div className="d-flex flex-wrap gap-3">
              <div><span className="badge" style={{ backgroundColor: '#6c757d' }}>Landing Zone</span></div>
              <div><span className="badge" style={{ backgroundColor: '#28a745' }}>Wave 1 - Quick Wins</span></div>
              <div><span className="badge" style={{ backgroundColor: '#ffc107' }}>Wave 2 - Standard</span></div>
              <div><span className="badge" style={{ backgroundColor: '#dc3545' }}>Wave 3 - Complex</span></div>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-4 row">
            <div className="col-md-3">
              <div className="text-center p-3 bg-light rounded">
                <h4>{timelineData.landingZone.duration}</h4>
                <small className="text-muted">Landing Zone (weeks)</small>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center p-3 bg-light rounded">
                <h4>{timelineData.wave1.workloads.length}</h4>
                <small className="text-muted">Wave 1 Workloads</small>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center p-3 bg-light rounded">
                <h4>{timelineData.wave2.workloads.length}</h4>
                <small className="text-muted">Wave 2 Workloads</small>
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-center p-3 bg-light rounded">
                <h4>{timelineData.wave3.workloads.length}</h4>
                <small className="text-muted">Wave 3 Workloads</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  */
};

export default MigrationTimelineGantt;
