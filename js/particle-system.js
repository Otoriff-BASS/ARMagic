// particle-system.js - パーティクルエフェクト

class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.isAnimating = false;
        
        // パーティクルの設定
        this.config = {
            maxParticles: 200,
            particleLifespan: 1000, // 1秒
            particlesPerFrame: 3,
            baseSize: 3,
            sizeVariation: 2
        };
        
        this.setupCanvas();
    }
    
    setupCanvas() {
        // キャンバスを画面全体に設定
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '1000';
        this.resizeCanvas();
        
        // リサイズ対応
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    // タッチ位置にパーティクルを生成
    addParticle(x, y, quality = 50, revolutions = 0) {
        if (this.particles.length >= this.config.maxParticles) {
            // 古いパーティクルを削除
            this.particles.shift();
        }
        
        // 品質と回転数に応じて色を決定
        const color = this.getParticleColor(quality, revolutions);
        const size = this.config.baseSize + Math.random() * this.config.sizeVariation;
        
        const particle = {
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 2, // 軽い拡散
            vy: (Math.random() - 0.5) * 2,
            size: size,
            maxSize: size,
            life: this.config.particleLifespan,
            maxLife: this.config.particleLifespan,
            color: color,
            alpha: 1.0
        };
        
        this.particles.push(particle);
        
        if (!this.isAnimating) {
            this.startAnimation();
        }
    }
    
    // 品質と回転数に応じた色を生成
    getParticleColor(quality, revolutions) {
        if (quality >= 85) {
            // 最高品質：金色
            return `rgb(255, 215, 0)`;
        } else if (quality >= 70) {
            // 高品質：紫色
            return `rgb(148, 0, 211)`;
        } else if (quality >= 55) {
            // 中品質：青色
            return `rgb(30, 144, 255)`;
        } else if (quality >= 40) {
            // 低品質：緑色
            return `rgb(50, 205, 50)`;
        } else {
            // 最低品質：白色
            return `rgb(255, 255, 255)`;
        }
    }
    
    // アニメーション開始
    startAnimation() {
        this.isAnimating = true;
        this.animate();
    }
    
    // アニメーションループ
    animate() {
        if (this.particles.length === 0) {
            this.isAnimating = false;
            return;
        }
        
        // キャンバスをクリア
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // パーティクルの更新と描画
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // パーティクルの更新
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 16; // 約60FPSを想定
            
            // ライフに応じてサイズとアルファを調整
            const lifeRatio = particle.life / particle.maxLife;
            particle.size = particle.maxSize * lifeRatio;
            particle.alpha = lifeRatio;
            
            // 寿命が尽きたパーティクルを削除
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            
            // パーティクルを描画
            this.drawParticle(particle);
        }
        
        // 次のフレームをリクエスト
        if (this.particles.length > 0) {
            requestAnimationFrame(() => this.animate());
        } else {
            this.isAnimating = false;
        }
    }
    
    // パーティクル描画
    drawParticle(particle) {
        this.ctx.save();
        
        // グローエフェクトを追加
        this.ctx.shadowColor = particle.color;
        this.ctx.shadowBlur = particle.size * 3;
        
        // パーティクルの色にアルファを適用
        const rgb = particle.color.match(/\d+/g);
        const colorWithAlpha = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${particle.alpha})`;
        this.ctx.fillStyle = colorWithAlpha;
        
        // 円形パーティクルを描画
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    // パーティクルシステムをクリア
    clear() {
        this.particles = [];
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.isAnimating = false;
    }
}

// グローバルに公開
window.ParticleSystem = ParticleSystem;
