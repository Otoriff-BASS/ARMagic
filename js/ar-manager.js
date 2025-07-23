// ar-manager.js - AR機能の管理

class ARManager {
    constructor() {
        this.marker = null;
        this.summonedObject = null;
        this.isMarkerVisible = false;
        
        this.initAR();
    }
    
    initAR() {
        // マーカー要素を取得
        this.marker = document.getElementById('hiro-marker');
        this.summonedObject = document.getElementById('summoned-object');
        
        if (this.marker) {
            // マーカーの表示/非表示イベント
            this.marker.addEventListener('markerFound', this.onMarkerFound.bind(this));
            this.marker.addEventListener('markerLost', this.onMarkerLost.bind(this));
        }
        
        console.log('AR Manager initialized');
    }
    
    onMarkerFound() {
        console.log('Marker found!');
        this.isMarkerVisible = true;
        
        // TouchHandlerに通知
        if (window.touchHandler) {
            window.touchHandler.setMarkerVisible(true);
        }
    }
    
    onMarkerLost() {
        console.log('Marker lost!');
        this.isMarkerVisible = false;
        
        // TouchHandlerに通知
        if (window.touchHandler) {
            window.touchHandler.setMarkerVisible(false);
        }
        
        // 召喚オブジェクトを非表示
        this.hideSummonedObject();
    }
    
    showSummonedObject(modelId) {
        if (!this.summonedObject) return;
        
        // 既存のモデルを削除
        this.summonedObject.removeAttribute('gltf-model');
        
        // 新しいモデルを設定
        this.summonedObject.setAttribute('gltf-model', `#${modelId}`);
        this.summonedObject.setAttribute('visible', 'true');
        
        // 召喚アニメーション
        this.summonedObject.setAttribute('animation__appear', {
            property: 'scale',
            from: '0 0 0',
            to: '1 1 1',
            dur: 1000,
            easing: 'easeOutBounce'
        });
        
        console.log(`Summoned object: ${modelId}`);
    }
    
    hideSummonedObject() {
        if (!this.summonedObject) return;
        
        this.summonedObject.setAttribute('visible', 'false');
        this.summonedObject.removeAttribute('animation__appear');
    }
}

// グローバルに公開
window.ARManager = ARManager;
