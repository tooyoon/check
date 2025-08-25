// =============== Global Variables & Constants ===============
const { useState, useEffect, useMemo, useRef } = React;

const PRIORITIES = [
    { value: "none", label: "없음", color: "gray" },
    { value: "low", label: "낮음", color: "blue" },
    { value: "medium", label: "보통", color: "yellow" },
    { value: "high", label: "높음", color: "red" },
];

// =============== Utility Functions ===============
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('ko-KR') : "");
const todayISO = () => new Date().toISOString().slice(0, 10);

function cn(...args) {
    return args.filter(Boolean).join(" ");
}

// Export utilities to global scope
window.cn = cn;
window.PRIORITIES = PRIORITIES;
window.playSuccess = playSuccess;
window.playUndo = playUndo;

// =============== Sound Effects ===============
function playTone(freq = 880, duration = 0.14, type = 'triangle', gain = 0.05) {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        osc.connect(g);
        g.connect(ctx.destination);
        const now = ctx.currentTime;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(gain, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        osc.start(now);
        osc.stop(now + duration + 0.02);
        osc.onended = () => ctx.close && ctx.close();
    } catch (e) {
        console.log('Audio context not available');
    }
}

function playSuccess() {
    playTone(880, 0.12, 'triangle', 0.06);
    setTimeout(() => playTone(1320, 0.12, 'triangle', 0.05), 90);
}

function playUndo() {
    playTone(440, 0.12, 'sine', 0.05);
}

// =============== Local Storage Database ===============
class LocalFileDB {
    constructor() {
        this.dbFile = 'data.json';
        this.data = { categories: [], tasks: [] };
        this.loadData();
    }

    async loadData() {
        try {
            const stored = localStorage.getItem('checklistApp');
            if (stored) {
                this.data = JSON.parse(stored);
            }
            
            if (this.data.categories.length === 0) {
                this.data.categories = [
                    { id: "work", name: "업무", emoji: "💼", builtin: false },
                    { id: "home", name: "가정", emoji: "🏠", builtin: false },
                    { id: "personal", name: "개인", emoji: "👤", builtin: false },
                    { id: "study", name: "학습", emoji: "📚", builtin: false }
                ];
                await this.saveData();
            }
        } catch (e) {
            console.error('데이터 로드 오류:', e);
        }
    }

    async saveData() {
        try {
            localStorage.setItem('checklistApp', JSON.stringify(this.data));
            this.createDownloadableBackup();
        } catch (e) {
            console.error('데이터 저장 오류:', e);
        }
    }

    createDownloadableBackup() {
        const dataStr = JSON.stringify(this.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'checklist-backup.json';
        link.style.display = 'none';
        document.body.appendChild(link);
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async getCategories() {
        return [...this.data.categories];
    }

    async getTasks() {
        return [...this.data.tasks];
    }

    async saveCategory(category) {
        const index = this.data.categories.findIndex(c => c.id === category.id);
        if (index >= 0) {
            this.data.categories[index] = category;
        } else {
            this.data.categories.push(category);
        }
        await this.saveData();
    }

    async deleteCategory(id) {
        this.data.categories = this.data.categories.filter(c => c.id !== id);
        this.data.tasks = this.data.tasks.filter(t => t.categoryId !== id);
        await this.saveData();
    }

    async saveTask(task) {
        const index = this.data.tasks.findIndex(t => t.id === task.id);
        if (index >= 0) {
            this.data.tasks[index] = task;
        } else {
            this.data.tasks.push(task);
        }
        await this.saveData();
    }

    async deleteTask(id) {
        this.data.tasks = this.data.tasks.filter(t => t.id !== id);
        await this.saveData();
    }

    async exportData() {
        return JSON.stringify(this.data, null, 2);
    }

    async importData(jsonStr) {
        try {
            const newData = JSON.parse(jsonStr);
            this.data = newData;
            await this.saveData();
            return true;
        } catch (e) {
            console.error('Import 오류:', e);
            return false;
        }
    }
}

const db = new LocalFileDB();

// =============== Drag and Drop Utilities ===============
let draggedTask = null;
let draggedIndex = null;

function handleDragStart(e, task, index) {
    draggedTask = task;
    draggedIndex = index;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.drop-indicator').forEach(indicator => {
        indicator.classList.remove('show');
    });
    draggedTask = null;
    draggedIndex = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const dropZone = e.currentTarget;
    const rect = dropZone.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    
    const topIndicator = dropZone.querySelector('.drop-indicator.top');
    const bottomIndicator = dropZone.querySelector('.drop-indicator.bottom');
    
    if (e.clientY < midpoint) {
        topIndicator?.classList.add('show');
        bottomIndicator?.classList.remove('show');
    } else {
        topIndicator?.classList.remove('show');
        bottomIndicator?.classList.add('show');
    }
}

function handleDragLeave(e) {
    const dropZone = e.currentTarget;
    if (!dropZone.contains(e.relatedTarget)) {
        dropZone.querySelectorAll('.drop-indicator').forEach(indicator => {
            indicator.classList.remove('show');
        });
    }
}

// =============== Task Card Component ===============
const TaskCard = React.memo(function TaskCard({ 
    task, 
    categories, 
    onUpdate, 
    onDelete, 
    onToggle, 
    onTogglePin, 
    onReorder,
    index,
    filteredTasks 
}) {
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(task.title);
    const [memo, setMemo] = useState(task.memo || "");
    const [priority, setPriority] = useState(task.priority);
    const [due, setDue] = useState(task.due || "");
    const [categoryId, setCategoryId] = useState(task.categoryId);

    const handleSave = () => {
        onUpdate(task.id, {
            title: title.trim() || "무제",
            memo: memo.trim(),
            priority,
            due,
            categoryId,
        });
        setEditing(false);
    };

    const handleCancel = () => {
        setTitle(task.title);
        setMemo(task.memo || "");
        setPriority(task.priority);
        setDue(task.due || "");
        setCategoryId(task.categoryId);
        setEditing(false);
    };

    const priorityColor = PRIORITIES.find(p => p.value === task.priority)?.color || "gray";
    const isOverdue = task.due && new Date(task.due) < new Date() && !task.checked;

    const handleDoubleClick = () => {
        if (!editing) setEditing(true);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const dropPosition = e.clientY < midpoint ? 'before' : 'after';
        
        if (draggedTask && draggedTask.id !== task.id) {
            onReorder(draggedTask, index, dropPosition);
        }
        
        e.currentTarget.querySelectorAll('.drop-indicator').forEach(indicator => {
            indicator.classList.remove('show');
        });
    };

    if (editing) {
        return (
            <div className="glassmorphism rounded-2xl p-6 transition-all duration-300 task-card">
                <div className="space-y-4">
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent form-input"
                        placeholder="작업 제목"
                        autoFocus
                    />
                    <textarea
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent form-input"
                        placeholder="메모 (선택사항)"
                        rows={3}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 form-input"
                        >
                            {PRIORITIES.map(p => (
                                <option key={p.value} value={p.value}>
                                    {p.value === 'high' ? '🔴' : p.value === 'medium' ? '🟡' : p.value === 'low' ? '🔵' : '⚪'} {p.label}
                                </option>
                            ))}
                        </select>
                        <input
                            type="date"
                            value={due}
                            onChange={(e) => setDue(e.target.value)}
                            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 form-input"
                        />
                        <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 form-input"
                        >
                            {categories.filter(c => c.id !== "all").map(c => (
                                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleSave}
                            className="px-6 py-3 rounded-xl text-white font-medium btn-primary"
                        >
                            💾 저장
                        </button>
                        <button
                            onClick={handleCancel}
                            className="px-6 py-3 rounded-xl font-medium btn-secondary"
                        >
                            ❌ 취소
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "glassmorphism rounded-2xl p-6 transition-all duration-300 card-hover task-card drop-zone relative",
                task.checked && "opacity-70 grayscale",
                isOverdue && "ring-2 ring-red-300 bg-red-50/50",
                task.pinned && "ring-2 ring-yellow-400 bg-yellow-50/30",
                !task.checked && "hover:shadow-lg",
                `priority-${task.priority}`
            )}
            data-task-id={task.id}
            onDoubleClick={handleDoubleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            draggable={!editing}
            onDragStart={(e) => handleDragStart(e, task, index)}
            onDragEnd={handleDragEnd}
        >
            <div className="drop-indicator top"></div>
            <div className="drop-indicator bottom"></div>
            
            {task.pinned && (
                <div className="pin-badge">
                    📌
                </div>
            )}
            
            <div className="flex items-start gap-4">
                <div className="drag-handle text-lg p-1 rounded hover:bg-gray-100" title="드래그해서 순서 변경">
                    ⋮⋮
                </div>
                
                <button
                    onClick={() => onToggle(task.id)}
                    className={cn(
                        "mt-1 w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all duration-300 font-bold",
                        task.checked
                            ? "bg-gradient-to-r from-emerald-500 to-teal-600 border-emerald-500 text-white shadow-lg transform scale-110"
                            : "border-gray-300 hover:border-blue-500 hover:bg-blue-50 hover:scale-105"
                    )}
                >
                    {task.checked && "✓"}
                </button>
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                        <h4
                            className={cn(
                                "font-semibold text-lg",
                                task.checked && "line-through text-gray-500"
                            )}
                        >
                            {task.title}
                        </h4>
                        {task.priority !== "none" && (
                            <span
                                className={cn(
                                    "px-3 py-1 text-xs font-medium rounded-full",
                                    priorityColor === "red" && "bg-gradient-to-r from-red-100 to-red-200 text-red-700 border border-red-300",
                                    priorityColor === "yellow" && "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-700 border border-yellow-300",
                                    priorityColor === "blue" && "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border border-blue-300"
                                )}
                            >
                                {task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : task.priority === 'low' ? '🔵' : '⚪'} {PRIORITIES.find(p => p.value === task.priority)?.label}
                            </span>
                        )}
                    </div>
                    
                    {task.memo && (
                        <p className="text-gray-600 mb-3 leading-relaxed">{task.memo}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        {task.due && (
                            <span className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-lg",
                                isOverdue ? "text-red-600 font-medium bg-red-50" : "bg-gray-100"
                            )}>
                                📅 {fmtDate(task.due)}
                                {isOverdue && " ⚠️"}
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onTogglePin(task.id)}
                        className={cn(
                            "p-2 rounded-xl transition-all duration-200",
                            task.pinned 
                                ? "text-yellow-600 hover:text-yellow-700 bg-yellow-50 hover:bg-yellow-100" 
                                : "text-gray-400 hover:text-yellow-600 hover:bg-yellow-50"
                        )}
                        title={task.pinned ? "고정 해제" : "상단 고정"}
                    >
                        <span className="text-lg">📌</span>
                    </button>
                    <button
                        onClick={() => setEditing(true)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
                        title="편집 (더블클릭 가능)"
                    >
                        <span className="text-lg">✏️</span>
                    </button>
                    <button
                        onClick={() => onDelete(task.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                        title="삭제"
                    >
                        <span className="text-lg">🗑️</span>
                    </button>
                </div>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    return prevProps.task.id === nextProps.task.id &&
           prevProps.task.title === nextProps.task.title &&
           prevProps.task.checked === nextProps.task.checked &&
           prevProps.task.priority === nextProps.task.priority &&
           prevProps.task.due === nextProps.task.due &&
           prevProps.task.memo === nextProps.task.memo &&
           prevProps.task.pinned === nextProps.task.pinned &&
           prevProps.task.categoryId === nextProps.task.categoryId &&
           prevProps.index === nextProps.index;
});

// =============== Main App Component ===============
function App() {
    const [categories, setCategories] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [selectedCat, setSelectedCat] = useState("all");
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [prioFilter, setPrioFilter] = useState("all");
    const [sortBy, setSortBy] = useState("order");
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [newCatName, setNewCatName] = useState("");
    const [soundOn, setSoundOn] = useState(true);
    const [editingCatId, setEditingCatId] = useState(null);
    const [editCatName, setEditCatName] = useState("");
    const [editCatEmoji, setEditCatEmoji] = useState("");
    const fileInputRef = useRef(null);

    // Debounce search query for performance
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    // Load data on mount
    useEffect(() => {
        loadAllData();
    }, []);

    async function loadAllData() {
        const cats = await db.getCategories();
        const tasks = await db.getTasks();
        setCategories([{ id: "all", name: "전체", emoji: "📋", builtin: true }, ...cats]);
        setTasks(tasks);
    }

    // Stats
    const stats = useMemo(() => {
        const filtered = selectedCat === "all" ? tasks : tasks.filter(t => t.categoryId === selectedCat);
        const completed = filtered.filter(t => t.checked).length;
        const total = filtered.length;
        return { completed, total, progress: total > 0 ? Math.round((completed / total) * 100) : 0 };
    }, [tasks, selectedCat]);

    // Filtered and sorted tasks with performance optimization
    const filteredTasks = useMemo(() => {
        let result = tasks;

        if (selectedCat !== "all") {
            result = result.filter(t => t.categoryId === selectedCat);
        }

        if (debouncedQuery.trim()) {
            const q = debouncedQuery.toLowerCase();
            result = result.filter(t => 
                t.title.toLowerCase().includes(q) || 
                (t.memo && t.memo.toLowerCase().includes(q))
            );
        }

        if (statusFilter === "completed") {
            result = result.filter(t => t.checked);
        } else if (statusFilter === "pending") {
            result = result.filter(t => !t.checked);
        }

        if (prioFilter !== "all") {
            result = result.filter(t => t.priority === prioFilter);
        }

        result.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            
            if (sortBy === "priority") {
                const prio = { none: 0, low: 1, medium: 2, high: 3 };
                return prio[b.priority] - prio[a.priority];
            } else if (sortBy === "due") {
                if (!a.due && !b.due) return 0;
                if (!a.due) return 1;
                if (!b.due) return -1;
                return new Date(a.due) - new Date(b.due);
            } else if (sortBy === "name") {
                return a.title.localeCompare(b.title);
            }
            return a.order - b.order;
        });

        return result;
    }, [tasks, selectedCat, debouncedQuery, statusFilter, prioFilter, sortBy]);

    // Actions
    async function addCategory() {
        if (!newCatName.trim()) return;
        const cat = {
            id: uid(),
            name: newCatName.trim(),
            emoji: "📁",
            builtin: false,
        };
        await db.saveCategory(cat);
        setCategories(prev => [...prev, cat]);
        setNewCatName("");
    }

    async function deleteCategory(id) {
        if (!confirm("이 카테고리와 관련된 모든 작업이 삭제됩니다. 계속하시겠습니까?")) return;
        await db.deleteCategory(id);
        setCategories(prev => prev.filter(c => c.id !== id));
        setTasks(prev => prev.filter(t => t.categoryId !== id));
        if (selectedCat === id) setSelectedCat("all");
    }

    async function renameCategory(catId, newName, newEmoji) {
        const cat = categories.find(c => c.id === catId);
        if (!cat || cat.builtin) return;
        
        const updated = { ...cat, name: newName, emoji: newEmoji };
        await db.saveCategory(updated);
        setCategories(prev => prev.map(c => c.id === catId ? updated : c));
    }

    async function addTask() {
        if (selectedCat === "all") {
            alert("작업을 추가하려면 특정 카테고리를 선택해주세요.");
            return;
        }
        const task = {
            id: uid(),
            title: "새 작업",
            checked: false,
            priority: "none",
            due: "",
            memo: "",
            categoryId: selectedCat,
            order: tasks.length,
            createdAt: new Date().toISOString(),
        };
        try {
            await db.saveTask(task);
            setTasks(prev => [...prev, task]);
            console.log('작업 추가 성공:', task);
        } catch (error) {
            console.error('작업 추가 실패:', error);
            alert('작업 추가에 실패했습니다.');
        }
    }

    async function updateTask(id, updates) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        const updated = { ...task, ...updates };
        await db.saveTask(updated);
        setTasks(prev => prev.map(t => t.id === id ? updated : t));
    }

    async function togglePinTask(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        await updateTask(id, { pinned: !task.pinned });
    }

    async function deleteTask(id) {
        await db.deleteTask(id);
        setTasks(prev => prev.filter(t => t.id !== id));
    }

    async function toggleTask(id) {
        const t = tasks.find(x => x.id === id);
        if (!t) return;
        const nextChecked = !t.checked;
        
        if (soundOn) {
            if (nextChecked) playSuccess(); 
            else playUndo();
        }
        
        const taskEl = document.querySelector(`[data-task-id="${id}"]`);
        if (taskEl && nextChecked) {
            taskEl.classList.add('task-complete');
            setTimeout(() => taskEl.classList.remove('task-complete'), 400);
        }
        
        await updateTask(id, { checked: nextChecked });
    }

    async function reorderTasks(draggedTask, targetIndex, position) {
        const currentTasks = [...filteredTasks];
        const draggedIndex = currentTasks.findIndex(t => t.id === draggedTask.id);
        
        if (draggedIndex === -1) return;
        
        // Remove dragged task
        currentTasks.splice(draggedIndex, 1);
        
        // Calculate new position
        let newIndex = targetIndex;
        if (draggedIndex < targetIndex) newIndex--;
        if (position === 'after') newIndex++;
        
        // Insert at new position
        currentTasks.splice(newIndex, 0, draggedTask);
        
        // Update order values
        const updatedTasks = currentTasks.map((task, index) => ({
            ...task,
            order: index
        }));
        
        // Save to database
        for (const task of updatedTasks) {
            await db.saveTask(task);
        }
        
        // Update state
        setTasks(prev => {
            const updated = [...prev];
            updatedTasks.forEach(updatedTask => {
                const index = updated.findIndex(t => t.id === updatedTask.id);
                if (index !== -1) {
                    updated[index] = updatedTask;
                }
            });
            return updated;
        });
    }

    async function clearCompleted() {
        if (!confirm("완료된 모든 작업을 삭제하시겠습니까?")) return;
        const completedIds = tasks.filter(t => t.checked).map(t => t.id);
        for (const id of completedIds) {
            await db.deleteTask(id);
        }
        setTasks(prev => prev.filter(t => !t.checked));
    }

    async function exportData() {
        const data = await db.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `checklist-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async function importData() {
        fileInputRef.current?.click();
    }

    async function handleFileImport(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        
        const text = await file.text();
        const success = await db.importData(text);
        if (success) {
            await loadAllData();
            alert("데이터를 성공적으로 가져왔습니다!");
        } else {
            alert("파일 형식이 올바르지 않습니다.");
        }
        event.target.value = '';
    }

    function startEditCategory(catId) {
        const cat = categories.find(c => c.id === catId);
        if (!cat || cat.builtin) return;
        setEditingCatId(catId);
        setEditCatName(cat.name);
        setEditCatEmoji(cat.emoji || "📁");
    }

    function saveEditCategory() {
        if (!editCatName.trim()) return;
        renameCategory(editingCatId, editCatName.trim(), editCatEmoji);
        setEditingCatId(null);
        setEditCatName("");
        setEditCatEmoji("");
    }

    function cancelEditCategory() {
        setEditingCatId(null);
        setEditCatName("");
        setEditCatEmoji("");
    }

    return { 
        // State
        categories, tasks, selectedCat, query, statusFilter, prioFilter, sortBy, 
        settingsOpen, newCatName, soundOn, editingCatId, editCatName, editCatEmoji,
        fileInputRef, stats, filteredTasks,
        
        // Actions
        setSelectedCat, setQuery, setStatusFilter, setPrioFilter, setSortBy,
        setSettingsOpen, setNewCatName, setSoundOn,
        addCategory, deleteCategory, startEditCategory, saveEditCategory, cancelEditCategory,
        addTask, updateTask, togglePinTask, deleteTask, toggleTask, reorderTasks,
        clearCompleted, exportData, importData, handleFileImport
    };
}
