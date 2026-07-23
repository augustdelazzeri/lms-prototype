// Epic 1G.8: Inline Add Term Modal
"use client";

import { useState } from 'react';
import { X } from 'lucide-react';
import Button from '@/components/Button';
import Modal from '@/components/Modal';

interface InlineAddTermModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (term: string, preferred?: string, isBanned?: boolean) => void;
  initialTerm?: string;
  isBanned?: boolean;
}

export default function InlineAddTermModal({
  isOpen,
  onClose,
  onSave,
  initialTerm = '',
  isBanned = false,
}: InlineAddTermModalProps) {
  const [term, setTerm] = useState(initialTerm);
  const [preferred, setPreferred] = useState('');
  const [termType, setTermType] = useState<'banned' | 'preferred'>(isBanned ? 'banned' : 'preferred');

  const handleSave = () => {
    if (!term.trim()) return;
    
    if (termType === 'banned') {
      onSave(term.trim(), undefined, true);
    } else {
      if (!preferred.trim()) {
        alert('Please provide a preferred term');
        return;
      }
      onSave(term.trim(), preferred.trim(), false);
    }
    
    // Reset form
    setTerm('');
    setPreferred('');
    setTermType('preferred');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="small">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Add to Style Guide</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Term Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setTermType('banned')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  termType === 'banned'
                    ? 'bg-red-100 text-red-700 border-2 border-red-300'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent'
                }`}
              >
                Banned Term
              </button>
              <button
                onClick={() => setTermType('preferred')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  termType === 'preferred'
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent'
                }`}
              >
                Preferred Term
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Term <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Enter term"
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
              autoFocus
            />
          </div>

          {termType === 'preferred' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Term <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={preferred}
                onChange={(e) => setPreferred(e.target.value)}
                placeholder="Enter preferred replacement"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Add to Style Guide
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}




