const API_KEY = PropertiesService.getScriptProperties().getProperty("API_KEY_FOR_pdf.co")
const FOLDER = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty("FOLDER_ID"))

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
function extractScheduleInfoFromString(text, searched_month, pattern) {
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
      let link = match[1]
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
  let imageName = `${year}-${month}-${place}.png`
  let image = FOLDER.getFilesByName(imageName);
  if(image.hasNext()){
    return [image.next().getDownloadUrl(), ""];
  }
  // スポーツセンターのページから指定された月のスケジュールのURLを取得する // 
  let url = URL_RELATED_DATA[place][0]
  let response = UrlFetchApp.fetch(url);
  let content = response.getContentText("utf-8");
  // スケジュールに関する部分のみ取得する
  let text = Parser.data(content).from(URL_RELATED_DATA[place][2]).to(URL_RELATED_DATA[place][3]).iterate();
  // スケジュールのlinkを取得する
  let scheduleLink = extractScheduleInfoFromString(text, month, new RegExp(URL_RELATED_DATA[place][1],"g"))
  if (scheduleLink == ""){ // linkが見つからない時にエラーを返す
    return ["noImage", "選択された月の予定表はまだありません。"]
  }
  if (place == "青葉"){ // 青葉区のみ予定表のurlが相対的パスであった。
    scheduleLink = "https://information.konamisportsclub.jp" + scheduleLink
  }

  // PDFをダウンロードして画像ファイルして保存する // 
  // PDFのblob型で取得
  let blob = getScheduleBlob(scheduleLink)
  // PDf.coを使用してPDFを画像ファイルに変換して画像ファイルのURLを取得
  imageUrl = convertPdfToImages(blob)
  saveImagesToDrive(imageUrl, imageName)
  image = FOLDER.getFilesByName(imageName);
  return [image.next().getDownloadUrl(),""];
}

/**
 * 予定表のblob型を返す関数
 * @params url ダウンロードする予定表のURL
 * @returns 予定表のBlob型
 */
function getScheduleBlob(url) {
  var response = UrlFetchApp.fetch(url);
  var blob = response.getBlob();
  return blob
}

/**
 * pdfを画像に変換するPDF.coにPDFをアップロードする関数。
 * pdfを直接画像に変換できると思っていたが、できなかったためこのようにしている。
 * @params blob
 * @params API_KEY PDF.co用のapi key
 * @returns fileUrl
 */
function uploadPdfToPdfCo(blob, apiKey) {
  let url = 'https://api.pdf.co/v1/file/upload/get-presigned-url?name=sample.pdf&contenttype=application/pdf';
  
  // プレサインURLを取得するリクエスト // 
  let options = {
    'method': 'GET',
    'headers': {
      'x-api-key': apiKey
    }
  };
  
  let response = UrlFetchApp.fetch(url, options);
  let jsonResponse = JSON.parse(response.getContentText());
  
  if (jsonResponse.error) {
    throw new Error('Error: ' + jsonResponse.message);
  }
  
  let presignedUrl = jsonResponse.presignedUrl;
  let fileUrl = jsonResponse.url;
  
  // ファイルをアップロードするリクエスト // 
  let uploadOptions = {
    'method': 'PUT',
    'contentType': 'application/pdf',
    'payload': blob.getBytes()
  };
  
  let uploadResponse = UrlFetchApp.fetch(presignedUrl, uploadOptions);
  
  if (uploadResponse.getResponseCode() != 200) {
    throw new Error(`${uploadResponse.getResponseCode()}エラーが発生しました。`);
  }
  
  return fileUrl;
}

/**
 * 予定表のblob型を受け取ってPDF.coを使用して画像に変換し、画像を返す関数
 * @params blob 予定表のblob型(pdf形式)
 * @returns imageUrl 画像のURLを返す
 */
function convertPdfToImages(blob) {
  let apiKey = API_KEY
  // ファイルをPDF.coにアップロード // 
  let fileUrl = uploadPdfToPdfCo(blob, API_KEY);
  if (!fileUrl) {
    throw new Error('Failed to upload file.');
  }
  let url = 'https://api.pdf.co/v1/pdf/convert/to/png';
  let payload = {
      'url': fileUrl,
      'async': false
    };
    
  let options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': {
      'x-api-key': apiKey
    },
    'payload': JSON.stringify(payload)
  };
  
  let response = UrlFetchApp.fetch(url, options);
  let jsonResponse = JSON.parse(response.getContentText());
  
  if (jsonResponse.error == false) {
    let images = jsonResponse.urls;
    let imageUrl = images[0];
    return imageUrl
  } else {
    throw new Error('Error: ' + jsonResponse.message);
  }
}

/**
 * 画像のURLをGoogleDriveに保存する
 * @params imageUrl　画像のURL
 * @params imageName 保存する際の画像の名前
 */
function saveImagesToDrive(imageUrl, imageName) {
  let response = UrlFetchApp.fetch(imageUrl);
  let blob = response.getBlob();
  let file = FOLDER.createFile(blob).setName(imageName);
  // 共有の設定を全員にする
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
}
