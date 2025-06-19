/**
 * 拡張子を含まないファイル名を返す
 * @params year {str}: 年
 * @params month {str}: 月
 * @params place {str}:　場所
 * @return fileName {str}: ファイル名(拡張子は含まない)
 */
function getBaseFileName(scheduleQuery) {
  return `${scheduleQuery.year}-${scheduleQuery.month}-${scheduleQuery.place}`;
}

const scheduleQuery = {
  "place": null,
  "year": null,
  "month": null
}

/**
 * 指定ファイル名のファイルを取得（存在しない場合はnull）
 * @param {string} fileName
 * @returns {File|null}
 */
function getFileBlobIfExists(fileName) {
  const files = FOLDER.getFilesByName(fileName);
  return files.hasNext() ? files.next(): null;
}
