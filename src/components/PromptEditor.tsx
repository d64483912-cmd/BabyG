import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, X, Save, Eye, EyeOff, Code, Sparkles, 
  Download, Upload, Trash2, Copy, Check
} from 'lucide-react';
import { 
  defaultTemplates, 
  PromptTemplate, 
  getTemplatesByCategory,
  interpolatePrompt 
} from '@/lib/prompt-templates';
import { toast } from 'sonner';

interface PromptEditorProps {
  onClose: () => void;
  onApplyTemplate?: (template: PromptTemplate) => void;
}

const PromptEditor: React.FC<PromptEditorProps> = ({ onClose, onApplyTemplate }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(
    defaultTemplates[0]
  );
  const [customPrompt, setCustomPrompt] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('general');
  const [showPreview, setShowPreview] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<PromptTemplate[]>([]);
  const [copied, setCopied] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const allTemplates = useMemo(() => {
    return [...defaultTemplates, ...customTemplates];
  }, [customTemplates]);

  const filteredTemplates = useMemo(() => {
    return allTemplates.filter(t => t.category === selectedCategory);
  }, [allTemplates, selectedCategory]);

  const handleSelectTemplate = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setCustomPrompt(template.prompt);
    setTemplateName(template.name);
    setTemplateDescription(template.description);
    setIsEditMode(false);
  };

  const handleSaveCustomTemplate = () => {
    if (!templateName.trim() || !customPrompt.trim()) {
      toast.error('Please provide a name and prompt');
      return;
    }

    const newTemplate: PromptTemplate = {
      id: `custom-${Date.now()}`,
      name: templateName,
      description: templateDescription,
      category: selectedCategory as any,
      prompt: customPrompt,
      variables: extractVariables(customPrompt),
      isDefault: false
    };

    setCustomTemplates([...customTemplates, newTemplate]);
    setSelectedTemplate(newTemplate);
    setIsEditMode(false);
    toast.success('Template saved successfully!');
  };

  const handleDeleteTemplate = (templateId: string) => {
    setCustomTemplates(customTemplates.filter(t => t.id !== templateId));
    if (selectedTemplate?.id === templateId) {
      setSelectedTemplate(defaultTemplates[0]);
      handleSelectTemplate(defaultTemplates[0]);
    }
    toast.success('Template deleted');
  };

  const handleApplyTemplate = () => {
    if (!selectedTemplate) return;
    onApplyTemplate?.(selectedTemplate);
    toast.success(`Applied template: ${selectedTemplate.name}`);
    onClose();
  };

  const handleCopyPrompt = () => {
    if (selectedTemplate) {
      navigator.clipboard.writeText(selectedTemplate.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Prompt copied to clipboard');
    }
  };

  const handleExportTemplate = () => {
    if (!selectedTemplate) return;
    const dataStr = JSON.stringify(selectedTemplate, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedTemplate.id}.json`;
    link.click();
    toast.success('Template exported');
  };

  const handleImportTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const template = JSON.parse(e.target?.result as string) as PromptTemplate;
        template.id = `custom-${Date.now()}`;
        template.isDefault = false;
        setCustomTemplates([...customTemplates, template]);
        toast.success('Template imported successfully');
      } catch (error) {
        toast.error('Invalid template file');
      }
    };
    reader.readAsText(file);
  };

  const extractVariables = (prompt: string): string[] => {
    const matches = prompt.match(/{{(.*?)}}/g) || [];
    return matches.map(m => m.replace(/{{|}}/g, ''));
  };

  const previewPrompt = useMemo(() => {
    if (!selectedTemplate) return '';
    return interpolatePrompt(selectedTemplate.prompt, {
      objective: 'Example: Build a mobile app',
      description: 'Example: A React Native app for task management'
    });
  }, [selectedTemplate]);

  const categories = [
    { value: 'general', label: 'General', icon: '🌐' },
    { value: 'development', label: 'Development', icon: '💻' },
    { value: 'research', label: 'Research', icon: '🔬' },
    { value: 'design', label: 'Design', icon: '🎨' },
    { value: 'management', label: 'Management', icon: '📊' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-indigo-900/90 to-purple-900/90 backdrop-blur-md rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-white/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-purple-300" />
            <h2 className="text-2xl font-bold text-white">Prompt Editor</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
              title={showPreview ? 'Hide Preview' : 'Show Preview'}
            >
              {showPreview ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex gap-6 flex-1 overflow-hidden">
          {/* Sidebar - Templates List */}
          <div className="w-64 flex flex-col gap-3">
            {/* Category Filter */}
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <h3 className="text-xs font-semibold text-white/60 mb-2">Category</h3>
              <div className="space-y-1">
                {categories.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all text-sm ${
                      selectedCategory === cat.value
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/5 text-white/80 hover:bg-white/10'
                    }`}
                  >
                    <span className="mr-2">{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Templates */}
            <div className="flex-1 overflow-y-auto space-y-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-white/60">Templates</h3>
                <button
                  onClick={() => {
                    setIsEditMode(true);
                    setCustomPrompt('');
                    setTemplateName('');
                    setTemplateDescription('');
                    setSelectedTemplate(null);
                  }}
                  className="p-1 hover:bg-white/10 rounded transition-colors text-purple-300"
                  title="New Template"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
              
              {filteredTemplates.map(template => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-3 rounded-lg cursor-pointer transition-all group ${
                    selectedTemplate?.id === template.id
                      ? 'bg-white/20 border-2 border-purple-400'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                  onClick={() => handleSelectTemplate(template)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white text-sm truncate">{template.name}</h4>
                      <p className="text-xs text-white/60 mt-1 line-clamp-2">{template.description}</p>
                      {template.isDefault && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    {!template.isDefault && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/30 rounded transition-all text-white/50 hover:text-red-300"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Import/Export */}
            <div className="flex gap-2">
              <label className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 text-white text-xs">
                <Upload className="w-3 h-3" />
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportTemplate}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleExportTemplate}
                disabled={!selectedTemplate}
                className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all flex items-center justify-center gap-2 text-white text-xs"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
            </div>
          </div>

          {/* Main Content - Prompt Editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedTemplate || isEditMode ? (
              <>
                {/* Template Info */}
                {isEditMode ? (
                  <div className="bg-white/5 rounded-lg p-4 mb-4 border border-white/10 space-y-3">
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Template Name"
                      className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-purple-400"
                    />
                    <input
                      type="text"
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="Template Description"
                      className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                ) : selectedTemplate && (
                  <div className="bg-white/5 rounded-lg p-4 mb-4 border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-1">{selectedTemplate.name}</h3>
                    <p className="text-sm text-white/70 mb-3">{selectedTemplate.description}</p>
                    {selectedTemplate.variables.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-white/60">Variables:</span>
                        {selectedTemplate.variables.map(v => (
                          <span key={v} className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">
                            {`{{${v}}}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Prompt Editor */}
                <div className="flex-1 bg-white/5 rounded-lg border border-white/10 overflow-hidden flex flex-col">
                  <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/70">
                      <Code className="w-4 h-4" />
                      <span className="text-sm font-medium">Prompt</span>
                    </div>
                    <button
                      onClick={handleCopyPrompt}
                      className="p-1 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white"
                      title="Copy Prompt"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <textarea
                    value={isEditMode ? customPrompt : selectedTemplate?.prompt || ''}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    readOnly={!isEditMode}
                    className="flex-1 p-4 bg-transparent text-white font-mono text-sm resize-none focus:outline-none"
                    placeholder="Enter your custom prompt here..."
                  />
                </div>

                {/* Preview */}
                <AnimatePresence>
                  {showPreview && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-400/30 overflow-hidden"
                    >
                      <div className="px-4 py-2 bg-white/5 border-b border-white/10">
                        <span className="text-sm font-medium text-white/70">Preview (with example values)</span>
                      </div>
                      <div className="p-4 text-white/80 text-sm font-mono max-h-48 overflow-y-auto">
                        {previewPrompt}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="flex gap-3 mt-4">
                  {isEditMode ? (
                    <>
                      <button
                        onClick={handleSaveCustomTemplate}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2"
                      >
                        <Save className="w-5 h-5" />
                        Save Template
                      </button>
                      <button
                        onClick={() => {
                          setIsEditMode(false);
                          if (defaultTemplates[0]) {
                            handleSelectTemplate(defaultTemplates[0]);
                          }
                        }}
                        className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-semibold text-white transition-all"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setIsEditMode(true);
                          setCustomPrompt(selectedTemplate?.prompt || '');
                          setTemplateName(`Copy of ${selectedTemplate?.name}`);
                          setTemplateDescription(selectedTemplate?.description || '');
                        }}
                        className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2"
                      >
                        <Code className="w-5 h-5" />
                        Edit
                      </button>
                      <button
                        onClick={handleApplyTemplate}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-5 h-5" />
                        Apply Template
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-white/60">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select a template or create a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PromptEditor;
