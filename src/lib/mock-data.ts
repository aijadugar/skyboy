export interface AlgorithmRun {
  id: string;
  name: string;
  version: string;
  dataset: string;
  status: 'clean' | 'regressed' | 'running' | 'queued';
  score: number;
  timestamp: string;
}

export const mockRuns: AlgorithmRun[] = [
  {
    id: 'run-001',
    name: 'DenseRetriever-v2',
    version: '2.3.1',
    dataset: 'LOCOMO',
    status: 'clean',
    score: 0.847,
    timestamp: '2025-08-17T09:23:00Z',
  },
  {
    id: 'run-002',
    name: 'SparseBM25-Plus',
    version: '1.0.4',
    dataset: 'BEIR',
    status: 'regressed',
    score: 0.612,
    timestamp: '2025-08-17T08:45:00Z',
  },
  {
    id: 'run-003',
    name: 'HybridFusion-X',
    version: '3.1.0',
    dataset: 'MTEB',
    status: 'running',
    score: 0.0,
    timestamp: '2025-08-17T10:01:00Z',
  },
  {
    id: 'run-004',
    name: 'ColBERT-Sharded',
    version: '2.0.1',
    dataset: 'LOCOMO',
    status: 'clean',
    score: 0.891,
    timestamp: '2025-08-16T16:30:00Z',
  },
  {
    id: 'run-005',
    name: 'Embedding-Mini',
    version: '1.2.0',
    dataset: 'BEIR',
    status: 'queued',
    score: 0.0,
    timestamp: '2025-08-17T10:15:00Z',
  },
  {
    id: 'run-006',
    name: 'CrossEncoder-Large',
    version: '4.0.0',
    dataset: 'MTEB',
    status: 'clean',
    score: 0.923,
    timestamp: '2025-08-16T14:20:00Z',
  },
];
