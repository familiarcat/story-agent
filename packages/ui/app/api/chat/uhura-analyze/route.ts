/**
 * Uhura Format Analysis Endpoint
 * 
 * Uhura (communications officer) analyzes incoming text to identify the best format/communication style.
 * She is an expert in linguistics, language patterns, and communication protocols across multiple cultures.
 * 
 * Analyzes:
 * - Markdown formatting (headers, lists, emphasis, code blocks)
 * - JSON structure
 * - Code (with language detection)
 * - Screenplay / narrative format
 * - Plain text
 * 
 * Returns the detected format and confidence level.
 */

import { NextRequest, NextResponse } from 'next/server';

interface AnalysisRequest {
  message: string;
}

interface AnalysisResponse {
  format: string;
  confidence: number;
  details: string;
}

// Simple heuristic format detection (Uhura's analysis)
function analyzeFormat(text: string): AnalysisResponse {
  const trimmed = text.trim();

  // JSON detection
  if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && isValidJSON(trimmed)) {
    return {
      format: '📋 JSON',
      confidence: 0.95,
      details: 'Structured data format',
    };
  }

  // Code block detection (triple backticks or language-specific syntax)
  if (trimmed.includes('```')) {
    return {
      format: '💻 Code',
      confidence: 0.9,
      details: 'Code block detected',
    };
  }

  // Screenplay/narrative format detection
  if (
    /^(INT\.|EXT\.|FADE IN|FADE OUT|CUT TO|SCENE|ACT)/m.test(trimmed) ||
    /^[A-Z\s]+\n\s*\([^)]*\)/m.test(trimmed) // Character with action
  ) {
    return {
      format: '🎬 Screenplay',
      confidence: 0.85,
      details: 'Screenplay or narrative format',
    };
  }

  // Markdown detection
  const markdownPatterns = [
    /^#{1,6}\s/m, // Headers
    /^\s*[-*+]\s/m, // Unordered lists
    /^\s*\d+\.\s/m, // Ordered lists
    /\*\*.*?\*\*/m, // Bold
    /\*.*?\*/m, // Italic
    /^>\s/m, // Blockquotes
    /\[.*?\]\(.*?\)/m, // Links
  ];

  const markdownMatches = markdownPatterns.filter(p => p.test(trimmed)).length;
  if (markdownMatches >= 2) {
    return {
      format: '📝 Markdown',
      confidence: 0.85,
      details: `${markdownMatches} markdown patterns detected`,
    };
  }

  // Default: plaintext
  return {
    format: '📄 Plaintext',
    confidence: 0.5,
    details: 'Unstructured text',
  };
}

function isValidJSON(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalysisResponse>> {
  try {
    const body = (await request.json()) as AnalysisRequest;
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        {
          format: '❓ Unknown',
          confidence: 0,
          details: 'No message provided',
        },
        { status: 400 }
      );
    }

    // Uhura analyzes the format
    const analysis = analyzeFormat(message);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Uhura analysis error:', error);
    return NextResponse.json(
      {
        format: '⚠️ Error',
        confidence: 0,
        details: 'Format analysis failed',
      },
      { status: 500 }
    );
  }
}
