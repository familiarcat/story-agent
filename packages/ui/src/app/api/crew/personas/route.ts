/**
 * API Route: /api/crew/personas
 * GET: Returns canonical persona data for crew members
 * 
 * Query params:
 *   - ids: comma-separated crew IDs (optional) — filter specific crew
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCrewPersona, getAllCrewPersonas } from '@story-agent/shared';

export async function GET(request: NextRequest) {
  try {
    const idsParam = request.nextUrl.searchParams.get('ids');

    let personas;

    if (idsParam) {
      const ids = idsParam.split(',').map(id => id.trim());
      personas = [];
      for (const id of ids) {
        const persona = await getCrewPersona(id as 'picard' | 'data' | 'riker' | 'geordi' | 'obrien' | 'worf' | 'yar' | 'troi' | 'crusher' | 'uhura' | 'quark');
        if (persona) personas.push(persona);
      }
    } else {
      personas = await getAllCrewPersonas();
    }

    return NextResponse.json(
      {
        success: true,
        personas: {
          total: personas.length,
          personas,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[crew/personas] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
