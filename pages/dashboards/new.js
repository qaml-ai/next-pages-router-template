export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { title, artifact_id } = req.body;

  if (!title) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      message: 'title is required'
    });
  }

  // Stub new dashboard creation
  const newDashboard = {
    id: `dash_${Date.now()}`,
    title,
    description: `Dashboard: ${title}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    artifacts: artifact_id ? [artifact_id] : [],
    artifactCount: artifact_id ? 1 : 0,
    isPublic: false,
    creator: 'user_123'
  };

  res.status(201).json({
    success: true,
    message: 'Dashboard created successfully',
    dashboard: newDashboard
  });
} 