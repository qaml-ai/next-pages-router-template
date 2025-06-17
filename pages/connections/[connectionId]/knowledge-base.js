export default function handler(req, res) {
  const { connectionId } = req.query;

  if (!connectionId) {
    return res.status(400).json({ 
      error: 'Missing required parameter',
      message: 'connectionId is required'
    });
  }

  if (req.method === 'GET') {
    // Fetch knowledge bases
    const knowledgeBases = [
      {
        id: 'kb_1',
        name: 'Customer Database',
        description: 'Customer information and transaction history',
        type: 'database',
        tables: ['customers', 'orders', 'products'],
        lastUpdated: '2023-01-01T00:00:00Z'
      },
      {
        id: 'kb_2',
        name: 'Sales Reports',
        description: 'Monthly and quarterly sales reports',
        type: 'files',
        fileCount: 24,
        lastUpdated: '2023-01-02T00:00:00Z'
      }
    ];

    res.status(200).json({
      connectionId,
      knowledgeBases,
      total: knowledgeBases.length,
      timestamp: new Date().toISOString()
    });

  } else if (req.method === 'POST') {
    // Update knowledge bases
    const { knowledge_bases } = req.body;

    if (!knowledge_bases) {
      return res.status(400).json({ 
        error: 'Missing required field',
        message: 'knowledge_bases is required'
      });
    }

    // Stub update implementation
    console.log(`Updating knowledge bases for connection ${connectionId}:`, knowledge_bases);

    res.status(200).json({
      success: true,
      message: 'Knowledge bases updated successfully',
      connectionId,
      updatedKnowledgeBases: knowledge_bases,
      timestamp: new Date().toISOString()
    });

  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
} 