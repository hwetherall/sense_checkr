const XLSX = require('xlsx');
const pdfParse = require('pdf-parse');
const fs = require('fs').promises;
const path = require('path');

class DocumentProcessor {
  constructor() {
    this.documents = new Map(); // In-memory storage for processed documents
    this.chunkSize = 800; // Characters per chunk
  }

  async processDocument(filePath, fileName, fileType) {
    try {
      let chunks = [];
      const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      if (fileType === 'excel') {
        chunks = await this.processExcel(filePath, fileName);
      } else if (fileType === 'pdf') {
        chunks = await this.processPDF(filePath, fileName);
      }

      // Store document metadata and chunks
      const document = {
        id: documentId,
        fileName,
        fileType,
        uploadTime: new Date().toISOString(),
        processed: true,
        chunks,
        chunkCount: chunks.length
      };

      this.documents.set(documentId, document);
      
      return document;
    } catch (error) {
      console.error('Error processing document:', error);
      throw new Error(`Failed to process ${fileType} file: ${error.message}`);
    }
  }

  async processExcel(filePath, fileName) {
    const chunks = [];
    
    try {
      const workbook = XLSX.readFile(filePath);
      
      // Process each sheet
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        
        // Get range of cells
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        
        // Extract data by rows for better context
        let currentChunk = {
          content: '',
          metadata: {
            fileName,
            sheetName,
            cellRange: '',
            type: 'excel'
          }
        };
        
        for (let row = range.s.r; row <= range.e.r; row++) {
          let rowContent = [];
          let cellRefs = [];
          
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = worksheet[cellAddress];
            
            if (cell) {
              const value = cell.v !== undefined ? String(cell.v) : '';
              if (value.trim()) {
                rowContent.push(value);
                cellRefs.push(cellAddress);
              }
            }
          }
          
          if (rowContent.length > 0) {
            const rowText = rowContent.join(' | ') + '\n';
            
            // Check if adding this row would exceed chunk size
            if (currentChunk.content.length + rowText.length > this.chunkSize && currentChunk.content.length > 0) {
              // Save current chunk
              chunks.push({ ...currentChunk });
              
              // Start new chunk
              currentChunk = {
                content: rowText,
                metadata: {
                  fileName,
                  sheetName,
                  cellRange: cellRefs.join(', '),
                  type: 'excel'
                }
              };
            } else {
              currentChunk.content += rowText;
              if (currentChunk.metadata.cellRange) {
                currentChunk.metadata.cellRange += ', ' + cellRefs.join(', ');
              } else {
                currentChunk.metadata.cellRange = cellRefs.join(', ');
              }
            }
          }
        }
        
        // Add final chunk if it has content
        if (currentChunk.content.trim()) {
          chunks.push(currentChunk);
        }
      }
      
      return chunks;
    } catch (error) {
      console.error('Excel processing error:', error);
      throw error;
    }
  }

  async processPDF(filePath, fileName) {
    const chunks = [];
    
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      
      // Split by pages first
      const pages = data.text.split('\n\n');
      
      pages.forEach((pageText, pageIndex) => {
        if (!pageText.trim()) return;
        
        // Further split large pages into chunks
        const pageChunks = this.splitIntoChunks(pageText, this.chunkSize);
        
        pageChunks.forEach((chunkText, chunkIndex) => {
          chunks.push({
            content: chunkText,
            metadata: {
              fileName,
              pageNumber: pageIndex + 1,
              chunkInPage: pageChunks.length > 1 ? chunkIndex + 1 : null,
              type: 'pdf'
            }
          });
        });
      });
      
      return chunks;
    } catch (error) {
      console.error('PDF processing error:', error);
      throw error;
    }
  }

  splitIntoChunks(text, maxSize) {
    const chunks = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  getDocument(documentId) {
    return this.documents.get(documentId);
  }

  getAllDocuments() {
    return Array.from(this.documents.values()).map(doc => ({
      id: doc.id,
      fileName: doc.fileName,
      fileType: doc.fileType,
      uploadTime: doc.uploadTime,
      processed: doc.processed,
      chunkCount: doc.chunkCount
    }));
  }

  deleteDocument(documentId) {
    return this.documents.delete(documentId);
  }

  getAllChunks() {
    const allChunks = [];
    
    for (const doc of this.documents.values()) {
      allChunks.push(...doc.chunks.map(chunk => ({
        ...chunk,
        documentId: doc.id
      })));
    }
    
    return allChunks;
  }

  searchChunks(query) {
    const queryLower = query.toLowerCase();
    const results = [];
    
    for (const doc of this.documents.values()) {
      for (const chunk of doc.chunks) {
        if (chunk.content.toLowerCase().includes(queryLower)) {
          results.push({
            ...chunk,
            documentId: doc.id,
            fileName: doc.fileName
          });
        }
      }
    }
    
    return results;
  }
}

module.exports = new DocumentProcessor(); 