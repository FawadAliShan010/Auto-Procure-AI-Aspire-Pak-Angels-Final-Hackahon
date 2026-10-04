/**
 * AutoProcure AI - Inventory / Transfer Agent
 *
 * Part 2 Specialist Agent
 * Reuses existing warehouse and inventory calculations.
 * Investigates local inventory, sister sites, idle/excess stock, and transfer feasibility.
 */

import { PurchaseRequest } from '../../../types/procurement';
import { AgentExecutionResult, RiskLevel } from '../types';
import { getInventoryEvidence, InventoryEvidence } from '../agentTools';

export function runInventoryAgent(
  request: Partial<PurchaseRequest>
): {
  result: AgentExecutionResult;
  evidence: InventoryEvidence;
} {
  const itemDesc = request.itemDescription || '';
  const quantity = Math.max(1, Number(request.quantity) || 1);

  // Invoke tool (which directly reuses existing catalog & warehouse models)
  const evidence = getInventoryEvidence(itemDesc, undefined, quantity);

  let finding = '';
  let riskLevel: RiskLevel = 'LOW';
  let recommendedNextStep = '';

  if (evidence.isSufficientLocally) {
    finding = `Local warehouse has ${evidence.localWarehouseStock} units in stock. Entire requisition (${quantity} units) can be fulfilled locally without external purchase order or inter-site transit.`;
    recommendedNextStep = 'Verify standard consumption run-rate with HISTORICAL_AGENT before dispatching local picking slip.';
  } else if (evidence.transferrableQuantity >= quantity) {
    finding = `Local stock is depleted (0 units), but sister facilities hold ${evidence.excessOrIdleStock} idle/excess units. 100% of requested volume (${quantity} units) can be satisfied via internal inter-warehouse transfer, completely avoiding external procurement spend.`;
    recommendedNextStep = 'Consult HISTORICAL_AGENT to verify monthly consumption velocity matches requested transfer batch.';
  } else if (evidence.transferrableQuantity > 0) {
    const deficit = quantity - evidence.transferrableQuantity;
    finding = `Partial fulfillment available: ${evidence.transferrableQuantity} units can be transferred from sister warehouses (idle stock), leaving a deficit of ${deficit} units requiring external PO consideration.`;
    riskLevel = 'MEDIUM';
    recommendedNextStep = 'Consult HISTORICAL_AGENT and DECISION_AGENT to evaluate split requisition (transfer + reduced external PO).';
  } else {
    finding = `No local or sister site idle stock available across warehouses (Total usable inventory: 0). Requisition must be fulfilled entirely via external PO.`;
    riskLevel = 'LOW';
    recommendedNextStep = 'Consult HISTORICAL_AGENT and Open PO records to confirm external procurement need.';
  }

  const result: AgentExecutionResult = {
    agentName: 'INVENTORY_AGENT',
    status: 'COMPLETED',
    action: 'AUDIT_INVENTORY_AND_TRANSFERS',
    evidence: {
      sku: evidence.matchedItem.sku,
      officialTitle: evidence.matchedItem.officialTitle,
      localWarehouseStock: evidence.localWarehouseStock,
      sisterSiteTotalStock: evidence.sisterSiteTotalStock,
      excessOrIdleStock: evidence.excessOrIdleStock,
      reservedStock: evidence.reservedStock,
      transferrableQuantity: evidence.transferrableQuantity,
      deficitQuantity: evidence.deficitQuantity,
      isSufficientLocally: evidence.isSufficientLocally,
      isSufficientWithTransfer: evidence.isSufficientWithTransfer,
      warehouseLocations: evidence.warehouses.map((w) => `${w.name} (${w.stockStatus}: ${w.quantity})`),
    },
    finding,
    riskLevel,
    recommendedNextStep,
    timestamp: new Date().toISOString(),
  };

  return { result, evidence };
}
