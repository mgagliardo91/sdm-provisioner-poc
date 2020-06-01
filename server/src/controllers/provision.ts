import { Storage } from '@google-cloud/storage';
import { UploadedFile } from 'express-fileupload';
import client from '../database';

const bucketName = 'sdm-provisioner';
const storage = new Storage({ projectId: 'sdm-test-integration' });

interface ISourceFile {
  appId: string;
  name: string;
  extension: string;
}

interface ISourceHostedFile extends ISourceFile {
  sourceUrl: string;
}

interface ISourceFileUpload extends ISourceFile {
  source: UploadedFile;
}

interface ISourceHostedApp extends ISourceFile {
  externalLocation: string;
}

interface IExtension extends ISourceFile {
  sourceUrl?: string;
  sourceFile?: string;
  externalLocation?: string;
}

const mapRowToExtension = ({ extension, app_id, name, source_url, source_file, external_location }: any): IExtension => ({
  extension,
  appId: app_id,
  name,
  sourceUrl: source_url,
  sourceFile: source_file,
  externalLocation: external_location
});

const writeExtension = async ({ extension, appId, name, sourceUrl, sourceFile, externalLocation }: IExtension) => {
  const query = 'INSERT INTO provision(extension, app_id, name, source_url, source_file, external_location) VALUES ($1, $2, $3, $4, $5, $6)'
    + ' ON CONFLICT ON CONSTRAINT provision_pk DO UPDATE SET source_url=$4, source_file=$5, external_location=$6'
    + ' RETURNING *';
  const vars = [extension, appId, name, sourceUrl, sourceFile, externalLocation];
  try {
    const result = await client.query(query, vars);
    if (result.rows.length === 1) {
      return mapRowToExtension(result.rows[0]);
    }
  } catch(e) {
    console.error(e);
  }

  return undefined;
}

const getExtension = async ({ extension, appId, name } : ISourceFile) => {
  const query = `SELECT * FROM provision where extension=$1 AND app_id=$2 AND name=$3 LIMIT 1`;
  const vars = [extension, appId, name];
  const result = await client.query(query, vars);
  if (result.rows.length === 1) {
    return mapRowToExtension(result.rows[0]);
  }

  return undefined;
};

export const getExtensions = async () => {
  return await storage.bucket(bucketName).getFiles();
};


type IExensionUrl = { embeddedUrl: string } | { externalUrl: string } | undefined;

export const getExtensionUrl = async ({ extension, appId, name }: ISourceFile): Promise<IExensionUrl> => {
  const result = await getExtension({ extension, appId, name });
  if (!result) {
    return undefined;
  }

  if (result.externalLocation) {
    return { externalUrl: result.externalLocation };
  }

  if (result.sourceUrl) {
    return { embeddedUrl: result.sourceUrl };
  }

  const file = await storage.bucket(bucketName).file(result.sourceFile!).get();
  if (!file.length) {
    return undefined;
  }

  const signedUrl =  await file[0].getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 24 * 60 * 60 * 1000
  });

  if (signedUrl && signedUrl.length) {
    return { embeddedUrl: signedUrl[0] };
  }

  return undefined;
};

export const createExtension = async (props: ISourceFileUpload | ISourceHostedFile | ISourceHostedApp) => {
  const { appId, name, extension } = props;

  const extensionProps: IExtension = {
    extension,
    appId,
    name,
    sourceUrl: undefined,
    sourceFile: undefined,
    externalLocation: undefined
  };

  if ('externalLocation' in props) {
    const { externalLocation } = props as ISourceHostedApp;
    extensionProps.externalLocation = externalLocation;
  } else if ('sourceUrl' in props) {
    const { sourceUrl } = props as ISourceHostedFile;
    extensionProps.sourceUrl = sourceUrl;
  } else {
    const { source } = props as ISourceFileUpload;
    const file = storage.bucket(bucketName).file(`${extension}/${appId}/${name}`);
    await file.save(source.data);
    const uploaded = (await file.get())[0];
    console.log(`Uploaded source at ${uploaded.name}`);
    extensionProps.sourceFile = `${extension}/${appId}/${name}`;
  }

  return await writeExtension(extensionProps);
};