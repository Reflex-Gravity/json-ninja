import { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, Check, Upload, Download } from 'lucide-react';
import type { Base64ToolState } from '@/types';
import { getToolState, saveToolState } from '@/lib/db';
import {
  encodeBase64Text,
  decodeBase64Text,
  encodeBase64File,
  decodeBase64ToBlob,
} from '@/lib/base64-utils';

const TOOL_KEY = 'base64';

export default function Base64App() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Base64ToolState | null>(null);

  useEffect(() => {
    let cancelled = false;
    getToolState<Base64ToolState>(TOOL_KEY).then((state) => {
      if (cancelled) return;
      if (state) {
        setMode(state.mode);
        setInput(state.input);
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const persistState = useCallback((newMode: 'encode' | 'decode', newInput: string) => {
    pendingRef.current = { mode: newMode, input: newInput };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (pendingRef.current) saveToolState(TOOL_KEY, pendingRef.current);
      pendingRef.current = null;
    }, 800);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (pendingRef.current) saveToolState(TOOL_KEY, pendingRef.current);
    };
  }, []);

  const handleModeChange = (newMode: 'encode' | 'decode') => {
    setMode(newMode);
    persistState(newMode, input);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    persistState(mode, value);
  };

  let output = '';
  let error = '';
  if (input) {
    try {
      output = mode === 'encode' ? encodeBase64Text(input) : decodeBase64Text(input);
    } catch {
      error = 'Invalid Base64 string';
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleImportFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const encoded = await encodeBase64File(file);
    setMode('encode');
    handleInputChange(encoded);
  };

  const handleDownloadDecoded = () => {
    if (!input.trim()) return;
    try {
      const blob = decodeBase64ToBlob(input);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'decoded.bin';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // invalid base64, nothing to download
    }
  };

  if (!loaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden p-2 gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-md p-0.5">
          {(['encode', 'decode'] as const).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`px-3 py-1.5 rounded text-xs font-medium capitalize transition-colors ${
                mode === m
                  ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleImportFile}
            title="Encode a file"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import file
          </button>
          {mode === 'decode' && (
            <button
              onClick={handleDownloadDecoded}
              title="Download decoded bytes"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden gap-2">
        <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="px-2 py-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
            {mode === 'encode' ? 'Text' : 'Base64'}
          </div>
          <textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            spellCheck={false}
            placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Enter Base64 to decode...'}
            className="flex-1 w-full p-3 font-mono text-xs resize-none outline-none bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
          />
        </div>
        <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-2 py-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
            <span>{mode === 'encode' ? 'Base64' : 'Text'}</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <textarea
            value={error || output}
            readOnly
            spellCheck={false}
            className={`flex-1 w-full p-3 font-mono text-xs resize-none outline-none bg-white dark:bg-gray-800 ${
              error ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'
            }`}
          />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelected}
      />
    </div>
  );
}
