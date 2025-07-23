# WebAR 魔法陣 - 5段階速度判定

大学のオープンキャンパス来場者向けのWebARコンテンツです。

## 概要

- ARマーカー（Hiro）を認識すると魔法陣が表示されます
- 画面をタッチする時間に応じて5種類の精霊を召喚できます
- スマートフォンのブラウザで動作します（アプリインストール不要）

## 技術仕様

- **フロントエンド**: HTML5, CSS3, JavaScript (ES6+)
- **ARライブラリ**: A-Frame v1.5.0 + AR.js v3.4.5
- **対応ブラウザ**: iOS Safari, Android Chrome（最新版）

## 使用方法

1. スマートフォンのブラウザで `index.html` にアクセス
2. カメラの使用を許可
3. Hiroマーカーをカメラに向ける
4. 魔法陣が表示されたら画面をタッチ
5. タッチ時間に応じて異なる精霊が召喚されます

## 召喚される精霊

- **0-200ms**: 稲妻の精霊 (model-a)
- **200-500ms**: 炎の精霊 (model-b)
- **500-1000ms**: 水の精霊 (model-c)
- **1000-2000ms**: 土の精霊 (model-d)
- **2000ms+**: 古の守護者 (model-e)

## ファイル構成

```
ARMagic/
├── index.html              # メインHTML
├── css/
│   └── styles.css          # スタイルシート
├── js/
│   ├── app.js              # メインアプリケーション
│   ├── ar-manager.js       # AR機能管理
│   └── touch-handler.js    # タッチ操作処理
├── assets/
│   ├── models/             # 3Dモデル (.glb)
│   ├── markers/            # ARマーカー
│   └── sounds/             # 効果音 (オプション)
└── README.md
```

## 必要なアセット

現在以下の3Dモデルファイル（.glb形式）が必要です：

- `assets/models/magic-circle.glb` - 魔法陣モデル
- `assets/models/model-a.glb` - 稲妻の精霊
- `assets/models/model-b.glb` - 炎の精霊
- `assets/models/model-c.glb` - 水の精霊
- `assets/models/model-d.glb` - 土の精霊
- `assets/models/model-e.glb` - 古の守護者

## デバッグ

ブラウザのコンソールで `debugAR()` を実行すると、システム状態を確認できます。

## 開発フェーズ

- **フェーズ1（MVP）**: 基本機能実装 ✅
- **フェーズ2**: UI/UX改善、効果音追加（予定）

## 注意事項

- HTTPS環境での実行を推奨（カメラアクセスのため）
- 3Dモデルファイルのサイズ最適化が重要
- 明るい環境でマーカーを認識させてください
