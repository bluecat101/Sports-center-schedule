// const API_KEY = PropertiesService.getScriptProperties().getProperty("API_KEY_FOR_pdf.co")
const API_KEY = PropertiesService.getScriptProperties().getProperty("API_KEY_FOR_CloudConvert")
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
  pdfFile = downloadPdf(scheduleLink);
  //  cloudconvertを使ってPDFファイルをongに変換する
  imageUrl = convertPdfToImageWithCloudConvert(pdfFile)
  saveImagesToDrive(imageUrl, imageName)
  // PDFファイルを削除する
  pdfFile.setTrashed(true)
  image = FOLDER.getFilesByName(imageName);
  return [image.next().getDownloadUrl(),""];
}

/**
 * googleDriveに予定表をダウンロードしてそのファイルパスを返す関数
 * @params scheduleLink 予定表のurl
 * @returns file pdfのファイル
 */
function downloadPdf(scheduleLink) {
  var blob = UrlFetchApp.fetch(scheduleLink).getAs('application/pdf');
  // Googleドライブへ保存 (ルートディレクトリに保存)
  const file = FOLDER.createFile(blob);
  return file;
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



/**
 * cloudconvertを使って、driveに保存されているPDFファイルをpngファイルに変化する
 * １日25回程度が限度
 * @params file Driveに保存されているPDFのファイル 
 * @returns downloadUrl imageのURL
 */
function convertPdfToImageWithCloudConvert(file) {
  // cloudconvertにjobが残っている可能性があるので全削除
  deleteAllJobs()

  // fileからblob型と名前を取得
  var blob = file.getBlob();
  var fileName = file.getName(); // PDFファイルの名前を取得

  // PDFファイルをBase64エンコード
  var pdfBase64 = Utilities.base64Encode(blob.getBytes());

  // CloudConvertのジョブを作成するためのリクエスト
  var url = 'https://api.cloudconvert.com/v2/jobs';

  // CloudConvert APIのリクエストペイロード
  var payload = {
    "tasks": {
      "import-1": {
        "operation": "import/base64",
        "filename": fileName, // ファイル名を指定
        "file": pdfBase64
      },
      "convert-1": {
        "operation": "convert",
        "input": "import-1",
        "output_format": "png"
      },
      "export-1": {
        "operation": "export/url",
        "input": "convert-1"
      }
    }
  };

  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': {
      'Authorization': 'Bearer ' + API_KEY
    },
    'payload': JSON.stringify(payload),
  };

  // CloudConvertジョブの作成
  var response = UrlFetchApp.fetch(url, options);
  var responseData = JSON.parse(response.getContentText());
  var jobId = responseData.data.id;

  // ジョブの完了を待つ
  var jobStatusUrl = 'https://api.cloudconvert.com/v2/jobs/' + jobId;
  var jobComplete = false;
  var jobStatusResponse, jobStatusData, status;
  while (!jobComplete) {
    jobStatusResponse = UrlFetchApp.fetch(jobStatusUrl, {
      'method': 'get',
      'headers': {
        'Authorization': 'Bearer ' + API_KEY
      }
    });
    jobStatusData = JSON.parse(jobStatusResponse.getContentText());
    status = jobStatusData.data.status;

    if (status === 'finished') {
      jobComplete = true;
    } else if (status === 'error') {
      Logger.log('Error: ' + jobStatusData.data.message);
      return;
    }

    // 3秒待つ（ジョブの完了を待つための適切な待機時間）
    Utilities.sleep(500);
  }
  // ジョブを削除する
  deleteJob(jobId)

  // 変換された画像のダウンロードURLを取得
  var downloadUrl = jobStatusData.data.tasks.filter(function(task) {
    return task.operation === 'export/url';
  })[0].result.files[0].url;
  return downloadUrl
}



/**
 * cloudconvertのjobiを全て取得して全てのjobを削除する
 */
function deleteAllJobs() {
  var apiKey = API_KEY; // cloudconvertのAPIキーをここに入力

  // CloudConvertのすべてのジョブを取得するリクエスト
  var url = 'https://api.cloudconvert.com/v2/jobs';

  var options = {
    'method': 'get',
    'headers': {
      'Authorization': 'Bearer ' + apiKey
    }
  };

  // CloudConvertジョブの取得
  var response = UrlFetchApp.fetch(url, options);
  var responseData = JSON.parse(response.getContentText());

  // 取得したすべてのジョブを削除する
  responseData.data.forEach(function(job) {
    deleteJob(job.id);
  });
}


/**
 * couldconvertのjobidを受け取って削除する
 * @params jobid couldconvertのjobid
 */
function deleteJob(jobId){
    var deleteUrl = 'https://api.cloudconvert.com/v2/jobs/' + jobId;
    UrlFetchApp.fetch(deleteUrl, {
      'method': 'delete',
      'headers': {
        'Authorization': 'Bearer ' + API_KEY
      }
    });
}
