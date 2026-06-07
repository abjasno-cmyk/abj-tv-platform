-- Zvýšení limitu Krátkého představení (medailonku) autora z 500 na 1500 znaků.

alter table author_profiles
  drop constraint if exists author_profiles_bio_length;

alter table author_profiles
  add constraint author_profiles_bio_length check (bio is null or char_length(bio) <= 1500);
