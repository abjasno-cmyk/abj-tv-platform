-- Odstranění limitu délky perexu (aplikace už neomezuje titulek, perex ani tělo článku).

alter table opinion_articles
  drop constraint if exists opinion_articles_perex_length;
