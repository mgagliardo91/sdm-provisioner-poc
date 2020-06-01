CREATE TABLE IF NOT EXISTS public.provision (
  extension varchar(40) NOT NULL,
  app_id varchar(50) NOT NULL,
  name varchar(50) NOT NULL,
  source_url varchar(100),
  source_file varchar(100),
  external_location varchar(100),
  CONSTRAINT provision_pk primary key (extension, app_id, name)
);