// circular-mask-shader.js - 円形マスク処理用のコンポーネント

// 円形マスクコンポーネント
AFRAME.registerComponent('circular-mask', {
  schema: {
    radius: {type: 'number', default: 0.48}
  },

  init: function () {
    const el = this.el;
    const data = this.data;
    
    // マテリアルを取得
    el.addEventListener('materialtextureloaded', () => {
      this.applyCircularMask();
    });
    
    // すでにテクスチャが読み込まれている場合
    setTimeout(() => {
      this.applyCircularMask();
    }, 100);
  },

  applyCircularMask: function () {
    const el = this.el;
    const mesh = el.getObject3D('mesh');
    
    if (!mesh) return;

    const material = mesh.material;
    if (!material || !material.map) return;

    // カスタムシェーダーマテリアルを作成
    const circularMaterial = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: material.map },
        opacity: { value: material.opacity || 1.0 },
        radius: { value: this.data.radius }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform float opacity;
        uniform float radius;
        varying vec2 vUv;
        
        void main() {
          vec4 textureColor = texture2D(map, vUv);
          
          // 中心からの距離を計算
          vec2 center = vec2(0.5, 0.5);
          float distance = length(vUv - center);
          
          // 円形マスクを作成
          float mask = 1.0 - smoothstep(radius, 0.5, distance);
          
          gl_FragColor = vec4(textureColor.rgb, textureColor.a * mask * opacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });

    mesh.material = circularMaterial;
  }
});
