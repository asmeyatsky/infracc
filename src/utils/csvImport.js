// CSV/Excel Import Utilities

export const parseCSV = (csvText) => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const workloads = [];

  // Expected columns: name, type, os, cpu, memory, storage, monthlyTraffic, dependencies
  const requiredFields = ['name', 'type'];
  const hasRequiredFields = requiredFields.every(field => headers.includes(field));

  if (!hasRequiredFields) {
    throw new Error(`CSV must include at least these columns: ${requiredFields.join(', ')}`);
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map(v => v.trim());
    const workload = {
      id: Date.now() + i,
      name: '',
      type: 'vm',
      os: 'linux',
      cpu: 0,
      memory: 0,
      storage: 0,
      monthlyTraffic: 0,
      dependencies: '',
    };

    headers.forEach((header, index) => {
      const value = values[index] || '';

      switch (header) {
        case 'name':
          workload.name = value;
          break;
        case 'type':
          const validTypes = ['vm', 'database', 'storage', 'application', 'container'];
          workload.type = validTypes.includes(value.toLowerCase()) ? value.toLowerCase() : 'vm';
          break;
        case 'os':
          workload.os = value.toLowerCase() === 'windows' ? 'windows' : 'linux';
          break;
        case 'cpu':
        case 'vcpu':
        case 'vcpus':
          workload.cpu = parseInt(value) || 0;
          break;
        case 'memory':
        case 'ram':
        case 'ram_gb':
          workload.memory = parseInt(value) || 0;
          break;
        case 'storage':
        case 'disk':
        case 'storage_gb':
          workload.storage = parseInt(value) || 0;
          break;
        case 'monthlytraffic':
        case 'network':
        case 'traffic':
        case 'bandwidth':
          workload.monthlyTraffic = parseInt(value) || 0;
          break;
        case 'dependencies':
        case 'depends_on':
          workload.dependencies = value;
          break;
        default:
          break;
      }
    });

    if (workload.name) {
      workloads.push(workload);
    }
  }

  return workloads;
};

export const generateCSVTemplate = () => {
  const headers = ['name', 'type', 'os', 'cpu', 'memory', 'storage', 'monthlyTraffic', 'dependencies'];
  const examples = [
    ['web-server-1', 'vm', 'linux', '4', '16', '100', '500', 'db-server'],
    ['db-server', 'database', 'linux', '8', '64', '1000', '100', ''],
    ['file-storage', 'storage', 'linux', '2', '8', '5000', '2000', ''],
    ['api-service', 'application', 'linux', '4', '16', '50', '800', 'db-server'],
    ['container-app', 'container', 'linux', '2', '8', '20', '300', 'api-service'],
  ];

  const csv = [
    headers.join(','),
    ...examples.map(row => row.join(',')),
  ].join('\n');

  return csv;
};

export const downloadCSVTemplate = () => {
  const csv = generateCSVTemplate();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'workloads-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportWorkloadsToCSV = (workloads) => {
  if (!workloads || workloads.length === 0) {
    throw new Error('No workloads to export');
  }

  const headers = ['name', 'type', 'os', 'cpu', 'memory', 'storage', 'monthlyTraffic', 'dependencies'];
  const rows = workloads.map(w => [
    w.name,
    w.type,
    w.os,
    w.cpu,
    w.memory,
    w.storage,
    w.monthlyTraffic,
    w.dependencies || '',
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `workloads-export-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
