// ar-manager.js - AR機能の管理

class ARManager {
    constructor() {
        this.marker = null;                // Hiroマーカーのa-marker要素（ARマーカーの検知と追跡を管理）
        this.summonedObject = null;        // 召喚されるオブジェクトのa-entity要素（タッチ操作で表示される精霊の3Dモデル）
        this.magicCircle = null;           // 魔法陣要素への参照（Planeオブジェクトのテクスチャ表示制御を担当）
        this.isMarkerVisible = false;      // マーカーが現在認識されているかのフラグ（true=認識中、false=未認識）
        
        this.initAR();
    }
    
    initAR() {
        console.log('Initializing AR Manager...');
        
        // マーカー要素を取得（HTMLで定義されたHiroマーカーのDOM要素を参照）
        this.marker = document.getElementById('hiro-marker');
        // 召喚オブジェクト要素を取得（精霊表示用のエンティティを参照）
        this.summonedObject = document.getElementById('summoned-object');
        // 魔法陣要素を取得（Planeテクスチャ表示制御用のエンティティを参照）
        this.magicCircle = document.getElementById('magic-circle-entity');
        
        // 要素の存在確認とデバッグ情報
        console.log('AR Elements found:', {
            marker: !!this.marker,
            summonedObject: !!this.summonedObject,
            magicCircle: !!this.magicCircle
        });
        
        if (!this.marker) {
            console.error('Hiro marker element not found!');
            return;
        }
        
        if (!this.summonedObject) {
            console.error('Summoned object element not found!');
            return;
        }
        
        if (this.marker) {
            // マーカーの表示/非表示イベント（AR.jsから自動的に発火されるイベントをリッスン）
            this.marker.addEventListener('markerFound', this.onMarkerFound.bind(this));    // マーカー発見時のイベントハンドラー
            this.marker.addEventListener('markerLost', this.onMarkerLost.bind(this));      // マーカー喪失時のイベントハンドラー
            
            console.log('Event listeners attached to marker');
        }
        
        console.log('AR Manager initialized with Hiro marker and magic circle texture');
    }
    
    onMarkerFound() {
        console.log('Marker found!');
        this.isMarkerVisible = true;  // マーカー認識状態フラグをtrueに設定
        
        // 魔法陣を表示・アニメーション開始
        this.showMagicCircle();
        
        // TouchHandlerに通知（タッチ操作が有効になったことを伝える）
        if (window.touchHandler) {
            window.touchHandler.setMarkerVisible(true);
        }
        
        // デバッグ用: マーカー検知時の状態ログ
        console.log('Marker detected - Elements check:', {
            marker: !!this.marker,
            magicCircle: !!this.magicCircle,
            summonedObject: !!this.summonedObject,
            markerVisible: this.isMarkerVisible
        });
        
        console.log('Marker found - ready for testing! Use testDebugObject() or testSummon() in console');
    }
    
    onMarkerLost() {
        console.log('Marker lost!');
        this.isMarkerVisible = false;  // マーカー認識状態フラグをfalseに設定
        
        // 魔法陣を非表示
        this.hideMagicCircle();
        
        // TouchHandlerに通知（タッチ操作を無効にすることを伝える）
        if (window.touchHandler) {
            window.touchHandler.setMarkerVisible(false);
        }
        
        // 召喚オブジェクトを非表示（マーカーが見えなくなったら精霊も消去）
        this.hideSummonedObject();
    }
    
    showMagicCircle() {
        if (this.magicCircle) {
            this.magicCircle.setAttribute('visible', 'true');
            console.log('Magic circle appeared! (Flattened sphere with rings)');
            
            // 魔法陣の構成要素をログ出力
            const sphere = this.magicCircle.querySelector('#magic-circle-sphere');
            const outerRing = this.magicCircle.querySelector('a-ring[color="#FFD700"]');
            const innerRing = this.magicCircle.querySelector('a-ring[color="#8A2BE2"]');
            
            console.log('Magic circle components:', {
                sphere: !!sphere,
                outerRing: !!outerRing,
                innerRing: !!innerRing,
                totalChildren: this.magicCircle.children.length
            });
        } else {
            console.error('Magic circle entity not found!');
        }
    }
    
    hideMagicCircle() {
        if (this.magicCircle) {
            this.magicCircle.setAttribute('visible', 'false');
            console.log('Magic circle hidden');
        }
    }
    
    showSummonedObject(modelId) {
        if (!this.summonedObject) {
            console.error('Summoned object element not found!');
            return;
        }
        
        console.log(`=== STARTING SUMMON PROCESS FOR: ${modelId} ===`);
        
        // モデルファイルの存在確認
        const modelAsset = document.getElementById(modelId);
        if (!modelAsset) {
            console.error(`Model asset not found: ${modelId}`);
            console.log('Available assets:', Array.from(document.querySelectorAll('a-assets *')).map(el => el.id));
            // モデルが見つからない場合はデバッグオブジェクトを表示
            this.showDebugObject();
            return;
        }
        
        console.log(`Model asset found: ${modelId}`, modelAsset);
        console.log('Model source:', modelAsset.src);
        
        // 既存のモデルとアニメーションを削除（前回召喚したオブジェクトがある場合はクリア）
        this.summonedObject.removeAttribute('gltf-model');
        this.summonedObject.removeAttribute('animation__appear');
        this.summonedObject.innerHTML = ''; // 既存の子要素をクリア
        
        // マーカー座標系での位置を明示的に設定
        this.summonedObject.setAttribute('position', '0 1 0');
        this.summonedObject.setAttribute('rotation', '0 0 0');
        this.summonedObject.setAttribute('scale', '0.5 0.5 0.5'); // 最初から見えるサイズに設定
        this.summonedObject.setAttribute('visible', 'true');  // 最初に表示状態に変更
        
        console.log('Object properties set:');
        console.log('- Position:', this.summonedObject.getAttribute('position'));
        console.log('- Scale:', this.summonedObject.getAttribute('scale'));
        console.log('- Visible:', this.summonedObject.getAttribute('visible'));
        
        // 新しいモデルを設定（指定されたmodelIdに対応する3Dモデルを適用）
        console.log(`Setting gltf-model to: #${modelId}`);
        this.summonedObject.setAttribute('gltf-model', `#${modelId}`);
        
        // モデル読み込み完了を監視
        this.summonedObject.addEventListener('model-loaded', () => {
            console.log(`✓ Model loaded successfully: ${modelId}`);
            console.log('Model loaded - starting animation...');
            
            // アニメーション開始
            this.summonedObject.setAttribute('animation__appear', {
                property: 'scale',
                from: '0.1 0.1 0.1',
                to: '1 1 1',
                dur: 1000,
                easing: 'easeOutBounce'
            });
        }, { once: true });
        
        this.summonedObject.addEventListener('model-error', (event) => {
            console.error(`✗ Model loading error for ${modelId}:`, event.detail);
            console.log('Model failed to load - showing debug object instead');
            // エラーの場合はデバッグオブジェクトを表示
            this.showDebugObject();
        }, { once: true });
        
        // フォールバック: 一定時間後にモデルが読み込まれていない場合
        setTimeout(() => {
            const hasModel = this.summonedObject.getAttribute('gltf-model');
            const isVisible = this.summonedObject.getAttribute('visible') === 'true';
            
            console.log('Fallback check after 2 seconds:');
            console.log('- Has model attribute:', !!hasModel);
            console.log('- Is visible:', isVisible);
            console.log('- Current innerHTML length:', this.summonedObject.innerHTML.length);
            
            // モデルが見えない場合は代替表示
            if (isVisible && this.summonedObject.innerHTML.length === 0) {
                console.log('Model not visible after 2s - showing fallback');
                this.showModelFallback(modelId);
            }
        }, 2000);
        
        console.log(`=== SUMMON PROCESS INITIATED FOR: ${modelId} ===`);
    }
    
    hideSummonedObject() {
        if (!this.summonedObject) return;  // 召喚オブジェクト要素が存在しない場合は処理を中止
        
        this.summonedObject.setAttribute('visible', 'false');           // オブジェクトを非表示状態に変更
        this.summonedObject.removeAttribute('animation__appear');       // 召喚アニメーションを削除（アニメーション処理の停止）
        this.summonedObject.removeAttribute('gltf-model');              // モデルも削除
        this.summonedObject.innerHTML = '';                             // 子要素をクリア
        
        console.log('Summoned object hidden and cleared');
    }
    
    // デバッグ用: 仮のオブジェクトを表示（3Dモデルファイルがない場合のテスト用）
    showDebugObject() {
        console.log('=== SHOW DEBUG OBJECT START ===');
        
        if (!this.summonedObject) {
            console.error('Summoned object element not found for debug!');
            console.log('Checking for element by ID...');
            const element = document.getElementById('summoned-object');
            console.log('Direct element search result:', !!element);
            return;
        }
        
        console.log('Summoned object found:', this.summonedObject);
        console.log('Current marker visible state:', this.isMarkerVisible);
        
        // 既存の内容をクリア
        this.summonedObject.innerHTML = '';
        this.summonedObject.removeAttribute('gltf-model');
        this.summonedObject.removeAttribute('animation__appear');
        
        // マーカー座標系での位置を設定
        this.summonedObject.setAttribute('position', '0 1 0');
        this.summonedObject.setAttribute('scale', '1 1 1');
        this.summonedObject.setAttribute('visible', 'true');
        
        console.log('Attributes set - adding debug shapes...');
        
        // より確実に表示される複数の形状を追加
        const debugContent = `
            <a-box 
                color="#ff0000" 
                position="0 0 0" 
                scale="0.5 0.5 0.5"
                animation__rotate="property: rotation; to: 0 360 0; loop: true; dur: 2000">
            </a-box>
            <a-sphere 
                color="#00ff00" 
                position="0 1 0" 
                scale="0.3 0.3 0.3"
                animation__bounce="property: position; to: 0 1.5 0; dir: alternate; loop: true; dur: 1000">
            </a-sphere>
            <a-cylinder 
                color="#0000ff" 
                position="0 -0.5 0" 
                scale="0.2 0.8 0.2"
                animation__pulse="property: scale; to: 0.3 1.0 0.3; dir: alternate; loop: true; dur: 800">
            </a-cylinder>
        `;
        
        this.summonedObject.innerHTML = debugContent;
        
        console.log('Debug content added. Final state:');
        console.log('- Position:', this.summonedObject.getAttribute('position'));
        console.log('- Scale:', this.summonedObject.getAttribute('scale'));
        console.log('- Visible:', this.summonedObject.getAttribute('visible'));
        console.log('- Parent:', this.summonedObject.parentElement ? this.summonedObject.parentElement.id : 'No parent');
        console.log('- Content length:', this.summonedObject.innerHTML.length);
        console.log('=== SHOW DEBUG OBJECT END ===');
    }
    
    // 3Dモデルの代替表示（モデルファイルが読み込まれない場合）
    showModelFallback(modelId) {
        console.log(`=== SHOWING FALLBACK FOR: ${modelId} ===`);
        
        if (!this.summonedObject) {
            console.error('Summoned object element not found for fallback!');
            return;
        }
        
        // 既存の内容をクリア
        this.summonedObject.innerHTML = '';
        this.summonedObject.removeAttribute('gltf-model');
        this.summonedObject.removeAttribute('animation__appear');
        
        // 位置設定
        this.summonedObject.setAttribute('position', '0 1 0');
        this.summonedObject.setAttribute('scale', '1 1 1');
        this.summonedObject.setAttribute('visible', 'true');
        
        // モデルIDに応じた色とテキストを設定
        const modelInfo = {
            'model-a': { color: '#ff4444', name: '稲妻の精霊' },
            'model-b': { color: '#ff8800', name: '炎の精霊' },
            'model-c': { color: '#4488ff', name: '水の精霊' },
            'model-d': { color: '#88aa44', name: '土の精霊' },
            'model-e': { color: '#aa44aa', name: '古の守護者' }
        };
        
        const info = modelInfo[modelId] || { color: '#ffffff', name: '未知の精霊' };
        
        // 代替表示オブジェクト
        this.summonedObject.innerHTML = `
            <a-cone 
                color="${info.color}" 
                position="0 0 0" 
                scale="0.8 1.2 0.8"
                animation__float="property: position; to: 0 0.3 0; dir: alternate; loop: true; dur: 2000; easing: easeInOutSine">
            </a-cone>
            <a-text 
                value="${info.name}" 
                position="0 2 0" 
                align="center" 
                color="white" 
                scale="2 2 2"
                animation__glow="property: components.text.color; to: ${info.color}; dir: alternate; loop: true; dur: 1500">
            </a-text>
            <a-ring 
                color="${info.color}" 
                position="0 -0.1 0" 
                radius-inner="0.8" 
                radius-outer="1.2" 
                rotation="-90 0 0"
                animation__spin="property: rotation; to: -90 360 0; loop: true; dur: 4000; easing: linear">
            </a-ring>
        `;
        
        console.log(`Fallback displayed for ${modelId}: ${info.name}`);
    }
    
    // シーンの状態を取得（デバッグ用）
    getSceneStatus() {
        return {
            isMarkerVisible: this.isMarkerVisible,          // マーカーが認識されているか
            hasScene: !!document.getElementById('ar-scene'), // ARシーンが存在するか
            hasMarker: !!this.marker,                       // マーカー要素が存在するか
            hasMagicCircle: !!document.getElementById('magic-circle-entity'), // 魔法陣要素が存在するか
            hasSummonedObject: !!this.summonedObject,        // 召喚オブジェクト要素が存在するか
            markerType: 'hiro'                               // マーカータイプを明記
        };
    }
}

// グローバルに公開
window.ARManager = ARManager;
