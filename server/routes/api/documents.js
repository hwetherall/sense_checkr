const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const documentProcessor = require('../../utils/documentProcessor');
const openrouterClient = require('../../utils/openrouter');

const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Documents API is working',
    uploadDir: uploadDir,
    timestamp: new Date().toISOString()
  });
});

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Only Excel (.xlsx, .xls) and PDF files are allowed.`));
    }
  }
});

// Upload documents
router.post('/upload', (req, res, next) => {
  upload.array('documents', 5)(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      
      // Handle multer-specific errors
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        } else if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: 'Too many files. Maximum 5 files allowed.' });
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ error: 'Unexpected field name. Use "documents" for file uploads.' });
        }
      } else if (err) {
        // Handle custom errors (file type validation)
        return res.status(400).json({ error: err.message });
      }
      
      // If no error, continue to the actual upload handler
      handleUpload(req, res, next);
    } else {
      handleUpload(req, res, next);
    }
  });
});

// Actual upload handler
async function handleUpload(req, res, next) {
  try {
    console.log('Document upload request received');
    console.log('Files received:', req.files?.length || 0);
    console.log('Request headers:', req.headers);
    
    if (!req.files || req.files.length === 0) {
      console.log('No files in request');
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Check current document count
    const currentDocs = documentProcessor.getAllDocuments();
    if (currentDocs.length + req.files.length > 5) {
      // Clean up uploaded files
      for (const file of req.files) {
        await fs.unlink(file.path).catch(console.error);
      }
      return res.status(400).json({ 
        error: 'Maximum 5 documents allowed. Please delete some documents first.' 
      });
    }

    const processedDocuments = [];
    const errors = [];

    for (const file of req.files) {
      try {
        const ext = path.extname(file.originalname).toLowerCase();
        const fileType = ext === '.pdf' ? 'pdf' : 'excel';
        
        console.log(`Processing ${fileType} file: ${file.originalname}`);
        
        const document = await documentProcessor.processDocument(
          file.path,
          file.originalname,
          fileType
        );
        
        processedDocuments.push(document);
        console.log(`Successfully processed ${file.originalname}`);
      } catch (error) {
        console.error(`Error processing ${file.originalname}:`, error);
        errors.push({
          fileName: file.originalname,
          error: error.message
        });
        // Clean up failed file
        await fs.unlink(file.path).catch(console.error);
      }
    }

    res.json({
      success: true,
      documents: processedDocuments.map(doc => ({
        id: doc.id,
        fileName: doc.fileName,
        fileType: doc.fileType,
        uploadTime: doc.uploadTime,
        processed: doc.processed,
        chunkCount: doc.chunkCount
      })),
      errors: errors.length > 0 ? errors : undefined,
      totalDocuments: documentProcessor.getAllDocuments().length
    });

  } catch (error) {
    console.error('Upload error:', error);
    console.error('Error stack:', error.stack);
    
    // Clean up any uploaded files on error
    if (req.files) {
      for (const file of req.files) {
        await fs.unlink(file.path).catch(console.error);
      }
    }
    
    next(error);
  }
}

// List all documents
router.get('/', async (req, res) => {
  try {
    const documents = documentProcessor.getAllDocuments();
    res.json({
      success: true,
      documents,
      totalDocuments: documents.length
    });
  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

// Delete a document
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const document = documentProcessor.getDocument(id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Delete from processor
    const deleted = documentProcessor.deleteDocument(id);
    
    if (deleted) {
      // Try to delete the physical file
      const files = await fs.readdir(uploadDir);
      
      for (const file of files) {
        if (file.includes(document.fileName)) {
          await fs.unlink(path.join(uploadDir, file)).catch(console.error);
        }
      }
      
      res.json({
        success: true,
        message: 'Document deleted successfully',
        totalDocuments: documentProcessor.getAllDocuments().length
      });
    } else {
      res.status(500).json({ error: 'Failed to delete document' });
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Verify claim against documents
router.post('/verify', async (req, res, next) => {
  try {
    const { claimText, claimId } = req.body;
    
    if (!claimText) {
      return res.status(400).json({ error: 'Claim text is required' });
    }
    
    console.log('Document verification request:', { claimText, claimId });
    
    // Get all document chunks
    const allChunks = documentProcessor.getAllChunks();
    
    if (allChunks.length === 0) {
      return res.json({
        verificationResult: {
          status: 'not_found',
          reasoning: 'No documents available for verification.',
          citations: [],
          confidence: 0,
          searchQuery: claimText,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    console.log(`Searching through ${allChunks.length} chunks`);
    
    // Verify with AI
    const verificationResult = await openrouterClient.verifyClaimWithDocuments(
      claimText,
      allChunks
    );
    
    res.json({
      verificationResult: {
        ...verificationResult,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Document verification error:', error);
    next(error);
  }
});

// Search documents
router.post('/search', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const results = documentProcessor.searchChunks(query);
    
    res.json({
      success: true,
      results: results.slice(0, 10), // Limit to 10 results
      totalResults: results.length
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router; 