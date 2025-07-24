// touch-handler.js - タッチ操作の処理

class TouchHandler {
    constructor() {
        this.touchStartTime = 0;        // タッチ開始時刻（ミリ秒単位のタイムスタンプ）
        this.touchEndTime = 0;          // タッチ終了時刻（ミリ秒単位のタイムスタンプ）
        this.isTouching = false;        // 現在タッチ中かどうかのフラグ（二重操作防止のため）
        this.isMarkerVisible = false;   // マーカーが認識されているかのフラグ（ARマネージャーから設定される）
        
        this.initEventListeners();
    }
    
    initEventListeners() {
        // タッチイベント（スマートフォン・タブレット用のタッチ操作を検知）
        document.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });  // タッチ開始イベント
        document.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });      // タッチ終了イベント
        
        // マウスイベント（PC用のマウスクリック操作を検知）
        document.addEventListener('mousedown', this.onTouchStart.bind(this));   // マウスボタン押下イベント
        document.addEventListener('mouseup', this.onTouchEnd.bind(this));       // マウスボタン離上イベント
        
        // タッチ操作の無効化を防ぐ（タッチ中のスクロールやズームを無効化）
        document.addEventListener('touchmove', (e) => {
            if (this.isTouching) {
                e.preventDefault();  // デフォルトのタッチ動作をキャンセル（スクロール防止）
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
        
        this.isTouching = false;                                    // タッチ状態フラグをfalseに設定
        this.touchEndTime = Date.now();                            // タッチ終了時刻を記録（現在時刻をミリ秒で取得）
        
        const duration = this.touchEndTime - this.touchStartTime;  // タッチ継続時間を計算（終了時刻 - 開始時刻）
        
        // タッチフィードバック解除（視覚的なタッチ効果を削除）
        this.hideTouchFeedback();
        
        // ステータス非表示（「魔法を込めています...」メッセージを隠す）
        const statusElement = document.getElementById('status');    // ステータス表示用のDOM要素を取得
        statusElement.style.display = 'none';
        
        console.log('Touch ended. Duration:', duration, 'ms');
        
        // 召喚処理を実行
        this.processSummoning(duration);
    }
    
    processSummoning(duration) {
        // 時間に基づいて召喚するオブジェクトを決定（3つのオブジェクトのみ表示）
        const T1 = 500, T2 = 1500;  // T1、T2は時間の境界値（ミリ秒）
        
        let modelToShow = '';   // 表示する3Dモデルのasset ID
        let summonType = '';    // ユーザーに表示するオブジェクトの名前
        
        if (duration < T1) {
            modelToShow = 'model-a';    // 高速タッチ（0-500ms）：オブジェクトA
            summonType = 'オブジェクトA';
        } else if (duration < T2) {
            modelToShow = 'model-b';    // 中速タッチ（500-1500ms）：オブジェクトB
            summonType = 'オブジェクトB';
        } else {
            modelToShow = 'model-c';    // 低速タッチ（1500ms+）：オブジェクトC
            summonType = 'オブジェクトC';
        }
        
        // ARマネージャーに召喚を指示（選択された3Dモデルを表示）
        if (window.arManager) {
            window.arManager.showSummonedObject(modelToShow);
        }
        
        // 結果表示（ユーザーに召喚成功を通知）
        this.showResult(summonType, duration);
    }
    
    showResult(summonType, duration) {
        const resultElement = document.getElementById('result');    // 結果表示用のDOM要素を取得
        const replayBtn = document.getElementById('replay-btn');    // リプレイボタンのDOM要素を取得
        
        resultElement.innerHTML = `
            <h3>召喚成功！</h3>
            <p><strong>${summonType}</strong> が現れました！</p>
            <p>タッチ時間: ${duration}ms</p>
        `;
        
        resultElement.style.display = 'block';      // 結果テキストを表示状態にする
        resultElement.classList.add('fade-in');     // フェードインアニメーションを適用
        
        // リプレイボタン表示（1秒後に表示してユーザーが結果を確認する時間を与える）
        setTimeout(() => {
            replayBtn.style.display = 'block';       // リプレイボタンを表示状態にする
            replayBtn.classList.add('fade-in');      // フェードインアニメーションを適用
        }, 1000);
        
        // 指示テキスト非表示（結果表示中は操作方法を隠す）
        const instructionsElement = document.getElementById('instructions');  // 指示テキストのDOM要素を取得
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
        // 状態リセット（タッチ操作に関する全ての変数を初期値に戻す）
        this.isTouching = false;        // タッチ中フラグをfalseに
        this.touchStartTime = 0;        // タッチ開始時間をリセット
        this.touchEndTime = 0;          // タッチ終了時間をリセット
        
        // UI要素リセット（画面上の表示要素を初期状態に戻す）
        const statusElement = document.getElementById('status');            // ステータス表示要素
        const resultElement = document.getElementById('result');            // 結果表示要素
        const replayBtn = document.getElementById('replay-btn');            // リプレイボタン要素
        const instructionsElement = document.getElementById('instructions'); // 指示テキスト要素
        
        statusElement.style.display = 'none';      // ステータスを非表示
        resultElement.style.display = 'none';      // 結果を非表示
        replayBtn.style.display = 'none';          // リプレイボタンを非表示
        instructionsElement.style.display = 'block'; // 指示テキストを表示
        
        // クラスリセット（CSSアニメーションクラスを削除）
        [statusElement, resultElement, replayBtn, instructionsElement].forEach(el => {
            el.classList.remove('fade-in');  // フェードインアニメーションクラスを削除
        });
        
        // ARオブジェクトリセット（現在表示されている召喚オブジェクトを非表示）
        if (window.arManager) {
            window.arManager.hideSummonedObject();
        }
    }
    
    setMarkerVisible(visible) {
        this.isMarkerVisible = visible;  // マーカー認識状態を更新（ARマネージャーから呼び出される）
        
        if (visible) {
            // マーカー認識時の指示テキスト（操作可能状態を示す）
            const instructionsElement = document.getElementById('instructions');  // 指示テキスト要素を取得
            instructionsElement.innerHTML = `
                <h2>AR召喚</h2>
                <p>マーカーを認識しました！</p>
                <p>画面を指でタッチしよう！</p>
            `;
            instructionsElement.classList.add('pulse');  // 点滅アニメーションを追加（注意喚起のため）
        } else {
            // マーカー未認識時の指示テキスト（カメラをマーカーに向けるよう促す）
            const instructionsElement = document.getElementById('instructions');  // 指示テキスト要素を取得
            instructionsElement.innerHTML = `
                <h2>AR召喚</h2>
                <p>マーカーにカメラを向けてください</p>
                <p>画面を指でタッチしよう！</p>
            `;
            instructionsElement.classList.remove('pulse');  // 点滅アニメーションを削除
        }
    }
}

// グローバルに公開
window.TouchHandler = TouchHandler;
