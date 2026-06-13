-- WC 2026 Family Predictions — group-stage fixture seed (72 matches).
-- Source: official World Cup 2026 group-stage schedule (Al Jazeera, published
-- 2026-06-11). All kick-off times are in UTC. Re-runnable: INSERT IGNORE skips
-- rows whose external_id already exists.
--
-- NOTE on Group F: the real tournament has SWEDEN (not Poland). Your app's
-- src/data/teams.ts lists Poland in Group F for the bracket SIMULATOR; this
-- seed uses Sweden (team_id 'swe') to match reality. See the setup guide.

INSERT IGNORE INTO games
  (external_id, stage, group_letter, home_team_id, away_team_id,
   home_team_name, away_team_name, home_code, away_code, home_flag, away_flag,
   kickoff_utc, venue)
VALUES
  -- Thursday 11 / Friday 12 June
  ('wc2026-01','group','A','mex','rsa','Mexico','South Africa','MEX','RSA','🇲🇽','🇿🇦','2026-06-11 19:00:00','Mexico City Stadium'),
  ('wc2026-02','group','A','kor','cze','Korea Republic','Czechia','KOR','CZE','🇰🇷','🇨🇿','2026-06-12 02:00:00','Estadio Guadalajara, Zapopan'),
  ('wc2026-03','group','B','can','bih','Canada','Bosnia & Herzegovina','CAN','BIH','🇨🇦','🇧🇦','2026-06-12 19:00:00','Toronto Stadium'),
  -- Saturday 13 June
  ('wc2026-04','group','D','usa','par','United States','Paraguay','USA','PAR','🇺🇸','🇵🇾','2026-06-13 01:00:00','Los Angeles Stadium'),
  ('wc2026-05','group','B','qat','sui','Qatar','Switzerland','QAT','SUI','🇶🇦','🇨🇭','2026-06-13 19:00:00','San Francisco Bay Area Stadium'),
  ('wc2026-06','group','C','bra','mar','Brazil','Morocco','BRA','MAR','🇧🇷','🇲🇦','2026-06-13 22:00:00','New York New Jersey Stadium'),
  ('wc2026-07','group','C','hai','sco','Haiti','Scotland','HAI','SCO','🇭🇹','🏴󠁧󠁢󠁳󠁣󠁴󠁿','2026-06-14 01:00:00','Boston Stadium'),
  ('wc2026-08','group','D','aus','tur','Australia','Türkiye','AUS','TUR','🇦🇺','🇹🇷','2026-06-14 04:00:00','BC Place, Vancouver'),
  -- Sunday 14 June
  ('wc2026-09','group','E','ger','cuw','Germany','Curaçao','GER','CUW','🇩🇪','🇨🇼','2026-06-14 17:00:00','Houston Stadium'),
  ('wc2026-10','group','F','ned','jpn','Netherlands','Japan','NED','JPN','🇳🇱','🇯🇵','2026-06-14 20:00:00','Dallas Stadium'),
  ('wc2026-11','group','E','civ','ecu',"Côte d'Ivoire",'Ecuador','CIV','ECU','🇨🇮','🇪🇨','2026-06-14 23:00:00','Philadelphia Stadium'),
  ('wc2026-12','group','F','swe','tun','Sweden','Tunisia','SWE','TUN','🇸🇪','🇹🇳','2026-06-15 02:00:00','Estadio Monterrey, Guadalupe'),
  -- Monday 15 June
  ('wc2026-13','group','H','esp','cpv','Spain','Cabo Verde','ESP','CPV','🇪🇸','🇨🇻','2026-06-15 16:00:00','Atlanta Stadium'),
  ('wc2026-14','group','G','bel','egy','Belgium','Egypt','BEL','EGY','🇧🇪','🇪🇬','2026-06-15 19:00:00','BC Place, Vancouver'),
  ('wc2026-15','group','H','ksa','uru','Saudi Arabia','Uruguay','KSA','URU','🇸🇦','🇺🇾','2026-06-15 22:00:00','Miami Stadium'),
  ('wc2026-16','group','G','irn','nzl','IR Iran','New Zealand','IRN','NZL','🇮🇷','🇳🇿','2026-06-16 01:00:00','Los Angeles Stadium'),
  -- Tuesday 16 June
  ('wc2026-17','group','I','fra','sen','France','Senegal','FRA','SEN','🇫🇷','🇸🇳','2026-06-16 19:00:00','New York New Jersey Stadium'),
  ('wc2026-18','group','I','irq','nor','Iraq','Norway','IRQ','NOR','🇮🇶','🇳🇴','2026-06-16 22:00:00','Boston Stadium'),
  ('wc2026-19','group','J','arg','alg','Argentina','Algeria','ARG','ALG','🇦🇷','🇩🇿','2026-06-17 01:00:00','Kansas City Stadium'),
  ('wc2026-20','group','J','aut','jor','Austria','Jordan','AUT','JOR','🇦🇹','🇯🇴','2026-06-17 04:00:00','San Francisco Bay Area Stadium'),
  -- Wednesday 17 June
  ('wc2026-21','group','K','por','cod','Portugal','DR Congo','POR','COD','🇵🇹','🇨🇩','2026-06-17 17:00:00','Houston Stadium'),
  ('wc2026-22','group','L','eng','cro','England','Croatia','ENG','CRO','🏴󠁧󠁢󠁥󠁮󠁧󠁿','🇭🇷','2026-06-17 20:00:00','Dallas Stadium'),
  ('wc2026-23','group','L','gha','pan','Ghana','Panama','GHA','PAN','🇬🇭','🇵🇦','2026-06-17 23:00:00','Toronto Stadium'),
  ('wc2026-24','group','K','uzb','col','Uzbekistan','Colombia','UZB','COL','🇺🇿','🇨🇴','2026-06-18 02:00:00','Mexico City Stadium'),
  -- Thursday 18 June
  ('wc2026-25','group','A','cze','rsa','Czechia','South Africa','CZE','RSA','🇨🇿','🇿🇦','2026-06-18 16:00:00','Atlanta Stadium'),
  ('wc2026-26','group','B','sui','bih','Switzerland','Bosnia & Herzegovina','SUI','BIH','🇨🇭','🇧🇦','2026-06-18 19:00:00','Los Angeles Stadium'),
  ('wc2026-27','group','B','can','qat','Canada','Qatar','CAN','QAT','🇨🇦','🇶🇦','2026-06-18 22:00:00','BC Place, Vancouver'),
  ('wc2026-28','group','A','mex','kor','Mexico','Korea Republic','MEX','KOR','🇲🇽','🇰🇷','2026-06-19 01:00:00','Estadio Guadalajara, Zapopan'),
  -- Friday 19 June
  ('wc2026-30','group','D','usa','aus','United States','Australia','USA','AUS','🇺🇸','🇦🇺','2026-06-19 19:00:00','Seattle Stadium'),
  ('wc2026-29','group','C','sco','mar','Scotland','Morocco','SCO','MAR','🏴󠁧󠁢󠁳󠁣󠁴󠁿','🇲🇦','2026-06-19 22:00:00','Boston Stadium'),
  ('wc2026-31','group','C','bra','hai','Brazil','Haiti','BRA','HAI','🇧🇷','🇭🇹','2026-06-20 00:30:00','Philadelphia Stadium'),
  ('wc2026-32','group','D','tur','par','Türkiye','Paraguay','TUR','PAR','🇹🇷','🇵🇾','2026-06-20 03:00:00','San Francisco Bay Area Stadium'),
  -- Saturday 20 June
  ('wc2026-33','group','F','ned','swe','Netherlands','Sweden','NED','SWE','🇳🇱','🇸🇪','2026-06-20 17:00:00','Houston Stadium'),
  ('wc2026-34','group','E','ger','civ','Germany',"Côte d'Ivoire",'GER','CIV','🇩🇪','🇨🇮','2026-06-20 20:00:00','Toronto Stadium'),
  ('wc2026-35','group','E','ecu','cuw','Ecuador','Curaçao','ECU','CUW','🇪🇨','🇨🇼','2026-06-21 03:00:00','Kansas City Stadium'),
  ('wc2026-36','group','F','tun','jpn','Tunisia','Japan','TUN','JPN','🇹🇳','🇯🇵','2026-06-21 04:00:00','Estadio Monterrey, Guadalupe'),
  -- Sunday 21 June
  ('wc2026-37','group','H','esp','ksa','Spain','Saudi Arabia','ESP','KSA','🇪🇸','🇸🇦','2026-06-21 16:00:00','Atlanta Stadium'),
  ('wc2026-38','group','G','bel','irn','Belgium','IR Iran','BEL','IRN','🇧🇪','🇮🇷','2026-06-21 19:00:00','Los Angeles Stadium'),
  ('wc2026-39','group','H','uru','cpv','Uruguay','Cabo Verde','URU','CPV','🇺🇾','🇨🇻','2026-06-21 22:00:00','Miami Stadium'),
  ('wc2026-40','group','G','nzl','egy','New Zealand','Egypt','NZL','EGY','🇳🇿','🇪🇬','2026-06-22 01:00:00','BC Place, Vancouver'),
  -- Monday 22 June
  ('wc2026-41','group','J','arg','aut','Argentina','Austria','ARG','AUT','🇦🇷','🇦🇹','2026-06-22 17:00:00','Dallas Stadium'),
  ('wc2026-42','group','I','fra','irq','France','Iraq','FRA','IRQ','🇫🇷','🇮🇶','2026-06-22 21:00:00','Philadelphia Stadium'),
  ('wc2026-43','group','I','nor','sen','Norway','Senegal','NOR','SEN','🇳🇴','🇸🇳','2026-06-23 00:00:00','New York New Jersey Stadium'),
  ('wc2026-44','group','J','jor','alg','Jordan','Algeria','JOR','ALG','🇯🇴','🇩🇿','2026-06-23 03:00:00','San Francisco Bay Area Stadium'),
  -- Tuesday 23 June
  ('wc2026-45','group','K','por','uzb','Portugal','Uzbekistan','POR','UZB','🇵🇹','🇺🇿','2026-06-23 17:00:00','Houston Stadium'),
  ('wc2026-46','group','L','eng','gha','England','Ghana','ENG','GHA','🏴󠁧󠁢󠁥󠁮󠁧󠁿','🇬🇭','2026-06-23 20:00:00','Boston Stadium'),
  ('wc2026-47','group','L','pan','cro','Panama','Croatia','PAN','CRO','🇵🇦','🇭🇷','2026-06-23 23:00:00','Toronto Stadium'),
  ('wc2026-48','group','K','col','cod','Colombia','DR Congo','COL','COD','🇨🇴','🇨🇩','2026-06-24 02:00:00','Estadio Guadalajara, Zapopan'),
  -- Wednesday 24 June
  ('wc2026-49','group','B','sui','can','Switzerland','Canada','SUI','CAN','🇨🇭','🇨🇦','2026-06-24 19:00:00','BC Place, Vancouver'),
  ('wc2026-50','group','B','bih','qat','Bosnia & Herzegovina','Qatar','BIH','QAT','🇧🇦','🇶🇦','2026-06-24 19:00:00','Seattle Stadium'),
  ('wc2026-51','group','C','sco','bra','Scotland','Brazil','SCO','BRA','🏴󠁧󠁢󠁳󠁣󠁴󠁿','🇧🇷','2026-06-24 22:00:00','Miami Stadium'),
  ('wc2026-52','group','C','mar','hai','Morocco','Haiti','MAR','HAI','🇲🇦','🇭🇹','2026-06-24 22:00:00','Atlanta Stadium'),
  ('wc2026-53','group','A','cze','mex','Czechia','Mexico','CZE','MEX','🇨🇿','🇲🇽','2026-06-25 01:00:00','Mexico City Stadium'),
  ('wc2026-54','group','A','rsa','kor','South Africa','Korea Republic','RSA','KOR','🇿🇦','🇰🇷','2026-06-25 01:00:00','Estadio Monterrey, Guadalupe'),
  -- Thursday 25 June
  ('wc2026-55','group','E','ecu','ger','Ecuador','Germany','ECU','GER','🇪🇨','🇩🇪','2026-06-25 20:00:00','New York New Jersey Stadium'),
  ('wc2026-56','group','E','cuw','civ','Curaçao',"Côte d'Ivoire",'CUW','CIV','🇨🇼','🇨🇮','2026-06-25 20:00:00','Philadelphia Stadium'),
  ('wc2026-57','group','F','jpn','swe','Japan','Sweden','JPN','SWE','🇯🇵','🇸🇪','2026-06-25 23:00:00','Dallas Stadium'),
  ('wc2026-58','group','F','tun','ned','Tunisia','Netherlands','TUN','NED','🇹🇳','🇳🇱','2026-06-25 23:00:00','Kansas City Stadium'),
  ('wc2026-59','group','D','tur','usa','Türkiye','United States','TUR','USA','🇹🇷','🇺🇸','2026-06-26 02:00:00','Los Angeles Stadium'),
  ('wc2026-60','group','D','par','aus','Paraguay','Australia','PAR','AUS','🇵🇾','🇦🇺','2026-06-26 02:00:00','San Francisco Bay Area Stadium'),
  -- Friday 26 June
  ('wc2026-61','group','I','nor','fra','Norway','France','NOR','FRA','🇳🇴','🇫🇷','2026-06-26 19:00:00','Boston Stadium'),
  ('wc2026-62','group','I','sen','irq','Senegal','Iraq','SEN','IRQ','🇸🇳','🇮🇶','2026-06-26 19:00:00','Toronto Stadium'),
  ('wc2026-63','group','H','cpv','ksa','Cabo Verde','Saudi Arabia','CPV','KSA','🇨🇻','🇸🇦','2026-06-27 00:00:00','Houston Stadium'),
  ('wc2026-64','group','H','uru','esp','Uruguay','Spain','URU','ESP','🇺🇾','🇪🇸','2026-06-27 00:00:00','Estadio Guadalajara, Zapopan'),
  ('wc2026-65','group','G','egy','irn','Egypt','IR Iran','EGY','IRN','🇪🇬','🇮🇷','2026-06-27 03:00:00','Seattle Stadium'),
  ('wc2026-66','group','G','nzl','bel','New Zealand','Belgium','NZL','BEL','🇳🇿','🇧🇪','2026-06-27 03:00:00','BC Place, Vancouver'),
  -- Saturday 27 June
  ('wc2026-67','group','L','pan','eng','Panama','England','PAN','ENG','🇵🇦','🏴󠁧󠁢󠁥󠁮󠁧󠁿','2026-06-27 21:00:00','New York New Jersey Stadium'),
  ('wc2026-68','group','L','cro','gha','Croatia','Ghana','CRO','GHA','🇭🇷','🇬🇭','2026-06-27 21:00:00','Philadelphia Stadium'),
  ('wc2026-69','group','K','col','por','Colombia','Portugal','COL','POR','🇨🇴','🇵🇹','2026-06-27 23:30:00','Miami Stadium'),
  ('wc2026-70','group','K','cod','uzb','DR Congo','Uzbekistan','COD','UZB','🇨🇩','🇺🇿','2026-06-27 23:30:00','Atlanta Stadium'),
  ('wc2026-71','group','J','alg','aut','Algeria','Austria','ALG','AUT','🇩🇿','🇦🇹','2026-06-28 02:00:00','Kansas City Stadium'),
  ('wc2026-72','group','J','jor','arg','Jordan','Argentina','JOR','ARG','🇯🇴','🇦🇷','2026-06-28 02:00:00','Dallas Stadium');
