import React, { useEffect, useState } from 'react';
import { apiClient, type SavedGraph } from '../logic/apiClient';
import { KnowledgeGraph } from '../logic/GraphModel';
import type { Language } from '../logic/translations';

interface ProjectManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentGraph: KnowledgeGraph | null;
    onLoadGraph: (graph: KnowledgeGraph, id: string, name?: string) => void;
    lang: Language;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
    isOpen,
    onClose,
    currentGraph,
    onLoadGraph,
    lang
}) => {
    const [graphs, setGraphs] = useState<SavedGraph[]>([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'list' | 'save'>('list');

    // Form State
    const [saveName, setSaveName] = useState('');
    const [saveDesc, setSaveDesc] = useState('');

    const t = {
        title: lang === 'zh' ? '项目管理' : 'Project Manager',
        saveTitle: lang === 'zh' ? '保存当前画布' : 'Save Current Canvas',
        projectList: lang === 'zh' ? '已保存项目' : 'Saved Projects',
        name: lang === 'zh' ? '项目名称' : 'Project Name',
        desc: lang === 'zh' ? '描述 (可选)' : 'Description (Optional)',
        save: lang === 'zh' ? '保存' : 'Save',
        back: lang === 'zh' ? '返回列表' : 'Back to List',
        load: lang === 'zh' ? '加载' : 'Load',
        delete: lang === 'zh' ? '删除' : 'Delete',
        export: lang === 'zh' ? '导出 JSON' : 'Export JSON',
        nodes: lang === 'zh' ? '节点' : 'Nodes',
        edges: lang === 'zh' ? '连线' : 'Edges',
        noProjects: lang === 'zh' ? '暂无保存的项目' : 'No saved projects found.',
        confirmDelete: lang === 'zh' ? '确定要删除吗？' : 'Are you sure you want to delete?',
        createNew: lang === 'zh' ? '新建保存' : 'Save New Project',
        newCanvas: lang === 'zh' ? '新建空画板' : 'New Empty Canvas'
    };

    useEffect(() => {
        if (isOpen) {
            loadGraphs();
            setView('list');
        }
    }, [isOpen]);

    const loadGraphs = async () => {
        setLoading(true);
        try {
            const list = await apiClient.getAllGraphs();
            setGraphs(list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentGraph || !saveName.trim()) return;

        setLoading(true);
        try {
            const graphData = {
                nodes: Array.from(currentGraph.nodes.values()),
                edges: currentGraph.edges
            };

            await apiClient.saveGraph(saveName, saveDesc, graphData);
            setSaveName('');
            setSaveDesc('');
            await loadGraphs();
            setView('list');
        } catch (error) {
            alert('Failed to save project');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleLoad = async (id: string) => {
        setLoading(true);
        try {
            const fullGraph = await apiClient.getGraphById(id);
            const data = fullGraph.data;

            // Reconstruct KnowledgeGraph
            const loadedGraph = new KnowledgeGraph(
                new Map(data.nodes.map((n: any) => [n.id, n])),
                data.edges
            );

            onLoadGraph(loadedGraph, id, fullGraph.name);
            onClose();
        } catch (error) {
            alert('Failed to load project');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t.confirmDelete)) return;
        setLoading(true);
        try {
            await apiClient.deleteGraph(id);
            await loadGraphs();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden relative flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        </span>
                        {t.title}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent"></div>
                        </div>
                    )}

                    {view === 'list' ? (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t.projectList}</h3>
                                <button
                                    type="button"
                                    onClick={() => setView('save')}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                    {t.createNew}
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onLoadGraph(new KnowledgeGraph(), 'new-empty', lang === 'zh' ? '未命名画布' : 'Untitled Canvas');
                                        onClose();
                                    }}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold border border-slate-200 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 ml-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    {t.newCanvas}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {graphs.length === 0 ? (
                                    <div className="col-span-2 py-12 text-center text-slate-400 font-medium">
                                        {t.noProjects}
                                    </div>
                                ) : (
                                    graphs.map(project => (
                                        <div key={project.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-xl hover:border-indigo-200 transition-all group relative overflow-hidden">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-lg">{project.name}</h4>
                                                    <p className="text-xs text-slate-400 font-medium mt-1">
                                                        {new Date(project.updatedAt).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <a
                                                        href={apiClient.exportGraphUrl(project.id)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 bg-slate-100 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                                        title={t.export}
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.preventDefault(); handleDelete(project.id); }}
                                                        className="p-2 bg-slate-100 text-rose-500 rounded-lg hover:bg-rose-50 transition-colors"
                                                        title={t.delete}
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mb-4 text-sm text-slate-500 line-clamp-2 min-h-[1.5em]">
                                                {project.description || 'No description'}
                                            </div>

                                            <div className="flex items-center gap-4 mb-4">
                                                <span className="px-2 py-1 bg-slate-100 rounded-md text-[10px] uppercase font-bold text-slate-500 tracking-wide">
                                                    {project.nodeCount} {t.nodes}
                                                </span>
                                                <span className="px-2 py-1 bg-slate-100 rounded-md text-[10px] uppercase font-bold text-slate-500 tracking-wide">
                                                    {project.edgeCount} {t.edges}
                                                </span>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); handleLoad(project.id); }}
                                                className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <span>{t.load}</span>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-lg mx-auto py-8">
                            <div className="mb-6 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-800">{t.saveTitle}</h3>
                                <button type="button" onClick={() => setView('list')} className="text-slate-500 hover:text-slate-800 text-sm font-bold">
                                    {t.back}
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.name}</label>
                                    <input
                                        type="text"
                                        value={saveName}
                                        onChange={e => setSaveName(e.target.value)}
                                        className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium"
                                        placeholder="My Amazing Project"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.desc}</label>
                                    <textarea
                                        value={saveDesc}
                                        onChange={e => setSaveDesc(e.target.value)}
                                        className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium h-32 resize-none"
                                        placeholder="Add some details..."
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); handleSave(); }}
                                    disabled={!saveName.trim()}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-lg font-bold shadow-xl shadow-indigo-200 transition-all mt-4"
                                >
                                    {t.save}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
