// app.js - メインアプリケーション

class ARMagicApp {
    constructor() {
        this.touchHandler = null;
        this.arManager = null;
        this.isInitialized = false;
        
        this.init();
    }
    
    init() {
        // DOM読み込み完了後に初期化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this.initialize.bind(this));
        } else {
            this.initialize();
        }
    }
    
    initialize() {
        console.log('ARMagicApp initializing...');
        
        // ARマネージャーを初期化
        this.arManager = new ARManager();
        window.arManager = this.arManager;
        
        // タッチハンドラーを初期化
        this.touchHandler = new TouchHandler();
        window.touchHandler = this.touchHandler;
        
        // リプレイボタンのイベントリスナー
        this.setupReplayButton();
        
        // アプリケーションの状態を監視
        this.setupStatusMonitoring();
        
        this.isInitialized = true;
        console.log('ARMagicApp initialized successfully');
    }
    
    setupReplayButton() {
        const replayBtn = document.getElementById('replay-btn');
        if (replayBtn) {
            replayBtn.addEventListener('click', this.replay.bind(this));
        }
    }
    
    setupStatusMonitoring() {
        // 定期的にシステム状態をチェック
        setInterval(() => {
            this.checkSystemStatus();
        }, 5000);
        
        // エラーハンドリング
        window.addEventListener('error', (event) => {
            console.error('Application error:', event.error);
            this.handleError(event.error);
        });
        
        // AR.jsの読み込み確認
        this.checkARJSLoaded();
    }
    
    checkARJSLoaded() {
        const maxAttempts = 50; // 5秒間チェック
        let attempts = 0;
        
        const checkInterval = setInterval(() => {
            attempts++;
            
            if (typeof AFRAME !== 'undefined' && AFRAME.version) {
                console.log('A-Frame loaded:', AFRAME.version);
                clearInterval(checkInterval);
                
                // AR.jsの確認
                if (window.THREEx && window.THREEx.ArToolkitSource) {
                    console.log('AR.js loaded successfully');
                } else {
                    console.warn('AR.js may not be loaded properly');
                }
                
                return;
            }
            
            if (attempts >= maxAttempts) {
                console.error('A-Frame/AR.js failed to load within timeout');
                this.handleError(new Error('AR libraries failed to load'));
                clearInterval(checkInterval);
            }
        }, 100);
    }
    
    checkSystemStatus() {
        if (!this.isInitialized) return;
        
        const status = this.arManager.getSceneStatus();
        console.log('System status:', status);
        
        // 必要な要素が見つからない場合の警告
        if (!status.hasScene || !status.hasMarker) {
            console.warn('Critical AR elements missing:', status);
        }
    }
    
    replay() {
        console.log('Replay button clicked');
        
        // タッチハンドラーをリセット
        if (this.touchHandler) {
            this.touchHandler.reset();
        }
        
        // ARマネージャーの召喚オブジェクトを非表示
        if (this.arManager) {
            this.arManager.hideSummonedObject();
        }
        
        console.log('App reset for replay');
    }
    
    handleError(error) {
        console.error('Handling application error:', error);
        
        // エラー表示
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.innerHTML = '⚠️ エラーが発生しました。ページを再読み込みしてください。';
            statusElement.style.display = 'block';
            statusElement.style.background = 'rgba(255, 0, 0, 0.9)';
            statusElement.style.color = 'white';
        }
    }
    
    // デバッグ用メソッド
    debug() {
        return {
            app: this,
            touchHandler: this.touchHandler,
            arManager: this.arManager,
            isInitialized: this.isInitialized,
            sceneStatus: this.arManager ? this.arManager.getSceneStatus() : null
        };
    }
}

// アプリケーション開始
const app = new ARMagicApp();

// デバッグ用にグローバルに公開
window.app = app;

// デバッグ用コンソールコマンド
window.debugAR = () => {
    console.log('=== AR Magic Debug Info ===');
    console.log(app.debug());
    
    if (app.arManager) {
        console.log('AR Scene Status:', app.arManager.getSceneStatus());
    }
    
    // テスト用の召喚
    if (app.arManager && app.arManager.isMarkerVisible) {
        console.log('Testing summon...');
        app.arManager.showDebugObject();
    } else {
        console.log('Marker not visible - cannot test summon');
    }
};
