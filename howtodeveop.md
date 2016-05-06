# 開発の始め方

Node.jsはインストール済みとします。

### 1. まずこのリポジトリをcloneします。

### 2. Electron開発環境のグローバルインストール
```
npm -g install electron-prebuilt
```

### 3. bowerのグローバルインストール
```
npm install bower -g
```

### 4. 依存パッケーのインストール
以下のコマンドを順に実行します。
```
npm install
```
 
```
bower install
```

### 5. 動作テスト
appフォルダに移動し、以下のコマンドで実行できれば動作します。
```
electron .
```
