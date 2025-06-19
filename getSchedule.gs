const API_KEY = PropertiesService.getScriptProperties().getProperty("API_KEY_I_LOVE_PDF");

/**
 * 予定表の画像をURLを返す。
 * @params year 検索する予定表の年
 * @params month　検索する予定表の月
 * @params place 検索する予定表のスポーツセンター
 * @return [url,error_message]   予定表の画像のURLとエラーメッセージ
 */
function getScheduleImageUrl(year, month, place){
  // 画像の検索
  const imageFileName = getBaseFileName(year, month, place) + ".png";
  const existingImageFile = getFileBlobIfExists(imageFileName);
  if (existingImageFile) return [existingImageFile.getDownloadUrl(), ""];
  // 画像がないためpdfの取得
  const pdfFileName = getBaseFileName(year, month, place) + ".pdf";
  const pdfFile = getOrDownloadPdf(place, pdfFileName)
  // 画像の取得&保存
  const imageFile = _toImageFromPdf(pdfFile);
  const savedFile = _saveFileToDrive(imageFile, imageName)
  return [savedFile.getDownloadUrl(),""];
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