import React, { useState, useEffect, useRef } from 'react';
import { useProcure } from '../context/ProcurementContext';
import { isPurchaseManagerRole, normalizeRole } from '../types/procurement';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Download,
  Database,
  Layers,
  Search,
  ShieldCheck,
  Play,
  Eye,
  FileText,
  Clock,
  Sparkles,
  Info,
  Check,
  BarChart3,
  Package,
  ShieldAlert,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  parseSpreadsheetFile,
  detectColumnMappings,
  validateAndCleanDataset,
  uploadAndRegisterHistoricalFile,
  commitHistoricalImport,
  generateSampleSpreadsheet,
  runHistoricalVerificationTests,
  ParsedWorkbookResult,
  ColumnMapping,
  DataQualityReport,
  CleanedRowResult,
  VerificationTestCaseResult,
} from '../services/historicalDataService';
import {
  listUploadedFiles,
  listHistoricalTransactions,
  listImportBatches,
} from '../services/persistentDataService';
import {
  UploadedFileMetadataDoc,
  HistoricalTransactionDoc,
  ImportBatchDoc,
} from '../types/procurementDataModel';
import { HistoricalSummaryCards } from '../components/historical/HistoricalSummaryCards';
import { ImportBatchesView } from '../components/historical/ImportBatchesView';
import { HistoricalExplorerView } from '../components/historical/HistoricalExplorerView';
import { ItemLevelSummaryView } from '../components/historical/ItemLevelSummaryView';
import { DataQualityHubView } from '../components/historical/DataQualityHubView';
import { BatchDetailModal } from '../components/historical/BatchDetailModal';
import { TransactionDetailModal } from '../components/historical/TransactionDetailModal';

export const HistoricalDataView: React.FC = () => {
  const { currentUser, addToast } = useProcure();
  const role = normalizeRole(currentUser.role);
  const isAuthorized = isPurchaseManagerRole(currentUser.role);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<
    'pipeline' | 'batches' | 'explorer' | 'items' | 'quality' | 'verification'
  >('pipeline');

  // Multi-Stage Pipeline State (Stage 1, 2, 3)
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3>(1);

  // Stage 1 State: Uploaded File
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileMetadata, setFileMetadata] = useState<UploadedFileMetadataDoc | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stage 2 State: Workbook & Column Mapping
  const [parsedWorkbook, setParsedWorkbook] = useState<ParsedWorkbookResult | null>(null);
  const [activeSheetName, setActiveSheetName] = useState<string>('');
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    rawItemDescription: '',
    transactionDate: '',
    quantity: '',
    unit: '',
    siteLocation: '',
    department: '',
    itemId: '',
    unitPrice: '',
    totalValue: '',
    transactionType: '',
  });
  const [defaultTransType, setDefaultTransType] = useState<'PURCHASE' | 'CONSUMPTION'>('PURCHASE');

  // Stage 3 State: Quality Report & Rows
  const [qualityReport, setQualityReport] = useState<DataQualityReport | null>(null);
  const [rowStatusFilter, setRowStatusFilter] = useState<'ALL' | 'VALID' | 'CORRECTED' | 'WARNING' | 'REJECTED'>('ALL');
  const [rowSearchQuery, setRowSearchQuery] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitProgress, setCommitProgress] = useState<{ current: number; total: number } | null>(null);
  const [importSuccessResult, setImportSuccessResult] = useState<{ batchId: string; count: number } | null>(null);
  const [skipRejectedRows, setSkipRejectedRows] = useState(true);

  // Persistent Datasets
  const [uploadedFilesList, setUploadedFilesList] = useState<UploadedFileMetadataDoc[]>([]);
  const [historicalTxList, setHistoricalTxList] = useState<HistoricalTransactionDoc[]>([]);
  const [importBatchesList, setImportBatchesList] = useState<ImportBatchDoc[]>([]);
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  // Filter pass-through state for Explorer
  const [explorerBatchFilter, setExplorerBatchFilter] = useState<string>('');
  const [explorerStatusFilter, setExplorerStatusFilter] = useState<string>('ALL');

  // Modals State
  const [selectedBatchModal, setSelectedBatchModal] = useState<ImportBatchDoc | null>(null);
  const [selectedTxModal, setSelectedTxModal] = useState<HistoricalTransactionDoc | null>(null);

  // 16-Test Verification Suite State
  const [testResults, setTestResults] = useState<VerificationTestCaseResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Initial Data Load
  const loadAllHistoricalData = async () => {
    setIsLoadingAll(true);
    try {
      const [files, txs, batches] = await Promise.all([
        listUploadedFiles(100),
        listHistoricalTransactions({ limit: 1000 }),
        listImportBatches(50),
      ]);
      setUploadedFilesList(files);
      setHistoricalTxList(txs);
      setImportBatchesList(batches);
    } catch (err) {
      console.error('Failed to load historical data:', err);
    } finally {
      setIsLoadingAll(false);
    }
  };

  useEffect(() => {
    loadAllHistoricalData();
  }, []);

  // Filter transactions when batch filter changes or on demand
  const handleSelectBatchForExplorer = (batchId: string) => {
    setExplorerBatchFilter(batchId);
    setActiveTab('explorer');
  };

  const handleSelectStatusForExplorer = (status: string) => {
    setExplorerStatusFilter(status);
    setActiveTab('explorer');
  };

  const handleFilterByItem = (skuOrDesc: string) => {
    setExplorerBatchFilter('');
    setExplorerStatusFilter('ALL');
    setActiveTab('explorer');
  };

  // Run 16-Test Suite
  const handleRunTests = async () => {
    setIsRunningTests(true);
    try {
      const results = await runHistoricalVerificationTests();
      setTestResults(results);
      const passedCount = results.filter((r) => r.passed).length;
      addToast(
        '16-Test Verification Completed',
        `${passedCount} of ${results.length} system rules passed verification.`,
        passedCount === results.length ? 'success' : 'warning'
      );
    } catch (e: any) {
      addToast('Test Suite Error', e?.message || 'Error running test suite', 'error');
    } finally {
      setIsRunningTests(false);
    }
  };

  // Handle Drag & Drop / File Input
  const handleFileSelected = async (file: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      addToast('Invalid File Type', 'Please select a valid Excel (.xlsx, .xls) or CSV (.csv) file.', 'error');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      addToast('File Too Large', 'Maximum supported file size is 50MB.', 'error');
      return;
    }

    setSelectedFile(file);
    setIsUploading(true);
    setImportSuccessResult(null);

    try {
      // 1. Parse spreadsheet with SheetJS
      const parsed = await parseSpreadsheetFile(file);
      setParsedWorkbook(parsed);
      setActiveSheetName(parsed.activeSheet);

      // 2. Auto-detect headers and column mappings
      const initialHeaders = parsed.sheets[parsed.activeSheet]?.headers || [];
      const autoMapping = detectColumnMappings(initialHeaders);
      setColumnMapping(autoMapping);

      // 3. Register file in server storage and Firestore metadata
      const batchId = `BATCH-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const metadata = await uploadAndRegisterHistoricalFile(
        file,
        {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
        },
        batchId
      );
      setFileMetadata(metadata);

      addToast(
        'Spreadsheet Parsed & Stored',
        `Loaded "${file.name}" (${parsed.sheets[parsed.activeSheet]?.totalRows || 0} rows). Proceed to Stage 2: Column Mapping.`,
        'success'
      );

      // Advance to Stage 2
      setCurrentStage(2);
    } catch (err: any) {
      console.error('File parsing error:', err);
      addToast('Parsing Error', err?.message || 'Failed to read spreadsheet file', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Instant Sample Dataset Loader (Clean, Messy, Edge Cases)
  const handleLoadSample = async (type: 'clean' | 'messy' | 'edge_cases') => {
    const sample = generateSampleSpreadsheet(type);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([sample.headers, ...sample.rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Historical_Data');
    const binary = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const file = new File([binary], sample.filename, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await handleFileSelected(file);
  };

  // Download real sample Excel template
  const handleDownloadTemplate = (type: 'clean' | 'messy') => {
    const sample = generateSampleSpreadsheet(type);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([sample.headers, ...sample.rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Historical_Template');
    XLSX.writeFile(wb, sample.filename);
    addToast('Template Downloaded', `Downloaded "${sample.filename}"`, 'info');
  };

  // Switch Active Sheet
  const handleSheetChange = (sheetName: string) => {
    if (!parsedWorkbook || !parsedWorkbook.sheets[sheetName]) return;
    setActiveSheetName(sheetName);
    const headers = parsedWorkbook.sheets[sheetName].headers;
    const mapping = detectColumnMappings(headers);
    setColumnMapping(mapping);
  };

  // Run Stage 3: Cleaning & Validation
  const handleProceedToValidation = () => {
    if (!columnMapping.rawItemDescription || !columnMapping.transactionDate || !columnMapping.quantity) {
      addToast(
        'Required Mappings Missing',
        'Please map the three required fields: Item Description, Transaction Date, and Quantity.',
        'error'
      );
      return;
    }

    if (!parsedWorkbook || !parsedWorkbook.sheets[activeSheetName]) return;

    const sheet = parsedWorkbook.sheets[activeSheetName];
    const report = validateAndCleanDataset(sheet.rawRows, sheet.headers, columnMapping, {
      defaultTransType,
    });

    setQualityReport(report);
    setCurrentStage(3);
    addToast(
      'Stage 3: Validation Complete',
      `Evaluated ${report.totalRows} rows: ${report.validCount} Valid, ${report.correctedCount} Corrected, ${report.warningCount} Warnings, ${report.rejectedCount} Rejected.`,
      report.rejectedCount === 0 ? 'success' : 'warning'
    );
  };

  // Commit Import to Firestore & Server
  const handleCommitImport = async () => {
    if (!fileMetadata || !qualityReport) return;

    setIsCommitting(true);
    setCommitProgress({ current: 0, total: qualityReport.totalRows });

    try {
      const result = await commitHistoricalImport(fileMetadata, qualityReport, {
        skipRejectedRows,
        onProgress: (saved, total) => {
          setCommitProgress({ current: saved, total });
        },
      });

      setImportSuccessResult({
        batchId: result.batchId,
        count: result.importedCount,
      });

      addToast(
        'Historical Import Committed',
        `Successfully imported ${result.importedCount} transaction records into collection historical_transactions.`,
        'success'
      );

      // Refresh all datasets in background
      loadAllHistoricalData();
    } catch (err: any) {
      console.error('Commit error:', err);
      addToast('Commit Failed', err?.message || 'Error saving transactions to Firestore', 'error');
    } finally {
      setIsCommitting(false);
      setCommitProgress(null);
    }
  };

  // Reset Pipeline
  const handleResetPipeline = () => {
    setSelectedFile(null);
    setParsedWorkbook(null);
    setQualityReport(null);
    setFileMetadata(null);
    setImportSuccessResult(null);
    setCurrentStage(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Filtered rows for Stage 3 inspector
  const filteredRows = (qualityReport?.rows || []).filter((r) => {
    if (rowStatusFilter !== 'ALL' && r.status !== rowStatusFilter) return false;
    if (rowSearchQuery.trim()) {
      const q = rowSearchQuery.toLowerCase();
      const matchDesc = r.cleaned.rawItemDescription.toLowerCase().includes(q);
      const matchStd = r.cleaned.standardizedDescription.toLowerCase().includes(q);
      const matchSku = (r.cleaned.itemId || '').toLowerCase().includes(q);
      return matchDesc || matchStd || matchSku;
    }
    return true;
  });

  // Access Control Check
  if (!isAuthorized) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Restricted Enterprise Access</h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
          Historical procurement data ingestion and schema mapping is restricted to{' '}
          <span className="font-semibold text-amber-300">Purchase Managers</span> and{' '}
          <span className="font-semibold text-rose-300">Administrators</span>. Your current active role is{' '}
          <span className="font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-200">{role}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 select-none">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-sm shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Historical Data Management</h1>
            <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded-full">
              STAGE 1–3 PIPELINE
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Real Excel & CSV ingestion, sheet detection, dynamic schema mapping, and Gate 1 data cleaning & standardization.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setActiveTab('verification');
              handleRunTests();
            }}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            Run 16-Test Suite
          </button>

          <button
            onClick={() => handleDownloadTemplate('clean')}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Download Excel Template
          </button>
        </div>
      </div>

      {/* Top Aggregate KPI Metric Cards */}
      <HistoricalSummaryCards
        transactions={historicalTxList}
        batches={importBatchesList}
        files={uploadedFilesList}
        onFilterStatus={(status) => {
          handleSelectStatusForExplorer(status);
        }}
      />

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'pipeline'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          Upload & Clean Pipeline
        </button>

        <button
          onClick={() => setActiveTab('batches')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'batches'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Import Batches & Audit
          {importBatchesList.length > 0 && (
            <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.2 rounded-full">
              {importBatchesList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('explorer')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'explorer'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          Record Explorer
          {historicalTxList.length > 0 && (
            <span className="text-[10px] bg-sky-500/30 text-sky-200 px-1.5 py-0.2 rounded-full">
              {historicalTxList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('items')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'items'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Package className="w-4 h-4" />
          Item Consumption Summaries
        </button>

        <button
          onClick={() => setActiveTab('quality')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'quality'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Data Quality Hub
          {historicalTxList.filter((t) => t.dataQualityStatus !== 'VALID').length > 0 && (
            <span className="text-[10px] bg-amber-500/30 text-amber-200 px-1.5 py-0.2 rounded-full">
              {historicalTxList.filter((t) => t.dataQualityStatus !== 'VALID').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('verification')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'verification'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          16-Rule System Verification
          {testResults.length > 0 && (
            <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.2 rounded-full">
              {testResults.filter((t) => t.passed).length}/{testResults.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PIPELINE (STAGES 1, 2, 3) */}
      {/* ========================================================================= */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          {/* Stepper Indicator */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => currentStage > 1 && setCurrentStage(1)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                currentStage === 1
                  ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200 shadow-sm'
                  : currentStage > 1
                  ? 'bg-slate-900/40 border-emerald-500/30 text-slate-300'
                  : 'bg-slate-900/20 border-slate-800/60 text-slate-500'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                  currentStage > 1
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : currentStage === 1
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {currentStage > 1 ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider">Stage 1</div>
                <div className="text-sm font-semibold text-white">Excel / CSV File Upload</div>
              </div>
            </div>

            <div
              onClick={() => currentStage > 2 && setCurrentStage(2)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                currentStage === 2
                  ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200 shadow-sm'
                  : currentStage > 2
                  ? 'bg-slate-900/40 border-emerald-500/30 text-slate-300'
                  : 'bg-slate-900/20 border-slate-800/60 text-slate-500'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                  currentStage > 2
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : currentStage === 2
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {currentStage > 2 ? <Check className="w-4 h-4" /> : '2'}
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider">Stage 2</div>
                <div className="text-sm font-semibold text-white">Preview & Column Mapping</div>
              </div>
            </div>

            <div
              className={`p-4 rounded-xl border transition-all flex items-center gap-3.5 ${
                currentStage === 3
                  ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200 shadow-sm'
                  : 'bg-slate-900/20 border-slate-800/60 text-slate-500'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                  currentStage === 3 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'
                }`}
              >
                3
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider">Stage 3</div>
                <div className="text-sm font-semibold text-white">Data Cleaning & Validation</div>
              </div>
            </div>
          </div>

          {/* Import Success Notification Screen */}
          {importSuccessResult && (
            <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Dataset Successfully Ingested & Committed</h3>
                  <p className="text-xs text-emerald-300/80">
                    Import Batch ID:{' '}
                    <span className="font-mono font-bold text-emerald-200">{importSuccessResult.batchId}</span> •{' '}
                    {importSuccessResult.count} transactions saved to Firestore.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => {
                    handleSelectBatchForExplorer(importSuccessResult.batchId);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer"
                >
                  View Ingested Records
                </button>
                <button
                  onClick={handleResetPipeline}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer"
                >
                  Upload Another Spreadsheet
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 1: REAL EXCEL UPLOAD */}
          {/* ========================================================================= */}
          {currentStage === 1 && (
            <div className="space-y-6">
              <div className="p-8 rounded-2xl bg-slate-900/40 border-2 border-dashed border-slate-700 hover:border-indigo-500/60 transition-all text-center space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelected(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <UploadCloud className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">Select or Drop Procurement Spreadsheet</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) workbooks. Maximum file size: 50MB. Files are
                    persisted in storage and linked via Firestore metadata.
                  </p>
                </div>

                <div className="flex justify-center gap-3 pt-2">
                  <button
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Parsing Spreadsheet...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-4 h-4" />
                        Browse Spreadsheet
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Instant Test Dataset Cards */}
              <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Instant Test Datasets (Pre-Configured Scenarios)
                  </h4>
                </div>
                <p className="text-xs text-slate-400">
                  Instantly test the upload, parsing, mapping, and cleaning pipeline without uploading your own file:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div
                    onClick={() => handleLoadSample('clean')}
                    className="p-4 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/40 transition-all cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Clean MRO History
                      </span>
                      <span className="text-[10px] bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded font-mono">
                        6 rows
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Pristine formatting, standard dates (YYYY-MM-DD), matched catalog items.
                    </p>
                  </div>

                  <div
                    onClick={() => handleLoadSample('messy')}
                    className="p-4 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/40 transition-all cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Messy Legacy ERP
                      </span>
                      <span className="text-[10px] bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded font-mono">
                        6 rows
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Excess whitespace, serial numbers, colloquial units (pcs, mtrs), varied date formats.
                    </p>
                  </div>

                  <div
                    onClick={() => handleLoadSample('edge_cases')}
                    className="p-4 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 hover:border-rose-500/40 transition-all cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" />
                        Edge Cases & Errors
                      </span>
                      <span className="text-[10px] bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded font-mono">
                        8 rows
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Negative returns, duplicate rows, future dates, missing item description, unparseable dates.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 2: PREVIEW + COLUMN MAPPING */}
          {/* ========================================================================= */}
          {currentStage === 2 && parsedWorkbook && (
            <div className="space-y-6">
              {/* File & Sheet Details Header */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{parsedWorkbook.fileName}</h3>
                    <p className="text-xs text-slate-400">
                      {(parsedWorkbook.fileSize / 1024).toFixed(1)} KB • Batch ID:{' '}
                      <span className="font-mono text-indigo-300">{fileMetadata?.importBatchId}</span>
                    </p>
                  </div>
                </div>

                {/* Sheet Selector (for multi-sheet workbooks) */}
                {parsedWorkbook.sheetNames.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400">Active Sheet:</span>
                    <select
                      value={activeSheetName}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                    >
                      {parsedWorkbook.sheetNames.map((name) => (
                        <option key={name} value={name}>
                          {name} ({parsedWorkbook.sheets[name]?.totalRows || 0} rows)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Raw Data Preview */}
              <div className="bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden">
                <div className="p-3.5 bg-slate-800/40 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Raw Spreadsheet Preview (First 5 Rows)
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Total Rows: {parsedWorkbook.sheets[activeSheetName]?.totalRows || 0}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/60 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-slate-500">#</th>
                        {parsedWorkbook.sheets[activeSheetName]?.headers.map((h, idx) => (
                          <th key={idx} className="py-2.5 px-3 font-semibold text-slate-200">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {(parsedWorkbook.sheets[activeSheetName]?.rawRows || []).slice(0, 5).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 text-slate-500 font-mono text-[10px]">{rIdx + 1}</td>
                          {parsedWorkbook.sheets[activeSheetName]?.headers.map((_, cIdx) => (
                            <td key={cIdx} className="py-2 px-3 truncate max-w-[200px]">
                              {row[cIdx] !== undefined ? String(row[cIdx]) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Dynamic Column Mapping Controls */}
              <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">Dynamic Column Mapping</h4>
                  <p className="text-xs text-slate-400">
                    Map columns from your spreadsheet to AutoProcure AI standard fields. The system automatically
                    suggests mappings based on header semantics.
                  </p>
                </div>

                {/* Default Transaction Type Option */}
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-white block">Default Transaction Type</span>
                    <span className="text-[11px] text-slate-400">
                      Applied if the spreadsheet does not contain an explicit movement type column.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDefaultTransType('PURCHASE')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        defaultTransType === 'PURCHASE'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      All Purchases / POs
                    </button>
                    <button
                      onClick={() => setDefaultTransType('CONSUMPTION')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        defaultTransType === 'CONSUMPTION'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      All Consumptions / Issues
                    </button>
                  </div>
                </div>

                {/* Mapping Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* 1. Item Description (REQUIRED) */}
                  <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white flex items-center gap-1.5">
                        Item Description
                        <span className="text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 rounded">
                          REQUIRED
                        </span>
                      </label>
                    </div>
                    <select
                      value={columnMapping.rawItemDescription}
                      onChange={(e) => setColumnMapping({ ...columnMapping, rawItemDescription: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {parsedWorkbook.sheets[activeSheetName]?.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Transaction Date (REQUIRED) */}
                  <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white flex items-center gap-1.5">
                        Transaction Date
                        <span className="text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 rounded">
                          REQUIRED
                        </span>
                      </label>
                    </div>
                    <select
                      value={columnMapping.transactionDate}
                      onChange={(e) => setColumnMapping({ ...columnMapping, transactionDate: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {parsedWorkbook.sheets[activeSheetName]?.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Quantity (REQUIRED) */}
                  <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white flex items-center gap-1.5">
                        Quantity
                        <span className="text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 rounded">
                          REQUIRED
                        </span>
                      </label>
                    </div>
                    <select
                      value={columnMapping.quantity}
                      onChange={(e) => setColumnMapping({ ...columnMapping, quantity: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {parsedWorkbook.sheets[activeSheetName]?.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 4. Unit of Measure (Optional) */}
                  <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700 space-y-2">
                    <label className="text-xs font-semibold text-slate-300">Unit of Measure (UOM)</label>
                    <select
                      value={columnMapping.unit}
                      onChange={(e) => setColumnMapping({ ...columnMapping, unit: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- None (Default: EA) --</option>
                      {parsedWorkbook.sheets[activeSheetName]?.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 5. Site / Location (Optional) */}
                  <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700 space-y-2">
                    <label className="text-xs font-semibold text-slate-300">Site / Plant Location</label>
                    <select
                      value={columnMapping.siteLocation}
                      onChange={(e) => setColumnMapping({ ...columnMapping, siteLocation: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- None (Default: Primary Facility) --</option>
                      {parsedWorkbook.sheets[activeSheetName]?.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 6. Department / Cost Center (Optional) */}
                  <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700 space-y-2">
                    <label className="text-xs font-semibold text-slate-300">Department / Cost Center</label>
                    <select
                      value={columnMapping.department}
                      onChange={(e) => setColumnMapping({ ...columnMapping, department: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- None (Default: Operations) --</option>
                      {parsedWorkbook.sheets[activeSheetName]?.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 7. Item Code / SKU (Optional) */}
                  <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700 space-y-2">
                    <label className="text-xs font-semibold text-slate-300">Item Code / Catalog SKU</label>
                    <select
                      value={columnMapping.itemId}
                      onChange={(e) => setColumnMapping({ ...columnMapping, itemId: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- None (Auto-detected from description) --</option>
                      {parsedWorkbook.sheets[activeSheetName]?.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 8. Unit Price (Optional) */}
                  <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700 space-y-2">
                    <label className="text-xs font-semibold text-slate-300">Unit Price / Rate</label>
                    <select
                      value={columnMapping.unitPrice}
                      onChange={(e) => setColumnMapping({ ...columnMapping, unitPrice: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- None --</option>
                      {parsedWorkbook.sheets[activeSheetName]?.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 9. Movement / Transaction Type (Optional) */}
                  <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700 space-y-2">
                    <label className="text-xs font-semibold text-slate-300">Movement / Transaction Type</label>
                    <select
                      value={columnMapping.transactionType}
                      onChange={(e) => setColumnMapping({ ...columnMapping, transactionType: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- None (Uses Default Type Above) --</option>
                      {parsedWorkbook.sheets[activeSheetName]?.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Stage 2 Navigation Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setCurrentStage(1)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to File Select
                  </button>

                  <button
                    onClick={handleProceedToValidation}
                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all cursor-pointer"
                  >
                    Proceed to Stage 3: Data Cleaning & Validation
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 3: DATA CLEANING + VALIDATION */}
          {/* ========================================================================= */}
          {currentStage === 3 && qualityReport && (
            <div className="space-y-6">
              {/* Quality Metrics Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Total Evaluated</div>
                  <div className="text-xl font-bold text-white mt-1">{qualityReport.totalRows}</div>
                  <div className="text-[10px] text-slate-500">Spreadsheet Rows</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-emerald-500/30">
                  <div className="text-[10px] uppercase font-bold text-emerald-400">Valid Rows</div>
                  <div className="text-xl font-bold text-emerald-300 mt-1">{qualityReport.validCount}</div>
                  <div className="text-[10px] text-emerald-400/80">Pristine Records</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-indigo-500/30">
                  <div className="text-[10px] uppercase font-bold text-indigo-400">Corrected Rows</div>
                  <div className="text-xl font-bold text-indigo-300 mt-1">{qualityReport.correctedCount}</div>
                  <div className="text-[10px] text-indigo-400/80">Cleaned & Matched</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-amber-500/30">
                  <div className="text-[10px] uppercase font-bold text-amber-400">Warnings</div>
                  <div className="text-xl font-bold text-amber-300 mt-1">{qualityReport.warningCount}</div>
                  <div className="text-[10px] text-amber-400/80">
                    {qualityReport.duplicatesCount} dups, {qualityReport.returnsCount} returns
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-rose-500/30">
                  <div className="text-[10px] uppercase font-bold text-rose-400">Rejected Rows</div>
                  <div className="text-xl font-bold text-rose-300 mt-1">{qualityReport.rejectedCount}</div>
                  <div className="text-[10px] text-rose-400/80">Missing Required Fields</div>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/40">
                  <div className="text-[10px] uppercase font-bold text-indigo-300">Clean Data Rate</div>
                  <div className="text-xl font-bold text-white mt-1">{qualityReport.cleanRate}%</div>
                  <div className="text-[10px] text-indigo-300/80">High Quality</div>
                </div>
              </div>

              {/* Data Quality Report & Row Inspector */}
              <div className="bg-slate-900/40 rounded-2xl border border-slate-800 space-y-4 p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Status Filter Tabs */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => setRowStatusFilter('ALL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        rowStatusFilter === 'ALL'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      All ({qualityReport.totalRows})
                    </button>
                    <button
                      onClick={() => setRowStatusFilter('VALID')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        rowStatusFilter === 'VALID'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-emerald-300'
                      }`}
                    >
                      Valid ({qualityReport.validCount})
                    </button>
                    <button
                      onClick={() => setRowStatusFilter('CORRECTED')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        rowStatusFilter === 'CORRECTED'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-indigo-300'
                      }`}
                    >
                      Corrected ({qualityReport.correctedCount})
                    </button>
                    <button
                      onClick={() => setRowStatusFilter('WARNING')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        rowStatusFilter === 'WARNING'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-amber-300'
                      }`}
                    >
                      Warnings ({qualityReport.warningCount})
                    </button>
                    <button
                      onClick={() => setRowStatusFilter('REJECTED')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        rowStatusFilter === 'REJECTED'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-rose-300'
                      }`}
                    >
                      Rejected ({qualityReport.rejectedCount})
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full md:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search items or SKUs..."
                      value={rowSearchQuery}
                      onChange={(e) => setRowSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Rows Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/80 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3 w-10">Row</th>
                        <th className="py-2.5 px-3">Item Description (Raw → Standardized)</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Qty & Unit</th>
                        <th className="py-2.5 px-3">Catalog Match</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Audit Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredRows.map((row) => (
                        <tr
                          key={row.rowIndex}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            row.status === 'REJECTED'
                              ? 'bg-rose-950/15'
                              : row.status === 'WARNING'
                              ? 'bg-amber-950/15'
                              : row.status === 'CORRECTED'
                              ? 'bg-indigo-950/15'
                              : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[10px]">{row.rowIndex}</td>

                          <td className="py-2.5 px-3 max-w-[280px]">
                            <div className="font-semibold text-white truncate">
                              {row.cleaned.standardizedDescription}
                            </div>
                            {row.cleaned.rawItemDescription !== row.cleaned.standardizedDescription && (
                              <div className="text-[10px] text-slate-400 font-mono truncate">
                                Raw: &ldquo;{row.cleaned.rawItemDescription}&rdquo;
                              </div>
                            )}
                          </td>

                          <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap">
                            {row.cleaned.transactionDate}
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`font-mono font-bold ${
                                row.cleaned.quantity < 0 ? 'text-amber-400' : 'text-slate-100'
                              }`}
                            >
                              {row.cleaned.quantity}
                            </span>{' '}
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1 py-0.5 rounded">
                              {row.cleaned.unit}
                            </span>
                          </td>

                          <td className="py-2.5 px-3">
                            {row.itemMatch.status === 'MATCHED' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                <Check className="w-3 h-3" />
                                {row.itemMatch.matchedSku}
                              </span>
                            ) : row.itemMatch.status === 'LOW_CONFIDENCE' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                                <AlertTriangle className="w-3 h-3" />
                                {row.itemMatch.matchedSku} ({Math.round(row.itemMatch.confidence * 100)}%)
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                                Uncataloged
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold rounded-full border ${
                                row.status === 'VALID'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : row.status === 'CORRECTED'
                                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                  : row.status === 'WARNING'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 max-w-[260px]">
                            {row.rejectionReason && (
                              <div className="text-[11px] text-rose-400 flex items-center gap-1">
                                <XCircle className="w-3 h-3 shrink-0" />
                                <span className="truncate">{row.rejectionReason}</span>
                              </div>
                            )}
                            {row.warnings.length > 0 && !row.rejectionReason && (
                              <div className="text-[11px] text-amber-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span className="truncate">{row.warnings[0]}</span>
                              </div>
                            )}
                            {row.corrections.length > 0 && !row.rejectionReason && row.warnings.length === 0 && (
                              <div className="text-[11px] text-indigo-300 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 shrink-0" />
                                <span className="truncate">{row.corrections[0]}</span>
                              </div>
                            )}
                            {row.corrections.length === 0 && row.warnings.length === 0 && !row.rejectionReason && (
                              <span className="text-[11px] text-slate-500">Pristine formatting</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredRows.length === 0 && (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No rows match the selected status or search filter.
                  </div>
                )}
              </div>

              {/* Confirmation & Commit Section */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      id="skip-rejected-checkbox"
                      type="checkbox"
                      checked={skipRejectedRows}
                      onChange={(e) => setSkipRejectedRows(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-0 cursor-pointer"
                    />
                    <label
                      htmlFor="skip-rejected-checkbox"
                      className="text-xs font-semibold text-slate-200 cursor-pointer"
                    >
                      Skip Rejected Rows ({qualityReport.rejectedCount}) during import
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Will import{' '}
                    <span className="font-bold text-white">
                      {skipRejectedRows
                        ? qualityReport.totalRows - qualityReport.rejectedCount
                        : qualityReport.totalRows}
                    </span>{' '}
                    transactions into Firestore collection <span className="font-mono text-indigo-300">historical_transactions</span>.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentStage(2)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Modify Mappings
                  </button>

                  <button
                    disabled={isCommitting}
                    onClick={handleCommitImport}
                    className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isCommitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Committing Import ({commitProgress?.current || 0}/{commitProgress?.total || 0})...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Confirm & Commit Import
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: IMPORT BATCHES & AUDIT LOGS */}
      {/* ========================================================================= */}
      {activeTab === 'batches' && (
        <ImportBatchesView
          batches={importBatchesList}
          files={uploadedFilesList}
          isLoading={isLoadingAll}
          onRefresh={loadAllHistoricalData}
          onSelectBatch={(batch) => setSelectedBatchModal(batch)}
          onFilterTransactions={(batchId) => handleSelectBatchForExplorer(batchId)}
          onNavigateToUpload={() => setActiveTab('pipeline')}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HISTORICAL RECORD EXPLORER */}
      {/* ========================================================================= */}
      {activeTab === 'explorer' && (
        <HistoricalExplorerView
          transactions={historicalTxList}
          isLoading={isLoadingAll}
          onRefresh={loadAllHistoricalData}
          onSelectTransaction={(tx) => setSelectedTxModal(tx)}
          onSelectBatch={(batchId) => handleSelectBatchForExplorer(batchId)}
          initialBatchFilter={explorerBatchFilter}
          initialStatusFilter={explorerStatusFilter}
          onNavigateToUpload={() => setActiveTab('pipeline')}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ITEM-LEVEL CONSUMPTION & PURCHASE SUMMARIES */}
      {/* ========================================================================= */}
      {activeTab === 'items' && (
        <ItemLevelSummaryView
          transactions={historicalTxList}
          onFilterByItem={handleFilterByItem}
          onNavigateToUpload={() => setActiveTab('pipeline')}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 5: DATA QUALITY HUB */}
      {/* ========================================================================= */}
      {activeTab === 'quality' && (
        <DataQualityHubView
          transactions={historicalTxList}
          onSelectTransaction={(tx) => setSelectedTxModal(tx)}
          onNavigateToUpload={() => setActiveTab('pipeline')}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 6: 16-RULE SYSTEM VERIFICATION */}
      {/* ========================================================================= */}
      {activeTab === 'verification' && (
        <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">16-Rule Historical Ingestion Verification Suite</h3>
              </div>
              <p className="text-xs text-slate-400">
                Automated regression test matrix verifying Stage 1 (Upload/Storage), Stage 2 (Mapping), and Stage 3
                (Cleaning & Normalization).
              </p>
            </div>

            <button
              disabled={isRunningTests}
              onClick={handleRunTests}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : ''}`} />
              {isRunningTests ? 'Running Tests...' : 'Execute All 16 Rules'}
            </button>
          </div>

          {testResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {testResults.map((test) => (
                <div
                  key={test.id}
                  className={`p-4 rounded-xl border transition-all ${
                    test.passed
                      ? 'bg-slate-800/40 border-emerald-500/30 text-slate-200'
                      : 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-mono text-slate-400">
                        {test.id}
                      </span>
                      {test.name}
                    </span>
                    {test.passed ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        PASSED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30">
                        <XCircle className="w-3 h-3" />
                        FAILED
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80 mb-1.5">
                    {test.actualOutcome}
                  </div>
                  <div className="text-[11px] text-slate-400">{test.details}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs space-y-3">
              <ShieldCheck className="w-10 h-10 mx-auto text-slate-600" />
              <p>Click &ldquo;Execute All 16 Rules&rdquo; to run the real-time test suite.</p>
            </div>
          )}
        </div>
      )}

      {/* Batch Detail Modal */}
      {selectedBatchModal && (
        <BatchDetailModal
          batch={selectedBatchModal}
          onClose={() => setSelectedBatchModal(null)}
          onViewTransactions={(batchId) => handleSelectBatchForExplorer(batchId)}
        />
      )}

      {/* Transaction Detail Modal */}
      {selectedTxModal && (
        <TransactionDetailModal
          transaction={selectedTxModal}
          onClose={() => setSelectedTxModal(null)}
        />
      )}
    </div>
  );
};
