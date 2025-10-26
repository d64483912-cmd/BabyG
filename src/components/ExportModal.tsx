import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  FileText,
  Table,
  FileType,
  X,
  Check,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Objective } from './BabyAGI';
import {
  exportToMarkdown,
  exportToNotion,
  exportToCSV,
  exportToPDF,
  downloadFile
} from '@/lib/export-utils';
import { toast } from 'sonner';

interface ExportModalProps {
  objectives: Objective[];
  onClose: () => void;
}

type ExportFormat = 'markdown' | 'notion' | 'csv' | 'pdf';

interface FormatOption {
  id: ExportFormat;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  fileExtension: string;
  mimeType: string;
}

const formatOptions: FormatOption[] = [
  {
    id: 'markdown',
    name: 'Markdown',
    description: 'Universal format for documentation',
    icon: FileText,
    color: 'from-gray-500 to-gray-600',
    fileExtension: 'md',
    mimeType: 'text/markdown'
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Import directly into Notion',
    icon: FileType,
    color: 'from-blue-500 to-indigo-500',
    fileExtension: 'md',
    mimeType: 'text/markdown'
  },
  {
    id: 'csv',
    name: 'CSV (Google Sheets)',
    description: 'Spreadsheet format for analysis',
    icon: Table,
    color: 'from-green-500 to-emerald-500',
    fileExtension: 'csv',
    mimeType: 'text/csv'
  },
  {
    id: 'pdf',
    name: 'PDF',
    description: 'Portable document for sharing',
    icon: FileType,
    color: 'from-red-500 to-rose-500',
    fileExtension: 'pdf',
    mimeType: 'application/pdf'
  }
];

export default function ExportModal({ objectives, onClose }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown');
  const [isExporting, setIsExporting] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const handleExport = async () => {
    if (objectives.length === 0) {
      toast.error('No objectives to export');
      return;
    }

    setIsExporting(true);
    
    try {
      const timestamp = Date.now();
      const selectedOption = formatOptions.find(f => f.id === selectedFormat)!;
      
      switch (selectedFormat) {
        case 'markdown': {
          const content = exportToMarkdown(objectives);
          downloadFile(content, `babyagi-export-${timestamp}.${selectedOption.fileExtension}`, selectedOption.mimeType);
          toast.success('Markdown file downloaded successfully!');
          break;
        }
        
        case 'notion': {
          const content = exportToNotion(objectives);
          downloadFile(content, `babyagi-notion-${timestamp}.${selectedOption.fileExtension}`, selectedOption.mimeType);
          toast.success('Notion-formatted file downloaded! Import it into Notion as Markdown.');
          break;
        }
        
        case 'csv': {
          const content = exportToCSV(objectives);
          downloadFile(content, `babyagi-export-${timestamp}.${selectedOption.fileExtension}`, selectedOption.mimeType);
          toast.success('CSV file downloaded! Open in Google Sheets or Excel.');
          break;
        }
        
        case 'pdf': {
          exportToPDF(objectives);
          toast.success('PDF generated successfully!');
          break;
        }
      }
      
      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePreview = () => {
    try {
      let content = '';
      
      switch (selectedFormat) {
        case 'markdown':
          content = exportToMarkdown(objectives);
          break;
        case 'notion':
          content = exportToNotion(objectives);
          break;
        case 'csv':
          content = exportToCSV(objectives);
          break;
        default:
          toast.info('Preview not available for PDF format');
          return;
      }
      
      setPreview(content);
      setShowPreview(true);
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to generate preview');
    }
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(preview);
    toast.success('Copied to clipboard!');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-gradient-to-br from-indigo-950 via-purple-900 to-pink-900 rounded-2xl border border-white/10 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Export Objectives</h2>
              <p className="text-sm text-muted-foreground">
                Choose your preferred export format
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Stats */}
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Exporting:</span>
              <span className="font-semibold">
                {objectives.length} objective{objectives.length !== 1 ? 's' : ''} with{' '}
                {objectives.reduce((acc, obj) => acc + obj.tasks.length, 0)} task
                {objectives.reduce((acc, obj) => acc + obj.tasks.length, 0) !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium mb-2">Select Format</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {formatOptions.map((format) => {
                const Icon = format.icon;
                const isSelected = selectedFormat === format.id;
                
                return (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.id)}
                    className={`
                      relative p-4 rounded-xl border-2 transition-all text-left
                      ${isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${format.color}`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{format.name}</h3>
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format-specific notes */}
          <AnimatePresence mode="wait">
            {selectedFormat === 'notion' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <ExternalLink className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-400 mb-1">Import to Notion:</p>
                    <ol className="text-blue-300 space-y-1 list-decimal list-inside">
                      <li>Download the file</li>
                      <li>In Notion, create a new page</li>
                      <li>Click "..." → Import → Markdown</li>
                      <li>Select the downloaded file</li>
                    </ol>
                  </div>
                </div>
              </motion.div>
            )}
            
            {selectedFormat === 'csv' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-green-500/10 border border-green-500/20 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <Table className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-green-400 mb-1">Open in Google Sheets:</p>
                    <ol className="text-green-300 space-y-1 list-decimal list-inside">
                      <li>Go to Google Sheets</li>
                      <li>File → Import → Upload</li>
                      <li>Select the CSV file</li>
                      <li>Choose import options and click "Import data"</li>
                    </ol>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Preview */}
          {showPreview && preview && (
            <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Preview</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyPreview}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-sm flex items-center gap-1 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
              <pre className="text-xs bg-black/30 rounded-lg p-4 overflow-x-auto max-h-64 overflow-y-auto">
                {preview}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-white/10">
          <button
            onClick={handlePreview}
            disabled={selectedFormat === 'pdf'}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            Preview
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || objectives.length === 0}
              className="px-6 py-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold flex items-center gap-2 transition-all"
            >
              {isExporting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Download className="w-4 h-4" />
                  </motion.div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
