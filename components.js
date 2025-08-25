// =============== UI Components ===============

// Access global utilities (exported from app.js)

// Sidebar Component
function Sidebar({ 
    categories, 
    selectedCat, 
    stats, 
    newCatName, 
    editingCatId, 
    editCatName, 
    editCatEmoji,
    onSelectCategory,
    onNewCatNameChange,
    onAddCategory,
    onDeleteCategory,
    onStartEditCategory,
    onEditCatNameChange,
    onEditCatEmojiChange,
    onSaveEditCategory,
    onCancelEditCategory,
    onOpenSettings
}) {
    return (
        <aside className="sidebar p-6">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-lg font-bold">✓</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">TodoMaster</h1>
                        <p className="text-xs text-gray-500">스마트 체크리스트</p>
                    </div>
                </div>
                <div className="glassmorphism rounded-2xl p-4 mb-4 fade-in">
                    <div className="text-sm text-gray-600 mb-2">전체 진행률</div>
                    <div className="text-2xl font-bold text-gray-800 mb-2">
                        {stats.completed}/{stats.total}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                        <div
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 progress-glow"
                            style={{ width: `${stats.progress}%` }}
                        ></div>
                    </div>
                    <div className="text-xs text-gray-500">{stats.progress}% 완료</div>
                </div>
            </div>

            <div className="mb-6">
                <div className="font-semibold mb-3 text-gray-700">📂 카테고리</div>
                <div className="space-y-2">
                    {categories.map((c) => (
                        <div
                            key={c.id}
                            className={window.cn(
                                "flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-300 card-hover",
                                selectedCat === c.id 
                                    ? "category-active text-white shadow-lg" 
                                    : "glassmorphism hover:shadow-md"
                            )}
                        >
                            {editingCatId === c.id ? (
                                <div className="flex-1 space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            value={editCatEmoji}
                                            onChange={(e) => onEditCatEmojiChange(e.target.value)}
                                            placeholder="🏷️"
                                            className="w-12 px-2 py-1 border rounded text-center"
                                            maxLength={2}
                                        />
                                        <input
                                            value={editCatName}
                                            onChange={(e) => onEditCatNameChange(e.target.value)}
                                            placeholder="카테고리 이름"
                                            className="flex-1 px-2 py-1 border rounded"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") onSaveEditCategory();
                                                if (e.key === "Escape") onCancelEditCategory();
                                            }}
                                        />
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={onSaveEditCategory}
                                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                        >
                                            저장
                                        </button>
                                        <button
                                            onClick={onCancelEditCategory}
                                            className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                                        >
                                            취소
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <span 
                                        className="text-lg w-6 text-center"
                                        onClick={() => onSelectCategory(c.id)}
                                    >
                                        {c.emoji || "📁"}
                                    </span>
                                    <div 
                                        className="flex-1 font-medium"
                                        onClick={() => onSelectCategory(c.id)}
                                    >
                                        {c.name}
                                    </div>
                                    {!c.builtin && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onStartEditCategory(c.id);
                                                }}
                                                className="text-gray-400 hover:text-blue-600"
                                                title="수정"
                                            >
                                                ✎
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteCategory(c.id);
                                                }}
                                                className="text-gray-400 hover:text-red-600"
                                                title="삭제"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>
                
                <div className="mt-6 bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50">
                    <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <span>➕</span>
                        새 카테고리 추가
                    </div>
                    <div className="space-y-3">
                        <input
                            value={newCatName}
                            onChange={(e) => onNewCatNameChange(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && onAddCategory()}
                            placeholder="카테고리 이름을 입력하세요..."
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 placeholder-gray-500 form-input"
                        />
                        <button
                            onClick={onAddCategory}
                            disabled={!newCatName.trim()}
                            className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transform hover:scale-[1.02] transition-all duration-200 shadow-md font-medium flex items-center justify-center gap-2"
                        >
                            <span>✨</span>
                            추가하기
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <button
                    onClick={onOpenSettings}
                    className="w-full px-4 py-2 text-left rounded-xl hover:bg-gray-100 flex items-center gap-2"
                >
                    ⚙️ 설정
                </button>
            </div>
        </aside>
    );
}

// Main Header Component
function MainHeader({ 
    selectedCategory, 
    filteredTasksCount, 
    stats, 
    onAddTask, 
    onClearCompleted, 
    hasCompletedTasks 
}) {
    return (
        <div className="glassmorphism rounded-3xl p-6 mb-6 fade-in">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-xl">
                            {selectedCategory?.emoji || "📋"}
                        </span>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800">
                            {selectedCategory?.name || "전체"}
                        </h2>
                        <p className="text-gray-500">
                            {filteredTasksCount}개의 작업이 있습니다
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {selectedCategory?.id !== "all" && (
                        <button
                            onClick={onAddTask}
                            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 transform hover:scale-105 transition-all duration-200 shadow-lg font-medium flex items-center gap-2 btn-primary"
                        >
                            <span className="text-lg">✨</span>
                            작업 추가
                        </button>
                    )}
                    {hasCompletedTasks && (
                        <button
                            onClick={onClearCompleted}
                            className="px-4 py-3 rounded-2xl glassmorphism hover:shadow-md transition-all duration-200 text-gray-700 font-medium btn-secondary"
                        >
                            🗑️ 완료 삭제
                        </button>
                    )}
                </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
                <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 h-4 rounded-full transition-all duration-700 progress-glow relative"
                    style={{ width: `${stats.progress}%` }}
                >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
            </div>
        </div>
    );
}

// Filter Bar Component
function FilterBar({ 
    query, 
    statusFilter, 
    prioFilter, 
    sortBy,
    onQueryChange,
    onStatusFilterChange,
    onPrioFilterChange,
    onSortByChange
}) {
    return (
        <div className="glassmorphism rounded-2xl p-4 mb-6 fade-in">
            <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-64">
                    <input
                        value={query}
                        onChange={(e) => onQueryChange(e.target.value)}
                        placeholder="🔍 작업 검색..."
                        className="w-full px-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 backdrop-blur-sm font-medium form-input"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => onStatusFilterChange(e.target.value)}
                    className="px-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 backdrop-blur-sm font-medium form-input"
                >
                    <option value="all">📋 모든 상태</option>
                    <option value="pending">⏳ 미완료</option>
                    <option value="completed">✅ 완료</option>
                </select>
                <select
                    value={prioFilter}
                    onChange={(e) => onPrioFilterChange(e.target.value)}
                    className="px-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 backdrop-blur-sm font-medium form-input"
                >
                    <option value="all">🎯 모든 우선순위</option>
                    {window.PRIORITIES.map(p => (
                        <option key={p.value} value={p.value}>
                            {p.value === 'high' ? '🔴' : p.value === 'medium' ? '🟡' : p.value === 'low' ? '🔵' : '⚪'} {p.label}
                        </option>
                    ))}
                </select>
                <select
                    value={sortBy}
                    onChange={(e) => onSortByChange(e.target.value)}
                    className="px-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 backdrop-blur-sm font-medium form-input"
                >
                    <option value="order">📅 등록순</option>
                    <option value="priority">⭐ 우선순위</option>
                    <option value="due">⏰ 마감일</option>
                    <option value="name">🔤 이름</option>
                </select>
            </div>
        </div>
    );
}

// Settings Modal Component
function SettingsModal({ 
    isOpen, 
    soundOn, 
    onClose, 
    onSoundToggle, 
    onTestSound, 
    onExportData, 
    onImportData 
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md m-4 glassmorphism">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">⚙️ 설정</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100"
                    >
                        ✕
                    </button>
                </div>

                <div className="space-y-6">
                    <section>
                        <h4 className="font-semibold mb-2">🔊 사운드</h4>
                        <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={soundOn}
                                    onChange={(e) => onSoundToggle(e.target.checked)}
                                    className="rounded"
                                />
                                체크/해제 시 효과음 재생
                            </label>
                            <button
                                onClick={onTestSound}
                                className="px-3 py-2 rounded-xl border hover:bg-gray-50 text-sm btn-secondary"
                            >
                                🎵 테스트
                            </button>
                        </div>
                    </section>

                    <section>
                        <h4 className="font-semibold mb-2">💾 데이터 백업</h4>
                        <div className="flex gap-2">
                            <button
                                onClick={onExportData}
                                className="flex-1 px-4 py-2 rounded-xl border hover:bg-gray-50 btn-secondary"
                            >
                                📤 내보내기
                            </button>
                            <button
                                onClick={onImportData}
                                className="flex-1 px-4 py-2 rounded-xl border hover:bg-gray-50 btn-secondary"
                            >
                                📥 가져오기
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            JSON 파일로 데이터를 백업하거나 복원할 수 있습니다.
                        </p>
                    </section>

                    <section>
                        <h4 className="font-semibold mb-2">🎯 드래그 앤 드롭</h4>
                        <p className="text-sm text-gray-600">
                            작업 카드 왼쪽의 <span className="font-mono text-gray-800">⋮⋮</span> 핸들을 드래그해서 순서를 변경할 수 있습니다.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}

// Empty State Component
function EmptyState({ selectedCategory }) {
    return (
        <div className="text-center py-12 glassmorphism rounded-2xl fade-in">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {selectedCategory?.id === "all" 
                    ? "작업이 없습니다" 
                    : "이 카테고리에 작업이 없습니다"}
            </h3>
            <p className="text-gray-500 mb-4">
                {selectedCategory?.id === "all"
                    ? "카테고리를 선택하고 새로운 작업을 추가해보세요!"
                    : "새로운 작업을 추가해서 시작해보세요!"}
            </p>
            {selectedCategory?.id !== "all" && (
                <div className="text-sm text-gray-400">
                    💡 팁: 더블클릭으로 빠른 편집, 드래그로 순서 변경
                </div>
            )}
        </div>
    );
}
