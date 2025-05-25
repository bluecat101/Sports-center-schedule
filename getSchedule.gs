const FOLDER = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty("FOLDER_ID"))
const API_KEY = PropertiesService.getScriptProperties().getProperty("API_KEY_I_LOVE_PDF");

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
 * 予定表の画像をURLを返す。
 * @params year 検索する予定表の年
 * @params month　検索する予定表の月
 * @params place 検索する予定表のスポーツセンター
 * @return [url,error_message]   予定表の画像のURLとエラーメッセージ
 */
function getScheduleImageUrl(year,month, place){
  // 画像がすでに存在しているかを確認して存在している場合にはその画像を返す // 
  const imageName = `${year}-${month}-${place}.png`
  const image = FOLDER.getFilesByName(imageName);
  if(image.hasNext()){
    return [image.next().getDownloadUrl(), ""];
  }
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

  // PDFをダウンロードして画像ファイルして保存する // 
  const pdfFile = _downloadPdf(scheduleLink);
  const imageFile = _toImageFromPdf(pdfFile);
  const savedFile = _saveFileToDrive(imageFile, imageName)
  // PDFファイルを削除する
  pdfFile.setTrashed(true)
  return [savedFile.getDownloadUrl(),""];
}

/**
 * googleDriveに予定表をダウンロードしてそのファイルパスを返す関数
 * @params scheduleLink 予定表のurl
 * @returns file pdfのファイル
 */
function _downloadPdf(scheduleLink) {
  const blob = UrlFetchApp.fetch(scheduleLink).getAs('application/pdf');
  // Googleドライブへ保存 (ルートディレクトリに保存)
  const file = FOLDER.createFile(blob);
  return file;
}


/**
 * Fileのblobを用いてGoogleDriveに保存する
 * @params fileBlob fileのBlob
 * @params fileName 保存する際の画像の名前
 * @return file
 */
function _saveFileToDrive(fileBlob, fileName) {
  const file = FOLDER.createFile(fileBlob).setName(fileName);
  // 共有の設定を全員にする
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file;
}


/**
 * iLoveAPIを用いてpdfを画像に変換する
 * @params pdfFile pdfのファイルオブジェクト
 * @return 画像ファイルのblob
 */
function _toImageFromPdf(pdfFile){
  const tokenUrl = 'https://api.ilovepdf.com/v1/auth';

  // トークンの取得
  const tokenResponse = UrlFetchApp.fetch(tokenUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ public_key: API_KEY })
  });
  const tokenResponseBody = JSON.parse(tokenResponse.getContentText());
  const signedToken = tokenResponseBody.token;

  // セッション作成
  const sessionUrl = 'https://api.ilovepdf.com/v1/start/pdfjpg';
  const sessionResponse = UrlFetchApp.fetch(sessionUrl, {
    method: 'get',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + signedToken
    },
  });

  const sessionResponseBody = JSON.parse(sessionResponse.getContentText());

  const server = sessionResponseBody.server;
  const task = sessionResponseBody.task;

  const uploadUrl = `https://${server}/v1/upload`;

  const uploadResponse =  UrlFetchApp.fetch(uploadUrl, {
    method: 'post',
    payload: {
      task: task,
      file: pdfFile.getBlob()
    },
    headers: {
      Authorization: 'Bearer ' + signedToken
    },
  });
  
  const uploadResponseBody = JSON.parse(uploadResponse.getContentText());
  const fileName = uploadResponseBody.server_filename;

  // PDFを画像化
  const processUrl = `https://${server}/v1/process`;
  const processResponse = UrlFetchApp.fetch(processUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      task: task,
      tool: 'pdfjpg',
      files: [{server_filename: fileName, filename: 'image.jpg'}]
    }),
    headers: {
      Authorization: 'Bearer ' + signedToken
    },
  });

  // 結果をダウンロード
  const downloadUrl = `https://${server}/v1/download/${task}`;
  const pdfToImage = UrlFetchApp.fetch(downloadUrl,{
    headers: {
      Authorization: 'Bearer ' + signedToken
    }
  });
  return pdfToImage.getBlob();
}