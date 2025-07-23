// app.js - メインアプリケーション

class ARMagicApp {
    constructor() {
        this.touchHandler = null;      // タッチ操作を管理するクラスのインスタンス（画面タッチの検知・時間計測・召喚処理を担当）
        this.arManager = null;         // AR機能を管理するクラスのインスタンス（マーカー検知・3Dオブジェクト表示制御を担当）
        this.isInitialized = false;    // アプリが正常に初期化されたかのフラグ（二重初期化防止のため）
        
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
        const replayBtn = document.getElementById('replay-btn');  // リプレイボタンのDOM要素を取得
        if (replayBtn) {
            replayBtn.addEventListener('click', this.replay.bind(this));
        }
    }
    
    setupStatusMonitoring() {
        // 定期的にシステム状態をチェック（5秒間隔でアプリの健全性を監視）
        setInterval(() => {
            this.checkSystemStatus();
        }, 5000);
        
        // エラーハンドリング（予期しないエラーをキャッチして適切に処理）
        window.addEventListener('error', (event) => {
            console.error('Application error:', event.error);
            this.handleError(event.error);
        });
        
        // AR.jsの読み込み確認（必要なライブラリが正常に読み込まれているかチェック）
        this.checkARJSLoaded();
    }
    
    checkARJSLoaded() {
        const maxAttempts = 50; // 5秒間チェック（最大試行回数）
        let attempts = 0;       // 現在の試行回数をカウント
        
        const checkInterval = setInterval(() => {  // 定期的にライブラリの読み込み状況をチェックするタイマー
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
        if (!this.isInitialized) return;  // 初期化が完了していない場合は処理をスキップ
        
        const status = this.arManager.getSceneStatus();  // ARシーンの現在状態を取得（マーカー認識状況、各要素の存在確認など）
        console.log('System status:', status);
        
        // 必要な要素が見つからない場合の警告（ARシーンやマーカーが正常に動作しているかチェック）
        if (!status.hasScene || !status.hasMarker) {
            console.warn('Critical AR elements missing:', status);
        }
    }
    
    replay() {
        console.log('Replay button clicked');
        
        // タッチハンドラーをリセット（前回の召喚結果や操作状態をクリア）
        if (this.touchHandler) {
            this.touchHandler.reset();
        }
        
        // ARマネージャーの召喚オブジェクトを非表示（現在表示されている精霊を消去）
        if (this.arManager) {
            this.arManager.hideSummonedObject();
        }
        
        console.log('App reset for replay');
    }
    
    handleError(error) {
        console.error('Handling application error:', error);
        
        // エラー表示（ユーザーに分かりやすい形でエラー状況を通知）
        const statusElement = document.getElementById('status');  // ステータス表示用のDOM要素を取得
        if (statusElement) {
            statusElement.innerHTML = '⚠️ エラーが発生しました。ページを再読み込みしてください。';
            statusElement.style.display = 'block';          // 要素を表示状態にする
            statusElement.style.background = 'rgba(255, 0, 0, 0.9)';  // 背景色を赤に変更してエラーを強調
            statusElement.style.color = 'white';             // 文字色を白に設定（赤背景に対する視認性向上）
        }
    }
    
    // デバッグ用メソッド（開発時にアプリの内部状態を確認するため）
    debug() {
        return {
            app: this,                      // アプリケーションのメインインスタンス
            touchHandler: this.touchHandler, // タッチ操作管理インスタンス
            arManager: this.arManager,       // AR機能管理インスタンス
            isInitialized: this.isInitialized, // 初期化完了フラグ
            sceneStatus: this.arManager ? this.arManager.getSceneStatus() : null  // ARシーンの現在状態（マネージャーが存在する場合のみ取得）
        };
    }
}

// アプリケーション開始（ページ読み込み時に自動的にARMagicAppのインスタンスを作成）
const app = new ARMagicApp();

// デバッグ用にグローバルに公開（ブラウザのコンソールからアクセス可能にする）
window.app = app;

// デバッグ用コンソールコマンド（開発時にブラウザコンソールで debugAR() を実行すると詳細情報を表示）
window.debugAR = () => {
    console.log('=== AR Magic Debug Info ===');
    console.log(app.debug());  // アプリの内部状態を出力
    
    if (app.arManager) {
        console.log('AR Scene Status:', app.arManager.getSceneStatus());  // ARシーンの詳細状態を出力
    }
    
    // テスト用の召喚（マーカーが認識されている場合のみ実行）
    if (app.arManager && app.arManager.isMarkerVisible) {
        console.log('Testing summon...');
        app.arManager.showDebugObject();  // テスト用オブジェクトを表示
    } else {
        console.log('Marker not visible - cannot test summon');  // マーカーが認識されていない場合の警告
    }
};
