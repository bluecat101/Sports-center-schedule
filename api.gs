/**
 * @params place {str}: 場所 
 * @params pdf {blob}: pdf
 * @returns schedule {json}: 取得したスケジュール
 * */
function read_schedule_from_pdf(place, pdf) {
  const url = PropertiesService.getScriptProperties().getProperty('API_END_POINT');
  const schedule =  UrlFetchApp.fetch(url, {
    method: 'post',
    payload: {
      file: pdf,
      place: place
    }
  });
  return schedule;
}