// touch-handler.js - タッチ操作の処理

class TouchHandler {
    constructor() {
        this.touchStartTime = 0;
        this.touchEndTime = 0;
        this.isTouching = false;
        this.isMarkerVisible = false;
        
        this.initEventListeners();
    }
    
    initEventListeners() {
        // タッチイベント
        document.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        document.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
        
        // マウスイベント（PC用）
        document.addEventListener('mousedown', this.onTouchStart.bind(this));
        document.addEventListener('mouseup', this.onTouchEnd.bind(this));
        
        // タッチ操作の無効化を防ぐ
        document.addEventListener('touchmove', (e) => {
            if (this.isTouching) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    onTouchStart(event) {
        // マーカーが表示されていない場合は処理しない
        if (!this.isMarkerVisible) {
            return;
        }
        
        event.preventDefault();
        
        if (!this.isTouching) {
            this.isTouching = true;
            this.touchStartTime = Date.now();
            
            // タッチ開始のフィードバック
            this.showTouchFeedback();
            
            // ステータス表示
            const statusElement = document.getElementById('status');
            statusElement.textContent = '魔法を込めています...';
            statusElement.style.display = 'block';
            statusElement.classList.add('fade-in');
            
            console.log('Touch started at:', this.touchStartTime);
        }
    }
    
    onTouchEnd(event) {
        if (!this.isTouching) {
            return;
        }
        
        event.preventDefault();
        
        this.isTouching = false;
        this.touchEndTime = Date.now();
        
        const duration = this.touchEndTime - this.touchStartTime;
        
        // タッチフィードバック解除
        this.hideTouchFeedback();
        
        // ステータス非表示
        const statusElement = document.getElementById('status');
        statusElement.style.display = 'none';
        
        console.log('Touch ended. Duration:', duration, 'ms');
        
        // 召喚処理を実行
        this.processSummoning(duration);
    }
    
    processSummoning(duration) {
        // 時間に基づいて召喚するオブジェクトを決定
        const T1 = 200, T2 = 500, T3 = 1000, T4 = 2000;
        
        let modelToShow = '';
        let summonType = '';
        
        if (duration < T1) {
            modelToShow = 'model-a';
            summonType = '稲妻の精霊';
        } else if (duration < T2) {
            modelToShow = 'model-b';
            summonType = '炎の精霊';
        } else if (duration < T3) {
            modelToShow = 'model-c';
            summonType = '水の精霊';
        } else if (duration < T4) {
            modelToShow = 'model-d';
            summonType = '土の精霊';
        } else {
            modelToShow = 'model-e';
            summonType = '古の守護者';
        }
        
        // ARマネージャーに召喚を指示
        if (window.arManager) {
            window.arManager.showSummonedObject(modelToShow);
        }
        
        // 結果表示
        this.showResult(summonType, duration);
    }
    
    showResult(summonType, duration) {
        const resultElement = document.getElementById('result');
        const replayBtn = document.getElementById('replay-btn');
        
        resultElement.innerHTML = `
            <h3>🎉 召喚成功！</h3>
            <p><strong>${summonType}</strong> が現れました！</p>
            <p>タッチ時間: ${duration}ms</p>
        `;
        
        resultElement.style.display = 'block';
        resultElement.classList.add('fade-in');
        
        // リプレイボタン表示
        setTimeout(() => {
            replayBtn.style.display = 'block';
            replayBtn.classList.add('fade-in');
        }, 1000);
        
        // 指示テキスト非表示
        const instructionsElement = document.getElementById('instructions');
        instructionsElement.style.display = 'none';
    }
    
    showTouchFeedback() {
        const overlay = document.getElementById('ui-overlay');
        overlay.classList.add('touching');
    }
    
    hideTouchFeedback() {
        const overlay = document.getElementById('ui-overlay');
        overlay.classList.remove('touching');
    }
    
    reset() {
        // 状態リセット
        this.isTouching = false;
        this.touchStartTime = 0;
        this.touchEndTime = 0;
        
        // UI要素リセット
        const statusElement = document.getElementById('status');
        const resultElement = document.getElementById('result');
        const replayBtn = document.getElementById('replay-btn');
        const instructionsElement = document.getElementById('instructions');
        
        statusElement.style.display = 'none';
        resultElement.style.display = 'none';
        replayBtn.style.display = 'none';
        instructionsElement.style.display = 'block';
        
        // クラスリセット
        [statusElement, resultElement, replayBtn, instructionsElement].forEach(el => {
            el.classList.remove('fade-in');
        });
        
        // ARオブジェクトリセット
        if (window.arManager) {
            window.arManager.hideSummonedObject();
        }
    }
    
    setMarkerVisible(visible) {
        this.isMarkerVisible = visible;
        
        if (visible) {
            const instructionsElement = document.getElementById('instructions');
            instructionsElement.innerHTML = `
                <h2>魔法陣召喚体験</h2>
                <p>✨ マーカーを認識しました！</p>
                <p>✋ 画面を指でぐるぐる回そう！</p>
            `;
            instructionsElement.classList.add('pulse');
        } else {
            const instructionsElement = document.getElementById('instructions');
            instructionsElement.innerHTML = `
                <h2>魔法陣召喚体験</h2>
                <p>📱 マーカーにカメラを向けてください</p>
                <p>✋ 画面を指でぐるぐる回そう！</p>
            `;
            instructionsElement.classList.remove('pulse');
        }
    }
}

// グローバルに公開
window.TouchHandler = TouchHandler;
