// touch-handler.js - タッチ操作の処理

class TouchHandler {
    constructor() {
        this.touchStartTime = 0;        // タッチ開始時刻（ミリ秒単位のタイムスタンプ）
        this.touchEndTime = 0;          // タッチ終了時刻（ミリ秒単位のタイムスタンプ）
        this.isTouching = false;        // 現在タッチ中かどうかのフラグ（二重操作防止のため）
        this.isMarkerVisible = false;   // マーカーが認識されているかのフラグ（ARマネージャーから設定される）
        
        // 軌跡追跡用プロパティ
        this.touchPath = [];            // タッチ軌跡のポイント配列
        
        // 円認識用プロパティ
        this.circles = [];              // 認識された円の配列
        this.currentCirclePoints = [];  // 現在描画中の円のポイント
        this.circleStartPoint = null;   // 円の開始点
        this.completedRevolutions = 0;  // 完了した回転数
        this.pathCenter = null;         // 軌跡の中心点
        
        // 時間計測用プロパティ
        this.drawingStartTime = null;   // 描画開始時間
        this.drawingEndTime = null;     // 描画終了時間
        this.drawingDuration = 0;       // 描画時間（ミリ秒）
        
        this.initEventListeners();
        this.initParticleSystem();
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
    
    initParticleSystem() {
        // パーティクル用キャンバスを作成
        this.particleCanvas = document.createElement('canvas');
        this.particleCanvas.id = 'particle-canvas';
        document.body.appendChild(this.particleCanvas);
        
        // パーティクルシステムを初期化
        this.particleSystem = new ParticleSystem(this.particleCanvas);
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
            
            // 描画開始時間を記録
            this.drawingStartTime = Date.now();
            
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
            
            // タッチ開始のフィードバック（無効化のため削除）
            
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
        
        // 座標の妥当性チェック
        if (isNaN(clientX) || isNaN(clientY)) {
            console.warn('Invalid coordinates:', { clientX, clientY });
            return;
        }
        
        const currentPoint = {
            x: clientX,
            y: clientY,
            timestamp: Date.now()
        };
        
        this.touchPath.push(currentPoint);
        
        // パーティクル生成（マーカーが表示されている時のみ）
        if (this.isMarkerVisible && this.particleSystem) {
            const currentQuality = this.getCurrentQuality();
            const currentRevolutions = this.calculateRevolutions();
            this.particleSystem.addParticle(clientX, clientY, currentQuality, currentRevolutions);
        }
        
        // リアルタイムで回転数を表示（十分なポイントが蓄積されてから）
        if (this.touchPath.length > 20) {
            try {
                const currentRevolutions = this.calculateRevolutions();
                const statusElement = document.getElementById('status');
                if (statusElement && !isNaN(currentRevolutions) && currentRevolutions > 0) {
                    statusElement.textContent = `回転数: ${currentRevolutions.toFixed(1)}/5.0`;
                }
            } catch (error) {
                console.error('Error calculating revolutions in onTouchMove:', error);
            }
        }
        
        // デバッグ用ログ（10ポイントごと）
        if (this.touchPath.length % 10 === 0) {
            try {
                const revolutions = this.calculateRevolutions();
                console.log('Path points:', this.touchPath.length, 'Current revolutions:', revolutions.toFixed(1));
            } catch (error) {
                console.error('Error in debug log:', error);
            }
        }
    }
    
    onTouchEnd(event) {
        if (!this.isTouching) {
            return;
        }
        
        event.preventDefault();
        
        this.isTouching = false;                                    // タッチ状態フラグをfalseに設定
        this.touchEndTime = Date.now();                            // タッチ終了時刻を記録（現在時刻をミリ秒で取得）
        
        // 描画終了時間を記録
        this.drawingEndTime = Date.now();
        this.drawingDuration = this.drawingEndTime - this.drawingStartTime;
        
        const duration = this.touchEndTime - this.touchStartTime;  // タッチ継続時間を計算（終了時刻 - 開始時刻）
        
        // タッチフィードバック解除（無効化のため削除）
        
        // ステータス非表示（DOM要素の存在チェック追加）
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.style.display = 'none';
        } else {
            console.warn('Status element not found during touch end');
        }
        
        // タッチ終了時にパーティクル生成を停止し、既存のパーティクルを徐々にフェードアウト
        if (this.particleSystem) {
            setTimeout(() => {
                this.particleSystem.clear();
            }, 2000); // 2秒後にクリア
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
        
        // スコア計算
        const scoreResult = this.calculateTotalScore();
        
        console.log('Score-based summoning analysis:', scoreResult);
        
        if (scoreResult.totalScore === 0) {
            // 基本条件未達成
            const revolutions = this.calculateRevolutions();
            if (revolutions < 5) {
                const failureReason = `5回転必要です！(現在: ${revolutions.toFixed(1)}回転)`;
                this.showResult(duration, failureReason);
            } else {
                const failureReason = `もっと綺麗な円を描いてください！`;
                this.showResult(duration, failureReason);
            }
            return;
        }
        
        // スコアによるオブジェクト分岐
        const score = scoreResult.totalScore;
        
        if (score >= 220) {
            modelToShow = 'softcream-model';
        } else if (score >= 160) {
            modelToShow = 'gozen-model';
        } else if (score >= 120) {
            modelToShow = 'okonomiyaki-model';
        } else if (score >= 90) {
            modelToShow = 'okonomiyaki-model';
        } else if (score >= 60) {
            modelToShow = 'oyakodon-model';
        } else {
            modelToShow = 'ayu-model';
        }
        
        // 特別なコンボボーナス表示
        let specialTitle = '';
        if (scoreResult.breakdown.bonus >= 50) {
            specialTitle = '【パーフェクトマスター】';
        } else if (scoreResult.breakdown.bonus >= 40) {
            specialTitle = '【スピードマスター】';
        } else if (scoreResult.breakdown.bonus >= 25) {
            specialTitle = '【職人の技】';
        }
        
        // ARマネージャーに召喚を指示（エラーはログのみ出力）
        if (window.arManager && typeof window.arManager.showSummonedObject === 'function') {
            try {
                window.arManager.showSummonedObject(modelToShow);
                console.log('Summoned:', modelToShow, 'Score:', score);
            } catch (error) {
                console.error('Failed to show summoned object:', error);
                // エラーがあってもUI表示は継続
            }
        } else {
            console.error('ARManager not available or showSummonedObject method missing');
            // エラーがあってもUI表示は継続
        }
        
        // 詳細な結果表示
        const breakdown = scoreResult.breakdown;
        const resultInfo = `${specialTitle} (${score}点)
時間: ${breakdown.details.drawingTime.toFixed(1)}秒 (${breakdown.time}pt)
精度: ${breakdown.details.avgQuality}% (${breakdown.quality}pt)
回転: ${breakdown.details.revolutions.toFixed(1)}回 (${breakdown.revolution}pt)${breakdown.bonus > 0 ? `
ボーナス: +${breakdown.bonus}pt` : ''}`.trim();
        
        this.showResult(duration, resultInfo);
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
    
    // 現在の品質を簡易計算（リアルタイム用）
    getCurrentQuality() {
        if (this.touchPath.length < 5) return 50;
        
        // 最後の10点で簡易品質計算
        const recentPoints = this.touchPath.slice(-10);
        if (recentPoints.length < 3) return 50;
        
        try {
            // 簡易的な中心計算
            const sumX = recentPoints.reduce((sum, p) => sum + p.x, 0);
            const sumY = recentPoints.reduce((sum, p) => sum + p.y, 0);
            const centerX = sumX / recentPoints.length;
            const centerY = sumY / recentPoints.length;
            
            // 中心からの距離の標準偏差を計算（簡易版）
            const distances = recentPoints.map(p => 
                Math.sqrt((p.x - centerX) * (p.x - centerX) + (p.y - centerY) * (p.y - centerY))
            );
            const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
            const variance = distances.reduce((sum, d) => sum + (d - avgDistance) * (d - avgDistance), 0) / distances.length;
            const stdDev = Math.sqrt(variance);
            
            // 品質スコア計算（0-100）
            const maxDeviation = avgDistance * 0.3;
            let quality = maxDeviation > 0 ? Math.max(0, 100 - (stdDev / maxDeviation) * 100) : 50;
            
            // 回転数に応じてボーナス
            const revolutions = this.calculateRevolutions();
            if (revolutions > 3) {
                quality = Math.min(100, quality + 10);
            }
            
            return Math.max(20, Math.min(95, quality));
        } catch (error) {
            return 50; // エラー時はデフォルト値
        }
    }
    
    reset() {
        // 状態リセット（タッチ操作に関する全ての変数を初期値に戻す）
        this.isTouching = false;        // タッチ中フラグをfalseに
        this.touchStartTime = 0;        // タッチ開始時間をリセット
        this.touchEndTime = 0;          // タッチ終了時間をリセット
        
        // 軌跡データのリセット
        this.touchPath = [];
        
        // 円認識データのリセット
        this.circles = [];
        this.currentCirclePoints = [];
        this.circleStartPoint = null;
        this.completedRevolutions = 0;
        this.pathCenter = null;
        
        // 時間計測リセット
        this.drawingStartTime = null;
        this.drawingEndTime = null;
        this.drawingDuration = 0;
        
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
        
        // パーティクルシステムをクリア
        if (this.particleSystem) {
            this.particleSystem.clear();
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
                <p style="font-size: 14px; opacity: 0.8;">円を5回転以上描くと召喚成功！</p>
            `;
            instructionsElement.classList.add('pulse');  // 点滅アニメーションを追加（注意喚起のため）
        } else {
            // マーカー未認識時の指示テキスト（カメラをマーカーに向けるよう促す）
            instructionsElement.innerHTML = `
                <h2>AR魔法陣</h2>
                <p>マーカーにカメラを向けてください</p>
                <p>画面をぐるぐるかき混ぜて召喚しよう！</p>
                <p style="font-size: 14px; opacity: 0.8;">円を5回転以上描くと召喚成功！</p>
            `;
            instructionsElement.classList.remove('pulse');  // 点滅アニメーションを削除
        }
    }
    
    // === 円認識メソッド群 ===
    
    // 統合された中心計算メソッド
    calculateCenter(points = null, removeOutliers = false) {
        // デフォルトは全軌跡を使用
        let targetPoints = points || this.touchPath;
        
        // 有効な点のみをフィルタ
        targetPoints = targetPoints.filter(point => 
            point && 
            typeof point.x === 'number' && 
            typeof point.y === 'number' && 
            !isNaN(point.x) && 
            !isNaN(point.y) &&
            isFinite(point.x) && 
            isFinite(point.y)
        );
        
        if (targetPoints.length === 0) {
            console.warn('No valid points for center calculation');
            return { x: 0, y: 0 };
        }
        
        // 基本的な重心計算
        const sumX = targetPoints.reduce((sum, point) => sum + point.x, 0);
        const sumY = targetPoints.reduce((sum, point) => sum + point.y, 0);
        
        // NaN チェック
        if (isNaN(sumX) || isNaN(sumY)) {
            console.error('NaN in sum calculation:', { sumX, sumY });
            return { x: 0, y: 0 };
        }
        
        const simpleCenter = {
            x: sumX / targetPoints.length,
            y: sumY / targetPoints.length
        };
        
        // 結果の妥当性チェック
        if (isNaN(simpleCenter.x) || isNaN(simpleCenter.y)) {
            console.error('NaN in simple center:', simpleCenter);
            return { x: 0, y: 0 };
        }
        
        // 外れ値除去が不要な場合は基本の重心を返す
        if (!removeOutliers || targetPoints.length < 3) {
            return simpleCenter;
        }
        
        try {
            // 外れ値除去処理
            const distances = targetPoints.map(point => {
                const distanceSquared = Math.pow(point.x - simpleCenter.x, 2) + Math.pow(point.y - simpleCenter.y, 2);
                if (distanceSquared < 0) return 0; // 念のため
                return Math.sqrt(distanceSquared);
            });
            
            // 距離配列の妥当性チェック
            const validDistances = distances.filter(d => !isNaN(d) && isFinite(d));
            if (validDistances.length === 0) {
                console.warn('No valid distances, returning simple center');
                return simpleCenter;
            }
            
            const avgDistance = validDistances.reduce((sum, d) => sum + d, 0) / validDistances.length;
            
            if (isNaN(avgDistance) || avgDistance === 0) {
                return simpleCenter;
            }
            
            const variance = validDistances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / validDistances.length;
            const stdDev = Math.sqrt(variance);
            
            if (isNaN(stdDev)) {
                return simpleCenter;
            }
            
            // 平均±2標準偏差の範囲内の点のみ使用
            const filteredPoints = targetPoints.filter((point, index) => {
                const distance = distances[index];
                return !isNaN(distance) && Math.abs(distance - avgDistance) <= 2 * stdDev;
            });
            
            if (filteredPoints.length < 3) return simpleCenter;
            
            const filteredSumX = filteredPoints.reduce((sum, point) => sum + point.x, 0);
            const filteredSumY = filteredPoints.reduce((sum, point) => sum + point.y, 0);
            
            const result = {
                x: filteredSumX / filteredPoints.length,
                y: filteredSumY / filteredPoints.length
            };
            
            // 最終結果の妥当性チェック
            if (isNaN(result.x) || isNaN(result.y)) {
                console.warn('NaN in filtered center, returning simple center');
                return simpleCenter;
            }
            
            return result;
            
        } catch (error) {
            console.error('Error in outlier removal:', error);
            return simpleCenter;
        }
    }
    
    calculateRevolutions() {
        if (this.touchPath.length < 10) return 0;
        
        console.log('Starting revolution calculation with', this.touchPath.length, 'points');
        
        // 座標値の妥当性をチェック
        const validPoints = this.touchPath.filter(point => 
            point && 
            typeof point.x === 'number' && 
            typeof point.y === 'number' && 
            !isNaN(point.x) && 
            !isNaN(point.y) &&
            isFinite(point.x) && 
            isFinite(point.y)
        );
        
        if (validPoints.length < 10) {
            console.warn('Not enough valid points:', validPoints.length);
            return 0;
        }
        
        console.log('Valid points after filtering:', validPoints.length);
        
        // 動的中心点計算（より正確な中心を求める）
        const center = this.calculateCenter(validPoints, true);
        
        // 中心点の妥当性チェック
        if (!center || isNaN(center.x) || isNaN(center.y)) {
            console.error('Invalid center point:', center);
            return 0;
        }
        
        console.log('Center point:', center);
        
        let totalAngleChange = 0;
        let validSegments = 0;
        
        for (let i = 1; i < validPoints.length; i++) {
            const prev = validPoints[i-1];
            const curr = validPoints[i];
            
            // 点の妥当性を再チェック
            if (!prev || !curr) continue;
            
            // 中心からの距離をチェック（ノイズ除去）
            const prevDistanceSquared = Math.pow(prev.x - center.x, 2) + Math.pow(prev.y - center.y, 2);
            const currDistanceSquared = Math.pow(curr.x - center.x, 2) + Math.pow(curr.y - center.y, 2);
            
            // 負の値チェック（念のため）
            if (prevDistanceSquared < 0 || currDistanceSquared < 0) {
                console.warn('Negative distance squared at index', i);
                continue;
            }
            
            const prevDistance = Math.sqrt(prevDistanceSquared);
            const currDistance = Math.sqrt(currDistanceSquared);
            
            // 距離の妥当性チェック
            if (isNaN(prevDistance) || isNaN(currDistance)) {
                console.warn('NaN distance at index', i, { prev, curr, center });
                continue;
            }
            
            // 中心から極端に近い点は無視（ノイズの可能性）
            if (prevDistance < 20 || currDistance < 20) continue;
            
            // 角度を計算
            const deltaX_prev = prev.x - center.x;
            const deltaY_prev = prev.y - center.y;
            const deltaX_curr = curr.x - center.x;
            const deltaY_curr = curr.y - center.y;
            
            const prevAngle = Math.atan2(deltaY_prev, deltaX_prev);
            const currAngle = Math.atan2(deltaY_curr, deltaX_curr);
            
            // 角度の妥当性チェック
            if (isNaN(prevAngle) || isNaN(currAngle)) {
                console.warn('NaN angle at index', i, { 
                    prev, curr, center,
                    deltaX_prev, deltaY_prev,
                    deltaX_curr, deltaY_curr
                });
                continue;
            }
            
            // 角度差を計算（改善された正規化）
            let angleDiff = this.normalizeAngleDifference(currAngle - prevAngle);
            
            // 角度差の妥当性チェック
            if (isNaN(angleDiff)) {
                console.warn('NaN angle difference at index', i);
                continue;
            }
            
            // 極端な角度変化は無視（急激な方向転換をフィルタ）
            if (Math.abs(angleDiff) > Math.PI / 2) continue;
            
            totalAngleChange += angleDiff;
            validSegments++;
            
            // 最初の5セグメントをデバッグ出力
            if (validSegments <= 5) {
                console.log(`Segment ${validSegments}:`, {
                    prev: { x: prev.x, y: prev.y },
                    curr: { x: curr.x, y: curr.y },
                    center: center,
                    prevAngle: (prevAngle * 180 / Math.PI).toFixed(2) + '°',
                    currAngle: (currAngle * 180 / Math.PI).toFixed(2) + '°',
                    angleDiff: (angleDiff * 180 / Math.PI).toFixed(2) + '°',
                    totalAngle: (totalAngleChange * 180 / Math.PI).toFixed(2) + '°'
                });
            }
        }
        
        // 最終チェック
        if (isNaN(totalAngleChange) || validSegments === 0) {
            console.error('Invalid calculation result:', { totalAngleChange, validSegments });
            return 0;
        }
        
        const revolutions = Math.abs(totalAngleChange) / (2 * Math.PI);
        
        console.log('Revolution calculation result:', {
            totalAngleChange: totalAngleChange,
            totalAngleDegrees: (totalAngleChange * 180 / Math.PI).toFixed(2) + '°',
            validSegments: validSegments,
            center: center,
            revolutions: revolutions
        });
        
        // 有効セグメントが少なすぎる場合は0を返す
        if (validSegments < 5) {
            console.warn('Too few valid segments:', validSegments);
            return 0;
        }
        
        return revolutions;
    }
    
    // 角度差の正規化（改善版）
    normalizeAngleDifference(angleDiff) {
        // -π〜πの範囲に正規化
        while (angleDiff > Math.PI) {
            angleDiff -= 2 * Math.PI;
        }
        while (angleDiff < -Math.PI) {
            angleDiff += 2 * Math.PI;
        }
        return angleDiff;
    }
    
    // 統合された円分析メソッド
    analyzeCircles() {
        const revolutions = this.calculateRevolutions();
        if (revolutions < 1) {
            return { circles: [], averageQuality: 0, totalCircles: 0 };
        }
        
        // 軌跡を円に分割
        const circleCount = Math.min(5, Math.floor(revolutions));
        const pointsPerCircle = Math.floor(this.touchPath.length / revolutions);
        const circleQualities = [];
        
        for (let i = 0; i < circleCount; i++) {
            const startIndex = i * pointsPerCircle;
            const endIndex = Math.min((i + 1) * pointsPerCircle, this.touchPath.length);
            const circlePoints = this.touchPath.slice(startIndex, endIndex);
            
            if (circlePoints.length > 5) {
                // 個別円の品質評価（インライン化）
                const center = this.calculateCenter(circlePoints);
                const distances = circlePoints.map(point => 
                    Math.sqrt(Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2))
                );
                
                const averageRadius = distances.reduce((sum, d) => sum + d, 0) / distances.length;
                const variance = distances.reduce((sum, d) => sum + Math.pow(d - averageRadius, 2), 0) / distances.length;
                const standardDeviation = Math.sqrt(variance);
                
                const maxDeviation = averageRadius * 0.5;
                const qualityScore = maxDeviation > 0 
                    ? Math.max(0, 100 - (standardDeviation / maxDeviation) * 100)
                    : 0;
                
                circleQualities.push(Math.round(qualityScore));
            }
        }
        
        const averageQuality = circleQualities.length > 0 
            ? Math.round(circleQualities.reduce((sum, q) => sum + q, 0) / circleQualities.length)
            : 0;
        
        console.log('Circle analysis:', {
            circleCount: circleQualities.length,
            qualities: circleQualities,
            averageQuality: averageQuality
        });
        
        return {
            circles: circleQualities,
            averageQuality: averageQuality,
            totalCircles: circleQualities.length
        };
    }
    
    // デバッグ用メソッド（統合版）
    debugCircleAnalysis() {
        console.log('=== CIRCLE ANALYSIS DEBUG ===');
        console.log('Total points:', this.touchPath.length);
        
        if (this.touchPath.length < 10) {
            console.log('Not enough points for analysis');
            return;
        }
        
        // 中心点情報
        const simpleCenter = this.calculateCenter();
        const dynamicCenter = this.calculateCenter(null, true);
        console.log('Simple center:', simpleCenter);
        console.log('Dynamic center:', dynamicCenter);
        
        // 回転数計算
        const revolutions = this.calculateRevolutions();
        console.log('Revolutions:', revolutions);
        
        // 円分析
        const analysis = this.analyzeCircles();
        console.log('Circle analysis:', analysis);
        
        // 角度変化の詳細（最初の20セグメントのみ）
        let totalAngle = 0;
        for (let i = 1; i < Math.min(20, this.touchPath.length); i++) {
            const prev = this.touchPath[i-1];
            const curr = this.touchPath[i];
            
            const prevAngle = Math.atan2(prev.y - dynamicCenter.y, prev.x - dynamicCenter.x);
            const currAngle = Math.atan2(curr.y - dynamicCenter.y, curr.x - dynamicCenter.x);
            let angleDiff = this.normalizeAngleDifference(currAngle - prevAngle);
            
            totalAngle += angleDiff;
            console.log(`Segment ${i}: ${(angleDiff * 180 / Math.PI).toFixed(2)}°, Total: ${(totalAngle * 180 / Math.PI).toFixed(2)}°`);
        }
        
        const finalRevolutions = Math.abs(totalAngle) / (2 * Math.PI);
        console.log('Final revolutions:', finalRevolutions);
    }
    
    // === スコア計算システム ===
    
    // 総合スコア計算
    calculateTotalScore() {
        const revolutions = this.calculateRevolutions();
        const circleAnalysis = this.analyzeCircles();
        const drawingTimeMs = this.drawingDuration;
        const drawingTimeSec = drawingTimeMs / 1000;
        
        // 基本条件チェック
        if (revolutions < 5 || circleAnalysis.averageQuality < 25) {
            return { totalScore: 0, breakdown: null };
        }
        
        // 各要素のスコア計算
        const revolutionScore = this.calculateRevolutionScore(revolutions);
        const qualityScore = this.calculateQualityScore(circleAnalysis.averageQuality);
        const timeScore = this.calculateTimeScore(drawingTimeSec);
        const bonusScore = this.calculateBonusScore(revolutions, circleAnalysis.averageQuality, drawingTimeSec);
        
        const totalScore = revolutionScore + qualityScore + timeScore + bonusScore;
        
        return {
            totalScore: Math.round(totalScore),
            breakdown: {
                revolution: revolutionScore,
                quality: qualityScore,
                time: timeScore,
                bonus: bonusScore,
                details: {
                    revolutions: revolutions,
                    avgQuality: circleAnalysis.averageQuality,
                    drawingTime: drawingTimeSec
                }
            }
        };
    }
    
    // 回転数スコア（基礎点）
    calculateRevolutionScore(revolutions) {
        // 5回転で基礎点、それ以上はボーナス
        const baseScore = Math.min(revolutions, 10) * 10; // 最大100点
        return Math.round(baseScore);
    }
    
    // 精度スコア（品質評価）
    calculateQualityScore(quality) {
        // 品質をそのまま点数化（0-100点）
        return Math.round(quality);
    }
    
    // 時間スコア（速度評価）
    calculateTimeScore(timeSec) {
        let timeScore = 0;
        
        if (timeSec <= 2) {
            timeScore = 100; // 超高速ボーナス
        } else if (timeSec <= 4) {
            timeScore = 80;  // 高速
        } else if (timeSec <= 6) {
            timeScore = 60;  // 標準
        } else if (timeSec <= 10) {
            timeScore = 40;  // やや低速
        } else if (timeSec <= 15) {
            timeScore = 20;  // 低速
        } else {
            timeScore = 10;  // 超低速
        }
        
        return timeScore;
    }
    
    // ボーナススコア（コンボ評価）
    calculateBonusScore(revolutions, quality, timeSec) {
        let bonus = 0;
        
        // パーフェクトコンボ（高精度 + 高速）
        if (quality >= 90 && timeSec <= 4) {
            bonus += 50; // パーフェクトマスター
        }
        
        // スピードマスター（そこそこ精度 + 超高速）
        if (quality >= 70 && timeSec <= 2) {
            bonus += 40; // スピードマスター
        }
        
        // 職人コンボ（超高精度 + 適度な時間）
        if (quality >= 95 && timeSec >= 4 && timeSec <= 8) {
            bonus += 45; // 職人の技
        }
        
        // 回転マスター（多回転ボーナス）
        if (revolutions >= 8) {
            bonus += Math.min((revolutions - 8) * 5, 25); // 最大25点追加
        }
        
        return bonus;
    }
    
    // デバッグ用スコア詳細表示
    debugScore() {
        const scoreResult = this.calculateTotalScore();
        console.log('=== SCORE BREAKDOWN ===');
        console.log('Total Score:', scoreResult.totalScore);
        
        if (scoreResult.breakdown) {
            console.log('Revolution Score:', scoreResult.breakdown.revolution);
            console.log('Quality Score:', scoreResult.breakdown.quality);
            console.log('Time Score:', scoreResult.breakdown.time);
            console.log('Bonus Score:', scoreResult.breakdown.bonus);
            console.log('Details:', scoreResult.breakdown.details);
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
}

// グローバルに公開
window.TouchHandler = TouchHandler;
