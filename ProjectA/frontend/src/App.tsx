import React, { useState } from 'react';
import axios from 'axios';
import { Upload, FileText, Settings, Play, CheckCircle2, AlertCircle, Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Question {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleGenerate = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('num_questions', numQuestions.toString());
    formData.append('difficulty', difficulty);

    try {
      const response = await axios.post('http://localhost:8000/upload-and-generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setQuestions(response.data.questions);
      setCurrentStep(2);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <FileText size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">AI Question Generator</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${currentStep === 1 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
            1. Setup
          </div>
          <ChevronRight size={16} className="text-slate-300" />
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${currentStep === 2 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
            2. Review
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-6">
        <AnimatePresence mode="wait">
          {currentStep === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-extrabold">Generate Questions from Documents</h2>
                <p className="text-slate-500">Upload a PDF or Word document and let AI create high-quality assessments for you.</p>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                {/* Upload Area */}
                <div 
                  className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors ${file ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}
                >
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.docx"
                  />
                  <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer">
                    {file ? (
                      <>
                        <CheckCircle2 className="text-blue-600 mb-3" size={48} />
                        <span className="font-semibold text-blue-700">{file.name}</span>
                        <span className="text-sm text-blue-500 mt-1">Click to change file</span>
                      </>
                    ) : (
                      <>
                        <div className="bg-slate-100 p-4 rounded-full mb-4">
                          <Upload className="text-slate-400" size={32} />
                        </div>
                        <span className="font-semibold">Click to upload document</span>
                        <span className="text-sm text-slate-400 mt-1">Supports PDF, DOCX (Max 10MB)</span>
                      </>
                    )}
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Settings size={16} /> Number of Questions
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Settings size={16} /> Difficulty Level
                    </label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-start gap-3">
                    <AlertCircle size={20} className="mt-0.5" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={loading || !file}
                  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${loading || !file ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-blue-200'}`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Analyzing Document...
                    </>
                  ) : (
                    <>
                      <Play size={20} />
                      Generate Questions
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
                >
                  <ChevronLeft size={20} /> Back to Setup
                </button>
                <h2 className="text-2xl font-bold">Generated Bank ({questions.length})</h2>
                <div className="w-24"></div> {/* Spacer for balance */}
              </div>

              <div className="space-y-6">
                {questions.map((q, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                    <div className="flex gap-4">
                      <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {idx + 1}
                      </span>
                      <h3 className="font-semibold text-lg">{q.question}</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-12">
                      {q.options.map((option, optIdx) => (
                        <div 
                          key={optIdx} 
                          className={`p-3 rounded-lg border text-sm transition-colors ${option === q.correct_answer ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium' : 'bg-slate-50 border-slate-100 text-slate-600'}`}
                        >
                          <span className="inline-block w-6 text-slate-400 font-mono">{String.fromCharCode(65 + optIdx)}.</span>
                          {option}
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <div className="mt-4 pl-12">
                        <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 italic border-l-4 border-slate-200">
                          <strong>Explanation:</strong> {q.explanation}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
