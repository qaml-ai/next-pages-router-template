export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { dashboard_id, artifact_id } = req.body;

  if (!dashboard_id || !artifact_id) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      message: 'dashboard_id and artifact_id are required'
    });
  }

  // Stub compatibility check
  const isCompatible = Math.random() > 0.2; // 80% chance of being compatible
  const compatibilityReason = isCompatible 
    ? 'Artifact is compatible with dashboard'
    : 'Artifact data schema does not match dashboard requirements';

  res.status(200).json({
    dashboard_id,
    artifact_id,
    compatible: isCompatible,
    reason: compatibilityReason,
    timestamp: new Date().toISOString()
  });
} 