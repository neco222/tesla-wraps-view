# Tesla Wrap Lab

Tesla Model 3 のカスタムラップを、公式の `teslamotors/custom-wraps` 素材を使ってプレビューする静的サイトです。

## Features

- Model 3 の静止画に、公式UV展開図のボンネット・左側面などを部位ごとに対応させて合成
- 公式サンプル20種類の検索・カテゴリフィルター
- `CAR` / `UV MAP` / `COMPARE` の表示切り替え
- 独自デザインPNGのローカル読み込み
- モバイル対応、GitHub Pages対応

## GitHub Pages

`outputs` フォルダ内のファイルを `Tesla-wraps-view` リポジトリのルートへ配置して push し、GitHub の **Settings → Pages** で `Deploy from a branch` を選択してください。ビルドツールやサーバーは不要です。

## Asset source

車体画像・テンプレート・サンプルラップは [Tesla custom-wraps / model3](https://github.com/teslamotors/custom-wraps/tree/master/model3) を元にしています。プレビューはクリエイティブ確認用の近似表示で、印刷前には実車の適合確認が必要です。

`COMPARE` では、元の展開図と車体への投影を並べて確認できます。`?view=compare&wrap=Divide` のように指定すると比較画面を直接開けます。投影で生じる透明な隙間はUV画像の前後の色から補間します。公式リポジトリに車両の3DモデルとUV頂点の対応情報は含まれないため、車体への投影は静止画上で手作業により合わせたものです。模様の位置や曲面での伸び方はTesla車内の表示とは一致しません。
