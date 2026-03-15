UPDATE jobs SET benefits = JSON_ARRAY(JSON_OBJECT('label','包午餐','color','green'),JSON_OBJECT('label','交通补贴','color','blue'),JSON_OBJECT('label','长期合作','color','amber')) WHERE id = 1;
UPDATE jobs SET benefits = JSON_ARRAY(JSON_OBJECT('label','包住宿','color','green'),JSON_OBJECT('label','有空调','color','blue')) WHERE id = 2;
UPDATE jobs SET benefits = JSON_ARRAY(JSON_OBJECT('label','包午餐','color','green'),JSON_OBJECT('label','有空调','color','blue'),JSON_OBJECT('label','熟手优先','color','amber')) WHERE id = 3;
UPDATE jobs SET benefits = JSON_ARRAY(JSON_OBJECT('label','包吃住','color','green'),JSON_OBJECT('label','交通补贴','color','blue')) WHERE id = 4;
UPDATE jobs SET benefits = JSON_ARRAY(JSON_OBJECT('label','有空调','color','green'),JSON_OBJECT('label','长期合作','color','amber'),JSON_OBJECT('label','包午餐','color','green')) WHERE id = 5;
UPDATE jobs SET benefits = JSON_ARRAY(JSON_OBJECT('label','包住宿','color','green'),JSON_OBJECT('label','交通补贴','color','blue'),JSON_OBJECT('label','熟手优先','color','amber')) WHERE id = 6;
UPDATE jobs SET benefits = JSON_ARRAY(JSON_OBJECT('label','包吃住','color','green'),JSON_OBJECT('label','有空调','color','blue')) WHERE id = 7;
