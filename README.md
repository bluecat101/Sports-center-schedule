## 目次
1. [アプリについて](#アプリについて)
2. [環境](#環境)
3. [ディレクトリ構成](#ディレクトリ構成)
4. [開発環境構築](開発環境構築)
5. [注意事項](注意事項)

## アプリ名
  Sports center shedule
## アプリについて
横浜市のスポーツセンターの個人利用の予定表をLINEを通して取得できるアプリ
LINEで友達登録し、「区」と取得する予定表の「月」を打つことで予定表を取得する。
<!--[実行画面]() -->
<img src="https://i.gyazo.com/b0bfd9f7b72a3f482d6fc8d10fc64be9.jpg" width="300" alt = "実行画面">

こちらから追加できます。↓

<img src="https://i.gyazo.com/3587dad2fefc664c860ef8bfe768541a.jpg" width="300" alt = "QRコード">

## 環境
|言語・フレームワーク・ライブラリ|バージョン|
|--|--|
|Google Apps Script | 2024-05-02時点|
|LINE|14.6.3|
|Parser|8|

## ディレクトリ構成
<pre>
.
├── getSchedule.gs
├── main.gs
├── README.md
├── appsscript.json
└── .gitignore
</pre>

## 開発環境構築
### For エンドユーザー
LINEで上記を友達登録する
### For 管理者
Google Apps Scriptが実行できる環境でデブロイ後にLINEと連動されて使用する。

## スクリプト プロパティ
|プロパティ|役割|
|--|--|
|API_KEY_FOR_pdf.co|pdf.coを使用してpdfを画像に変換するapiキー|
|CHANNEL_ACCESS_TOKEN|LINEからPOSTを受け取る用のトークン|
|FOLDER_ID|予定表を保存するためのディレクトリ|
|SPREAD_SHEET_ID|エラー時のログを記録するためのスプレッドシート|
|SHEET_NAME|エラー時のログを記録するためのスプレッドシートのシート名|

## 注意事項
今回、pdf.coを無料枠で使用している関係で今後、pdfを画像に変換する機能が使えなくなり、エラーが出る可能性があります。
今後、サイトによりスクレイピングが禁止される可能性もありますが、使用する場合には自己責任でお願いします。
