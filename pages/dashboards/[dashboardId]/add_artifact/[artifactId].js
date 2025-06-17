export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { dashboardId, artifactId } = req.query;

  if (!dashboardId || !artifactId) {
    return res.status(400).json({ 
      error: 'Missing required parameters',
      message: 'dashboardId and artifactId are required'
    });
  }

  // Stub adding artifact to dashboard
  const result = {
    dashboardId,
    artifactId,
    success: true,
    message: `Artifact ${artifactId} added to dashboard ${dashboardId}`,
    addedAt: new Date().toISOString()
  };

  res.status(200).json(result);
} 