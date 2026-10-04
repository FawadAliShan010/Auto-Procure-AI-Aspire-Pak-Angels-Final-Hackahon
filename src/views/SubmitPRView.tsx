import React, { useState, useEffect } from 'react';
import { useProcure } from '../context/ProcurementContext';
import { Department, PurchaseRequest, isRequisitionerRole } from '../types/procurement';
import { Button } from '../components/common/Button';
import * as XLSX from 'xlsx';
import {
  Sparkles,
  ArrowRight,
  RotateCcw,
  Calendar,
  Building2,
  User,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  FileText,
  DollarSign,
  Layers,
  ShieldCheck,
  FileSpreadsheet,
  Upload,
} from 'lucide-react';

interface FormErrors {
  employeeName?: string;
  department?: string;
  itemDescription?: string;
  quantity?: string;
  estimatedPrice?: string;
  requiredDate?: string;
}

export const SubmitPRView: React.FC = () => {
  const { activeDraft, updateDraft, startAnalysisFlow, addToast, currentUser } = useProcure();

  // Form local state initialized from active draft or defaults
  const [employeeName, setEmployeeName] = useState<string>(activeDraft.employeeName || currentUser?.name || 'Fawad Ali Shan');
  const [department, setDepartment] = useState<Department>((activeDraft.department as Department) || 'IT / Technology');
  const [itemDescription, setItemDescription] = useState<string>(activeDraft.itemDescription || '');
  const [quantity, setQuantity] = useState<number | string>(activeDraft.quantity ?? 10);
  const [estimatedPrice, setEstimatedPrice] = useState<number | string>(activeDraft.estimatedPrice ?? 25);
  const [requiredDate, setRequiredDate] = useState<string>(
    activeDraft.requiredDate || new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0]
  );
  const [additionalNotes, setAdditionalNotes] = useState<string>(activeDraft.additionalNotes || '');

  // Validation errors
  const [errors, setErrors] = useState<FormErrors>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const departments: Department[] = [
    'Operations',
    'Maintenance',
    'IT / Technology',
    'Engineering',
    'Facilities & Safety',
    'HR',
    'Production Plant',
    'Marketing',
  ];

  // Sync draft in context on changes
  useEffect(() => {
    updateDraft({
      employeeName,
      department,
      itemDescription,
      quantity: Number(quantity) || 1,
      estimatedPrice: Number(estimatedPrice) || 0,
      requiredDate,
      additionalNotes,
    });
  }, [employeeName, department, itemDescription, quantity, estimatedPrice, requiredDate, additionalNotes]);

  // Load Demo Scenario specifically requested:
  // Employee: Marcus
  // Department: Operations
  // Item: 500 saftey helms for site refit project
  // Quantity: 500
  // Estimated price: 25
  const handleLoadDemoScenario = () => {
    setEmployeeName('Marcus');
    setDepartment('Operations');
    setItemDescription('500 saftey helms for site refit project');
    setQuantity(500);
    setEstimatedPrice(25);
    setRequiredDate(new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0]);
    setAdditionalNotes('Urgent safety overhaul for plant 3 crew refit.');
    setErrors({});
    setHasAttemptedSubmit(false);

    addToast(
      'Demo Scenario Loaded',
      'Loaded Marcus (Operations) • 500 saftey helms for site refit project',
      'success'
    );
  };

  // Specific Steel Pipe test scenario from prompt
  const handleLoadSteelPipeScenario = () => {
    setEmployeeName('Carlos Mendez');
    setDepartment('Maintenance');
    setItemDescription('3in steele pip for factory maintenance 50 count');
    setQuantity(50);
    setEstimatedPrice(145);
    setRequiredDate(new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0]);
    setAdditionalNotes('Factory cooling manifold structural repair.');
    setErrors({});
    setHasAttemptedSubmit(false);

    addToast(
      'Prompt Test Scenario Loaded',
      'Loaded "3in steele pip for factory maintenance 50 count"',
      'success'
    );
  };

  // Low confidence AI test scenario
  const handleLoadLowConfidenceScenario = () => {
    setEmployeeName('Dr. Sarah Chen');
    setDepartment('Engineering');
    setItemDescription('custom machined brass fitting coupler 12v');
    setQuantity(5);
    setEstimatedPrice(120);
    setRequiredDate(new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0]);
    setAdditionalNotes('Uncataloged prototype mechanical coupling component.');
    setErrors({});
    setHasAttemptedSubmit(false);

    addToast(
      'Low-Confidence Scenario Loaded',
      'Loaded uncataloged prototype item to trigger INVESTIGATE gate',
      'info'
    );
  };

  // Secondary preset for Laptop Charger
  const handleLoadChargerScenario = () => {
    setEmployeeName('Fawad Ali Shan');
    setDepartment('IT / Technology');
    setItemDescription('laptop charger 65w');
    setQuantity(10);
    setEstimatedPrice(25);
    setRequiredDate(new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]);
    setAdditionalNotes('Replacement adapters for engineering cohort.');
    setErrors({});
    setHasAttemptedSubmit(false);

    addToast(
      'Scenario Loaded',
      'Loaded Fawad Ali Shan • Laptop Charger 65W',
      'info'
    );
  };

  // Reset form to clean state
  const handleResetForm = () => {
    setEmployeeName('');
    setDepartment('Operations');
    setItemDescription('');
    setQuantity(1);
    setEstimatedPrice(0);
    setRequiredDate(new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]);
    setAdditionalNotes('');
    setErrors({});
    setHasAttemptedSubmit(false);
    addToast('Form Cleared', 'Ready for new requisition input', 'info');
  };

  // Comprehensive validation function
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // 1. Employee name required
    if (!employeeName.trim()) {
      newErrors.employeeName = 'Employee name is required.';
    }

    // 2. Department required
    if (!department) {
      newErrors.department = 'Department is required.';
    }

    // 3. Item description required
    if (!itemDescription.trim()) {
      newErrors.itemDescription = 'Item description is required.';
    }

    // 4. Quantity > 0
    const numQty = Number(quantity);
    if (quantity === '' || isNaN(numQty) || numQty <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0.';
    }

    // 5. Price >= 0
    const numPrice = Number(estimatedPrice);
    if (estimatedPrice === '' || isNaN(numPrice) || numPrice < 0) {
      newErrors.estimatedPrice = 'Estimated price must be greater than or equal to $0.';
    }

    // 6. Required date must be valid
    if (!requiredDate || isNaN(Date.parse(requiredDate))) {
      newErrors.requiredDate = 'A valid required date is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Clear specific error on user typing
  const handleFieldChange = (field: keyof FormErrors, value: any) => {
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);

    if (!validateForm()) {
      addToast(
        'Validation Incomplete',
        'Please correct the highlighted fields before checking your request.',
        'error'
      );
      return;
    }

    setIsSubmitting(true);

    const draftData: Partial<PurchaseRequest> = {
      employeeName: employeeName.trim(),
      department,
      itemDescription: itemDescription.trim(),
      quantity: Number(quantity),
      estimatedPrice: Number(estimatedPrice),
      requiredDate,
      additionalNotes: additionalNotes.trim(),
    };

    // Begin the AI analysis workflow: navigates to /processing first
    startAnalysisFlow(draftData);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (!jsonData || jsonData.length === 0) {
          addToast('Excel Error', 'The uploaded Excel file contains no data rows.', 'error');
          return;
        }

        const row = jsonData[0];
        const itemDesc = row.itemDescription || row.description || row.ItemDescription || row.Description || row.Item || row.item;
        const qty = row.quantity || row.qty || row.Quantity || row.Qty;
        const price = row.estimatedPrice || row.price || row.unitPrice || row.EstimatedPrice || row.Price || row.UnitPrice || 0;
        const dept = row.department || row.dept || row.Department || row.Dept || department;
        const reqDate = row.requiredDate || row.date || row.RequiredDate || row.Date || requiredDate;
        const notes = row.additionalNotes || row.notes || row.AdditionalNotes || row.Notes || '';

        if (!itemDesc || qty === undefined || qty === null) {
          addToast('Validation Error', 'Excel file is missing required columns (e.g. itemDescription, quantity).', 'error');
          return;
        }

        const parsedName = currentUser?.name || 'Requisitioner';
        const draftData: Partial<PurchaseRequest> = {
          employeeName: parsedName,
          department: (dept as Department) || 'IT / Technology',
          itemDescription: String(itemDesc),
          quantity: Number(qty) || 1,
          estimatedPrice: Number(price) || 0,
          requiredDate: reqDate ? String(reqDate) : new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
          additionalNotes: String(notes),
        };

        addToast(
          'Excel Requisition Submitted',
          `Successfully processed Excel data for "${itemDesc}" (Qty: ${qty}). Running AI Audit...`,
          'success'
        );

        startAnalysisFlow(draftData);
      } catch (err: any) {
        addToast('Excel Parse Failed', err?.message || 'Invalid Excel format or structure.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const numQuantity = Number(quantity) || 0;
  const numPrice = Number(estimatedPrice) || 0;
  const grossCommitment = numQuantity * numPrice;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Requisitioner Exclusive Excel Submission Workflow */}
      {isRequisitionerRole(currentUser?.role) && (
        <div className="bg-white rounded-xl border border-emerald-200 p-5 shadow-2xs relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-mono font-bold uppercase tracking-wider">
                  <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                  Requisitioner Portal
                </span>
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">• Direct Excel Ingestion</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Submit Requisition Excel
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                Upload your item requisition spreadsheet (.xlsx, .xls, .csv). AutoProcure AI will instantly validate columns, parse records, and run the 4-gate audit workflow for your submission.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all">
                <Upload className="w-4 h-4" />
                <span>Choose Excel File</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={handleExcelUpload}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 1. Dedicated Demo Scenario Launchpad Banner */}
      <div className="bg-white rounded-xl border border-indigo-100 p-4 sm:p-5 shadow-2xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-[10px] font-mono font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                Featured Test Scenarios
              </span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">• PRD Verification Suite</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Interactive Gatekeeper Presets
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
              Load realistic procurement requisitions with raw typos, budget variances, sister facility surplus, and velocity anomalies to audit all 4 gates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              onClick={handleLoadSteelPipeScenario}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
            >
              Steel Pipe (Maintenance)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadDemoScenario}
              className="text-xs text-slate-700 hover:text-indigo-600"
            >
              500 Helmets (Marcus)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadLowConfidenceScenario}
              className="text-xs text-purple-700 border-purple-200 hover:bg-purple-50"
            >
              Low Confidence Item
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadChargerScenario}
              className="text-xs text-slate-600 hover:text-indigo-600"
            >
              IT Adapter
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Main Purchase Request Form Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 sm:p-8">
        {/* Form Header */}
        <div className="mb-6 pb-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-indigo-700 uppercase tracking-wider mb-1">
              <span>GATEWAY INTERCEPT</span>
              <span>/</span>
              <span>STEP 01: REQUISITION ENTRY</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Submit Purchase Request
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter requisition parameters below. AutoProcure AI will intercept and audit data quality, budget, inventory, and usage velocity before supplier commitment.
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={handleResetForm}
            className="text-xs text-slate-500 hover:text-slate-800 self-start sm:self-auto"
          >
            Clear Form
          </Button>
        </div>

        {/* Global Error Banner if submission had validation errors */}
        {hasAttemptedSubmit && Object.keys(errors).length > 0 && (
          <div className="mb-6 bg-rose-50 border border-rose-200 rounded-lg p-3.5 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Please resolve the following before proceeding:</span>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-rose-700">
                {errors.employeeName && <li>{errors.employeeName}</li>}
                {errors.department && <li>{errors.department}</li>}
                {errors.itemDescription && <li>{errors.itemDescription}</li>}
                {errors.quantity && <li>{errors.quantity}</li>}
                {errors.estimatedPrice && <li>{errors.estimatedPrice}</li>}
                {errors.requiredDate && <li>{errors.requiredDate}</li>}
              </ul>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Row 1: Employee Name & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Field: Employee Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Employee Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={employeeName}
                  onChange={(e) => {
                    setEmployeeName(e.target.value);
                    handleFieldChange('employeeName', e.target.value);
                  }}
                  placeholder="e.g. Marcus or Fawad Ali Shan"
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors shadow-2xs ${
                    errors.employeeName
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
                      : 'border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                  }`}
                />
              </div>
              {errors.employeeName && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.employeeName}</span>
                </p>
              )}
            </div>

            {/* Field: Department */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Department <span className="text-rose-500">*</span>
              </label>
              <select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value as Department);
                  handleFieldChange('department', e.target.value);
                }}
                className={`w-full px-3 py-2 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none transition-colors shadow-2xs cursor-pointer ${
                  errors.department
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                }`}
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              {errors.department && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.department}</span>
                </p>
              )}
            </div>
          </div>

          {/* Row 2: Item Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-800">
                Item Description <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {itemDescription.length}/500 chars
              </span>
            </div>
            <textarea
              rows={3}
              value={itemDescription}
              maxLength={500}
              onChange={(e) => {
                setItemDescription(e.target.value);
                handleFieldChange('itemDescription', e.target.value);
              }}
              placeholder="e.g. 500 saftey helms for site refit project, or laptop charger 65w"
              className={`w-full px-3 py-2 bg-white border rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors shadow-2xs resize-y ${
                errors.itemDescription
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
                  : 'border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
              }`}
            />
            {errors.itemDescription ? (
              <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.itemDescription}</span>
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                <span className="font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                  Gate 1 AI Engine:
                </span>
                <span>
                  Enter unstandardized text. Machine learning will fix typos, expand abbreviations, and resolve official catalog item codes.
                </span>
              </p>
            )}
          </div>

          {/* Row 3: Quantity, Estimated Price, Required Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Field: Quantity */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Quantity <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value === '' ? '' : parseInt(e.target.value) || 0);
                  handleFieldChange('quantity', e.target.value);
                }}
                placeholder="1"
                className={`w-full px-3 py-2 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none transition-colors shadow-2xs font-mono ${
                  errors.quantity
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
                    : 'border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                }`}
              />
              {errors.quantity && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.quantity}</span>
                </p>
              )}
            </div>

            {/* Field: Estimated Price per Unit */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Estimated Price per Unit ($) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-400 font-mono">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={estimatedPrice}
                  onChange={(e) => {
                    setEstimatedPrice(e.target.value === '' ? '' : parseFloat(e.target.value) || 0);
                    handleFieldChange('estimatedPrice', e.target.value);
                  }}
                  placeholder="0.00"
                  className={`w-full pl-7 pr-3 py-2 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none transition-colors shadow-2xs font-mono ${
                    errors.estimatedPrice
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
                      : 'border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                  }`}
                />
              </div>
              {errors.estimatedPrice && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.estimatedPrice}</span>
                </p>
              )}
            </div>

            {/* Field: Required Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Required Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={requiredDate}
                onChange={(e) => {
                  setRequiredDate(e.target.value);
                  handleFieldChange('requiredDate', e.target.value);
                }}
                className={`w-full px-3 py-2 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none transition-colors shadow-2xs cursor-pointer ${
                  errors.requiredDate
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
                    : 'border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'
                }`}
              />
              {errors.requiredDate && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.requiredDate}</span>
                </p>
              )}
            </div>
          </div>

          {/* Row 4: Additional Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Additional Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Operational justification, project code, or urgency context..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors shadow-2xs"
            />
          </div>

          {/* Row 5: Financial Calculation & Primary CTA Bar */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Total Estimated Commitment
                </span>
                <span className="font-mono font-bold text-slate-900 text-base sm:text-lg">
                  ${grossCommitment.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-slate-500 font-sans">
                    ({numQuantity} × ${numPrice.toFixed(2)})
                  </span>
                </span>
              </div>
            </div>

            {/* Primary CTA: "Check Request →" */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="font-semibold text-sm shadow-xs px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Check Request →
            </Button>
          </div>
        </form>
      </div>

      {/* 3. 4-Gate Workflow Explainer Info Card */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[10px] font-mono font-bold text-indigo-600 block">GATE 01</span>
          <span className="font-bold text-slate-800 mt-0.5 block">AI Standardization</span>
          <span className="text-slate-500 text-[11px] mt-0.5 block">Fixes typos and maps raw input to master catalog SKU & GL code.</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[10px] font-mono font-bold text-indigo-600 block">GATE 02</span>
          <span className="font-bold text-slate-800 mt-0.5 block">Budget Check</span>
          <span className="text-slate-500 text-[11px] mt-0.5 block">Verifies cost against department quarterly budget limits.</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[10px] font-mono font-bold text-indigo-600 block">GATE 03</span>
          <span className="font-bold text-slate-800 mt-0.5 block">Inventory Transfer</span>
          <span className="text-slate-500 text-[11px] mt-0.5 block">Scans 6 sister facilities for idle or surplus inventory.</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[10px] font-mono font-bold text-indigo-600 block">GATE 04</span>
          <span className="font-bold text-slate-800 mt-0.5 block">Usage Velocity</span>
          <span className="text-slate-500 text-[11px] mt-0.5 block">Audits 90-day consumption rate to flag over-ordering.</span>
        </div>
      </div>
    </div>
  );
};
