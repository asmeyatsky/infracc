import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

const getNodeColor = (node) => {
  const colors = {
    'vm': '#FF6384',
    'database': '#36A2EB',
    'storage': '#FFCE56',
    'application': '#4BC0C0',
    'container': '#9966FF',
  };
  return colors[node.type] || '#999';
};

function DependencyMap({ workloads }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());

  const graphData = useMemo(() => {
    if (!workloads || workloads.length === 0) {
      return { nodes: [], links: [] };
    }

    const nodes = workloads.map(workload => ({
      id: workload.id,
      name: workload.name,
      type: workload.type,
      os: workload.os,
      cpu: workload.cpu,
      memory: workload.memory,
      storage: workload.storage,
      val: Math.max(10, (workload.cpu + workload.memory / 4)),
    }));

    const workloadMap = new Map(workloads.map(w => [w.name.toLowerCase(), w]));
    const links = [];
    workloads.forEach(workload => {
      if (workload.dependencies && workload.dependencies.trim()) {
        const deps = workload.dependencies.split(',').map(d => d.trim().toLowerCase());
        deps.forEach(depName => {
          const targetWorkload = workloadMap.get(depName);
          if (targetWorkload && targetWorkload.id !== workload.id) {
            links.push({
              source: workload.id,
              target: targetWorkload.id,
            });
          }
        });
      }
    });

    return { nodes, links };
  }, [workloads]);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);

    const neighbors = new Set();
    const links = new Set();

    graphData.links.forEach(link => {
      if (link.source.id === node.id || link.source === node.id) {
        neighbors.add(link.target.id || link.target);
        links.add(link);
      } else if (link.target.id === node.id || link.target === node.id) {
        neighbors.add(link.source.id || link.source);
        links.add(link);
      }
    });

    neighbors.add(node.id);
    setHighlightNodes(neighbors);
    setHighlightLinks(links);
  }, [graphData]);

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
    setHighlightNodes(new Set());
    setHighlightLinks(new Set());
  }, []);

  const paintNode = useCallback((node, ctx, globalScale) => {
    const label = node.name;
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px Sans-Serif`;

    const isHighlighted = highlightNodes.size === 0 || highlightNodes.has(node.id);

    ctx.beginPath();
    ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
    ctx.fillStyle = isHighlighted ? getNodeColor(node) : '#ccc';
    ctx.fill();

    if (selectedNode && selectedNode.id === node.id) {
      ctx.lineWidth = 3 / globalScale;
      ctx.strokeStyle = '#000';
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isHighlighted ? '#000' : '#999';
    ctx.fillText(label, node.x, node.y + node.val + fontSize);

    ctx.font = `bold ${fontSize * 0.8}px Sans-Serif`;
    ctx.fillStyle = '#fff';
    ctx.fillText(node.type[0].toUpperCase(), node.x, node.y);
  }, [highlightNodes, selectedNode]);

  const paintLink = useCallback((link, ctx, globalScale) => {
    const isHighlighted = highlightLinks.size === 0 || highlightLinks.has(link);

    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.lineWidth = isHighlighted ? 2 / globalScale : 1 / globalScale;
    ctx.strokeStyle = isHighlighted ? '#999' : '#ddd';
    ctx.stroke();

    if (isHighlighted) {
      const arrowLength = 10 / globalScale;
      const arrowWidth = 6 / globalScale;
      const angle = Math.atan2(link.target.y - link.source.y, link.target.x - link.source.x);
      const targetRadius = link.target.val || 5;
      const arrowX = link.target.x - targetRadius * Math.cos(angle);
      const arrowY = link.target.y - targetRadius * Math.sin(angle);

      ctx.save();
      ctx.translate(arrowX, arrowY);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-arrowLength, arrowWidth / 2);
      ctx.lineTo(-arrowLength, -arrowWidth / 2);
      ctx.closePath();
      ctx.fillStyle = '#999';
      ctx.fill();
      ctx.restore();
    }
  }, [highlightLinks]);

  return (
    <div className="card mb-4">
      <div className="card-header bg-warning text-dark">
        <h3 className="mb-0">🗺️ Dependency Visualization Map</h3>
        <small>Interactive network graph showing workload relationships</small>
      </div>
      <div className="card-body">
        {workloads.length === 0 ? (
          <div className="alert alert-info">
            <strong>No workloads discovered yet.</strong> Add workloads with dependencies using the Discovery Tool to see the visualization.
          </div>
        ) : (
          <>
            <div className="row mb-3">
              <div className="col-md-8">
                <div className="alert alert-light mb-0">
                  <strong>💡 Tips:</strong>
                  <ul className="mb-0 mt-2 small">
                    <li>Click on nodes to highlight connections</li>
                    <li>Drag nodes to rearrange the layout</li>
                    <li>Scroll to zoom in/out</li>
                    <li>Node size represents resource usage (CPU + Memory)</li>
                  </ul>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card">
                  <div className="card-body p-2">
                    <h6 className="card-title mb-2">Legend</h6>
                    <div className="d-flex flex-wrap">
                      <span className="badge me-2 mb-1" style={{backgroundColor: '#FF6384'}}>VM</span>
                      <span className="badge me-2 mb-1" style={{backgroundColor: '#36A2EB'}}>Database</span>
                      <span className="badge me-2 mb-1" style={{backgroundColor: '#FFCE56'}}>Storage</span>
                      <span className="badge me-2 mb-1" style={{backgroundColor: '#4BC0C0'}}>Application</span>
                      <span className="badge me-2 mb-1" style={{backgroundColor: '#9966FF'}}>Container</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {graphData.nodes.length > 0 ? (
              <>
                <div style={{
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  backgroundColor: '#f8f9fa'
                }}>
                  <ForceGraph2D
                    graphData={graphData}
                    nodeLabel={node => `${node.name} (${node.type})`}
                    nodeCanvasObject={paintNode}
                    linkCanvasObject={paintLink}
                    onNodeClick={handleNodeClick}
                    onBackgroundClick={handleBackgroundClick}
                    width={window.innerWidth > 768 ? window.innerWidth * 0.85 : window.innerWidth * 0.9}
                    height={600}
                    cooldownTicks={100}
                    enableNodeDrag={true}
                    enableZoomInteraction={true}
                    enablePanInteraction={true}
                  />
                </div>

                {selectedNode && (
                  <div className="card mt-3">
                    <div className="card-body">
                      <h5 className="card-title">
                        <span className="badge" style={{backgroundColor: getNodeColor(selectedNode)}}>
                          {selectedNode.type}
                        </span>
                        {' '}{selectedNode.name}
                      </h5>
                      <div className="row">
                        <div className="col-md-6">
                          <p className="mb-1"><strong>Type:</strong> {selectedNode.type}</p>
                          <p className="mb-1"><strong>OS:</strong> {selectedNode.os}</p>
                          <p className="mb-1"><strong>CPU:</strong> {selectedNode.cpu} cores</p>
                          <p className="mb-1"><strong>Memory:</strong> {selectedNode.memory} GB</p>
                          <p className="mb-1"><strong>Storage:</strong> {selectedNode.storage} GB</p>
                        </div>
                        <div className="col-md-6">
                          <p className="mb-1"><strong>Dependencies:</strong></p>
                          <ul className="list-unstyled ms-3">
                            {graphData.links
                              .filter(link =>
                                (link.source.id === selectedNode.id || link.source === selectedNode.id)
                              )
                              .map((link, idx) => {
                                const targetNode = graphData.nodes.find(n =>
                                  n.id === (link.target.id || link.target)
                                );
                                return targetNode ? (
                                  <li key={idx}>→ {targetNode.name}</li>
                                ) : null;
                              })
                            }
                            {graphData.links.filter(link =>
                              (link.source.id === selectedNode.id || link.source === selectedNode.id)
                            ).length === 0 && (
                              <li className="text-muted">No dependencies</li>
                            )}
                          </ul>
                          <p className="mb-1"><strong>Dependents:</strong></p>
                          <ul className="list-unstyled ms-3">
                            {graphData.links
                              .filter(link =>
                                (link.target.id === selectedNode.id || link.target === selectedNode.id)
                              )
                              .map((link, idx) => {
                                const sourceNode = graphData.nodes.find(n =>
                                  n.id === (link.source.id || link.source)
                                );
                                return sourceNode ? (
                                  <li key={idx}>← {sourceNode.name}</li>
                                ) : null;
                              })
                            }
                            {graphData.links.filter(link =>
                              (link.target.id === selectedNode.id || link.target === selectedNode.id)
                            ).length === 0 && (
                              <li className="text-muted">No dependents</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Statistics */}
                <div className="row mt-3">
                  <div className="col-md-4">
                    <div className="card text-center">
                      <div className="card-body">
                        <h3 className="mb-0">{graphData.nodes.length}</h3>
                        <p className="text-muted mb-0">Total Workloads</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card text-center">
                      <div className="card-body">
                        <h3 className="mb-0">{graphData.links.length}</h3>
                        <p className="text-muted mb-0">Dependencies</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card text-center">
                      <div className="card-body">
                        <h3 className="mb-0">
                          {graphData.nodes.filter(n => {
                            const hasIncoming = graphData.links.some(l =>
                              (l.target.id || l.target) === n.id
                            );
                            const hasOutgoing = graphData.links.some(l =>
                              (l.source.id || l.source) === n.id
                            );
                            return !hasIncoming && !hasOutgoing;
                          }).length}
                        </h3>
                        <p className="text-muted mb-0">Isolated Workloads</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="alert alert-warning">
                <strong>No dependencies found.</strong> Add dependency information to your workloads to see connections.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default DependencyMap;
