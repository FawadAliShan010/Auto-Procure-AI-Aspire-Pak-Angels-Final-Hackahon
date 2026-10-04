import { PurchaseRequest, UserProfile } from '../types/procurement';

export const CURRENT_USER: UserProfile = {
  id: 'usr-101',
  name: 'Fawad Ali Shan',
  email: 'fawad.alishan@enterprise.com',
  role: 'PURCHASE_MANAGER',
  department: 'Procurement & Supply Chain',
  avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
};

export const ALTERNATE_USER: UserProfile = {
  id: 'usr-102',
  name: 'Marcus Vance',
  email: 'marcus.vance@apexgroup.com',
  role: 'REQUISITIONER',
  department: 'Maintenance / Operations',
  avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
};

export const ADMIN_USER: UserProfile = {
  id: 'usr-100',
  name: 'Sarah Chen',
  email: 'sarah.chen@enterprise.com',
  role: 'ADMIN',
  department: 'Governance & Enterprise Administration',
  avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
};

export const DEMO_PERSONAS: UserProfile[] = [
  ALTERNATE_USER,
  CURRENT_USER,
  ADMIN_USER,
];

export interface MasterCatalogItem {
  sku: string;
  officialTitle: string;
  category: string;
  glCode: string;
  glName: string;
  standardUnitPrice: number;
  avgMonthlyConsumption: number;
  localWarehouseStock: number;
  sisterSiteStock: Array<{
    siteId: string;
    siteName: string;
    quantity: number;
    status: 'excess/project-canceled' | 'idle' | 'reserve';
  }>;
  warehouses: Array<{
    warehouseId: string;
    name: string;
    quantity: number;
    location: string;
    stockStatus: 'In Stock' | 'Excess / Idle' | 'Reserved' | 'Out of Stock';
    isLocal?: boolean;
  }>;
  preceding90Days: Array<{
    month: string;
    usage: number;
  }>;
}

export const ITEM_MASTER_CATALOG: MasterCatalogItem[] = [
  {
    sku: '#IT-CHR-065W',
    officialTitle: 'Laptop Charger 65W USB-C Type',
    category: 'IT Accessories',
    glCode: '6201',
    glName: 'IT Hardware & Consumables',
    standardUnitPrice: 25,
    avgMonthlyConsumption: 2,
    localWarehouseStock: 5,
    sisterSiteStock: [
      { siteId: 'WH-A', siteName: 'Warehouse A', quantity: 5, status: 'idle' },
      { siteId: 'WH-C', siteName: 'Warehouse C', quantity: 10, status: 'excess/project-canceled' },
    ],
    warehouses: [
      { warehouseId: 'WH-A', name: 'Warehouse A', quantity: 5, location: 'Building 2, IT Locker B-2', stockStatus: 'In Stock', isLocal: true },
      { warehouseId: 'WH-B', name: 'Warehouse B', quantity: 0, location: 'Regional Hub East', stockStatus: 'Out of Stock', isLocal: false },
      { warehouseId: 'WH-C', name: 'Warehouse C', quantity: 10, location: 'Depot C, Shelf 4', stockStatus: 'Excess / Idle', isLocal: false },
    ],
    preceding90Days: [
      { month: 'Jun', usage: 2 },
      { month: 'Jul', usage: 1 },
      { month: 'Aug', usage: 3 },
    ],
  },
  {
    sku: '#HS-9912',
    officialTitle: 'Safety Helmet',
    category: 'Safety & PPE',
    glCode: '5510',
    glName: 'Operational Safety Expenses',
    standardUnitPrice: 25,
    avgMonthlyConsumption: 30,
    localWarehouseStock: 0,
    sisterSiteStock: [
      { siteId: 'SITE-B', siteName: 'Site B Distribution Center', quantity: 350, status: 'excess/project-canceled' },
      { siteId: 'SITE-D', siteName: 'Yard Facility D', quantity: 20, status: 'idle' },
    ],
    warehouses: [
      { warehouseId: 'WH-A', name: 'Warehouse A', quantity: 0, location: 'Plant 1 Storage Bay', stockStatus: 'Out of Stock', isLocal: true },
      { warehouseId: 'WH-B', name: 'Warehouse B', quantity: 350, location: 'Site B Distribution, Bay 14', stockStatus: 'Excess / Idle', isLocal: false },
      { warehouseId: 'WH-C', name: 'Warehouse C', quantity: 20, location: 'Regional Yard C, Rack 3', stockStatus: 'Reserved', isLocal: false },
    ],
    preceding90Days: [
      { month: 'Jun', usage: 28 },
      { month: 'Jul', usage: 32 },
      { month: 'Aug', usage: 30 },
    ],
  },
  {
    sku: '#402-STEEL-P3',
    officialTitle: '3-inch carbon-steel pipe',
    category: 'Piping',
    glCode: '5120',
    glName: 'MRO Supplies',
    standardUnitPrice: 145,
    avgMonthlyConsumption: 12,
    localWarehouseStock: 2,
    sisterSiteStock: [
      { siteId: 'WH-B', siteName: 'Warehouse B', quantity: 45, status: 'excess/project-canceled' },
    ],
    warehouses: [
      { warehouseId: 'WH-A', name: 'Warehouse A', quantity: 2, location: 'Bay 4, Rack 12', stockStatus: 'In Stock', isLocal: true },
      { warehouseId: 'WH-B', name: 'Warehouse B', quantity: 45, location: 'Logistics Depot North, Staging A', stockStatus: 'Excess / Idle', isLocal: false },
      { warehouseId: 'WH-C', name: 'Warehouse C', quantity: 0, location: 'Central Distribution Yard', stockStatus: 'Out of Stock', isLocal: false },
    ],
    preceding90Days: [
      { month: 'Jun', usage: 14 },
      { month: 'Jul', usage: 10 },
      { month: 'Aug', usage: 12 },
    ],
  },
  {
    sku: '#OF-CHR-ERG1',
    officialTitle: 'Office Chair',
    category: 'Office Furniture',
    glCode: '5410',
    glName: 'Corporate Admin & Facilities',
    standardUnitPrice: 180,
    avgMonthlyConsumption: 3,
    localWarehouseStock: 1,
    sisterSiteStock: [
      { siteId: 'HQ-STOR', siteName: 'Corporate Basement Storage', quantity: 8, status: 'idle' },
    ],
    warehouses: [
      { warehouseId: 'WH-A', name: 'Warehouse A', quantity: 1, location: 'HQ Floor 2 Staging', stockStatus: 'In Stock', isLocal: true },
      { warehouseId: 'WH-B', name: 'Warehouse B', quantity: 8, location: 'Corporate Basement Storage, Rm 102', stockStatus: 'Excess / Idle', isLocal: false },
      { warehouseId: 'WH-C', name: 'Warehouse C', quantity: 0, location: 'Offsite Archive Yard', stockStatus: 'Out of Stock', isLocal: false },
    ],
    preceding90Days: [
      { month: 'Jun', usage: 3 },
      { month: 'Jul', usage: 4 },
      { month: 'Aug', usage: 2 },
    ],
  },
];

export const DEPARTMENT_BUDGETS: Record<string, number> = {
  'IT / Technology': 150,
  'Maintenance': 4000,
  'HR': 600,
  'Operations': 8500,
  'Facilities & Safety': 3200,
  'Production Plant': 12000,
};

export const INITIAL_PURCHASE_REQUESTS: PurchaseRequest[] = [
  {
    id: 'PR-2025-0842',
    employeeName: 'Fawad Ali Shan',
    department: 'IT / Technology',
    itemDescription: 'Laptop Charger 65W',
    quantity: 10,
    estimatedPrice: 25,
    requiredDate: '2025-09-20',
    additionalNotes: 'Urgent replacement for engineering cohort laptops.',
    createdAt: 'Sep 12, 2025',
    status: 'ON_HOLD',
    gate1: {
      originalInput: 'laptop charger 65w usb-c type',
      standardized: 'Laptop Charger 65W USB-C Type',
      matchedItemCode: 'IT-CHR-065W',
      category: 'IT Accessories',
      glCode: '6201 • IT Consumables',
      confidenceScore: 0.98,
      typosCorrected: ['Standardized casing', 'Mapped to official USB-C 65W SKU'],
    },
    gate2: {
      estimatedCost: 250,
      availableBudget: 150,
      status: 'Warning',
      variance: 100,
      remainingBudget: 0,
      message: 'Budget exceeded by $100 ($250 cost vs $150 available)',
    },
    gate3: {
      localWarehouseName: 'Warehouse A',
      localAvailable: 5,
      otherSites: [
        { siteId: 'WH-A', siteName: 'Warehouse A', quantity: 5, status: 'idle' },
        { siteId: 'WH-C', siteName: 'Warehouse C', quantity: 10, status: 'excess/project-canceled' },
      ],
      warehouses: [
        { warehouseId: 'WH-A', name: 'Warehouse A', quantity: 5, location: 'Building 2, IT Locker B-2', stockStatus: 'In Stock', isLocal: true },
        { warehouseId: 'WH-B', name: 'Warehouse B', quantity: 0, location: 'Regional Hub East', stockStatus: 'Out of Stock', isLocal: false },
        { warehouseId: 'WH-C', name: 'Warehouse C', quantity: 10, location: 'Depot C, Shelf 4', stockStatus: 'Excess / Idle', isLocal: false },
      ],
      totalSisterStock: 15,
      status: 'Found',
      recommendedTransferQuantity: 5,
      transferRecommendation: 'Transfer 5 units from Warehouse A and purchase 5 units externally to stay within quarterly budget limits.',
    },
    gate4: {
      avgMonthlyUsage: 2,
      requestedQuantity: 10,
      monthsOfSupply: 5,
      recommendedQuantity: 5,
      status: 'High',
      usageFlagMessage: 'Requested volume is 5x higher than average monthly consumption (2 units)',
      preceding90Days: [
        { month: 'Jun', usage: 2 },
        { month: 'Jul', usage: 1 },
        { month: 'Aug', usage: 3 },
      ],
    },
    decisionResult: {
      decision: 'REDUCE',
      headline: 'The requested quantity is higher than necessary based on budget and usage analysis.',
      reasoning: [
        'Budget is exceeded by $100 ($250 cost vs $150 available)',
        '15 units are already available across sister warehouses (Warehouse A & Depot C)',
        'Average monthly usage is 2 units (requested 10 units = 5 months supply)',
      ],
      recommendedActions: [
        { type: 'transfer', text: 'Transfer 5 units from Warehouse A', quantity: 5, site: 'Warehouse A' },
        { type: 'purchase', text: 'Purchase only 5 units externally', quantity: 5 },
      ],
      estimatedSavings: 100,
      purchaseQuantity: 5,
      transferQuantity: 5,
    },
    erpSynced: true,
    erpRefId: 'SAP-PO-991204',
  },
  {
    id: 'PR-2025-0841',
    employeeName: 'Marcus Vance',
    department: 'Operations',
    itemDescription: 'Safety Helmet',
    quantity: 500,
    estimatedPrice: 25,
    requiredDate: '2025-09-25',
    additionalNotes: 'Scheduled safety overhaul for plant 3 crew.',
    createdAt: 'Sep 11, 2025',
    status: 'APPROVED',
    gate1: {
      originalInput: '500 saftey helms for site refit project',
      standardized: 'Safety Helmet',
      matchedItemCode: 'HS-9912',
      category: 'Safety & PPE',
      glCode: '5510 • Operational Safety',
      confidenceScore: 0.96,
      typosCorrected: [
        'Typo: "saftey" corrected to "Safety"',
        'Informal: "helms" standardized to "Safety Helmet"',
        'Extracted quantity: 500 units',
      ],
    },
    gate2: {
      estimatedCost: 12500,
      availableBudget: 8500,
      status: 'Warning',
      variance: 4000,
      remainingBudget: 0,
      message: 'Budget variance flagged ($4,000 over initial allocation)',
    },
    gate3: {
      localWarehouseName: 'Warehouse A',
      localAvailable: 0,
      otherSites: [
        { siteId: 'SITE-B', siteName: 'Warehouse B', quantity: 350, status: 'excess/project-canceled' },
        { siteId: 'SITE-D', siteName: 'Warehouse C', quantity: 20, status: 'reserve' },
      ],
      warehouses: [
        { warehouseId: 'WH-A', name: 'Warehouse A', quantity: 0, location: 'Plant 1 Storage Bay', stockStatus: 'Out of Stock', isLocal: true },
        { warehouseId: 'WH-B', name: 'Warehouse B', quantity: 350, location: 'Site B Distribution, Bay 14', stockStatus: 'Excess / Idle', isLocal: false },
        { warehouseId: 'WH-C', name: 'Warehouse C', quantity: 20, location: 'Regional Yard C, Rack 3', stockStatus: 'Reserved', isLocal: false },
      ],
      totalSisterStock: 370,
      status: 'Found',
      recommendedTransferQuantity: 350,
      transferRecommendation: 'Transfer 350 units from Warehouse B (Site B excess stock) and issue purchase order for 50 buffer units.',
    },
    gate4: {
      avgMonthlyUsage: 30,
      requestedQuantity: 500,
      monthsOfSupply: 16.6,
      recommendedQuantity: 50,
      status: 'High',
      usageFlagMessage: '500 units represents 16.6 months of usage baseline (30 units/mo)',
      preceding90Days: [
        { month: 'Jun', usage: 28 },
        { month: 'Jul', usage: 32 },
        { month: 'Aug', usage: 30 },
      ],
    },
    decisionResult: {
      decision: 'PROCEED',
      headline: 'Re-routed with 350 internal transfer units + 50 external order buffer.',
      reasoning: [
        'Typo resolved and categorized to Safety & PPE #HS-9912',
        'Transferred 350 idle units from Warehouse B project-canceled inventory',
        'Resized external order from 500 to 50 units buffer',
        'Avoided external spend of $11,250 recorded',
      ],
      recommendedActions: [
        { type: 'transfer', text: 'Transfer 350 idle units from Warehouse B', quantity: 350, site: 'Warehouse B' },
        { type: 'purchase', text: 'Issue external purchase order for 50 buffer units', quantity: 50 },
      ],
      estimatedSavings: 11250,
      purchaseQuantity: 50,
      transferQuantity: 350,
    },
    erpSynced: true,
    erpRefId: 'ORACLE-REQ-44021',
  },
  {
    id: 'PR-2025-0840',
    employeeName: 'Sarah Jenkins',
    department: 'HR',
    itemDescription: 'Office Chair',
    quantity: 12,
    estimatedPrice: 180,
    requiredDate: '2025-09-30',
    additionalNotes: 'New joiners onboarding for October batch.',
    createdAt: 'Sep 10, 2025',
    status: 'ON_HOLD',
    gate1: {
      originalInput: 'Office Chair ergonomic high-back',
      standardized: 'Office Chair',
      matchedItemCode: 'OF-CHR-ERG1',
      category: 'Office Furniture',
      glCode: '5410 • Corporate Admin',
      confidenceScore: 0.94,
      typosCorrected: ['Standardized chair specs to ergonomic catalog item'],
    },
    gate2: {
      estimatedCost: 2160,
      availableBudget: 600,
      status: 'Failed',
      variance: 1560,
      remainingBudget: 0,
      message: 'Budget exceeded by $1,560 (Available: $600)',
    },
    gate3: {
      localWarehouseName: 'Warehouse A',
      localAvailable: 1,
      otherSites: [
        { siteId: 'HQ-STOR', siteName: 'Warehouse B', quantity: 8, status: 'idle' },
      ],
      warehouses: [
        { warehouseId: 'WH-A', name: 'Warehouse A', quantity: 1, location: 'HQ Floor 2 Staging', stockStatus: 'In Stock', isLocal: true },
        { warehouseId: 'WH-B', name: 'Warehouse B', quantity: 8, location: 'Corporate Basement Storage, Rm 102', stockStatus: 'Excess / Idle', isLocal: false },
        { warehouseId: 'WH-C', name: 'Warehouse C', quantity: 0, location: 'Offsite Archive Yard', stockStatus: 'Out of Stock', isLocal: false },
      ],
      totalSisterStock: 8,
      status: 'Found',
      recommendedTransferQuantity: 8,
      transferRecommendation: 'Transfer 8 units from Warehouse B and request VP Finance budget override for remaining 4 units.',
    },
    gate4: {
      avgMonthlyUsage: 3,
      requestedQuantity: 12,
      monthsOfSupply: 4,
      recommendedQuantity: 4,
      status: 'Optimal',
      usageFlagMessage: 'Within quarterly onboarding baseline',
      preceding90Days: [
        { month: 'Jun', usage: 3 },
        { month: 'Jul', usage: 4 },
        { month: 'Aug', usage: 2 },
      ],
    },
    decisionResult: {
      decision: 'HOLD',
      headline: 'Department budget insufficient; awaiting quarterly adjustment or override.',
      reasoning: [
        'HR Budget deficit exceeds 200% threshold',
        '8 surplus chairs located in Corporate Basement Storage',
        'Manager sign-off required for external order delta',
      ],
      recommendedActions: [
        { type: 'transfer', text: 'Transfer 8 chairs from Warehouse B', quantity: 8, site: 'Warehouse B' },
        { type: 'budget_override', text: 'Request VP Finance Budget Variance Override for remaining 4 units' },
      ],
      estimatedSavings: 1440,
      purchaseQuantity: 4,
      transferQuantity: 8,
    },
    erpSynced: false,
  },
  {
    id: 'PR-2025-0839',
    employeeName: 'Dave Miller',
    department: 'Maintenance',
    itemDescription: 'Steel Pipe',
    quantity: 50,
    estimatedPrice: 145,
    requiredDate: '2025-09-18',
    additionalNotes: 'Urgent cooling loop pipe replacement.',
    createdAt: 'Sep 9, 2025',
    status: 'APPROVED',
    gate1: {
      originalInput: '3in steele pip for factory maintenance 50 count',
      standardized: '3-inch carbon-steel pipe',
      matchedItemCode: '402-STEEL-P3',
      category: 'Piping',
      glCode: '5120 • MRO Supplies',
      confidenceScore: 0.99,
      typosCorrected: [
        'Typo: "steele" → "steel"',
        'Truncation: "pip" → "pipe"',
        'Specification: "3in" → "3-inch carbon-steel pipe"',
        'Unit extraction: "50 count" → 50 units',
      ],
    },
    gate2: {
      estimatedCost: 7250,
      availableBudget: 4000,
      status: 'Warning',
      variance: 3250,
      remainingBudget: 0,
      message: 'Exceeds available maintenance allocation by $3,250 ($7,250 cost vs $4,000 available)',
    },
    gate3: {
      localWarehouseName: 'Warehouse A',
      localAvailable: 2,
      otherSites: [
        { siteId: 'WH-B', siteName: 'Warehouse B', quantity: 45, status: 'excess/project-canceled' },
      ],
      warehouses: [
        { warehouseId: 'WH-A', name: 'Warehouse A', quantity: 2, location: 'Bay 4, Rack 12', stockStatus: 'In Stock', isLocal: true },
        { warehouseId: 'WH-B', name: 'Warehouse B', quantity: 45, location: 'Logistics Depot North, Staging A', stockStatus: 'Excess / Idle', isLocal: false },
        { warehouseId: 'WH-C', name: 'Warehouse C', quantity: 0, location: 'Central Distribution Yard', stockStatus: 'Out of Stock', isLocal: false },
      ],
      totalSisterStock: 45,
      status: 'Found',
      recommendedTransferQuantity: 45,
      transferRecommendation: 'Transfer 45 units from Warehouse B (Logistics Depot North) to local facility to avoid external supplier lead time and save $6,525.',
    },
    gate4: {
      avgMonthlyUsage: 12,
      requestedQuantity: 50,
      monthsOfSupply: 4.2,
      recommendedQuantity: 5,
      status: 'High',
      usageFlagMessage: 'Requested 50 units represents 4.2 months of supply against 12 units/mo baseline',
      preceding90Days: [
        { month: 'Jun', usage: 14 },
        { month: 'Jul', usage: 10 },
        { month: 'Aug', usage: 12 },
      ],
    },
    decisionResult: {
      decision: 'PROCEED',
      headline: 'Compliant purchase request. Clean data, funded budget, verified inventory.',
      reasoning: [
        'Standardized item mapped directly to catalog #402-STEEL-P3',
        'Transferred 45 units from Warehouse B to preserve budget',
        'External PO reduced to 5 units to fulfill 50 total requirement',
        'Net external spend minimized from $7,250 to $725',
      ],
      recommendedActions: [
        { type: 'transfer', text: 'Transfer 45 units from Warehouse B', quantity: 45, site: 'Warehouse B' },
        { type: 'purchase', text: 'Issue external purchase order for 5 buffer units', quantity: 5 },
      ],
      estimatedSavings: 6525,
      purchaseQuantity: 5,
      transferQuantity: 45,
    },
    erpSynced: true,
    erpRefId: 'SAP-PO-881290',
  },
  {
    id: 'PR-2025-0838',
    employeeName: 'Elena Rostova',
    department: 'Engineering',
    itemDescription: 'Hydraulic Seal Kit',
    quantity: 65,
    estimatedPrice: 75,
    requiredDate: '2025-09-28',
    additionalNotes: 'High-pressure cylinder refurbishment kit.',
    createdAt: 'Sep 8, 2025',
    status: 'INVESTIGATE',
    gate1: {
      originalInput: 'Hydraulic Seal Kit',
      standardized: 'Hydraulic Seal Kit',
      matchedItemCode: 'HYD-SEAL-09',
      category: 'Hydraulics & Seals',
      glCode: '5140 • Machine Components',
      confidenceScore: 0.95,
      typosCorrected: ['Mapped to ISO-4406 fluid seal specs'],
    },
    gate2: {
      estimatedCost: 4875,
      availableBudget: 5000,
      status: 'Passed',
      variance: 0,
      remainingBudget: 125,
      message: 'Within quarterly maintenance budget',
    },
    gate3: {
      localWarehouseName: 'Warehouse A',
      localAvailable: 0,
      otherSites: [
        { siteId: 'PLANT-4', siteName: 'Warehouse B', quantity: 15, status: 'reserve' },
      ],
      warehouses: [
        { warehouseId: 'WH-A', name: 'Warehouse A', quantity: 0, location: 'Local Central Depot', stockStatus: 'Out of Stock', isLocal: true },
        { warehouseId: 'WH-B', name: 'Warehouse B', quantity: 15, location: 'Plant 4 Storage, Bay 7', stockStatus: 'Reserved', isLocal: false },
        { warehouseId: 'WH-C', name: 'Warehouse C', quantity: 0, location: 'Regional Yard C', stockStatus: 'Out of Stock', isLocal: false },
      ],
      totalSisterStock: 15,
      status: 'Found',
      recommendedTransferQuantity: 0,
      transferRecommendation: 'Sister plant stock is marked for active overhaul reserve and cannot be transferred.',
    },
    gate4: {
      avgMonthlyUsage: 8,
      requestedQuantity: 65,
      monthsOfSupply: 8.1,
      recommendedQuantity: 20,
      status: 'High',
      usageFlagMessage: 'Requested quantity exceeds 8 months of historical consumption baseline',
      preceding90Days: [
        { month: 'Jun', usage: 7 },
        { month: 'Jul', usage: 9 },
        { month: 'Aug', usage: 8 },
      ],
    },
    decisionResult: {
      decision: 'INVESTIGATE',
      headline: 'Unusual spike in consumption velocity flagged for engineering review.',
      reasoning: [
        'Requested 65 units vs 8 units/month historical consumption rate (8.1x anomaly)',
        'Budget is technically sufficient but ties up excess MRO working capital',
        'Sister plant reserve cannot be released without production supervisor release',
      ],
      recommendedActions: [
        { type: 'clarification', text: 'Clarify if required for one-off overhaul or standard inventory buffer' },
      ],
      estimatedSavings: 2250,
      purchaseQuantity: 20,
      transferQuantity: 0,
    },
    erpSynced: false,
  },
  {
    id: 'PR-2025-0837',
    employeeName: 'Thomas Thorne',
    department: 'Marketing',
    itemDescription: 'Commercial Drone 4K',
    quantity: 2,
    estimatedPrice: 2800,
    requiredDate: '2025-10-02',
    additionalNotes: 'Site progress aerial photography.',
    createdAt: 'Sep 7, 2025',
    status: 'REJECTED',
    gate1: {
      originalInput: 'Commercial Drone 4K',
      standardized: 'Commercial Drone 4K',
      matchedItemCode: 'DRN-4K-UAV',
      category: 'Media & Communications',
      glCode: '7200 • Advertising & PR',
      confidenceScore: 0.92,
      typosCorrected: ['Restricted asset classification'],
    },
    gate2: {
      estimatedCost: 5600,
      availableBudget: 1200,
      status: 'Failed',
      variance: 4400,
      remainingBudget: 0,
      message: 'Unbudgeted capital expenditure (deficit $4,400)',
    },
    gate3: {
      localWarehouseName: 'Warehouse A',
      localAvailable: 0,
      otherSites: [],
      warehouses: [
        { warehouseId: 'WH-A', name: 'Warehouse A', quantity: 0, location: 'HQ Media Lab', stockStatus: 'Out of Stock', isLocal: true },
        { warehouseId: 'WH-B', name: 'Warehouse B', quantity: 0, location: 'Logistics Depot North', stockStatus: 'Out of Stock', isLocal: false },
        { warehouseId: 'WH-C', name: 'Warehouse C', quantity: 0, location: 'Regional Yard C', stockStatus: 'Out of Stock', isLocal: false },
      ],
      totalSisterStock: 0,
      status: 'Not Found',
      recommendedTransferQuantity: 0,
      transferRecommendation: 'No internal stock exists across any enterprise facility.',
    },
    gate4: {
      avgMonthlyUsage: 0,
      requestedQuantity: 2,
      monthsOfSupply: 24,
      recommendedQuantity: 0,
      status: 'High',
      usageFlagMessage: 'Unprecedented procurement item without prior usage baseline',
      preceding90Days: [
        { month: 'Jun', usage: 0 },
        { month: 'Jul', usage: 0 },
        { month: 'Aug', usage: 0 },
      ],
    },
    decisionResult: {
      decision: 'REJECTED',
      headline: 'Restricted equipment category without enterprise aviation security compliance.',
      reasoning: [
        'Marketing department budget insufficient by $4,400',
        'Drone flight hardware requires Corporate Health, Safety & Aviation clearance',
        'Capital expenditure threshold of $5,000 breached for non-standard assets',
      ],
      recommendedActions: [
        { type: 'cancel', text: 'Contract third-party licensed aerial surveyor instead of asset acquisition' },
      ],
      estimatedSavings: 5600,
      purchaseQuantity: 0,
      transferQuantity: 0,
    },
    erpSynced: false,
  },
];

export const DEMO_PRESETS = [
  {
    id: 'demo-charger',
    label: 'IT Charger (Design Reference)',
    badge: 'Screen Mockup',
    employeeName: 'Fawad Ali Shan',
    department: 'IT / Technology' as const,
    itemDescription: 'laptop charger 65w',
    quantity: 10,
    estimatedPrice: 25,
    requiredDate: '2025-09-20',
    additionalNotes: 'Replacement adapters for remote staff.',
  },
  {
    id: 'demo-apex',
    label: 'Apex Case Study: Safety Helmets',
    badge: 'PRD Case Study',
    employeeName: 'Marcus Vance',
    department: 'Maintenance' as const,
    itemDescription: '500 saftey helms for site refit project',
    quantity: 500,
    estimatedPrice: 25,
    requiredDate: '2025-09-25',
    additionalNotes: 'Urgent request for 500 safety helmets at site.',
  },
  {
    id: 'demo-steel',
    label: 'Piping Typo Correction',
    badge: 'Gate 1 Showcase',
    employeeName: 'Dave Miller',
    department: 'Operations' as const,
    itemDescription: '3in steele pip for factory maintenance 50 count',
    quantity: 50,
    estimatedPrice: 145,
    requiredDate: '2025-10-05',
    additionalNotes: 'Corrosion repair on main line.',
  },
];
