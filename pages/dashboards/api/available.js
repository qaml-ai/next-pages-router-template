export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Stub available dashboards
  const dashboards = [
    {
      id: 'dash_1',
      title: 'Sales Overview',
      description: 'Overview of sales performance and metrics',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-02T00:00:00Z',
      artifactCount: 3,
      isPublic: false
    },
    {
      id: 'dash_2',
      title: 'Marketing Analytics',
      description: 'Marketing campaign performance and ROI',
      createdAt: '2023-01-03T00:00:00Z',
      updatedAt: '2023-01-04T00:00:00Z',
      artifactCount: 5,
      isPublic: true
    },
    {
      id: 'dash_3',
      title: 'Customer Insights',
      description: 'Customer behavior and segmentation analysis',
      createdAt: '2023-01-05T00:00:00Z',
      updatedAt: '2023-01-06T00:00:00Z',
      artifactCount: 2,
      isPublic: false
    }
  ];

  res.status(200).json({
    dashboards,
    total: dashboards.length,
    timestamp: new Date().toISOString()
  });
} 