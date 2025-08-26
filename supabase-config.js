// Supabase Configuration
const SUPABASE_URL = 'https://oryaquouelpqwzarhjdn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yeWFxdW91ZWxwcXd6YXJoamRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDA1MzMsImV4cCI6MjA3MTc3NjUzM30.iUcQa42sUazqtBUuiqxNDtAssPYSG0qSA37RuVMNb9w';

// Initialize Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// User Management Class
class UserManager {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.subscription = null;
        this.initializeAuth();
    }

    async initializeAuth() {
        // Check current session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            this.currentUser = session.user;
            await this.loadUserProfile();
            await this.checkSubscription();
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN') {
                this.currentUser = session.user;
                await this.loadUserProfile();
                await this.checkSubscription();
                // Don't reload immediately - let sync complete first
                setTimeout(() => {
                    window.location.reload();
                }, 1500); // Give sync 1.5 seconds to complete
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.userProfile = null;
                this.subscription = null;
                window.location.reload();
            }
        });
    }

    async signInWithGoogle() {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/index.html`
            }
        });
        
        if (error) {
            console.error('Google sign in error:', error);
            throw error;
        }
        
        return data;
    }

    async signOut() {
        try {
            // Check if there's an active session
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                console.log('No active session to sign out');
                // Clear local data anyway
                this.currentUser = null;
                this.userProfile = null;
                this.subscription = null;
                window.location.reload();
                return;
            }
            
            // Save local data before signing out
            await this.saveLocalDataBackup();
            
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Sign out error:', error);
                // Clear local state even if signout fails
                this.currentUser = null;
                this.userProfile = null;
                this.subscription = null;
                window.location.reload();
            }
        } catch (err) {
            console.error('Sign out failed:', err);
            // Force clear session
            this.currentUser = null;
            this.userProfile = null;
            this.subscription = null;
            window.location.reload();
        }
    }

    async loadUserProfile() {
        if (!this.currentUser) return;

        // Check if profile exists
        let { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', this.currentUser.id)
            .single();

        if (!profile) {
            // Create new profile
            const newProfile = {
                id: this.currentUser.id,
                email: this.currentUser.email,
                full_name: this.currentUser.user_metadata.full_name || '',
                avatar_url: this.currentUser.user_metadata.avatar_url || '',
                subscription_tier: 'free',
                created_at: new Date().toISOString(),
                last_login: new Date().toISOString(),
                settings: {
                    theme: 'light',
                    notifications: true,
                    auto_sync: true
                }
            };

            const { data, error: insertError } = await supabase
                .from('user_profiles')
                .insert([newProfile])
                .select()
                .single();

            if (insertError) {
                console.error('Profile creation error:', insertError);
            } else {
                this.userProfile = data;
            }
        } else {
            // Update last login
            await supabase
                .from('user_profiles')
                .update({ last_login: new Date().toISOString() })
                .eq('id', this.currentUser.id);
            
            this.userProfile = profile;
        }
    }

    async checkSubscription() {
        if (!this.currentUser) return;

        try {
            const { data: subscription, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .eq('status', 'active')
                .single();

            if (error) {
                console.log('Subscription check error (expected if no subscription):', error.message);
                this.subscription = null;
            } else {
                this.subscription = subscription;
            }
        } catch (err) {
            console.log('Subscription check failed:', err);
            this.subscription = null;
        }
    }

    async syncLocalDataToCloud() {
        // This method is no longer needed - we handle sync in SyncManager
        // Keeping it empty to avoid breaking existing calls
        return;
    }

    async saveTodos(todos) {
        if (!this.currentUser) return;

        const { error } = await supabase
            .from('todos')
            .upsert({
                user_id: this.currentUser.id,
                data: todos,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            });

        if (error) {
            console.error('Todo save error:', error);
        }
    }

    async loadTodos() {
        if (!this.currentUser) return null;

        const { data, error } = await supabase
            .from('todos')
            .select('data')
            .eq('user_id', this.currentUser.id)
            .single();

        if (error || !data) {
            return null;
        }

        return data.data;
    }

    async saveCategories(categories) {
        if (!this.currentUser) return;

        const { error } = await supabase
            .from('categories')
            .upsert({
                user_id: this.currentUser.id,
                data: categories,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            });

        if (error) {
            console.error('Categories save error:', error);
        }
    }

    async loadCategories() {
        if (!this.currentUser) return null;

        const { data, error } = await supabase
            .from('categories')
            .select('data')
            .eq('user_id', this.currentUser.id)
            .single();

        if (error || !data) {
            return null;
        }

        return data.data;
    }

    async saveMindmaps(mindmaps) {
        if (!this.currentUser) return;

        const { error } = await supabase
            .from('mindmaps')
            .upsert({
                user_id: this.currentUser.id,
                data: mindmaps,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            });

        if (error) {
            console.error('Mindmap save error:', error);
        }
    }

    async loadMindmaps() {
        if (!this.currentUser) return null;

        const { data, error } = await supabase
            .from('mindmaps')
            .select('data')
            .eq('user_id', this.currentUser.id)
            .single();

        if (error || !data) {
            return null;
        }

        return data.data;
    }

    async saveLocalDataBackup() {
        const backup = {
            todos: localStorage.getItem('tasks'),
            mindmaps: localStorage.getItem('mindMapBoards'),
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('dataBackup', JSON.stringify(backup));
    }

    isLoggedIn() {
        return !!this.currentUser;
    }

    isPremium() {
        return this.subscription && this.subscription.tier !== 'free';
    }

    isAdmin() {
        return this.userProfile && this.userProfile.role === 'admin';
    }
}

// Real-time Sync Manager
class SyncManager {
    constructor(userManager) {
        this.userManager = userManager;
        this.todoSubscription = null;
        this.mindmapSubscription = null;
        this.syncStatus = 'offline';
        this.lastSyncTime = null;
    }

    async initializeSync() {
        if (!this.userManager.isLoggedIn()) {
            console.log('User not logged in, skipping sync initialization');
            return;
        }

        // Initialize sync silently
        this.updateSyncStatus('syncing');

        try {
            // Load the TodoMaster app data structure
            const localData = localStorage.getItem('todoMasterApp');
            let appData = localData ? JSON.parse(localData) : { categories: [], tasks: [] };
            
            // ALWAYS prefer cloud data when available (for immediate sync)
            
            // Load categories from cloud
            const cloudCategories = await this.userManager.loadCategories();
            if (cloudCategories && cloudCategories.length > 0) {
                // Always use cloud data when available
                appData.categories = cloudCategories;
            } else if (appData.categories && appData.categories.length > 0) {
                // Only save local if cloud is empty
                await this.userManager.saveCategories(appData.categories);
            }
            
            // Load todos from cloud
            const cloudTodos = await this.userManager.loadTodos();
            if (cloudTodos !== null) {  // Changed: check for null, not length
                // Always use cloud data when available (even if empty array)
                appData.tasks = cloudTodos || [];
            } else if (appData.tasks && appData.tasks.length > 0) {
                // Only save local if cloud has no data at all
                await this.userManager.saveTodos(appData.tasks);
            }
            
            // Save updated app data
            localStorage.setItem('todoMasterApp', JSON.stringify(appData));
            
            // Also update the old 'tasks' key for compatibility
            localStorage.setItem('tasks', JSON.stringify(appData.tasks));
            
            if (window.updateTodoUI) {
                window.updateTodoUI();
            }

            // Load mindmaps from cloud
            const cloudMindmaps = await this.userManager.loadMindmaps();
            if (cloudMindmaps && Object.keys(cloudMindmaps).length > 0) {
                console.log('Loaded mindmaps from cloud:', cloudMindmaps);
                localStorage.setItem('mindMapBoards', JSON.stringify(cloudMindmaps));
                if (window.updateMindmapUI) {
                    window.updateMindmapUI();
                }
            } else {
                console.log('No mindmaps in cloud, keeping local data');
                // If no cloud data, save local to cloud
                const localMindmaps = localStorage.getItem('mindMapBoards');
                if (localMindmaps) {
                    await this.userManager.saveMindmaps(JSON.parse(localMindmaps));
                }
            }

            // Subscribe to todo changes with proper error handling
            this.todoSubscription = supabase
                .channel('todos-channel')
                .on(
                    'postgres_changes',
                    {
                        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
                        schema: 'public',
                        table: 'todos',
                        filter: `user_id=eq.${this.userManager.currentUser.id}`
                    },
                    (payload) => {
                        console.log('Todo change detected:', payload.eventType);
                        this.handleTodoUpdate(payload.new || payload.old);
                    }
                )
                .subscribe((status) => {
                    console.log('Todo subscription status:', status);
                });
                
            // Subscribe to category changes
            this.categorySubscription = supabase
                .channel('categories-channel')
                .on(
                    'postgres_changes',
                    {
                        event: '*', // Listen to all events
                        schema: 'public',
                        table: 'categories',
                        filter: `user_id=eq.${this.userManager.currentUser.id}`
                    },
                    (payload) => {
                        this.handleCategoryUpdate(payload.new || payload.old);
                    }
                )
                .subscribe();

            // Subscribe to mindmap changes
            this.mindmapSubscription = supabase
                .channel('mindmaps-channel')
                .on(
                    'postgres_changes',
                    {
                        event: '*', // Listen to all events
                        schema: 'public',
                        table: 'mindmaps',
                        filter: `user_id=eq.${this.userManager.currentUser.id}`
                    },
                    (payload) => {
                        this.handleMindmapUpdate(payload.new || payload.old);
                    }
                )
                .subscribe();

            // Successfully initialized
            this.syncStatus = 'online';
            this.startAutoSync();
            
            // Save current data to cloud
            await this.syncAll();
            
            // Update status to synced after everything is done
            this.updateSyncStatus('synced');
            console.log('Sync status updated to synced');
            
        } catch (error) {
            console.error('Sync initialization failed:', error);
            this.updateSyncStatus('offline');
        }
    }

    handleTodoUpdate(data) {
        if (!data || !data.data) return;
        
        // Check if this update is from another device (not from us)
        const lastLocalUpdate = localStorage.getItem('lastLocalUpdate');
        const updateTime = new Date().getTime();
        
        // If we just updated locally (within 2 seconds), ignore this cloud update
        if (lastLocalUpdate && (updateTime - parseInt(lastLocalUpdate)) < 2000) {
            console.log('Ignoring cloud update - just updated locally');
            return;
        }
        
        console.log('Received real-time todo update from another device');
        
        // Update TodoMaster app data structure
        const localData = localStorage.getItem('todoMasterApp');
        let appData = localData ? JSON.parse(localData) : { categories: [], tasks: [] };
        
        // Update tasks
        appData.tasks = data.data;
        localStorage.setItem('todoMasterApp', JSON.stringify(appData));
        
        // Also update old 'tasks' key for compatibility
        localStorage.setItem('tasks', JSON.stringify(data.data));
        
        // Force reload to ensure UI is fully updated with new data
        window.location.reload();
    }
    
    handleCategoryUpdate(data) {
        if (!data || !data.data) return;
        
        // Check if this update is from another device
        const lastLocalUpdate = localStorage.getItem('lastLocalCategoryUpdate');
        const updateTime = new Date().getTime();
        
        // If we just updated locally (within 2 seconds), ignore this cloud update
        if (lastLocalUpdate && (updateTime - parseInt(lastLocalUpdate)) < 2000) {
            console.log('Ignoring category cloud update - just updated locally');
            return;
        }
        
        console.log('Received real-time category update from another device');
        
        // Update TodoMaster app data structure
        const localData = localStorage.getItem('todoMasterApp');
        let appData = localData ? JSON.parse(localData) : { categories: [], tasks: [] };
        
        // Update categories
        appData.categories = data.data;
        localStorage.setItem('todoMasterApp', JSON.stringify(appData));
        
        // Force reload to ensure UI is fully updated with new data
        window.location.reload();
    }

    handleMindmapUpdate(data) {
        // Update local storage with new data
        localStorage.setItem('mindMapBoards', JSON.stringify(data.data));
        
        // Trigger UI update
        if (window.updateMindmapUI) {
            window.updateMindmapUI();
        }
        
        this.updateSyncStatus('synced');
    }

    startAutoSync() {
        // Auto sync periodically, but only if data has changed
        setInterval(() => {
            if (this.userManager.isLoggedIn() && this.userManager.userProfile?.settings?.auto_sync) {
                this.syncAll(); // Will only sync if data changed
            }
        }, 10000); // Every 10 seconds, check if sync needed
    }

    async syncAll() {
        // Don't sync if already syncing
        if (this.syncStatus === 'syncing') {
            return;
        }
        
        // Check if data has changed since last sync
        const currentDataHash = this.getDataHash();
        if (this.lastDataHash === currentDataHash) {
            // No changes, skip sync
            return;
        }
        
        this.updateSyncStatus('syncing');
        
        try {
            // Get data from TodoMaster app structure
            const localData = localStorage.getItem('todoMasterApp');
            if (localData) {
                const appData = JSON.parse(localData);
                
                // Save categories if they exist
                if (appData.categories && appData.categories.length > 0) {
                    await this.userManager.saveCategories(appData.categories);
                }
                
                // Save todos if they exist
                if (appData.tasks && appData.tasks.length > 0) {
                    await this.userManager.saveTodos(appData.tasks);
                }
            }
            
            const localMindmaps = localStorage.getItem('mindMapBoards');
            if (localMindmaps) {
                const mindmaps = JSON.parse(localMindmaps);
                if (Object.keys(mindmaps).length > 0) {
                    await this.userManager.saveMindmaps(mindmaps);
                }
            }
            
            this.lastSyncTime = new Date();
            this.lastDataHash = currentDataHash;
            this.updateSyncStatus('synced');
        } catch (error) {
            console.error('Sync failed:', error);
            this.updateSyncStatus('offline');
        }
    }
    
    getDataHash() {
        // Create a simple hash of current data to detect changes
        const localData = localStorage.getItem('todoMasterApp');
        const mindmaps = localStorage.getItem('mindMapBoards');
        return JSON.stringify(localData) + JSON.stringify(mindmaps);
    }

    updateSyncStatus(status) {
        this.syncStatus = status;
        // Only log important status changes
        if (status === 'offline' || status === 'error') {
            console.log('Sync status:', status);
        }
        
        // Update UI indicator - try multiple times to ensure DOM is ready
        const updateUI = () => {
            const indicator = document.getElementById('sync-indicator');
            if (indicator) {
                // Remove all status classes first
                indicator.className = 'sync-indicator';
                // Add new status class
                if (status === 'synced') {
                    indicator.classList.add('synced');
                } else if (status === 'syncing') {
                    indicator.classList.add('syncing');
                } else {
                    indicator.classList.add('offline');
                }
                
                const statusText = indicator.querySelector('.sync-text');
                if (statusText) {
                    statusText.textContent = status === 'synced' ? '동기화됨' : 
                                            status === 'syncing' ? '동기화 중' : 
                                            status === 'online' ? '온라인' : '오프라인';
                }
                indicator.title = `Last sync: ${this.lastSyncTime ? this.lastSyncTime.toLocaleTimeString() : 'Never'}`;
                console.log('Sync indicator updated successfully');
            } else {
                console.log('Sync indicator not found, retrying...');
                // Retry after a short delay if element not found
                setTimeout(updateUI, 500);
            }
        };
        
        updateUI();
    }

    mergeTodos(localTodos, cloudTodos) {
        // Create a map of todos by ID for efficient merging
        const todoMap = new Map();
        
        // Add cloud todos first
        cloudTodos.forEach(todo => {
            if (todo && todo.id) {
                todoMap.set(todo.id, todo);
            }
        });
        
        // Add or update with local todos (local takes priority for recent changes)
        localTodos.forEach(todo => {
            if (todo && todo.id) {
                const cloudTodo = todoMap.get(todo.id);
                if (!cloudTodo) {
                    // New local todo
                    todoMap.set(todo.id, todo);
                } else {
                    // Compare timestamps if available, otherwise prefer local
                    const localTime = todo.updatedAt ? new Date(todo.updatedAt).getTime() : Date.now();
                    const cloudTime = cloudTodo.updatedAt ? new Date(cloudTodo.updatedAt).getTime() : 0;
                    
                    if (localTime >= cloudTime) {
                        todoMap.set(todo.id, todo);
                    }
                }
            }
        });
        
        // Convert map back to array
        return Array.from(todoMap.values());
    }
    
    mergeMindmaps(localMindmaps, cloudMindmaps) {
        // For mindmaps, merge at the board level
        const merged = { ...cloudMindmaps };
        
        // Add or update with local mindmaps
        Object.keys(localMindmaps).forEach(boardId => {
            if (!merged[boardId]) {
                // New local board
                merged[boardId] = localMindmaps[boardId];
            } else {
                // Compare timestamps if available
                const localBoard = localMindmaps[boardId];
                const cloudBoard = merged[boardId];
                
                const localTime = localBoard.updatedAt ? new Date(localBoard.updatedAt).getTime() : Date.now();
                const cloudTime = cloudBoard.updatedAt ? new Date(cloudBoard.updatedAt).getTime() : 0;
                
                if (localTime >= cloudTime) {
                    merged[boardId] = localBoard;
                }
            }
        });
        
        return merged;
    }
    
    cleanup() {
        if (this.todoSubscription) {
            supabase.removeChannel(this.todoSubscription);
        }
        if (this.categorySubscription) {
            supabase.removeChannel(this.categorySubscription);
        }
        if (this.mindmapSubscription) {
            supabase.removeChannel(this.mindmapSubscription);
        }
    }
}

// Analytics Manager
class AnalyticsManager {
    constructor(userManager) {
        this.userManager = userManager;
    }

    async trackEvent(eventName, properties = {}) {
        if (!this.userManager.isLoggedIn()) return;

        await supabase.from('analytics_events').insert({
            user_id: this.userManager.currentUser.id,
            event_name: eventName,
            properties,
            created_at: new Date().toISOString()
        });
    }

    async trackPageView(pageName) {
        await this.trackEvent('page_view', { page: pageName });
    }

    async getUserStats() {
        if (!this.userManager.isLoggedIn()) return null;

        try {
            const { data, error } = await supabase
                .from('user_stats')
                .select('*')
                .eq('user_id', this.userManager.currentUser.id)
                .single();

            if (error) {
                console.log('User stats not found (expected if new user):', error.message);
                // Return default stats
                return {
                    total_todos: 0,
                    completed_todos: 0,
                    total_mindmaps: 0,
                    total_nodes: 0,
                    streak_days: 0
                };
            }

            return data;
        } catch (err) {
            console.error('Failed to get user stats:', err);
            // Return default stats
            return {
                total_todos: 0,
                completed_todos: 0,
                total_mindmaps: 0,
                total_nodes: 0,
                streak_days: 0
            };
        }
    }
}

// Initialize managers
const userManager = new UserManager();
const syncManager = new SyncManager(userManager);
const analyticsManager = new AnalyticsManager(userManager);

// Export for use in other files
window.userManager = userManager;
window.syncManager = syncManager;
window.analyticsManager = analyticsManager;
window.supabase = supabase;