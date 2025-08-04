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
        
        // A-Frameの背景を強制的に透明化
        this.forceTransparentBackground();
        
        // ARマネージャーを初期化
        this.arManager = new ARManager();
        window.arManager = this.arManager;  // グローバルに設定
        
        // タッチハンドラーを初期化
        this.touchHandler = new TouchHandler();
        window.touchHandler = this.touchHandler;
        
        // リプレイボタンのイベントリスナー
        this.setupReplayButton();
        
        // アプリケーションの状態を監視
        this.setupStatusMonitoring();
        
        this.isInitialized = true;
        console.log('ARMagicApp initialized successfully');
        
        // グローバル変数の確認
        console.log('Global AR objects set:', {
            arManager: !!window.arManager,
            touchHandler: !!window.touchHandler,
            arManagerType: typeof window.arManager
        });
    }
    
    forceTransparentBackground() {
        // A-Frameシーンの読み込み完了を待つ
        const scene = document.querySelector('a-scene');
        if (scene) {
            scene.addEventListener('loaded', () => {
                console.log('A-Frame scene loaded, setting transparent background...');
                
                // キャンバス要素を取得して背景を透明化（レンダリングは維持）
                const canvas = scene.canvas;
                if (canvas) {
                    // CSSでのみ背景を制御
                    canvas.style.background = 'transparent';
                    console.log('Canvas background style set to transparent');
                }
                
                // レンダラーのクリアカラーは設定しない（デフォルトのままにする）
                console.log('Background transparency applied without affecting rendering');
            });
        }
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
                
                // AR.jsの確認 - より包括的な検出
                let arjsDetected = false;
                let detectionMethod = '';
                
                // 方法1: A-Frameコンポーネント確認
                if (AFRAME.components) {
                    const arComponents = Object.keys(AFRAME.components).filter(k => 
                        k.includes('ar') || k === 'arjs' || k === 'marker'
                    );
                    if (arComponents.length > 0) {
                        arjsDetected = true;
                        detectionMethod = `Component (${arComponents.length})`;
                    }
                }
                
                // 方法2: THREEx確認
                if (!arjsDetected && window.THREEx && window.THREEx.ArToolkitSource) {
                    arjsDetected = true;
                    detectionMethod = 'THREEx';
                }
                
                // 方法3: シーンのarjs属性確認
                if (!arjsDetected) {
                    const scene = document.getElementById('ar-scene');
                    if (scene && scene.hasAttribute('arjs')) {
                        arjsDetected = true;
                        detectionMethod = 'Scene arjs attribute';
                    }
                }
                
                if (arjsDetected) {
                    console.log(`AR.js loaded successfully via: ${detectionMethod}`);
                } else {
                    console.warn('AR.js may not be loaded properly, but proceeding...');
                }
                
                // テクスチャ読み込み確認
                this.checkTextureLoaded();
                
                return;
            }
            
            if (attempts >= maxAttempts) {
                console.error('A-Frame/AR.js failed to load within timeout');
                this.handleError(new Error('AR libraries failed to load'));
                clearInterval(checkInterval);
            }
        }, 100);
    }
    
    checkTextureLoaded() {
        const texture = document.getElementById('magic-circle-texture');
        if (texture) {
            texture.onload = () => {
                console.log('✅ Magic circle texture loaded successfully');
            };
            texture.onerror = (error) => {
                console.error('❌ Failed to load magic circle texture:', error);
                this.handleError(new Error('Magic circle texture failed to load'));
            };
            
            if (texture.complete) {
                if (texture.naturalWidth > 0) {
                    console.log('✅ Magic circle texture already loaded');
                } else {
                    console.error('❌ Magic circle texture failed to load (naturalWidth = 0)');
                    this.handleError(new Error('Magic circle texture failed to load'));
                }
            }
        } else {
            console.error('❌ Magic circle texture element not found');
            this.handleError(new Error('Magic circle texture element not found'));
        }
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
            // 魔法陣も一度リセット（マーカーが認識されている場合は再表示）
            if (this.arManager.isMarkerVisible) {
                this.arManager.showMagicCircle();
            }
        }
        
        console.log('App reset for replay');
    }
    
    handleError(error) {
        console.error('Handling application error:', error);
        
        // エラー表示（ユーザーに分かりやすい形でエラー状況を通知）
        const statusElement = document.getElementById('status');  // ステータス表示用のDOM要素を取得
        /*if (statusElement) {
            statusElement.innerHTML = '⚠️ エラーが発生しました。ページを再読み込みしてください。';
            statusElement.style.display = 'block';          // 要素を表示状態にする
            statusElement.style.background = 'rgba(255, 0, 0, 0.9)';  // 背景色を赤に変更してエラーを強調
            statusElement.style.color = 'white';             // 文字色を白に設定（赤背景に対する視認性向上）
        }*/
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
        
        // 魔法陣とマーカーの状態確認
        console.log('Magic Circle Element:', document.getElementById('magic-circle-entity'));
        console.log('Magic Circle Texture:', document.getElementById('magic-circle-texture'));
        console.log('Marker Element:', document.getElementById('hiro-marker'));
    }
    
    // テスト用の召喚（マーカーが認識されている場合のみ実行）
    if (app.arManager && app.arManager.isMarkerVisible) {
        console.log('Testing summon...');
        app.arManager.showDebugObject();  // テスト用オブジェクトを表示
        
        // 魔法陣のテスト表示
        console.log('Testing magic circle...');
        app.arManager.showMagicCircle();
    } else {
        console.log('Marker not visible - cannot test summon');  // マーカーが認識されていない場合の警告
    }
    
    // デバッグ用: マニュアルテスト関数をグローバルに公開
    console.log('Setting up global debug functions...');
};

// グローバル関数を確実に定義（スコープ外で定義）
window.testDebugObject = function() {
    console.log('testDebugObject called');
    if (window.arManager) {
        console.log('ARManager found, testing debug object...');
        console.log('Marker status:', window.arManager.isMarkerVisible);
        window.arManager.showDebugObject();
    } else {
        console.error('ARManager not available');
        console.log('Available objects:', Object.keys(window).filter(key => key.includes('ar') || key.includes('AR')));
    }
};

window.testSummon = function(modelId = 'model-a') {
    console.log('testSummon called with:', modelId);
    if (window.arManager) {
        console.log('ARManager found, testing summon...');
        console.log('Marker status:', window.arManager.isMarkerVisible);
        window.arManager.showSummonedObject(modelId);
    } else {
        console.error('ARManager not available');
        console.log('Available objects:', Object.keys(window).filter(key => key.includes('ar') || key.includes('AR')));
    }
};

window.checkStatus = function() {
    console.log('checkStatus called');
    if (window.arManager) {
        console.log('Current AR Status:', window.arManager.getSceneStatus());
        const obj = document.getElementById('summoned-object');
        if (obj) {
            console.log('Summoned Object Status:', {
                position: obj.getAttribute('position'),
                scale: obj.getAttribute('scale'),
                visible: obj.getAttribute('visible'),
                innerHTML: obj.innerHTML,
                parentElement: obj.parentElement ? obj.parentElement.tagName : 'No parent'
            });
        } else {
            console.error('Summoned object element not found!');
        }
    } else {
        console.error('ARManager not available');
    }
};

// 初期化完了の確認
console.log('Global debug functions defined:', {
    testDebugObject: typeof window.testDebugObject,
    testSummon: typeof window.testSummon,
    checkStatus: typeof window.checkStatus
});
