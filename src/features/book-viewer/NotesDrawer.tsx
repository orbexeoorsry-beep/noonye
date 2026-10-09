import React, { useState } from 'react';
import { UserNote } from '../../types';
import { useI18n } from '../../i18n';
import { AppIcon, IconButton } from '../../design-system';

interface NotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pageNumber: number;
  notes: UserNote[];
  onAddNote: (text: string) => void;
  onDeleteNote: (noteId: string) => void;
}

export const NotesDrawer: React.FC<NotesDrawerProps> = ({
  isOpen,
  onClose,
  pageNumber,
  notes,
  onAddNote,
  onDeleteNote,
}) => {
  const { t } = useI18n();
  const [inputText, setInputText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onAddNote(inputText.trim());
    setInputText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs animate-in fade-in duration-200 motion-reduce:animate-none">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200 motion-reduce:animate-none">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AppIcon name="notes" size="sm" className="text-amber-500" />
            <h3 className="font-bold text-slate-900 text-sm font-display">
              {t.viewer.pageNotesTitle} ({t.common.page} {pageNumber})
            </h3>
          </div>
          <IconButton
            name="close"
            iconSize="sm"
            variant="ghost"
            label={t.common.close}
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] text-slate-400 hover:text-slate-700"
          />
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans">
          {notes.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-400 text-xs leading-relaxed">
              <AppIcon name="notes" size="xl" className="mx-auto mb-2 text-slate-300" />
              <p>{t.viewer.noNotesYet}</p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3.5 relative group text-start font-sans"
              >
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {note.text}
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-200/40 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1 font-sans">
                    <AppIcon name="award" size="xs" className="text-slate-300" />
                    <span>{note.createdAt}</span>
                  </span>
                  <IconButton
                    name="delete"
                    iconSize="xs"
                    variant="ghost"
                    label={t.actions.delete}
                    onClick={() => onDeleteNote(note.id)}
                    className="min-h-[36px] min-w-[36px] text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Note Form */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200 bg-slate-50 font-sans">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t.viewer.noteInputPlaceholder}
            rows={3}
            className="w-full text-xs sm:text-sm p-3 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-600 resize-none font-sans"
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 transition-colors active:scale-[0.98] motion-reduce:transform-none shadow-xs"
            >
              <AppIcon name="addBook" size="xs" />
              <span>{t.viewer.saveNote}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
