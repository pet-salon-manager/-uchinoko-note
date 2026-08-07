うちの子ノート - GitHub Pages 公開パッケージ
================================================

このフォルダ内の6ファイルを GitHub の「-uchinoko-note」リポジトリ直下へアップロードすれば、
GitHub Pages で iPhone Safari から使えるWebアプリとして公開できます。

【v1〜v3から統合した機能】
・ペット登録 / 複数ペット切り替え
・健康記録（体重・体調・ワクチン・通院・薬）
・予定 / カレンダー / 予約追加・削除
・思い出写真＋コメント
・体重グラフ
・飼い主登録・ログイン（プロトタイプ）
・Apple / Google ログイン画面（プロトタイプ）
・写真クラウド保存設定画面
・ワクチン・薬のリマインダー設定
・動物病院 / トリミング店の連携画面
・家族共有 / 招待
・JSONバックアップ / 復元
・ペットカルテ
  既往歴 / アレルギー / 持病 / 手術歴 / 血液型 / かかりつけ病院 / 現在の薬
・薬 / 予防薬管理
  次回投薬日 / 通知日数 / 投薬済み
・ワクチン証明書 / 診療明細などの写真・PDF保存
・健康管理強化
  体重 / 食事量 / 飲水量 / 体温 / 排便 / 排尿 / 症状メモ
・食事 / おやつ管理
・緊急時プロフィール
・動物病院に見せる診療用サマリー
・AI健康アシスタント（登録データからの注意喚起）
・PWA対応（ホーム画面追加 / Service Worker / Manifest）

【GitHub Pagesへの入れ替え】
1. -uchinoko-note リポジトリを開く
2. 現在の古い index.html / manifest.webmanifest / service-worker.js / README.txt をこの新しいファイルで置き換える
3. icon-192.png と icon-512.png を追加
4. Commit changes
5. Settings → Pages が main / /(root) のままなら自動で再公開
6. https://pet-salon-manager.github.io/-uchinoko-note/ をSafariで開く
7. Safariの共有 →「ホーム画面に追加」

【重要】
このGitHub Pages版は、データを主にブラウザの localStorage に保存する「動くプロトタイプ」です。
本物のクラウド同期・Apple/Google OAuth・家族間のリアルタイム共有・本番Push通知・AI APIを使うには、
作成済みのSupabaseプロジェクト等への接続が次の工程です。
