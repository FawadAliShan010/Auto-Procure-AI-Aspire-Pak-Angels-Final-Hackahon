import {
  PurchaseRequest,
  Gate1Result,
  Gate2Result,
  Gate3Result,
  Gate4Result,
  AIDecisionResult,
  GeminiStandardizationOutput,
  GeminiReasoningOutput,
} from '../types/procurement';
import { analyzePurchaseRequest } from './procurementEngine';

export interface AuditEngineOutput {
  gate1: Gate1Result;
  gate2: Gate2Result;
  gate3: Gate3Result;
  gate4: Gate4Result;
  decisionResult: AIDecisionResult;
  source: 'gemini-live' | 'deterministic-engine' | 'deterministic-fallback';
  anomalyExplanation?: string;
  actionableGuidance?: string;
}

/**
 * Validate standardization JSON received from server/Gemini
 */
export function validateStandardization(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Response is not a valid object'] };
  }
  if (typeof data.standardizedDescription !== 'string' || !data.standardizedDescription.trim()) {
    errors.push('Missing or invalid standardizedDescription string');
  }
  if (typeof data.category !== 'string' || !data.category.trim()) {
    errors.push('Missing or invalid category string');
  }
  if (typeof data.suggestedItemCode !== 'string' || !data.suggestedItemCode.trim()) {
    errors.push('Missing or invalid suggestedItemCode string');
  }
  if (typeof data.glCode !== 'string' || !data.glCode.trim()) {
    errors.push('Missing or invalid glCode string');
  }
  if (!Array.isArray(data.corrections)) {
    errors.push('corrections must be an array of strings');
  }
  if (typeof data.confidence !== 'number' || isNaN(data.confidence) || data.confidence < 0 || data.confidence > 1) {
    errors.push('confidence must be a number between 0.0 and 1.0');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Request server-side Gemini purchase description cleaning & item standardization.
 * Strictly proxies through the server without exposing GEMINI_API_KEY to browser code.
 * Falls back to deterministic mock AI response if unavailable or malformed.
 */
export async function requestItemStandardization(
  description: string,
  department?: string,
  simulateMode?: 'normal' | 'malformed' | 'unavailable' | 'low_confidence'
): Promise<GeminiStandardizationOutput> {
  const rawText = (description || '').trim();

  try {
    const res = await fetch('/api/gemini/standardize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: rawText,
        department,
        simulateMode,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const json = await res.json();
    const validation = validateStandardization(json);

    if (validation.isValid) {
      return {
        standardizedDescription: json.standardizedDescription,
        category: json.category,
        suggestedItemCode: json.suggestedItemCode,
        glCode: json.glCode,
        corrections: Array.isArray(json.corrections) ? json.corrections : [],
        confidence: Number(json.confidence) || 0.85,
        source: json.source || 'gemini-live',
      };
    } else {
      console.warn('Malformed standardization response received, applying fallback:', validation.errors);
      throw new Error('Malformed AI response schema');
    }
  } catch (err) {
    console.warn('Gemini standardization service unavailable or failed, applying deterministic fallback:', err);
    // Local deterministic fallback
    return getLocalDeterministicStandardization(rawText);
  }
}

/**
 * Request server-side Gemini explanation of anomalies & human-readable reasoning.
 */
export async function requestAnomalyReasoning(payload: {
  itemDescription: string;
  standardizedDescription: string;
  decision: string;
  quantity: number;
  totalCost: number;
  availableBudget: number;
  variance: number;
  transferQuantity: number;
  purchaseQuantity: number;
  estimatedSavings: number;
  monthsOfSupply: number;
  confidence: number;
  anomaliesFound: string[];
}): Promise<GeminiReasoningOutput> {
  try {
    const res = await fetch('/api/gemini/explain-anomalies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const json = await res.json();
    if (json && typeof json.executiveHeadline === 'string' && Array.isArray(json.humanReadableReasoning)) {
      return {
        executiveHeadline: json.executiveHeadline,
        anomalyExplanation: json.anomalyExplanation || 'Audit evaluated against active procurement rules.',
        humanReadableReasoning: json.humanReadableReasoning,
        actionableGuidance: json.actionableGuidance,
        source: json.source || 'gemini-live',
      };
    }
    throw new Error('Invalid reasoning structure');
  } catch (err) {
    console.warn('Gemini reasoning service unavailable, falling back to deterministic narrative:', err);
    return {
      executiveHeadline: `Requisition evaluated for ${payload.standardizedDescription}: Decision ${payload.decision}.`,
      anomalyExplanation: payload.anomaliesFound.length > 0 ? payload.anomaliesFound.join('; ') : 'No policy deviations detected.',
      humanReadableReasoning: [
        `Requisition total commitment is $${payload.totalCost.toLocaleString()} for ${payload.quantity} units.`,
        payload.transferQuantity > 0
          ? `Sourcing ${payload.transferQuantity} units from sister facility inventory, saving $${payload.estimatedSavings.toLocaleString()}.`
          : `External purchase order of ${payload.purchaseQuantity} units required.`,
        payload.variance > 0
          ? `Budget variance of $${payload.variance.toLocaleString()} detected against limit.`
          : 'Departmental budget verified and compliant.',
      ],
      actionableGuidance: 'Proceed according to procurement gatekeeper decision.',
      source: 'deterministic-fallback',
    };
  }
}

/**
 * Local deterministic fallback if network or server is completely offline
 */
function getLocalDeterministicStandardization(description: string): GeminiStandardizationOutput {
  const lower = (description || '').toLowerCase();
  const corrections: string[] = [];

  if (lower.includes('pip') || lower.includes('steele') || lower.includes('steel') || lower.includes('3in')) {
    if (lower.includes('steele')) corrections.push('Typo: "steele" corrected to "steel"');
    if (lower.includes('pip')) corrections.push('Truncation: "pip" expanded to "pipe"');
    if (lower.includes('3in')) corrections.push('Specification: "3in" expanded to "3-inch"');
    if (lower.includes('50 count') || lower.includes('count')) corrections.push('Extracted count: 50 units');

    return {
      standardizedDescription: '3-inch carbon-steel pipe',
      category: 'Piping',
      suggestedItemCode: '#402-STEEL-P3',
      glCode: '5120 - MRO Supplies',
      corrections: corrections.length > 0 ? corrections : ['Industrial standard terminology aligned'],
      confidence: 0.95,
      source: 'deterministic-fallback',
    };
  }

  if (lower.includes('helm') || lower.includes('saftey') || lower.includes('safety')) {
    if (lower.includes('saftey')) corrections.push('Typo: "saftey" corrected to "Safety"');
    if (lower.includes('helms')) corrections.push('Colloquial: "helms" standardized to "Safety Helmet"');

    return {
      standardizedDescription: 'Safety Helmet',
      category: 'Safety & PPE',
      suggestedItemCode: '#HS-9912',
      glCode: '5510 - Operational Safety Expenses',
      corrections: corrections.length > 0 ? corrections : ['Aligned with PPE industrial safety standards'],
      confidence: 0.98,
      source: 'deterministic-fallback',
    };
  }

  if (lower.includes('charger') || lower.includes('65w') || lower.includes('adapter')) {
    if (!lower.includes('usb-c')) corrections.push('Interface standardized: USB-C Type');

    return {
      standardizedDescription: 'Laptop Charger 65W USB-C Type',
      category: 'IT Accessories',
      suggestedItemCode: '#IT-CHR-065W',
      glCode: '6201 - IT Consumables',
      corrections: corrections.length > 0 ? corrections : ['Added official USB-C 65W spec'],
      confidence: 0.97,
      source: 'deterministic-fallback',
    };
  }

  if (lower.includes('chair') || lower.includes('ergo') || lower.includes('seat')) {
    return {
      standardizedDescription: 'Ergonomic Task Office Chair',
      category: 'Office Furniture',
      suggestedItemCode: '#OF-CHR-ERG1',
      glCode: '5410 - Corporate Admin & Facilities',
      corrections: ['Standardized to ergonomic master catalog specification'],
      confidence: 0.94,
      source: 'deterministic-fallback',
    };
  }

  return {
    standardizedDescription: description ? description.trim() : 'Unspecified Requisition Item',
    category: 'General Supplies / Uncategorized',
    suggestedItemCode: 'NON-CATALOG-ITEM',
    glCode: '9999 - Suspense Account',
    corrections: ['No exact SKU found in master catalog. Manual review required.'],
    confidence: 0.45,
    source: 'deterministic-fallback',
  };
}

/**
 * Intelligent Requisition Audit Workflow
 * 
 * Rules:
 * 1. ZERO arithmetic in Gemini. All math (costs, variance, transfers, run rates)
 *    is 100% computed in deterministic code.
 * 2. Gemini performs:
 *    - Purchase description cleaning
 *    - Item standardization
 *    - Category classification
 *    - Item/SKU matching suggestion
 *    - Explanation of anomalies
 *    - Human-readable procurement reasoning
 * 3. Never let malformed AI output crash the application; validated thoroughly.
 * 4. Zero exposure of GEMINI_API_KEY in client bundles.
 */
export async function runRequisitionAudit(
  draft: Partial<PurchaseRequest>
): Promise<AuditEngineOutput> {
  const rawText = draft.itemDescription || '';

  // Step 1: Call Gemini via secure server endpoint for description cleaning & item standardization
  const standardization = await requestItemStandardization(rawText, draft.department);

  // Step 2: Pass standardization and confidence into deterministic engine
  // This computes all numeric totals, inventory matches, run-rate ceilings, and policy decision
  const deterministicOutput = analyzePurchaseRequest({
    ...draft,
    itemDescription: standardization.standardizedDescription,
  });

  // Collect any detected anomalies for explanation
  const anomaliesFound: string[] = [];
  if (standardization.confidence < 0.80) {
    anomaliesFound.push(`Catalog match confidence is low (${(standardization.confidence * 100).toFixed(0)}%), triggering verification`);
  }
  if (deterministicOutput.gate2.variance > 0) {
    anomaliesFound.push(`Budget allocation exceeded by $${deterministicOutput.gate2.variance.toLocaleString()}`);
  }
  if (deterministicOutput.gate3.recommendedTransferQuantity > 0) {
    anomaliesFound.push(`Excess idle stock (${deterministicOutput.gate3.recommendedTransferQuantity} units) found at sister facility`);
  }
  if (deterministicOutput.gate4.status === 'High') {
    anomaliesFound.push(`Requested quantity represents ${deterministicOutput.gate4.monthsOfSupply.toFixed(1)} months of supply (exceeds policy ceiling)`);
  }

  // Step 3: Call Gemini for natural language explanation of anomalies & human-readable reasoning
  const reasoningOutput = await requestAnomalyReasoning({
    itemDescription: rawText,
    standardizedDescription: standardization.standardizedDescription,
    decision: deterministicOutput.decisionResult.decision,
    quantity: Number(draft.quantity) || 1,
    totalCost: deterministicOutput.gate2.estimatedCost,
    availableBudget: deterministicOutput.gate2.availableBudget,
    variance: deterministicOutput.gate2.variance,
    transferQuantity: deterministicOutput.decisionResult.transferQuantity,
    purchaseQuantity: deterministicOutput.decisionResult.purchaseQuantity,
    estimatedSavings: deterministicOutput.decisionResult.estimatedSavings,
    monthsOfSupply: deterministicOutput.gate4.monthsOfSupply,
    confidence: standardization.confidence,
    anomaliesFound,
  });

  const gate1: Gate1Result = {
    originalInput: rawText || 'Unspecified Item',
    standardized: standardization.standardizedDescription,
    matchedItemCode: standardization.suggestedItemCode.replace('#', ''),
    category: standardization.category,
    glCode: standardization.glCode,
    confidenceScore: standardization.confidence,
    typosCorrected: standardization.corrections,
  };

  const decisionResult: AIDecisionResult = {
    ...deterministicOutput.decisionResult,
    headline: reasoningOutput.executiveHeadline || deterministicOutput.decisionResult.headline,
    reasoning:
      reasoningOutput.humanReadableReasoning?.length > 0
        ? reasoningOutput.humanReadableReasoning
        : deterministicOutput.decisionResult.reasoning,
  };

  const finalSource =
    standardization.source === 'gemini-live' || reasoningOutput.source === 'gemini-live'
      ? 'gemini-live'
      : 'deterministic-fallback';

  return {
    gate1,
    gate2: deterministicOutput.gate2,
    gate3: deterministicOutput.gate3,
    gate4: deterministicOutput.gate4,
    decisionResult,
    source: finalSource,
    anomalyExplanation: reasoningOutput.anomalyExplanation,
    actionableGuidance: reasoningOutput.actionableGuidance,
  };
}
