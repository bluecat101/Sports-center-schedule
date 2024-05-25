const API_KEY = PropertiesService.getScriptProperties().getProperty("API_KEY_FOR_pdf.co")
const FOLDER = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty("FOLDER_ID"))
const URL = {
  "鶴見":"https://yokohama-sport.jp/tsurumi-sc-ysa/userguide",
  "神奈川":"https://kanagawa-sc.com/default/personalUse/",
  "中":"https://yokohama-sport.jp/naka-sc-ysa/userguide",
  "南":"https://www.yokohama-minamisc.jp/personal",
  "港南":"https://yokohama-sport.jp/konan-sc-ysa/userguide",
  "保土ケ谷":"https://hodogaya-sports.com/default/personalUse/",
  "旭":"https://yokohama-sport.jp/asahi-sc-ysa/userguide/",
  "磯子":"https://yokohama-sport.jp/isogo-sc-ysa/userguide/",
  "金沢":"https://yokohama-sport.jp/kanazawa-sc-ysa/userguide/",
  "港北":"https://kohoku-sports.com/default/kojin/",
  "緑":"https://yokohama-sport.jp/midori-sc-ysa/userguide/",
  "都筑":"https://yokohama-sport.jp/tsuzuki-sc-ysa/userguide/",
  "戸塚":"https://yokohama-sport.jp/totsuka-sc-ysa/userguide",
  "栄":"https://yokohama-sport.jp/sakae-sc-ysa/userguide",
  "泉":"https://yokohama-sport.jp/izumi-sc-ysa/userguide",
  "瀬谷":"https://yokohama-sport.jp/seya-sc-ysa/userguide/",
}
function extractScheduleInfoFromString(text, searched_month) {
  // 正規表現パターンを定義(リンクと月を取得する,栄スポーツセンター用)
  var pattern = /<a\s[^>]*href="([^"]*)"[^>]*>(?=.*スケジュール)([0-9]+)月の個人利用スケジュール\(PDF\)<\/a>/g;
  
  var matches = [];
  var match;
  
  // パターンにマッチし、月が合う全ての部分文字列を取得
  while (match = pattern.exec(text)) {
    var link = match[1]; // リンクを取得
    var month = match[2]; // 月の情報を取得
    if (month == searched_month){
      matches.push({ month: month, link: link }); // 月とリンクを配列に追加
    }
  }
  return matches;
}

function test(){
  url = URL["鶴見"]
  month = 5
  
  let response = UrlFetchApp.fetch(url);
  let content = response.getContentText("utf-8");
  let text = Parser.data(content).from('p-blogParts post_content').to('</div>').iterate();
  scheduleInfo = extractScheduleInfoFromString(text, month)
  console.log(scheduleInfo)
}


function getScheduleImageUrl(year,month, place){
  // 画像がすでに存在しているかを確認して存在している場合にはその画像を返す
  let imageName = `${year}-${month}-${place}.png`
  let image = FOLDER.getFilesByName(imageName);
  if(image.hasNext()){
    return [image.next().getDownloadUrl(), ""];
  }
  // スポーツセンターのページから指定された月のスケジュールのURLを取得する
  let url = URL[place]
  let response = UrlFetchApp.fetch(url);
  let content = response.getContentText("utf-8");
  // スケジュールに関する部分のみ取得する
  let text = Parser.data(content).from('p-blogParts post_content').to('</div>').iterate();
  // スケジュールの月とlinkを取得する
  let scheduleInfo = extractScheduleInfoFromString(text, month)
  if (scheduleInfo.length == 0){
    return ["noImage", "選択された月の予定表はまだありません。"]
  };
  var scheduleURL = scheduleInfo[0].link
  // pdfをダウンロードして画像ファイルして保存する
  var pdfFile = downloadPdfFromUrl(scheduleURL)
  imageURL = convertPdfToImages(pdfFile)
  saveImagesToDrive(imageURL, imageName)
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

function saveImagesToDrive(imageURL, imageName) {
  let response = UrlFetchApp.fetch(imageURL);
  let blob = response.getBlob();
  let file = FOLDER.createFile(blob).setName(imageName);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
}

function deletePdfFile(file){
  file.setTrashed(true);
}