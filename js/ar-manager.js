// ar-manager.js - AR機能の管理

class ARManager {
    constructor() {
        this.marker = null;                // Hiroマーカーのa-marker要素（ARマーカーの検知と追跡を管理）
        this.summonedObject = null;        // 召喚されるオブジェクトのa-entity要素（タッチ操作で表示される精霊の3Dモデル）
        this.isMarkerVisible = false;      // マーカーが現在認識されているかのフラグ（true=認識中、false=未認識）
        
        this.initAR();
    }
    
    initAR() {
        // マーカー要素を取得（HTMLで定義されたHiroマーカーのDOM要素を参照）
        this.marker = document.getElementById('hiro-marker');
        // 召喚オブジェクト要素を取得（精霊表示用のエンティティを参照）
        this.summonedObject = document.getElementById('summoned-object');
        
        if (this.marker) {
            // マーカーの表示/非表示イベント（AR.jsから自動的に発火されるイベントをリッスン）
            this.marker.addEventListener('markerFound', this.onMarkerFound.bind(this));    // マーカー発見時のイベントハンドラー
            this.marker.addEventListener('markerLost', this.onMarkerLost.bind(this));      // マーカー喪失時のイベントハンドラー
        }
        
        console.log('AR Manager initialized');
    }
    
    onMarkerFound() {
        console.log('Marker found!');
        this.isMarkerVisible = true;  // マーカー認識状態フラグをtrueに設定
        
        // TouchHandlerに通知（タッチ操作が有効になったことを伝える）
        if (window.touchHandler) {
            window.touchHandler.setMarkerVisible(true);
        }
    }
    
    onMarkerLost() {
        console.log('Marker lost!');
        this.isMarkerVisible = false;  // マーカー認識状態フラグをfalseに設定
        
        // TouchHandlerに通知（タッチ操作を無効にすることを伝える）
        if (window.touchHandler) {
            window.touchHandler.setMarkerVisible(false);
        }
        
        // 召喚オブジェクトを非表示（マーカーが見えなくなったら精霊も消去）
        this.hideSummonedObject();
    }
    
    showSummonedObject(modelId) {
        if (!this.summonedObject) return;  // 召喚オブジェクト要素が存在しない場合は処理を中止
        
        // 既存のモデルを削除（前回召喚したオブジェクトがある場合はクリア）
        this.summonedObject.removeAttribute('gltf-model');
        
        // 新しいモデルを設定（指定されたmodelIdに対応する3Dモデルを適用）
        this.summonedObject.setAttribute('gltf-model', `#${modelId}`);
        this.summonedObject.setAttribute('visible', 'true');  // オブジェクトを表示状態に変更
        
        // 召喚アニメーション（小さい状態から通常サイズへ拡大するアニメーション）
        this.summonedObject.setAttribute('animation__appear', {
            property: 'scale',              // スケール（大きさ）をアニメーション対象にする
            from: '0 0 0',                  // アニメーション開始時のスケール（完全に小さい状態）
            to: '1 1 1',                    // アニメーション終了時のスケール（通常サイズ）
            dur: 1000,                      // アニメーション時間（1000ms = 1秒）
            easing: 'easeOutBounce'         // イージング関数（バウンドしながら止まる動き）
        });
        
        console.log(`Summoned object: ${modelId}`);
    }
    
    hideSummonedObject() {
        if (!this.summonedObject) return;  // 召喚オブジェクト要素が存在しない場合は処理を中止
        
        this.summonedObject.setAttribute('visible', 'false');           // オブジェクトを非表示状態に変更
        this.summonedObject.removeAttribute('animation__appear');       // 召喚アニメーションを削除（アニメーション処理の停止）
    }
    
    // デバッグ用: 仮のオブジェクトを表示（3Dモデルファイルがない場合のテスト用）
    showDebugObject() {
        if (!this.summonedObject) {
            return;
        }
        
        // 基本的なボックスを表示（3Dモデルがない場合のテスト用）
        this.summonedObject.innerHTML = `
            <a-box 
                color="#ff0000" 
                position="0 0 0" 
                scale="0.3 0.3 0.3"
                animation__rotate="property: rotation; to: 0 360 0; loop: true; dur: 2000">
            </a-box>
        `;
        this.summonedObject.setAttribute('visible', true);
    }
    
    // シーンの状態を取得（デバッグ用）
    getSceneStatus() {
        return {
            isMarkerVisible: this.isMarkerVisible,          // マーカーが認識されているか
            hasScene: !!document.getElementById('ar-scene'), // ARシーンが存在するか
            hasMarker: !!this.marker,                       // マーカー要素が存在するか
            hasMagicCircle: !!document.getElementById('magic-circle-entity'), // 魔法陣要素が存在するか
            hasSummonedObject: !!this.summonedObject         // 召喚オブジェクト要素が存在するか
        };
    }
}

// グローバルに公開
window.ARManager = ARManager;
