/**
 * スケジュールを取得するメイン関数
 * @param {Object} scheduleQuery - place, year, monthなどを含む検索条件
 * @returns {Blob} - JSONファイルのBlob
 */
function analyzeSchedule(scheduleQuery) {
  const jsonFileName = getBaseFileName(scheduleQuery) + ".json";
  const existingJsonFile = getFileBlobIfExists(jsonFileName);
  if (existingJsonFile) return existingJsonFile.getBlob() ;

  const pdfFileName = getBaseFileName(scheduleQuery) + ".pdf";
  const pdfFile = getOrDownloadPdf(scheduleQuery.place, pdfFileName);

  const schedule = read_schedule_from_pdf(scheduleQuery.place, pdfFile);
  return saveScheduleForFolder(schedule, jsonFileName);
}

/**
 * @params strJson {str}: str型のjson
 * @params fileName {str}: ファイル名
 * @return blob {blob}: jsonのファイル
 */
function saveScheduleForFolder(srtJson, fileName){
  const blob = Utilities.newBlob(srtJson, "application/json", fileName);
  FOLDER.createFile(blob);
  return blob;
}

/**
 * 日付を指定してその日の予定を返す。
 */
function fetchScheduleByDate(scheduleQuery, date){
  const pdfFile = analyze_schedule_by_date(scheduleQuery)
  const text = pdfFile.getDataAsString('utf8');
  const json = JSON.parse(text);
  if(!(date in json)){
    return "日付が範囲外です。";
  }
  return json.date;
  
}
