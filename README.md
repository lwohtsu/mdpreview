# mdpreview
 Markdown Preview and Convert to HTML with Electron.

## 概要
Electronで作成したMarkdownプレビューアプリです。grunt-markdownで行っていたHTML変換タスクの代替として作成しているので、いったんHTMLファイルを書き出してから読み込んで表示するという特徴を持ちます。

その際に`_template.html`というHTMLのテンプレートファイルを読み込む仕様なので、
テンプレートファイルにCSSの読み込みを書いておけば、任意のCSSを読み込んでプレビュー表示することができます。

最終的にはVivliostyleを利用した書籍形式でのプレビューへの対応と、InDesign向けのXMLファイル書き出しをサポートする予定です。


![screenshot](readme/mdpreview1.jpg)

[マニュアルなどはhttp://libroworks.co.jp/?p=838に](http://libroworks.co.jp/?p=838)

---

## ver2.0までの予定

- [ ] 編集作業用プレビューの追加（page-breakプロパティを見て強制的に改ページし、はみ出しを許す高速表示モード）
- [ ] ACEを利用した内蔵エディタの追加
 - [ ] 保存などの基本機能の追加
 - [ ] 編集作業用プレビューをクリックして原稿の該当行へジャンプ
 - [ ] 後置換リストを利用した専用スニペット機能
 - [ ] 編集作業用の置換機能
- [ ] 画像のトリミング指摘ツール（svgimg指定をGUIで。可能なら囲みや図中文字も付けられるように）
- [ ] 簡易SVG作図機能（IT書やビジネス書でよく使う図が手早く作れるもの）
