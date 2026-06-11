-- Jednorázová oprava VŠECH aktivních YouTube kanálů v Supabase.
-- Spusť v SQL Editoru (nevyžaduje nový deploy).
-- Páruje podle channel_url — bezpečné i když se liší source_name.

begin;

update sources set channel_id = 'UC4ghMQ16P3acuKKXHTtkS7w', uploads_playlist_id = 'UU4ghMQ16P3acuKKXHTtkS7w' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@AbyByloJasno';
update sources set channel_id = 'UC0Wv53TrPRfroHF96nqoLcQ', uploads_playlist_id = 'UU0Wv53TrPRfroHF96nqoLcQ' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@XTV';
update sources set channel_id = 'UCHUKlFSiEZZNZ2z1zG45Cuw', uploads_playlist_id = 'UUHUKlFSiEZZNZ2z1zG45Cuw' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@XaverLive';
update sources set channel_id = 'UC1ASPUCPfhkyUW9RUX9RGHw', uploads_playlist_id = 'UU1ASPUCPfhkyUW9RUX9RGHw' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@radiouniversumcz';
update sources set channel_id = 'UCvfbXBzdvbKWDkLfp5UpYLA', uploads_playlist_id = 'UUvfbXBzdvbKWDkLfp5UpYLA' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@ProtiproudTV';
update sources set channel_id = 'UCBaZlXmNcEmf0qhN8KiXqBw', uploads_playlist_id = 'UUBaZlXmNcEmf0qhN8KiXqBw' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@InovaceRepubliky';
update sources set channel_id = 'UCg5LFoUflbTUo1w8ot3CAPw', uploads_playlist_id = 'UUg5LFoUflbTUo1w8ot3CAPw' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@svedominaroda';
update sources set channel_id = 'UCBb1XL5nvz7u3Inzhi_UYxA', uploads_playlist_id = 'UUBb1XL5nvz7u3Inzhi_UYxA' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@KarelHavl%C3%AD%C4%8Dek-l1d';
update sources set channel_id = 'UCQEPR23yCIME2NcyNvBqjdg', uploads_playlist_id = 'UUQEPR23yCIME2NcyNvBqjdg' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@AndrejBabis';
update sources set channel_id = 'UCe0c2rUjCHtQSf2XY7ulCQA', uploads_playlist_id = 'UUe0c2rUjCHtQSf2XY7ulCQA' where platform = 'youtube' and channel_url = 'https://www.youtube.com/channel/UCe0c2rUjCHtQSf2XY7ulCQA';
update sources set channel_id = 'UC43VMo86tQCK-3Kv6_PL_Ew', uploads_playlist_id = 'UU43VMo86tQCK-3Kv6_PL_Ew' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@Jind%C5%99ich_Rajchl/videos';
update sources set channel_id = 'UCUPk4wPoxYr5BKJcvN2H7qw', uploads_playlist_id = 'UUUPk4wPoxYr5BKJcvN2H7qw' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@rozhovorysmimisramovou188';
update sources set channel_id = 'UC81PBuvIimtXQ8pDH7CcQkg', uploads_playlist_id = 'UU81PBuvIimtXQ8pDH7CcQkg' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@InfoVojna';
update sources set channel_id = 'UCGIBojINWxSrJNJh1pbGq6Q', uploads_playlist_id = 'UUGIBojINWxSrJNJh1pbGq6Q' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@parlamentkyTV';
update sources set channel_id = 'UCNd3v2aDf1MvtJtCmCunT6w', uploads_playlist_id = 'UUNd3v2aDf1MvtJtCmCunT6w' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@denik_to';
update sources set channel_id = 'UCSEoE21aMhQ5_6QaCqJpK_g', uploads_playlist_id = 'UUSEoE21aMhQ5_6QaCqJpK_g' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@oprokop';
update sources set channel_id = 'UCHGLQzX7_7C24yyX8Ip1pWg', uploads_playlist_id = 'UUHGLQzX7_7C24yyX8Ip1pWg' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@Modryjelen';
update sources set channel_id = 'UC0_3GsUWlcf5khH5DHg1d9Q', uploads_playlist_id = 'UU0_3GsUWlcf5khH5DHg1d9Q' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@ktvlive-zpravy';
update sources set channel_id = 'UCXUYAfDy8yuW_TbV4CFDxIw', uploads_playlist_id = 'UUXUYAfDy8yuW_TbV4CFDxIw' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@RaptorTV.cz_hejobcane_zs';
update sources set channel_id = 'UCsMZA2m6JqvxOST3dsv8ocw', uploads_playlist_id = 'UUsMZA2m6JqvxOST3dsv8ocw' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@RadimPanenka';
update sources set channel_id = 'UC6Ut-Dh2_LUEFNqA83UTRLw', uploads_playlist_id = 'UU6Ut-Dh2_LUEFNqA83UTRLw' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@gregormatej';
update sources set channel_id = 'UCNZaQQarQJrN5Q6TWf8IMLQ', uploads_playlist_id = 'UUNZaQQarQJrN5Q6TWf8IMLQ' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@PatrikNacherCZ';
update sources set channel_id = 'UClsRKIPWinojQGWIyQ6qFVw', uploads_playlist_id = 'UUlsRKIPWinojQGWIyQ6qFVw' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@zakonybohatstvi';
update sources set channel_id = 'UCnnxbfVd-D9BuvYMN0LE9NQ', uploads_playlist_id = 'UUnnxbfVd-D9BuvYMN0LE9NQ' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@marketa.sichtarova';
update sources set channel_id = 'UCABTOPGq1UAcRCQCifrsz-Q', uploads_playlist_id = 'UUABTOPGq1UAcRCQCifrsz-Q' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@svobodni';
update sources set channel_id = 'UCmddwtkOBmS__HAH1dlF4Iw', uploads_playlist_id = 'UUmddwtkOBmS__HAH1dlF4Iw' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@emko-ab';
update sources set channel_id = 'UCaJH1RPJxaK9BsccgzZbiKA', uploads_playlist_id = 'UUaJH1RPJxaK9BsccgzZbiKA' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@inFAKTAcz';
update sources set channel_id = 'UCmB0qQFal60mzi-x2XDqyvA', uploads_playlist_id = 'UUmB0qQFal60mzi-x2XDqyvA' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@IncorrectCZ';
update sources set channel_id = 'UC28hsAjds3mQzScBtYtkGsQ', uploads_playlist_id = 'UU28hsAjds3mQzScBtYtkGsQ' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@PortalMarker';
update sources set channel_id = 'UCpM-t0T57ODqg3Z5oOo-x5A', uploads_playlist_id = 'UUpM-t0T57ODqg3Z5oOo-x5A' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@eReportTV';
update sources set channel_id = 'UC3DpNu6HPq9BHprmJBuQAig', uploads_playlist_id = 'UU3DpNu6HPq9BHprmJBuQAig' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@JuditaLassakova';
update sources set channel_id = 'UCKfQ-eny-anZXc3nQ5ZDlOw', uploads_playlist_id = 'UUKfQ-eny-anZXc3nQ5ZDlOw' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@TERAZTAKTOsAnkouZitnou';
update sources set channel_id = 'UCVry0p4SnE6UpJCYVwaLqIg', uploads_playlist_id = 'UUVry0p4SnE6UpJCYVwaLqIg' where platform = 'youtube' and channel_url = 'https://www.youtube.com/channel/UCVry0p4SnE6UpJCYVwaLqIg';
update sources set channel_id = 'UCdU1Hed-u-HJky_GNcPABeQ', uploads_playlist_id = 'UUdU1Hed-u-HJky_GNcPABeQ' where platform = 'youtube' and channel_url = 'https://www.youtube.com/channel/UCdU1Hed-u-HJky_GNcPABeQ';
update sources set channel_id = 'UCaqWi_n6zpT0Wo5wWGapp7g', uploads_playlist_id = 'UUaqWi_n6zpT0Wo5wWGapp7g' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@IlonaSvihl%C3%ADkovaOfficial';
update sources set channel_id = 'UC3a-SkXJxrC9IbfNH304OfA', uploads_playlist_id = 'UU3a-SkXJxrC9IbfNH304OfA' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@SpolekSvatopluk';
update sources set channel_id = 'UCprDr9curndqH6vHNyg2xBg', uploads_playlist_id = 'UUprDr9curndqH6vHNyg2xBg' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@O%C4%8Demseml%C4%8D%C3%AD';
update sources set channel_id = 'UCs3NaeO10RxshJVWdcEN_Iw', uploads_playlist_id = 'UUs3NaeO10RxshJVWdcEN_Iw' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@Hlavnespravy-lc9yc';
update sources set channel_id = 'UC29iqHgpbu99IrJB32ZkESA', uploads_playlist_id = 'UU29iqHgpbu99IrJB32ZkESA' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@vox-news';
update sources set channel_id = 'UCycGhWFmJk3m5q135_AUl9g', uploads_playlist_id = 'UUycGhWFmJk3m5q135_AUl9g' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@KonecnaKaterina/featured';
update sources set channel_id = 'UCnEDP6GeUOj_2JpA5RvWCpw', uploads_playlist_id = 'UUnEDP6GeUOj_2JpA5RvWCpw' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@echopodcasty';
update sources set channel_id = 'UCIX6MozjkkRZwdqESX_Vt4A', uploads_playlist_id = 'UUIX6MozjkkRZwdqESX_Vt4A' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@Datarun_cz';
update sources set channel_id = 'UCGttrUON87gWfU6dMWm1fcA', uploads_playlist_id = 'UUGttrUON87gWfU6dMWm1fcA' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@TuckerCarlson';
update sources set channel_id = 'UCVNlbld-oFN1O1yjcAzyheg', uploads_playlist_id = 'UUVNlbld-oFN1O1yjcAzyheg' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@JeffreyDSachsOfficial';
update sources set channel_id = 'UCSTcrIUKiDV_543bXH8Zgsw', uploads_playlist_id = 'UUSTcrIUKiDV_543bXH8Zgsw' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@petrburestv';
update sources set channel_id = 'UCTkLw7sxdswyHZegPtffjzA', uploads_playlist_id = 'UUTkLw7sxdswyHZegPtffjzA' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@hovoryzezeme';
update sources set channel_id = 'UCF6hAvpKZ-uqMStf_8OUhhg', uploads_playlist_id = 'UUF6hAvpKZ-uqMStf_8OUhhg' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@miroslavkamensky3577/videos';
update sources set channel_id = 'UC9si6gMYt2_5veSv9HVJVsQ', uploads_playlist_id = 'UU9si6gMYt2_5veSv9HVJVsQ' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@casopisargument3584';
update sources set channel_id = 'UCUMK4ZohnfC864B1_0vHTbQ', uploads_playlist_id = 'UUUMK4ZohnfC864B1_0vHTbQ' where platform = 'youtube' and channel_url = 'https://www.youtube.com/@doktoregg';

commit;
