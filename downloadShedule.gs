
// 各スポーツセンターのURL、予定表のURLを取得する正規表現、予定表のURLが存在する範囲の最初と最後の文字
const URL_RELATED_DATA ={
  "港南":['https://yokohama-sport.jp/konan-sc-ysa/userguide','<a\\s[^>]*href="([^"]*)"[^>]*>([0-9]+)月の個人利用スケジュール\\(PDF\\)<\\/a>','p-blogParts post_content','</div>'],
  "金沢":['https://yokohama-sport.jp/kanazawa-sc-ysa/userguide/','<a\\s[^>]*href="([^"]*)"[^>]*>([0-9]+)月の個人利用スケジュール\\(PDF\\)<\\/a>','p-blogParts post_content','</div>'],
  "戸塚":['https://yokohama-sport.jp/totsuka-sc-ysa/userguide','<a\\s[^>]*href="([^"]*)"[^>]*>([0-9]+)月の個人利用スケジュール\\(PDF\\)<\\/a>','p-blogParts post_content','</div>'],
  "栄":['https://yokohama-sport.jp/sakae-sc-ysa/userguide','<a\\s[^>]*href="([^"]*)"[^>]*>([0-9]+)月の個人利用スケジュール\\(PDF\\)<\\/a>','p-blogParts post_content','</div>'],
  "鶴見":['https://yokohama-sport.jp/tsurumi-sc-ysa/userguide','<a\\s[^>]*href="([^"]*)"[^>]*>([0-9]+)月の個人利用予定表<\\/a>','p-blogParts post_content','</div>'],
  "都筑":['https://yokohama-sport.jp/tsuzuki-sc-ysa/userguide/','<a\\s[^>]*href="([^"]*)"[^>]*>([0-9]+)月個人利用スケジュール\\(PDF\\)<\\/a>','p-blogParts post_content','</div>'],
  "泉":['https://yokohama-sport.jp/seya-sc-ysa/userguide/','<a\\s[^>]*href="([^"]*)"[^>]*>\\d{4}年([0-9]+)月の個人利用スケジュール\\(PDF\\)<\\/a>','p-blogParts post_content','</div>'],
  "中":['https://yokohama-sport.jp/naka-sc-ysa/userguide','<a\\s[^>]*href="([^"]*)"[^>]*>([0-9]+)月個人利用スケジュール<\\/a>','p-blogParts post_content','</td>'],
  "磯子":['https://yokohama-sport.jp/isogo-sc-ysa/userguide/','<a\\s[^>]*href="([^"]*)"[^>]*>([0-9]+)月の個人スケジュール\\(PDF\\)<\\/a','p-blogParts post_content','</td>'],
  "緑":['https://yokohama-sport.jp/midori-sc-ysa/userguide/','<a\\s[^>]*href="([^"]*)"[^>]*><span>\\d{4}年([0-9]+)月個人利用日程表<\\/span>','p-blogParts post_content','</td>'],
  "旭":['https://yokohama-sport.jp/asahi-sc-ysa/userguide/','<a\\s[^>]*href="([^"]*)"[^>]*>☝([0-9]+)月の予定はこちら<\\/a>','p-blogParts post_content','</td>'],
  "瀬谷":['https://yokohama-sport.jp/izumi-sc-ysa/userguide','<a\\s[^>]*href="([^"]*)"[^>]*>([0-9]+)月の個人利用スケジュール\\(PDF\\)<\\/a>','個人利用ができる日・利用区分は、個人利用スケジュールをご確認ください。','</div>'],
  "青葉":['https://information.konamisportsclub.jp/trust/aoba/','<a\\s[^>]*href="([^"]*)"[^>]*>\\d{4}年([0-9]+)月度個人利用.*<\\/a>','id="tabs-schedule"','</div>'],
  "南":['https://www.yokohama-minamisc.jp/personal','<a\\s[^>]*href="([^"]*)"[^>]*>\\d{4}年([0-9]+)月予定<\\/a>','entry-content','</div>'],
}


/**
 * 予定表を取得しダウンロードする
 */
function fetchScheduleLink(place){
  // スポーツセンターのページから指定された月のスケジュールのURLを取得する // 
  const url = URL_RELATED_DATA[place][0]
  const response = UrlFetchApp.fetch(url);
  const content = response.getContentText("utf-8");
  // スケジュールに関する部分のみ取得する
  const textIncludeSchedule = Parser.data(content).from(URL_RELATED_DATA[place][2]).to(URL_RELATED_DATA[place][3]).iterate();
  // スケジュールのlinkを取得する
  let scheduleLink = _extractScheduleInfoFromString(textIncludeSchedule, month, new RegExp(URL_RELATED_DATA[place][1],"g"))
  if (scheduleLink == ""){ // linkが見つからない時にエラーを返す
    return ["noImage", "選択された月の予定表はまだありません。"]
  }
  if (place == "青葉"){ // 青葉区のみ予定表のurlが相対的パスであった。
    scheduleLink = "https://information.konamisportsclub.jp" + scheduleLink
  }
  return scheduleLink;
}


/**
 * 入力規則に沿うかを確認し、検索する年と月と場所を返します。
 * @param text 選択された範囲のhtmlの文章
 * @param searched_month 検索する月
 * @param pattern pdfのlinkと何月用かを探す正規表現
 * @return link
 */
function _extractScheduleInfoFromString(text, searched_month, pattern) {
  let match;
  // 全角数字もしくは全角括弧を半角に変換する
  text = text[0].replace(/[０-９（）]/g, function(s) {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);  // ASCIIコード分だけずらす
  });
  // パターンマッチし、探している月のURLを取得
  // match[1]: link
  // match[2]: 月
  while (match = pattern.exec(text)) {
    if (match[2] == searched_month){
      const link = match[1]
      return link
    }
  }
  return ""
}




/**
 * PDFファイルを取得。存在しない場合はダウンロードして返す
 * @param {string} place
 * @param {string} fileName
 * @returns {File} - Google DriveのFileオブジェクト
 */
function getOrDownloadPdf(place, fileName) {
  const files = FOLDER.getFilesByName(fileName);
  if (files.hasNext()) {
    return files.next();
  }
  const scheduleLink = fetchScheduleLink(place);
  return downloadPdf(scheduleLink, fileName);
}

/**
 * googleDriveに予定表をダウンロードしてそのファイルパスを返す関数
 * @params scheduleLink 予定表のurl
 * @returns file pdfのファイル
 */
function downloadPdf(scheduleLink, fileName) {
  const blob = UrlFetchApp.fetch(scheduleLink).getAs('application/pdf');
  // ファイル名を設定する
  blob.setName(fileName);
  // Googleドライブへ保存 (ルートディレクトリに保存)
  const file = FOLDER.createFile(blob);
  return file;
}
