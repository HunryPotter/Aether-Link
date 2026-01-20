import { useState, useEffect } from 'react';
import type { Language } from '../logic/translations';

interface AttributeEntry {
    value: number;
    confidence: number;
}

interface AttributeEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (attributes: Record<string, AttributeEntry>) => void;
    initialAttributes: Record<string, AttributeEntry>;
    lang: Language;
}

export const AttributeEditorModal = ({ isOpen, onClose, onSave, initialAttributes, lang }: AttributeEditorModalProps) => {
    const [attributes, setAttributes] = useState<Record<string, AttributeEntry>>(initialAttributes || {});
    const [newName, setNewName] = useState('');
    const [newValue, setNewValue] = useState<number>(0);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setAttributes(initialAttributes ? { ...initialAttributes } : {});
            setNewName('');
            setNewValue(0);
        }
    }, [isOpen, initialAttributes]);

    if (!isOpen) return null;

    const handleAdd = () => {
        if (!newName) return;
        setAttributes(prev => ({
            ...prev,
            [newName]: {
                value: newValue,
                confidence: 1.0 // Default to 100% confidence
            }
        }));
        setNewName('');
        setNewValue(0);
    };

    const handleRemove = (key: string) => {
        const next = { ...attributes };
        delete next[key];
        setAttributes(next);
    };

    const handleSave = () => {
        onSave(attributes);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-[500px] overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-lg font-black text-slate-800">
                        {lang === 'zh' ? '管理节点属性' : 'Manage Node Attributes'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {/* Add New Input Group */}
                    <div className="flex gap-3 mb-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100 items-end">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Name</label>
                            <input
                                className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder={lang === 'zh' ? '如: 温度' : 'Name'}
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                            />
                        </div>
                        <div className="w-24">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Value</label>
                            <input
                                type="number"
                                className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-center font-mono"
                                value={newValue}
                                onChange={e => setNewValue(parseFloat(e.target.value))}
                            />
                        </div>
                        <button
                            onClick={handleAdd}
                            disabled={!newName}
                            className={`px-4 py-2 rounded-lg text-sm font-bold h-[38px] transition-all ${newName ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                        >
                            +
                        </button>
                    </div>

                    {/* Attribute List Header */}
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">
                        <div className="col-span-8">Name</div>
                        <div className="col-span-3 text-right">Obj. Value</div>
                        <div className="col-span-1"></div>
                    </div>

                    {/* Attribute List */}
                    <div className="space-y-2">
                        {Object.entries(attributes).length === 0 && (
                            <div className="text-center text-slate-400 text-sm py-8 italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                {lang === 'zh' ? '暂无属性' : 'No attributes defined'}
                            </div>
                        )}
                        {Object.entries(attributes).map(([key, data]) => (
                            <div key={key} className="grid grid-cols-12 gap-2 items-center p-3 bg-white rounded-lg border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all group">
                                <div className="col-span-8 font-bold text-slate-700 text-sm truncate" title={key}>{key}</div>
                                <div className="col-span-3 font-mono text-sm text-slate-600 text-right pr-2">{data.value}</div>
                                <div className="col-span-1 text-right">
                                    <button
                                        onClick={() => handleRemove(key)}
                                        className="text-slate-300 hover:text-rose-500 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition"
                    >
                        {lang === 'zh' ? '取消' : 'Cancel'}
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        {lang === 'zh' ? '保存' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};
