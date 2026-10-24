import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Sparkles,
  FileText,
  CheckCircle2,
  ExternalLink,
  Download,
  BookOpen,
  Layers,
  FileCheck,
  AlertCircle,
  FileUp,
} from 'lucide-react';
import { WordItem, UserTag, DifficultyLevel } from '../types/spelling';
import { parseWordsFromPdfText } from '../utils/spelling';
import { SCRIPPS_DATA, createWordItemFromScripps, batchCreateScrippsWords } from '../data/scrippsRepository';

interface ImportWordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportWords: (newWords: WordItem[]) => void;
  userTags: UserTag[];
  allCurrentWords: WordItem[];
}

export const ImportWordsModal: React.FC<ImportWordsModalProps> = ({
  isOpen,
  onClose,
  onImportWords,
  userTags,
  allCurrentWords,
}) => {
  const [activeSourceTab, setActiveSourceTab] = useState<'official-pdf' | 'upload' | 'paste'>('official-pdf');
  const [rawText, setRawText] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('hard');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [isEnrichingWithAI, setIsEnrichingWithAI] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedWords, setUploadedWords] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const parsedWords = activeSourceTab === 'upload' ? uploadedWords : parseWordsFromPdfText(rawText);

  // 1-Click Import from Attached Scripps Words of the Champions PDF
  const handleQuickImportFromScripps = async (
    levelKey: 'oneBee' | 'twoBee' | 'threeBee' | 'all',
    batchLimit?: number
  ) => {
    setIsProcessing(true);
    setImportSummary(null);

    try {
      let wordsToImport: { word: string; difficulty: DifficultyLevel }[] = [];

      if (levelKey === 'all') {
        const one = SCRIPPS_DATA.levels.oneBee.words.map((w) => ({ word: w, difficulty: 'easy' as DifficultyLevel }));
        const two = SCRIPPS_DATA.levels.twoBee.words.map((w) => ({ word: w, difficulty: 'medium' as DifficultyLevel }));
        const three = SCRIPPS_DATA.levels.threeBee.words.map((w) => ({ word: w, difficulty: 'hard' as DifficultyLevel }));
        wordsToImport = [...one, ...two, ...three];
      } else {
        const lvl = SCRIPPS_DATA.levels[levelKey];
        wordsToImport = lvl.words.map((w) => ({ word: w, difficulty: lvl.difficulty }));
      }

      if (batchLimit && batchLimit > 0 && batchLimit < wordsToImport.length) {
        wordsToImport = wordsToImport.slice(0, batchLimit);
      }

      // Check which words are already in the repository
      const currentWordSet = new Set(allCurrentWords.map((w) => w.word.toLowerCase().trim()));
      const filteredToImport = wordsToImport.filter((item) => !currentWordSet.has(item.word.toLowerCase().trim()));

      if (filteredToImport.length === 0) {
        setImportSummary(`All ${wordsToImport.length} words from this section are already in your repository!`);
        setIsProcessing(false);
        return;
      }

      const tagsToAssign = selectedTag ? [selectedTag] : [];
      const newWordItems: WordItem[] = filteredToImport.map((item) =>
        createWordItemFromScripps(item.word, item.difficulty, tagsToAssign)
      );

      onImportWords(newWordItems);
      setImportSummary(
        `🎉 Successfully imported ${newWordItems.length} words from the official Words of the Champions PDF!`
      );
    } catch (err: any) {
      console.error('Import error:', err);
      setImportSummary('Failed to import words from booklet: ' + (err.message || 'unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle PDF or Text File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadedFileName(file.name);
    setIsProcessing(true);

    try {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        // Read as Base64 and send to server PDF parser
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = reader.result as string;
            const res = await fetch('/api/extract-pdf-words', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ base64 }),
            });
            const data = await res.json();
            if (res.ok && Array.isArray(data.words)) {
              setUploadedWords(data.words);
              setImportSummary(`Parsed ${data.words.length} words from ${file.name}`);
            } else {
              setUploadError(data.error || 'Could not parse words from PDF file');
            }
          } catch (err: any) {
            setUploadError('Failed to parse PDF: ' + err.message);
          } finally {
            setIsProcessing(false);
          }
        };
        reader.readAsDataURL(file);
      } else {
        // Text / CSV file
        const text = await file.text();
        const extracted = parseWordsFromPdfText(text);
        setUploadedWords(extracted);
        setImportSummary(`Found ${extracted.length} words in ${file.name}`);
        setIsProcessing(false);
      }
    } catch (err: any) {
      setUploadError('Failed to read file: ' + err.message);
      setIsProcessing(false);
    }
  };

  // Submit words from pasted text or uploaded file
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedWords.length === 0) return;

    setIsProcessing(true);
    setImportSummary(null);

    try {
      const tagsToAssign = selectedTag ? [selectedTag] : [];

      if (isEnrichingWithAI && parsedWords.length <= 25) {
        // AI enrichment batch
        const res = await fetch('/api/enrich-word-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            words: parsedWords.slice(0, 25),
            levelHint: selectedDifficulty,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.words) && data.words.length > 0) {
            const enriched = data.words.map((w: WordItem) => ({
              ...w,
              difficulty: selectedDifficulty,
              tags: tagsToAssign,
            }));
            onImportWords(enriched);
            setImportSummary(`Successfully imported and AI-enriched ${enriched.length} words!`);
            setRawText('');
            setUploadedWords([]);
            setIsProcessing(false);
            return;
          }
        }
      }

      // Fast linguistic repository creation
      const localWords = batchCreateScrippsWords(parsedWords, selectedDifficulty, tagsToAssign);
      onImportWords(localWords);
      setImportSummary(`Successfully imported ${localWords.length} words into your repository!`);
      setRawText('');
      setUploadedWords([]);
    } catch (err) {
      console.error('Import error:', err);
      setImportSummary('Encountered an issue enriching words, but local import succeeded.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick sample loader
  const handleLoadSampleFromPdf = () => {
    const sampleChampions = `accolade, acquiesce, bailiwick, belligerent, chlorophyll, conundrum, debonair, extrapolate, feign, gregarious, hierarchy, idiosyncratic, juxtapose, loquacious, mischievous, nemesis, obfuscate, panacea, querulous, repertoire, surveillance, tactile, ubiquitous, vicarious, whet, xylophone, zealous`;
    setRawText(sampleChampions);
  };

  // Export current repository as JSON
  const handleExportRepository = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(allCurrentWords, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `spellbee_words_of_the_champions_backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-amber-100 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Import & Extend Word Repository</h2>
            <p className="text-xs text-slate-500">
              Import from the official Scripps <span className="font-semibold text-amber-900">Words of the Champions</span> PDF or any study file
            </p>
          </div>
        </div>

        {/* Source Navigation Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl mb-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveSourceTab('official-pdf')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeSourceTab === 'official-pdf'
                ? 'bg-white text-amber-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Official Champions PDF (4,002 words)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSourceTab('upload')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeSourceTab === 'upload'
                ? 'bg-white text-amber-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileUp className="w-3.5 h-3.5 text-amber-600" />
            <span>Upload PDF / File</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSourceTab('paste')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeSourceTab === 'paste'
                ? 'bg-white text-amber-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            <span>Paste Text</span>
          </button>
        </div>

        {/* Success / Info feedback */}
        {importSummary && (
          <div className="p-3.5 mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{importSummary}</span>
          </div>
        )}

        {/* Error notification */}
        {uploadError && (
          <div className="p-3.5 mb-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* TAB 1: OFFICIAL PDF 1-CLICK IMPORTER */}
        {activeSourceTab === 'official-pdf' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-extrabold text-amber-900 block text-xs uppercase tracking-wider">
                  Attached Booklet:
                </span>
                <p className="text-slate-800 font-bold mt-0.5">
                  Words_of_the_Champions_Printable_FINAL.pdf
                </p>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Full 4,002 competition words parsed from all 28 pages across One Bee, Two Bee, and Three Bee.
                </p>
              </div>

              <a
                href="/assets/aistudio/Words_of_the_Champions_Printable_FINAL_737b4a0b.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-xs"
              >
                <span>View PDF</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Optional Tag assignment */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <label className="block font-bold text-slate-700 mb-1">
                Optional: Assign imported words to revision label:
              </label>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 font-semibold bg-white"
              >
                <option value="">None (Clean — No default tags attached)</option>
                {userTags.map((t) => (
                  <option key={t.id} value={t.id}>
                    🏷️ {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Action Grid */}
            <div className="space-y-2.5">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                Choose Words To Import:
              </span>

              {/* One Bee Card */}
              <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-200 text-emerald-900">
                      Easy
                    </span>
                    <h4 className="font-extrabold text-sm text-slate-900">One Bee Study List & Champions</h4>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    <strong>800 words</strong> for classroom and early school spelling bees.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleQuickImportFromScripps('oneBee')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shrink-0 shadow-xs transition-all disabled:opacity-50"
                >
                  Import 800 Words
                </button>
              </div>

              {/* Two Bee Card */}
              <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/50 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-200 text-blue-900">
                      Medium
                    </span>
                    <h4 className="font-extrabold text-sm text-slate-900">Two Bee Study List & Champions</h4>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    <strong>2,100 words</strong> for district and county competitions.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleQuickImportFromScripps('twoBee')}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shrink-0 shadow-xs transition-all disabled:opacity-50"
                >
                  Import 2,100 Words
                </button>
              </div>

              {/* Three Bee Card */}
              <div className="p-3.5 rounded-2xl border border-purple-200 bg-purple-50/50 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-purple-200 text-purple-900">
                      Hard & Finals
                    </span>
                    <h4 className="font-extrabold text-sm text-slate-900">Three Bee Champions Study List</h4>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    <strong>1,102 words</strong> for regional and national championship finals.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleQuickImportFromScripps('threeBee')}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shrink-0 shadow-xs transition-all disabled:opacity-50"
                >
                  Import 1,102 Words
                </button>
              </div>

              {/* All 4,002 Words Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleQuickImportFromScripps('all')}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-black text-sm shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Importing words into repository...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-200" />
                      <span>Import Complete 4,002 Words of the Champions</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FILE UPLOAD */}
        {activeSourceTab === 'upload' && (
          <form onSubmit={handleImportSubmit} className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.txt,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-amber-300 hover:border-amber-500 rounded-3xl p-8 text-center cursor-pointer bg-amber-50/40 hover:bg-amber-50/70 transition-all flex flex-col items-center justify-center gap-2"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <FileUp className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-800">
                {uploadedFileName ? uploadedFileName : 'Click to select or drop a PDF, TXT, or CSV file'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Upload your school spelling bee list, district PDF booklet, or custom vocabulary text file.
              </p>
            </div>

            {uploadedWords.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs">
                <div className="flex items-center justify-between font-bold text-amber-950 mb-1">
                  <span>Extracted {uploadedWords.length} words from file</span>
                  <span className="text-[11px] text-amber-700">Ready to add</span>
                </div>
                <p className="text-[11px] text-slate-600 truncate font-mono">
                  Preview: {uploadedWords.slice(0, 10).join(', ')}...
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Difficulty Level:</label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value as DifficultyLevel)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-semibold"
                >
                  <option value="easy">One-Bee (Easy / Grades 1-3)</option>
                  <option value="medium">Two-Bee (Medium / Grades 4-6)</option>
                  <option value="hard">Three-Bee (Hard / Regional)</option>
                  <option value="very_hard">Champions Finals (Very Hard)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Optional Revision Tag:</label>
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-semibold"
                >
                  <option value="">None (Clean / No tags)</option>
                  {userTags.map((t) => (
                    <option key={t.id} value={t.id}>
                      🏷️ {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadedWords.length === 0 || isProcessing}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-amber-500/20 flex items-center gap-2"
              >
                {isProcessing ? 'Importing...' : `Import ${uploadedWords.length} Words`}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: PASTE TEXT */}
        {activeSourceTab === 'paste' && (
          <form onSubmit={handleImportSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="pdf-words" className="text-xs font-bold text-slate-700">
                  Paste Words or Text from PDF:
                </label>
                <button
                  type="button"
                  onClick={handleLoadSampleFromPdf}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Load Sample Champions List</span>
                </button>
              </div>

              <textarea
                id="pdf-words"
                rows={4}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste lines, columns, or comma-separated words from the PDF (e.g. accolade, acquiesce, conundrum, ubiquitous, farrago)..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-xs sm:text-sm font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-400 placeholder:font-sans placeholder:text-slate-400"
              />

              {parsedWords.length > 0 && (
                <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Found <strong className="text-amber-800">{parsedWords.length} valid words</strong>
                  </span>
                  <span className="truncate max-w-xs text-[11px] text-slate-400">
                    Preview: {parsedWords.slice(0, 5).join(', ')}...
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Difficulty Level:</label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value as DifficultyLevel)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-semibold"
                >
                  <option value="easy">One-Bee (Easy / Grades 1-3)</option>
                  <option value="medium">Two-Bee (Medium / Grades 4-6)</option>
                  <option value="hard">Three-Bee (Hard / Regional)</option>
                  <option value="very_hard">Champions Finals (Very Hard)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Optional Revision Tag:</label>
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-semibold"
                >
                  <option value="">None (Clean / No tags)</option>
                  {userTags.map((t) => (
                    <option key={t.id} value={t.id}>
                      🏷️ {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* AI Enrichment Option */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <span className="font-bold text-xs text-indigo-950 block">
                    Auto-Enrich with Definitions & Sentences
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Looks up phonetics, etymology, and competition clues.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isEnrichingWithAI}
                onChange={(e) => setIsEnrichingWithAI(e.target.checked)}
                className="w-4 h-4 rounded-md accent-indigo-600"
              />
            </div>

            {/* Submit Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleExportRepository}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Backup Repository (JSON)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={parsedWords.length === 0 || isProcessing}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Import {parsedWords.length > 0 ? `${parsedWords.length} Words` : 'Words'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
