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
function extractScheduleInfoFromString(text, searched_month, pattern) {
  var match;
  // 全角数字もしくは全角括弧を半角に変換する
  text = text[0].replace(/[０-９（）]/g, function(s) {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });
  // パターンにマッチし、月が合うUrlを取得
  while (match = pattern.exec(text)) {
    let link = match[1]; // リンクを取得
    if (match[2] == searched_month){
      // matches.push({ month: month, link: link }); // 月とリンクを配列に追加
      return link
    }
  }
  return ""
}

function getScheduleImageUrl(year,month, place){
  // 画像がすでに存在しているかを確認して存在している場合にはその画像を返す
  let imageName = `${year}-${month}-${place}.png`
  let image = FOLDER.getFilesByName(imageName);
  if(image.hasNext()){
    return [image.next().getDownloadUrl(), ""];
  }
  // スポーツセンターのページから指定された月のスケジュールのURLを取得する
  let url = URL_RELATED_DATA[place][0]
  let response = UrlFetchApp.fetch(url);
  let content = response.getContentText("utf-8");
  // スケジュールに関する部分のみ取得する
  let text = Parser.data(content).from(URL_RELATED_DATA[place][2]).to(URL_RELATED_DATA[place][3]).iterate();
  // スケジュールの月とlinkを取得する
  let scheduleLink = extractScheduleInfoFromString(text, month, new RegExp(URL_RELATED_DATA[place][1],"g"))
  if (scheduleLink == ""){
    return ["noImage", "選択された月の予定表はまだありません。"]
  }
  if (place == "青葉"){ // 青葉区のみ予定表のurlが相対的パスであった。
    scheduleLink = "https://information.konamisportsclub.jp" + scheduleLink
  }
  // pdfをダウンロードして画像ファイルして保存する
  var pdfFile = downloadPdfFromUrl(scheduleLink)
  imageUrl = convertPdfToImages(pdfFile)
  saveImagesToDrive(imageUrl, imageName)
  // pdfデータを削除する
  deletePdfFile(pdfFile)
  image = FOLDER.getFilesByName(imageName);
  // logger(image)
  return [image.next().getDownloadUrl(),""];
}

function downloadPdfFromUrl(url) {
  var response = UrlFetchApp.fetch(url);
  var blob = response.getBlob();
  var file = FOLDER.createFile(blob).setName('sample.pdf');
  Logger.log('File saved to Google Drive with ID: ' + file.getId());
  return file
}

function uploadPdfToPdfCo(blob) {
  var apiKey = API_KEY; // PDF.coのAPIキー
  var url = 'https://api.pdf.co/v1/file/upload/get-presigned-url?name=sample.pdf&contenttype=application/pdf';
  
  // プレサインURLを取得するリクエスト
  var options = {
    'method': 'GET',
    'headers': {
      'x-api-key': apiKey
    }
  };
  
  var response = UrlFetchApp.fetch(url, options);
  var jsonResponse = JSON.parse(response.getContentText());
  
  if (jsonResponse.error) {
    Logger.log('Error: ' + jsonResponse.message);
    return null;
  }
  
  var presignedUrl = jsonResponse.presignedUrl;
  var fileUrl = jsonResponse.url;
  
  // ファイルをアップロードするリクエスト
  var uploadOptions = {
    'method': 'PUT',
    'contentType': 'application/pdf',
    'payload': blob.getBytes()
  };
  
  var uploadResponse = UrlFetchApp.fetch(presignedUrl, uploadOptions);
  
  if (uploadResponse.getResponseCode() != 200) {
    Logger.log('Error uploading file: ' + uploadResponse.getContentText());
    return null;
  }
  
  return fileUrl;
}

function convertPdfToImages(file) {
  // var file = FOLDER.getFileById(fileId);
  var blob = file.getBlob();
  
  var apiKey = API_KEY
  // ファイルをPDF.coにアップロード
  var fileUrl = uploadPdfToPdfCo(blob);
  if (!fileUrl) {
    Logger.log('Failed to upload file.');
    return;
  }
  var url = 'https://api.pdf.co/v1/pdf/convert/to/png';
  var payload = {
      'url': fileUrl,
      'async': false
    };
    
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': {
      'x-api-key': apiKey
    },
    'payload': JSON.stringify(payload)
  };
  
  var response = UrlFetchApp.fetch(url, options);
  var jsonResponse = JSON.parse(response.getContentText());
  
  if (jsonResponse.error == false) {
    var images = jsonResponse.urls;
    var image = images[0];
    return image
  } else {
    Logger.log('Error: ' + jsonResponse.message);
  }
}

function saveImagesToDrive(imageUrl, imageName) {
  let response = UrlFetchApp.fetch(imageUrl);
  let blob = response.getBlob();
  let file = FOLDER.createFile(blob).setName(imageName);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
}

function deletePdfFile(file){
  file.setTrashed(true);
}



// <a\\s[^>]*href="([^"]*)"[^>]*>([0-9]+)月の個人利用スケジュール\\(PDF\\)<\\/a>

// <a\\s[^>]*href="([^"]*)"[^>]*>([0-9]+)月の個人利用スケジュール\\(PDF\\)<\\/a>
// <a\\s[^>]*href="([^"]*)"[^>]*>([0-9]+)月の個人利用スケジュール\\(PDF\\)<\\/a>
// <a\\s[^>]*href="([^"]*)"[^>]*>([0-9]+)月の個人利用スケジュール\\(PDF\\)<\\/a>
// <a\\s[^>]*href="([^"]*)"[^>]*>([0-9]+)月の個人利用スケジュール\\(PDF\\)<\\/a>
// <a\\s[^>]*href="([^"]*)"[^>]*>([0-9]+)月の個人利用予定表<\\/a>
// <a\\s[^>]*href="([^"]*)"[^>]*>([0-9]+)月個人利用スケジュール\\(PDF\\)<\\/a>
// <a\\s[^>]*href="([^"]*)"[^>]*>\\d{4}年([0-9]+)月の個人利用スケジュール\\(PDF\\)<\\/a>
// <a\\s[^>]*href="([^"]*)"[^>]*>([0-9]+)月個人利用スケジュール<\\/a>
// <a\\s[^>]*href="([^"]*)"[^>]*>([0-9]+)月の個人スケジュール\\(PDF\\)<\\/a
// <a\\s[^>]*href="([^"]*)"[^>]*><span>\\d{4}年([0-9]+)月個人利用日程表<\\/span>
// <a\\s[^>]*href="([^"]*)"[^>]*>☝([0-9]+)月の予定はこちら<\\/a>
// <a\\s[^>]*href="([^"]*)"[^>]*>([0-9]+)月の個人利用スケジュール\\(PDF\\)<\\/a>
// <a\\s[^>]*href="([^"]*)"[^>]*>\\d{4}年([0-9]+)月度個人利用.*<\\/a>
// <a\\s[^>]*href="([^"]*)"[^>]*>\\d{4}年([0-9]+)月予定<\\/a>

