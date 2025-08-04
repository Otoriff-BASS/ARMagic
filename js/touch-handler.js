// touch-handler.js - タッチ操作の処理

class TouchHandler {
    constructor() {
        this.touchStartTime = 0;        // タッチ開始時刻（ミリ秒単位のタイムスタンプ）
        this.touchEndTime = 0;          // タッチ終了時刻（ミリ秒単位のタイムスタンプ）
        this.isTouching = false;        // 現在タッチ中かどうかのフラグ（二重操作防止のため）
        this.isMarkerVisible = false;   // マーカーが認識されているかのフラグ（ARマネージャーから設定される）
        
        // 軌跡追跡用プロパティ
        this.touchPath = [];            // タッチ軌跡のポイント配列
        this.guideCanvas = null;        // ガイド描画用Canvas
        this.guideCtx = null;           // Canvasコンテキスト
        this.isGuideVisible = false;    // ガイド表示状態
        this.guideAnimationId = null;   // アニメーションID
        
        this.createGuideCanvas();
        this.initEventListeners();
    }
    
    createGuideCanvas() {
        // ガイドCanvas作成は無効化（軌跡の長さのみ測定）
        return;
    }
    
    initEventListeners() {
        // タッチイベント（スマートフォン・タブレット用のタッチ操作を検知）
        document.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });  // タッチ開始イベント
        document.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });      // タッチ終了イベント
        document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });    // タッチ移動イベント（軌跡追跡用）
        
        // マウスイベント（PC用のマウスクリック操作を検知）
        document.addEventListener('mousedown', this.onTouchStart.bind(this));   // マウスボタン押下イベント
        document.addEventListener('mouseup', this.onTouchEnd.bind(this));       // マウスボタン離上イベント
        document.addEventListener('mousemove', this.onTouchMove.bind(this));    // マウス移動イベント（軌跡追跡用）
        
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
            
            // 軌跡の初期化
            this.touchPath = [];
            
            // マウスとタッチの両方に対応
            let clientX, clientY;
            if (event.touches && event.touches[0]) {
                // タッチデバイス
                clientX = event.touches[0].clientX;
                clientY = event.touches[0].clientY;
            } else {
                // マウス
                clientX = event.clientX;
                clientY = event.clientY;
            }
            
            this.touchPath.push({
                x: clientX,
                y: clientY,
                timestamp: this.touchStartTime
            });
            
            // 新しい召喚開始時に前の結果表示をクリア
            const resultElement = document.getElementById('result');
            if (resultElement) {
                resultElement.style.display = 'none';
                resultElement.classList.remove('fade-in', 'fade-out');
            }
            
            // タッチ開始のフィードバック
            this.showTouchFeedback();
            
            // ガイド表示は無効化
            // this.showCircleGuide();
            
            // ステータス表示（ぐるぐる描画用メッセージ）
            const statusElement = document.getElementById('status');
            if (statusElement) {
                statusElement.textContent = '画面をぐるぐるかき混ぜています...';
                statusElement.style.display = 'block';
                statusElement.classList.add('fade-in');
            } else {
                console.warn('Status element not found');
            }
            
            console.log('Swirl drawing started at:', this.touchStartTime);
        }
    }
    
    onTouchMove(event) {
        if (!this.isTouching) {
            return;
        }
        
        // マウス移動時は左ボタンが押されている時のみ処理
        if (event.type === 'mousemove' && event.buttons !== 1) {
            return;
        }
        
        event.preventDefault();
        
        // マウスとタッチの両方に対応
        let clientX, clientY;
        if (event.touches && event.touches[0]) {
            // タッチデバイス
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            // マウス
            clientX = event.clientX;
            clientY = event.clientY;
        }
        
        const currentPoint = {
            x: clientX,
            y: clientY,
            timestamp: Date.now()
        };
        
        this.touchPath.push(currentPoint);
        
        // デバッグ用ログ（10ポイントごと）
        if (this.touchPath.length % 10 === 0) {
            console.log('Path points:', this.touchPath.length, 'Current length:', Math.round(this.calculatePathLength()));
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
        
        // ガイド表示は無効化
        // this.hideCircleGuide();
        
        // タッチフィードバック解除（視覚的なタッチ効果を削除）
        this.hideTouchFeedback();
        
        // ステータス非表示（DOM要素の存在チェック追加）
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.style.display = 'none';
        } else {
            console.warn('Status element not found during touch end');
        }
        
        console.log('Touch ended. Duration:', duration, 'ms');
        console.log('Swirl drawing completed - Path length:', this.calculatePathLength());
        console.log('Touch path points collected:', this.touchPath.length);
        
        // デバッグ情報を表示
        this.debugPathInfo();
        
        // 召喚処理を実行（エラーはログのみ出力）
        this.processSummoning(duration);
    }
    
    processSummoning(duration) {
        let modelToShow = '';
        
        // 軌跡の長さを計算
        const pathLength = this.calculatePathLength();
        
        console.log('Path analysis:', {
            pathLength: pathLength,
            duration: duration,
            pointCount: this.touchPath.length
        });
        
        // 描画距離（軌跡の長さ）のみで判定
        if (pathLength >= 300) {
            // 軌跡の長さに応じてモデルを選択
            if (pathLength >= 800 && duration < 8000) {
                // 長い軌跡 + 高速 = 最高品質
                modelToShow = 'model-a';
            } else if (pathLength >= 500) {
                // 中程度の軌跡 = 中品質
                modelToShow = 'model-b';
            } else {
                // 基本的な軌跡 = 基本品質
                modelToShow = 'model-c';
            }
        } else {
            // 召喚失敗 - 軌跡が短すぎる
            const failureReason = `もっと長くぐるぐる描いてください！(現在: ${Math.round(pathLength)}px, 必要: 300px以上)`;
            
            this.showResult(duration, failureReason);
            return;
        }
        
        // ARマネージャーに召喚を指示（エラーはログのみ出力）
        if (window.arManager && typeof window.arManager.showSummonedObject === 'function') {
            try {
                window.arManager.showSummonedObject(modelToShow);
                console.log('Summoned object:', modelToShow, 'Path length:', pathLength);
            } catch (error) {
                console.error('Failed to show summoned object:', error);
                // エラーがあってもUI表示は継続
            }
        } else {
            console.error('ARManager not available or showSummonedObject method missing');
            // エラーがあってもUI表示は継続
        }
        
        // 結果表示（軌跡の長さ情報を含める）
        this.showResult(duration, `軌跡の長さ: ${Math.round(pathLength)}px`);
    }
    
    showResult(duration, additionalInfo = '') {
        const resultElement = document.getElementById('result');    // 結果表示用のDOM要素を取得
        
        // DOM要素の存在チェック（エラーを投げずに警告のみ）
        if (!resultElement) {
            console.warn('Result element not found - skipping result display');
            return; // エラーを投げずに処理を終了
        }
        
        try {
            const isFailure = additionalInfo.includes('もっと');
            resultElement.innerHTML = `
                <h3>${isFailure ? '召喚失敗' : '召喚成功！'}</h3>
                <p>描画時間: ${Math.round(duration / 1000)}秒</p>
                ${additionalInfo ? `<p style="margin-top: 10px; font-style: italic;">${additionalInfo}</p>` : ''}
                <p style="margin-top: 15px; font-size: 14px; opacity: 0.8;">再度ぐるぐる描いて次の召喚を行えます</p>
            `;
            
            resultElement.style.display = 'block';      // 結果テキストを表示状態にする
            resultElement.classList.add('fade-in');     // フェードインアニメーションを適用
            
            // 指示テキストを更新
            const instructionsElement = document.getElementById('instructions');
            if (instructionsElement) {
                instructionsElement.innerHTML = `
                    <h2>AR魔法陣</h2>
                    <p>マーカーを認識しました！</p>
                    <p>画面上をぐるぐるかき混ぜよう！</p>
                `;
                instructionsElement.style.display = 'block';
                instructionsElement.classList.add('pulse');
            }
            
            // 3秒後に結果表示を自動的にフェードアウト
            setTimeout(() => {
                if (resultElement) {
                    resultElement.classList.add('fade-out');
                    setTimeout(() => {
                        resultElement.style.display = 'none';
                        resultElement.classList.remove('fade-in', 'fade-out');
                    }, 500);
                }
            }, 3000);
            
        } catch (error) {
            console.warn('Error updating result display:', error);
            // UI更新エラーでも処理は継続（召喚は成功しているため）
        }
    }
    
    // エラーメッセージ表示用のメソッド（UI表示は無効化、ログのみ）
    showErrorMessage(message) {
        console.error('Error (UI disabled):', message);
        // UI表示は完全に無効化
        // const resultElement = document.getElementById('result');
        // const replayBtn = document.getElementById('replay-btn');
        
        // if (resultElement) {
        //     resultElement.innerHTML = `
        //         <h3>エラー</h3>
        //         <p>${message}</p>
        //     `;
        //     resultElement.style.display = 'block';
        //     resultElement.classList.add('fade-in');
        // }
        
        // if (replayBtn) {
        //     setTimeout(() => {
        //         replayBtn.style.display = 'block';
        //         replayBtn.classList.add('fade-in');
        //     }, 1000);
        // }
    }
    
    showTouchFeedback() {
        // タッチフィードバック（黄色フィルター）を無効化
        // const overlay = document.getElementById('ui-overlay');
        // overlay.classList.add('touching');
    }
    
    hideTouchFeedback() {
        // タッチフィードバック解除も無効化
        // const overlay = document.getElementById('ui-overlay');
        // overlay.classList.remove('touching');
    }
    
    reset() {
        // 状態リセット（タッチ操作に関する全ての変数を初期値に戻す）
        this.isTouching = false;        // タッチ中フラグをfalseに
        this.touchStartTime = 0;        // タッチ開始時間をリセット
        this.touchEndTime = 0;          // タッチ終了時間をリセット
        
        // 軌跡データのリセット
        this.touchPath = [];
        
        // ガイドCanvasのクリーンアップは無効化
        // this.hideCircleGuide();
        
        // UI要素リセット（画面上の表示要素を初期状態に戻す）
        const statusElement = document.getElementById('status');            // ステータス表示要素
        const resultElement = document.getElementById('result');            // 結果表示要素
        const instructionsElement = document.getElementById('instructions'); // 指示テキスト要素
        
        if (statusElement) statusElement.style.display = 'none';      // ステータスを非表示
        if (resultElement) resultElement.style.display = 'none';      // 結果を非表示
        if (instructionsElement) instructionsElement.style.display = 'block'; // 指示テキストを表示
        
        // クラスリセット（CSSアニメーションクラスを削除）
        [statusElement, resultElement, instructionsElement].forEach(el => {
            if (el) el.classList.remove('fade-in', 'fade-out');  // フェードアニメーションクラスを削除
        });
        
        // ARオブジェクトリセット（現在表示されている召喚オブジェクトを非表示）
        if (window.arManager) {
            window.arManager.hideSummonedObject();
        }
        
        console.log('Touch state reset - ready for next swirl drawing');
    }
    
    setMarkerVisible(visible) {
        this.isMarkerVisible = visible;  // マーカー認識状態を更新（ARマネージャーから呼び出される）
        
        const instructionsElement = document.getElementById('instructions');  // 指示テキスト要素を取得
        
        if (!instructionsElement) {
            console.warn('Instructions element not found');
            return;
        }
        
        if (visible) {
            // マーカー認識時の指示テキスト（ぐるぐる描画対応）
            instructionsElement.innerHTML = `
                <h2>AR魔法陣</h2>
                <p>マーカーを認識しました！</p>
                <p>画面上をぐるぐるかき混ぜよう！</p>
            `;
            instructionsElement.classList.add('pulse');  // 点滅アニメーションを追加（注意喚起のため）
        } else {
            // マーカー未認識時の指示テキスト（カメラをマーカーに向けるよう促す）
            instructionsElement.innerHTML = `
                <h2>AR魔法陣</h2>
                <p>マーカーにカメラを向けてください</p>
                <p>画面をぐるぐるかき混ぜて召喚しよう！</p>
            `;
            instructionsElement.classList.remove('pulse');  // 点滅アニメーションを削除
        }
    }
    
    // === 軌跡解析メソッド群 ===
    
    calculatePathLength() {
        if (this.touchPath.length < 2) {
            console.log('Path too short:', this.touchPath.length, 'points');
            return 0;
        }
        
        let totalLength = 0;
        
        console.log('Calculating path length for', this.touchPath.length, 'points');
        console.log('First point:', this.touchPath[0]);
        console.log('Last point:', this.touchPath[this.touchPath.length - 1]);
        
        for (let i = 1; i < this.touchPath.length; i++) {
            const prev = this.touchPath[i - 1];
            const curr = this.touchPath[i];
            
            // 座標の妥当性チェック
            if (prev && curr && 
                typeof prev.x === 'number' && typeof prev.y === 'number' &&
                typeof curr.x === 'number' && typeof curr.y === 'number') {
                
                // 2点間の距離を計算
                const distance = Math.sqrt(
                    Math.pow(curr.x - prev.x, 2) + 
                    Math.pow(curr.y - prev.y, 2)
                );
                
                totalLength += distance;
                
                // 最初の数回だけデバッグ出力
                if (i <= 3) {
                    console.log(`Point ${i}: prev(${prev.x}, ${prev.y}) -> curr(${curr.x}, ${curr.y}) = distance: ${distance}`);
                }
            } else {
                console.warn(`Invalid point data at index ${i}:`, { prev, curr });
            }
        }
        
        console.log('Total calculated length:', totalLength);
        return totalLength;
    }
    
    getBoundingBox() {
        if (this.touchPath.length === 0) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }
        
        const xs = this.touchPath.map(p => p.x);
        const ys = this.touchPath.map(p => p.y);
        
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
    
    getDrawingStats() {
        const pathLength = this.calculatePathLength();
        const boundingBox = this.getBoundingBox();
        const pointCount = this.touchPath.length;
        const duration = this.touchEndTime - this.touchStartTime;
        
        return {
            pathLength: Math.round(pathLength),
            boundingBox: boundingBox,
            pointCount: pointCount,
            duration: duration,
            drawingArea: Math.round(boundingBox.width * boundingBox.height),
            avgSpeed: Math.round(pathLength / (duration / 1000)) // px/秒
        };
    }
    
    // デバッグ用：軌跡の詳細情報を表示
    debugPathInfo() {
        const stats = this.getDrawingStats();
        console.log('=== Path Debug Info ===');
        console.log('Points collected:', stats.pointCount);
        console.log('Path length:', stats.pathLength, 'px');
        console.log('Drawing area:', stats.drawingArea, 'px²');
        console.log('Bounding box:', stats.boundingBox);
        console.log('Average speed:', stats.avgSpeed, 'px/sec');
        console.log('Touch path sample:', this.touchPath.slice(0, 3));
        console.log('======================');
        return stats;
    }
    
    // === Canvasガイド描画メソッド群 ===
    // ガイド機能は無効化（軌跡の長さのみ測定）
    
    showCircleGuide() {
        // ガイド表示は無効化
        return;
    }
    
    hideCircleGuide() {
        // ガイド非表示は無効化
        return;
    }
    
    drawGuide() {
        // ガイド描画は無効化
        return;
    }
    
    drawClockwiseArrows(centerX, centerY, radius) {
        // 矢印描画は無効化
        return;
    }
    
    drawUserPath() {
        // 軌跡描画は無効化
        return;
    }
    
    drawInstructions(centerX, centerY) {
        // 指示描画は無効化
        return;
    }
    
    updateGuideDisplay() {
        // ガイド更新は無効化
        return;
    }
    
    startGuideAnimation() {
        // アニメーション開始は無効化
        return;
    }
    
    stopGuideAnimation() {
        // アニメーション停止は無効化
        return;
    }
}

// グローバルに公開
window.TouchHandler = TouchHandler;
