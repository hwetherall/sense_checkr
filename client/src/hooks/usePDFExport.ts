import { useCallback } from 'react';
import jsPDF from 'jspdf';
import { useApp } from '../contexts/AppContext';
import { usePerplexityVerification } from './usePerplexityVerification';
import { useDocumentVerification } from './useDocumentVerification';

interface ExportOptions {
  projectName: string;
  chapterName: string;
}

export function usePDFExport() {
  const { state } = useApp();
  const { getPerplexityResult } = usePerplexityVerification();
  const { getDocumentVerificationResult } = useDocumentVerification();

  const generatePDF = useCallback(async (options: ExportOptions) => {
    const { projectName, chapterName } = options;
    const { claims, memoText, companyType } = state;

    // Create new PDF document
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Helper function to add text with word wrapping
    const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
      const fontStyle = isBold ? 'bold' : 'normal';
      pdf.setFont('helvetica', fontStyle);
      pdf.setFontSize(fontSize);
      
      const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);
      
      // Check if we need a new page
      if (yPosition + (lines.length * fontSize * 0.5) > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      
      pdf.text(lines, margin, yPosition);
      yPosition += lines.length * fontSize * 0.5 + 5;
      
      return yPosition;
    };

    // Helper function to add a section break
    const addSectionBreak = () => {
      yPosition += 10;
      if (yPosition > pageHeight - margin - 20) {
        pdf.addPage();
        yPosition = margin;
      }
    };

    // Title Page
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(24);
    pdf.text(projectName, pageWidth / 2, 60, { align: 'center' });
    
    pdf.setFontSize(18);
    pdf.text(chapterName, pageWidth / 2, 80, { align: 'center' });
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(14);
    pdf.text('Investment Memo Verification Report', pageWidth / 2, 100, { align: 'center' });
    
    pdf.setFontSize(12);
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    pdf.text(`Generated on ${date}`, pageWidth / 2, 120, { align: 'center' });

    // Add new page for content
    pdf.addPage();
    yPosition = margin;

    // Executive Summary
    addText('EXECUTIVE SUMMARY', 16, true);
    addSectionBreak();
    
    const totalClaims = claims.length;
    const verifiedClaims = claims.filter(claim => 
      claim.status !== 'unverified' || 
      claim.verificationState === 'verified-perplexity' || 
      claim.verificationState === 'verified-document'
    ).length;
    
    const statusCounts = claims.reduce((acc, claim) => {
      acc[claim.status]++;
      if (claim.verificationState === 'verified-perplexity') acc.aiVerified++;
      if (claim.verificationState === 'verified-document') acc.docVerified++;
      return acc;
    }, { unverified: 0, true: 0, false: 0, assumption: 0, aiVerified: 0, docVerified: 0 });

    addText(`This report contains the verification results for ${totalClaims} critical claims extracted from the investment memo.`);
    addText(`Company Type: ${companyType === 'external' ? 'External Company' : 'Internal Venture'}`);
    addText(`Verification Progress: ${verifiedClaims}/${totalClaims} claims verified (${Math.round(verifiedClaims/totalClaims*100)}%)`);
    addSectionBreak();

    addText('Verification Summary:', 14, true);
    addText(`• True Claims: ${statusCounts.true}`);
    addText(`• False Claims: ${statusCounts.false}`);
    addText(`• Assumptions: ${statusCounts.assumption}`);
    addText(`• Unverified: ${statusCounts.unverified}`);
    addText(`• AI Verified: ${statusCounts.aiVerified}`);
    addText(`• Document Verified: ${statusCounts.docVerified}`);
    addSectionBreak();

    // Original Memo Section
    addText('ORIGINAL MEMO', 16, true);
    addSectionBreak();
    addText(memoText, 10);
    addSectionBreak();

    // Claims Analysis
    addText('CLAIMS ANALYSIS', 16, true);
    addSectionBreak();

    claims.forEach((claim, index) => {
      // Check if we need a new page for this claim
      if (yPosition > pageHeight - margin - 100) {
        pdf.addPage();
        yPosition = margin;
      }

      const perplexityResult = getPerplexityResult(claim.id);
      const documentResult = getDocumentVerificationResult(claim.id);

      // Claim header
      addText(`CLAIM ${index + 1}`, 14, true);
      addText(`Category: ${claim.category.toUpperCase()}`, 11);
      
      // Status determination
      let statusDisplay: string = claim.status;
      let verificationType = 'Manual';
      
      if (documentResult) {
        statusDisplay = documentResult.status === 'found' ? 'verified (found in documents)' : 
                documentResult.status === 'contradicted' ? 'contradicted by documents' : 'not found in documents';
        verificationType = 'Document';
      } else if (perplexityResult) {
        statusDisplay = perplexityResult.status.replace('_', ' ');
        verificationType = 'AI (Perplexity)';
      }
      
      addText(`Status: ${statusDisplay.toUpperCase()}`, 11, true);
      addText(`Verification Type: ${verificationType}`, 11);
      addSectionBreak();

      // Claim text
      addText('Claim Statement:', 12, true);
      addText(claim.text, 11);
      addSectionBreak();

      // Verification details
      if (perplexityResult) {
        addText('AI Verification Analysis:', 12, true);
        addText(perplexityResult.reasoning, 11);
        
        if (perplexityResult.sources && perplexityResult.sources.length > 0) {
          addText('Sources:', 11, true);
          perplexityResult.sources.forEach((source, idx) => {
            addText(`${idx + 1}. ${source}`, 10);
          });
        }
        
        addText(`Confidence Score: ${perplexityResult.confidence}/10`, 11);
        addSectionBreak();
      }

      if (documentResult) {
        addText('Document Verification Analysis:', 12, true);
        addText(documentResult.reasoning, 11);
        
        if (documentResult.citations && documentResult.citations.length > 0) {
          addText('Document Citations:', 11, true);
          documentResult.citations.forEach((citation, idx) => {
            addText(`${idx + 1}. ${citation.fileName} - ${citation.location}`, 10);
            if (citation.content) {
              addText(`   "${citation.content}"`, 10);
            }
          });
        }
        
        addText(`Confidence Score: ${documentResult.confidence}/10`, 11);
        addSectionBreak();
      }

      // Add separator between claims
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
    });

    // Save the PDF
    const fileName = `${projectName.replace(/[^a-z0-9]/gi, '_')}_${chapterName.replace(/[^a-z0-9]/gi, '_')}_verification_report.pdf`;
    pdf.save(fileName);
    
    return { success: true, fileName };
  }, [state, getPerplexityResult, getDocumentVerificationResult]);

  return {
    generatePDF
  };
} 