-- Noviny MVP: pouze ověřené a funkční RSS zdroje (audit 2026-06-25)
-- Tento seed je záměrně konzervativní: obsahuje jen endpointy, které
-- během auditu vracely validní RSS/Atom feed.

with category_map as (
  select id, slug
  from noviny_categories
),
seed as (
  select *
  from (
    values
      ('parlamentni-listy', 'Parlamentní listy', 'https://www.parlamentnilisty.cz', 'https://www.parlamentnilisty.cz/export/rss.aspx', 'cs', 'CZ', 'domaci'),
      ('protiproud', 'Protiproud', 'https://www.protiproud.info', 'https://protiproud.info/nejnovejsi/rss/', 'cs', 'CZ', 'domaci'),
      ('radio-universum', 'Rádio Universum', 'https://www.radiouniversum.cz', 'https://www.radiouniversum.cz/feed/', 'cs', 'CZ', 'domaci'),
      ('vidlakovy-kydy', 'Vidlákovy kydy', 'https://www.vidlakovykydy.cz', 'https://www.vidlakovykydy.cz/rss.xml', 'cs', 'CZ', 'domaci'),
      ('litterate', 'Litterate', 'https://www.litterate.cz', 'https://web.litterate.cz/feed/', 'cs', 'CZ', 'domaci'),
      ('nova-republika', 'Nová republika', 'https://www.novarepublika.cz', 'https://www.novarepublika.cz/feed', 'cs', 'CZ', 'domaci'),
      ('pravy-prostor', 'Pravý prostor', 'https://www.pravyprostor.net', 'https://pravyprostor.net/feed/', 'cs', 'CZ', 'domaci'),
      ('konzervativni-noviny', 'Konzervativní noviny', 'https://www.konzervativninoviny.cz', 'https://www.konzervativninoviny.cz/feed/', 'cs', 'CZ', 'domaci'),
      ('ac24', 'AC24', 'https://www.ac24.cz', 'https://www.ac24.cz/feed/', 'cs', 'CZ', 'domaci'),
      ('krajske-listy', 'Krajské listy', 'https://www.krajskelisty.cz', 'http://www.krajskelisty.cz/export/rss.xml', 'cs', 'CZ', 'domaci'),
      ('svedomi-naroda', 'Svědomí národa', 'https://www.svedomi-naroda.cz', 'https://www.svedomi-naroda.cz/feed/', 'cs', 'CZ', 'domaci'),
      ('stacilo', 'STAČILO!', 'https://www.stacilo.cz', 'https://stacilo.cz/feed/', 'cs', 'CZ', 'domaci'),
      ('spd', 'SPD', 'https://www.spd.cz', 'https://new.spd.cz/feed/', 'cs', 'CZ', 'domaci'),
      ('pro-strana', 'PRO', 'https://www.stranapro.cz', 'https://www.stranapro.cz/feed/', 'cs', 'CZ', 'domaci'),
      ('trikolora', 'Trikolora', 'https://www.volimtrikoloru.cz', 'https://volimtrikoloru.cz/feed/', 'cs', 'CZ', 'domaci'),
      ('motoriste-sobe', 'Motoristé sobě', 'https://motoristesobe.cz', 'https://motoristesobe.cz/feed', 'cs', 'CZ', 'domaci'),
      ('sosp', 'SOSP', 'https://www.sosp.cz', 'https://www.sosp.cz/feed/', 'cs', 'CZ', 'domaci'),
      ('standard-sk', 'Štandard', 'https://standard.sk', 'https://standard.sk/feed', 'sk', 'SK', 'zahranici'),
      ('hlavne-spravy', 'Hlavné správy', 'https://www.hlavnespravy.sk', 'https://www.hlavnespravy.sk/feed', 'sk', 'SK', 'zahranici'),
      ('blog-hlavne-spravy', 'Blog Hlavné správy', 'https://blog.hlavnespravy.sk', 'https://blog.hlavnespravy.sk/feed/', 'sk', 'SK', 'zahranici'),
      ('ereport', 'eReport', 'https://ereport.sk', 'https://ereport.sk/feed', 'sk', 'SK', 'zahranici'),
      ('postoj', 'Postoj', 'https://www.postoj.sk', 'https://www.postoj.sk/rss', 'sk', 'SK', 'zahranici'),
      ('fox-news', 'Fox News', 'https://www.foxnews.com', 'https://moxie.foxnews.com/google-publisher/latest.xml', 'en', 'US', 'zahranici'),
      ('zerohedge', 'ZeroHedge', 'https://www.zerohedge.com', 'https://cms.zerohedge.com/fullrss2.xml', 'en', 'US', 'zahranici')
  ) as t(slug, name, homepage_url, rss_url, language, country, category_slug)
)
insert into noviny_sources (
  slug,
  name,
  homepage_url,
  rss_url,
  language,
  country,
  category_id,
  is_active,
  allow_images,
  legal_note
)
select
  s.slug,
  s.name,
  s.homepage_url,
  s.rss_url,
  s.language,
  s.country,
  c.id,
  true,
  false,
  'Automatický RSS import pouze metadat; bez přebírání plných textů.'
from seed s
left join category_map c on c.slug = s.category_slug
on conflict (rss_url) do update
set
  name = excluded.name,
  homepage_url = excluded.homepage_url,
  language = excluded.language,
  country = excluded.country,
  category_id = excluded.category_id,
  is_active = excluded.is_active,
  allow_images = excluded.allow_images,
  legal_note = excluded.legal_note,
  updated_at = now();
