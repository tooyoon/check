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
                await this.syncLocalDataToCloud();
                window.location.reload();
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
        // Save local data before signing out
        await this.saveLocalDataBackup();
        
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Sign out error:', error);
            throw error;
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

        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', this.currentUser.id)
            .eq('status', 'active')
            .single();

        this.subscription = subscription;
    }

    async syncLocalDataToCloud() {
        if (!this.currentUser) return;

        // Sync TodoMaster data
        const localTodos = localStorage.getItem('tasks');
        if (localTodos) {
            await this.saveTodos(JSON.parse(localTodos));
        }

        // Sync MindMap data
        const localMindmaps = localStorage.getItem('mindMapBoards');
        if (localMindmaps) {
            await this.saveMindmaps(JSON.parse(localMindmaps));
        }
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
            return [];
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
        if (!this.userManager.isLoggedIn()) return;

        // Subscribe to todo changes
        this.todoSubscription = supabase
            .channel('todos-channel')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'todos',
                    filter: `user_id=eq.${this.userManager.currentUser.id}`
                },
                (payload) => {
                    this.handleTodoUpdate(payload.new);
                }
            )
            .subscribe();

        // Subscribe to mindmap changes
        this.mindmapSubscription = supabase
            .channel('mindmaps-channel')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'mindmaps',
                    filter: `user_id=eq.${this.userManager.currentUser.id}`
                },
                (payload) => {
                    this.handleMindmapUpdate(payload.new);
                }
            )
            .subscribe();

        this.syncStatus = 'online';
        this.updateSyncStatus('synced');
        this.startAutoSync();
    }

    handleTodoUpdate(data) {
        // Update local storage with new data
        localStorage.setItem('tasks', JSON.stringify(data.data));
        
        // Trigger UI update
        if (window.updateTodoUI) {
            window.updateTodoUI();
        }
        
        this.updateSyncStatus('synced');
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
        // Auto sync every 30 seconds
        setInterval(() => {
            if (this.userManager.isLoggedIn() && this.userManager.userProfile?.settings?.auto_sync) {
                this.syncAll();
            }
        }, 30000);
    }

    async syncAll() {
        this.updateSyncStatus('syncing');
        
        // Sync todos
        const todos = localStorage.getItem('tasks');
        if (todos) {
            await this.userManager.saveTodos(JSON.parse(todos));
        }

        // Sync mindmaps
        const mindmaps = localStorage.getItem('mindMapBoards');
        if (mindmaps) {
            await this.userManager.saveMindmaps(JSON.parse(mindmaps));
        }

        this.lastSyncTime = new Date();
        this.updateSyncStatus('synced');
    }

    updateSyncStatus(status) {
        this.syncStatus = status;
        
        // Update UI indicator
        const indicator = document.getElementById('sync-indicator');
        if (indicator) {
            indicator.className = `sync-indicator ${status}`;
            const statusText = indicator.querySelector('.sync-text') || indicator.querySelector('span:last-child');
            if (statusText) {
                statusText.textContent = status === 'synced' ? '동기화됨' : 
                                        status === 'syncing' ? '동기화 중' : 
                                        status === 'online' ? '온라인' : '오프라인';
            }
            indicator.title = `Last sync: ${this.lastSyncTime ? this.lastSyncTime.toLocaleTimeString() : 'Never'}`;
        }
    }

    cleanup() {
        if (this.todoSubscription) {
            supabase.removeChannel(this.todoSubscription);
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

        const { data } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', this.userManager.currentUser.id)
            .single();

        return data;
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