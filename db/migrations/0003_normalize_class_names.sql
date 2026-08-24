UPDATE registrations
SET class_name = CASE grade
  WHEN '1年級' THEN '一年忠班'
  WHEN '2年級' THEN '二年忠班'
  WHEN '3年級' THEN '三年忠班'
  WHEN '4年級' THEN '四年忠班'
  WHEN '5年級' THEN '五年忠班'
  WHEN '6年級' THEN '六年忠班'
  ELSE class_name
END
WHERE grade IN ('1年級', '2年級', '3年級', '4年級', '5年級', '6年級');
