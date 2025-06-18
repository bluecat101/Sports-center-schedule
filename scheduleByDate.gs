/**
 * pdfから予定を取得して保存する
 * @params place {str}: 場所 
 * @params pdf {blob}: pdf
 * @params year {str}: 年
 * @params month {str}: 月
 * @returns schedule {json}: 取得したスケジュール
 * */
function analze_schedule_by_date(place, pdf, year, month) {
  const schedule = read_schedule_from_pdf(place, pdf);
  const fileName = getBaseFileName(year, month, place)+".josn";
  saveScheduleForFolder(schedule, fileName);
}


/**
 * @params strJson {str}: str型のjson
 * @params fileName {str}: ファイル名
 */
function saveScheduleForFolder(srtJson, fileName){
  const blob = Utilities.newBlob(srtJson, "application/json", fileName);
  FOLDER.createFile(blob);
}