// touch-handler.js - タッチ操作の処理

class TouchHandler {
    constructor() {
        this.touchStartTime = 0;        // タッチ開始時刻（ミリ秒単位のタイムスタンプ）
        this.touchEndTime = 0;          // タッチ終了時刻（ミリ秒単位のタイムスタンプ）
        this.isTouching = false;        // 現在タッチ中かどうかのフラグ（二重操作防止のため）
        this.isMarkerVisible = false;   // マーカーが認識されているかのフラグ（ARマネージャーから設定される）
        
        // 5回転円描画追跡用プロパティ
        this.touchPath = [];            // タッチ軌跡の座標配列 [{x, y, timestamp}, ...]
        this.circleCenter = null;       // 円の中心座標 {x, y}
        this.circleRadius = 0;          // 円の半径（ピクセル）
        this.rotationCount = 0;         // 完了した回転数
        this.currentAngle = 0;          // 現在の角度（ラジアン）
        this.lastAngle = null;          // 前回の角度（回転方向判定用）
        this.isClockwise = true;        // 時計回りかどうか
        this.angleCrossings = 0;        // 角度の境界越え回数（回転カウント用）
        this.isCircleStarted = false;   // 円描画が開始されたか
        this.circleQuality = 0;         // 円の品質（0-1、形の正確性）
        
        // 視覚ガイド用プロパティ
        this.guideCanvas = null;        // ガイド描画用のCanvas要素
        this.guideContext = null;       // Canvasの2Dコンテキスト
        this.animationFrame = null;     // アニメーションフレームID
        this.arrowRotation = 0;         // 矢印の回転角度
        
        this.initEventListeners();
        this.createGuideCanvas();       // ガイド用Canvasを作成
    }
    
    createGuideCanvas() {
        // ガイド用のCanvasを動的に作成
        this.guideCanvas = document.createElement('canvas');
        this.guideCanvas.id = 'circle-guide-canvas';
        this.guideCanvas.style.position = 'fixed';
        this.guideCanvas.style.top = '0';
        this.guideCanvas.style.left = '0';
        this.guideCanvas.style.width = '100vw';
        this.guideCanvas.style.height = '100vh';
        this.guideCanvas.style.pointerEvents = 'none'; // タッチイベントを通す
        this.guideCanvas.style.zIndex = '1000'; // UI要素より手前に表示
        this.guideCanvas.style.display = 'none'; // 初期は非表示
        
        // Canvasのサイズを画面サイズに合わせる
        this.guideCanvas.width = window.innerWidth;
        this.guideCanvas.height = window.innerHeight;
        
        // 2Dコンテキストを取得
        this.guideContext = this.guideCanvas.getContext('2d');
        
        // DOMに追加
        document.body.appendChild(this.guideCanvas);
        
        // 画面リサイズ時のハンドリング
        window.addEventListener('resize', () => {
            this.guideCanvas.width = window.innerWidth;
            this.guideCanvas.height = window.innerHeight;
        });
        
        console.log('Circle guide canvas created');
    }
    
    initEventListeners() {
        // タッチイベント（スマートフォン・タブレット用のタッチ操作を検知）
        document.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });  // タッチ開始イベント
        document.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });      // タッチ終了イベント
        document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });    // タッチ移動イベント（円描画追跡用）
        
        // マウスイベント（PC用のマウスクリック操作を検知）
        document.addEventListener('mousedown', this.onTouchStart.bind(this));   // マウスボタン押下イベント
        document.addEventListener('mouseup', this.onTouchEnd.bind(this));       // マウスボタン離上イベント
        document.addEventListener('mousemove', this.onTouchMove.bind(this));    // マウス移動イベント（円描画追跡用）
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
            
            // 新しい召喚開始時に前の結果表示をクリア
            const resultElement = document.getElementById('result');
            if (resultElement) {
                resultElement.style.display = 'none';
                resultElement.classList.remove('fade-in', 'fade-out');
            }
            
            // 円描画追跡の初期化
            this.touchPath = [];
            this.circleCenter = null;
            this.circleRadius = 0;
            this.rotationCount = 0;
            this.currentAngle = 0;
            this.lastAngle = null;
            this.isClockwise = true;
            this.angleCrossings = 0;
            this.isCircleStarted = false;
            this.circleQuality = 0;
            this.arrowRotation = 0;
            
            // 開始点を記録
            const touch = event.touches ? event.touches[0] : event;
            this.touchPath.push({
                x: touch.clientX,
                y: touch.clientY,
                timestamp: Date.now()
            });
            
            // 画面中央に初期ガイドを表示
            this.circleCenter = {
                x: window.innerWidth / 2,
                y: window.innerHeight / 2
            };
            this.circleRadius = Math.min(window.innerWidth, window.innerHeight) * 0.25; // 画面の25%サイズ
            
            // ガイド表示を開始
            this.showCircleGuide();
            this.startGuideAnimation();
            
            // タッチ開始のフィードバック
            this.showTouchFeedback();
            
            // ステータス表示（円描画用メッセージ）
            const statusElement = document.getElementById('status');
            if (statusElement) {
                statusElement.textContent = '魔法円を5回転時計回りに描いてください...';
                statusElement.style.display = 'block';
                statusElement.classList.add('fade-in');
            } else {
                console.warn('Status element not found');
            }
            
            console.log('Circle drawing started at:', this.touchStartTime);
        }
    }
    
    onTouchMove(event) {
        if (!this.isTouching) return;
        
        event.preventDefault();
        
        // 軌跡ポイントを追加
        const touch = event.touches ? event.touches[0] : event;
        const currentPoint = {
            x: touch.clientX,
            y: touch.clientY,
            timestamp: Date.now()
        };
        
        this.touchPath.push(currentPoint);
        
        // 十分なポイントが集まったら円の解析を開始
        if (this.touchPath.length > 10) {
            this.analyzeCircularMotion();
            this.updateGuideDisplay(); // ガイド表示を更新
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
        
        // ガイド表示を終了
        this.hideCircleGuide();
        this.stopGuideAnimation();
        
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
        console.log('Rotations completed:', this.rotationCount, 'Quality:', this.circleQuality);
        
        // 召喚処理を実行（エラーはログのみ出力）
        this.processSummoning(duration);
    }
    
    processSummoning(duration) {
        let modelToShow = '';
        let summonType = '';
        
        // 5回転完了チェック
        if (this.rotationCount >= 5 && this.isClockwise && this.isCircleStarted) {
            // 円の品質と描画速度でオブジェクトを決定（ランク表示なし）
            if (this.circleQuality > 0.8 && duration < 15000) {
                // 高品質な円 + 適度な速度
                modelToShow = 'model-a';
                summonType = '精霊召喚';
            } else if (this.circleQuality > 0.6 || duration < 10000) {
                // 中品質な円 または 高速描画
                modelToShow = 'model-b';
                summonType = '魔法生物召喚';
            } else {
                // 基本的な円
                modelToShow = 'model-c';
                summonType = '召喚獣召喚';
            }
        } else {
            // 召喚失敗
            this.showResult('召喚失敗', duration, '魔法円が不完全です。時計回りで5回転してください。');
            return;
        }
        
        // ARマネージャーに召喚を指示（エラーはログのみ出力）
        if (window.arManager && typeof window.arManager.showSummonedObject === 'function') {
            try {
                window.arManager.showSummonedObject(modelToShow);
                console.log('Summoned object:', modelToShow);
            } catch (error) {
                console.error('Failed to show summoned object:', error);
                // エラーがあってもUI表示は継続
            }
        } else {
            console.error('ARManager not available or showSummonedObject method missing');
            // エラーがあってもUI表示は継続
        }
        
        // 結果表示（ユーザーに召喚成功を通知）
        this.showResult(summonType, duration);
    }
    
    showResult(summonType, duration, additionalInfo = '') {
        const resultElement = document.getElementById('result');    // 結果表示用のDOM要素を取得
        
        // DOM要素の存在チェック（エラーを投げずに警告のみ）
        if (!resultElement) {
            console.warn('Result element not found - skipping result display');
            return; // エラーを投げずに処理を終了
        }
        
        try {
            resultElement.innerHTML = `
                <h3>${summonType.includes('失敗') ? '召喚失敗' : '召喚成功！'}</h3>
                <p><strong>${summonType}</strong></p>
                <p>描画時間: ${Math.round(duration / 1000)}秒</p>
                ${additionalInfo ? `<p style="margin-top: 10px; font-style: italic;">${additionalInfo}</p>` : ''}
                <p style="margin-top: 15px; font-size: 14px; opacity: 0.8;">再度円を描いて次の召喚を行えます</p>
            `;
            
            resultElement.style.display = 'block';      // 結果テキストを表示状態にする
            resultElement.classList.add('fade-in');     // フェードインアニメーションを適用
            
            // 指示テキストを更新
            const instructionsElement = document.getElementById('instructions');
            if (instructionsElement) {
                instructionsElement.innerHTML = `
                    <h2>AR召喚</h2>
                    <p>マーカーを認識しました！</p>
                    <p>画面で円を5回転時計回りに描いてください</p>
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
    }
    
    setMarkerVisible(visible) {
        this.isMarkerVisible = visible;  // マーカー認識状態を更新（ARマネージャーから呼び出される）
        
        const instructionsElement = document.getElementById('instructions');  // 指示テキスト要素を取得
        
        if (!instructionsElement) {
            console.warn('Instructions element not found');
            return;
        }
        
        if (visible) {
            // マーカー認識時の指示テキスト（円描画対応）
            instructionsElement.innerHTML = `
                <h2>AR召喚</h2>
                <p>マーカーを認識しました！</p>
                <p>画面で円を5回転時計回りに描いてください</p>
            `;
            instructionsElement.classList.add('pulse');  // 点滅アニメーションを追加（注意喚起のため）
        } else {
            // マーカー未認識時の指示テキスト（カメラをマーカーに向けるよう促す）
            instructionsElement.innerHTML = `
                <h2>AR召喚</h2>
                <p>マーカーにカメラを向けてください</p>
                <p>画面で円を描いて召喚しよう！</p>
            `;
            instructionsElement.classList.remove('pulse');  // 点滅アニメーションを削除
        }
    }
    
    resetTouchState() {
        // タッチ状態のリセット
        this.isTouching = false;
        this.touchStartTime = null;
        this.touchEndTime = null;
        
        // 円描画状態のリセット
        this.touchPath = [];
        this.circleCenter = null;
        this.rotationCount = 0;
        this.circleQuality = 0;
        this.drawingCompleted = false;
        
        // ガイドCanvasのクリーンアップ
        this.hideCircleGuide();
        
        console.log('Touch state reset - ready for next circle drawing');
    }
    
    // === 円描画解析メソッド群 ===
    
    analyzeCircularMotion() {
        if (this.touchPath.length < 3) return;
        
        try {
            // 円の中心を推定
            this.estimateCircleCenter();
            
            // 回転数をカウント
            this.countRotations();
            
            // 円の品質を評価
            this.circleQuality = this.calculateCircleQuality();
            
        } catch (error) {
            console.warn('Error in circular motion analysis:', error);
        }
    }
    
    estimateCircleCenter() {
        if (this.touchPath.length < 10) return;
        
        // 最初の数点と最新の数点から中心を推定
        const recentPoints = this.touchPath.slice(-10);
        
        let sumX = 0, sumY = 0;
        recentPoints.forEach(point => {
            sumX += point.x;
            sumY += point.y;
        });
        
        this.circleCenter = {
            x: sumX / recentPoints.length,
            y: sumY / recentPoints.length
        };
    }
    
    countRotations() {
        if (!this.circleCenter || this.touchPath.length < 10) return;
        
        let totalAngleChange = 0;
        let lastAngle = null;
        
        // 最新の20ポイントで角度変化を計算
        const recentPoints = this.touchPath.slice(-20);
        
        recentPoints.forEach(point => {
            const angle = Math.atan2(
                point.y - this.circleCenter.y,
                point.x - this.circleCenter.x
            );
            
            if (lastAngle !== null) {
                let angleDiff = angle - lastAngle;
                
                // 角度の正規化（-π ~ π）
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                
                // 時計回りの回転のみカウント
                if (angleDiff > 0) {
                    totalAngleChange += angleDiff;
                }
            }
            
            lastAngle = angle;
        });
        
        // 2π（一回転）で割って回転数を計算
        this.rotationCount = Math.floor(totalAngleChange / (2 * Math.PI));
    }
    
    calculateCircleQuality() {
        if (!this.circleCenter || this.touchPath.length < 20) return 0;
        
        // 各点から中心までの距離の一貫性を評価
        const distances = this.touchPath.map(point => {
            return Math.sqrt(
                Math.pow(point.x - this.circleCenter.x, 2) +
                Math.pow(point.y - this.circleCenter.y, 2)
            );
        });
        
        const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        
        // 距離の標準偏差を計算
        const variance = distances.reduce((sum, dist) => {
            return sum + Math.pow(dist - avgDistance, 2);
        }, 0) / distances.length;
        
        const stdDev = Math.sqrt(variance);
        
        // 品質スコア（標準偏差が小さいほど高品質）
        const maxStdDev = 50; // 許容する最大標準偏差
        const quality = Math.max(0, Math.min(1, 1 - (stdDev / maxStdDev)));
        
        return Math.round(quality * 100); // 0-100のスコア
    }
    
    // === Canvasガイド描画メソッド群 ===
    
    showCircleGuide() {
        if (!this.guideCanvas) return;
        
        this.guideCanvas.style.display = 'block';
        this.guideCanvas.style.opacity = '0.7';
        this.isGuideVisible = true;
        
        this.drawGuide();
        this.startGuideAnimation();
    }
    
    hideCircleGuide() {
        if (!this.guideCanvas) return;
        
        this.guideCanvas.style.display = 'none';
        this.isGuideVisible = false;
        this.stopGuideAnimation();
    }
    
    drawGuide() {
        if (!this.guideCanvas || !this.guideCtx) return;
        
        // Canvas をクリア
        this.guideCtx.clearRect(0, 0, this.guideCanvas.width, this.guideCanvas.height);
        
        // 画面中央に円のガイドを描画
        const centerX = this.guideCanvas.width / 2;
        const centerY = this.guideCanvas.height / 2;
        const radius = 80;
        
        // 半透明の円を描画
        this.guideCtx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        this.guideCtx.lineWidth = 3;
        this.guideCtx.setLineDash([10, 5]);
        this.guideCtx.beginPath();
        this.guideCtx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.guideCtx.stroke();
        
        // 時計回りの矢印を描画
        this.drawClockwiseArrows(centerX, centerY, radius);
        
        // ユーザーが描いた軌跡を描画
        this.drawUserPath();
        
        // 指示テキストを描画
        this.drawInstructions(centerX, centerY);
    }
    
    drawClockwiseArrows(centerX, centerY, radius) {
        const arrowPositions = [0, Math.PI/2, Math.PI, 3*Math.PI/2]; // 4つの矢印位置
        
        this.guideCtx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
        this.guideCtx.fillStyle = 'rgba(0, 255, 255, 0.8)';
        this.guideCtx.lineWidth = 2;
        this.guideCtx.setLineDash([]);
        
        arrowPositions.forEach(angle => {
            const x = centerX + Math.cos(angle) * (radius + 20);
            const y = centerY + Math.sin(angle) * (radius + 20);
            
            // 矢印の向き（時計回り）
            const arrowAngle = angle + Math.PI/2;
            
            this.guideCtx.save();
            this.guideCtx.translate(x, y);
            this.guideCtx.rotate(arrowAngle);
            
            // 矢印を描画
            this.guideCtx.beginPath();
            this.guideCtx.moveTo(-8, -4);
            this.guideCtx.lineTo(0, 0);
            this.guideCtx.lineTo(-8, 4);
            this.guideCtx.lineTo(-6, 0);
            this.guideCtx.closePath();
            this.guideCtx.fill();
            
            this.guideCtx.restore();
        });
    }
    
    drawUserPath() {
        if (this.touchPath.length < 2) return;
        
        this.guideCtx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
        this.guideCtx.lineWidth = 4;
        this.guideCtx.setLineDash([]);
        
        this.guideCtx.beginPath();
        this.guideCtx.moveTo(this.touchPath[0].x, this.touchPath[0].y);
        
        for (let i = 1; i < this.touchPath.length; i++) {
            this.guideCtx.lineTo(this.touchPath[i].x, this.touchPath[i].y);
        }
        
        this.guideCtx.stroke();
    }
    
    drawInstructions(centerX, centerY) {
        this.guideCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.guideCtx.font = '16px Arial';
        this.guideCtx.textAlign = 'center';
        
        const instruction = '5回転時計回りに描いてください';
        this.guideCtx.fillText(instruction, centerX, centerY - 120);
        
        // 進捗情報（回転数は表示しない）
        if (this.circleQuality > 0) {
            this.guideCtx.font = '14px Arial';
            this.guideCtx.fillText(`品質: ${this.circleQuality}%`, centerX, centerY + 140);
        }
    }
    
    updateGuideDisplay() {
        if (this.isGuideVisible) {
            this.drawGuide();
        }
    }
    
    startGuideAnimation() {
        if (this.guideAnimationId) return;
        
        let animationFrame = 0;
        const animate = () => {
            if (!this.isGuideVisible) return;
            
            animationFrame++;
            
            // アニメーション効果（矢印の点滅など）
            if (animationFrame % 30 === 0) {
                this.drawGuide();
            }
            
            this.guideAnimationId = requestAnimationFrame(animate);
        };
        
        this.guideAnimationId = requestAnimationFrame(animate);
    }
    
    stopGuideAnimation() {
        if (this.guideAnimationId) {
            cancelAnimationFrame(this.guideAnimationId);
            this.guideAnimationId = null;
        }
    }
}

// グローバルに公開
window.TouchHandler = TouchHandler;
