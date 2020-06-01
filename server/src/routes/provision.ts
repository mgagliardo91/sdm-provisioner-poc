import express, { Express, Request, Response } from 'express';
import { getExtensions, getExtensionUrl, createExtension } from '../controllers/provision';
import { BadRequestError, ApiError, NotFoundError } from '../error';
import { UploadedFile } from 'express-fileupload';

export const router = express.Router({
  strict: true
});


router.get('/', async (req, res, next) => {
  try {
    await getExtensions();
  } catch (e) {
    next(e);
  }
});

router.get('/:extension/:appId/:name', async (req, res, next) => {
  try {
    const {
      extension,
      appId,
      name
    } = req.params;
    const extensionUrl = await getExtensionUrl({ extension, appId, name });
    
    if (!extensionUrl) {
      return next(new NotFoundError(`Unable to locate the file ${extension}/${name} for app ${appId}`));
    }

    if ('externalUrl' in extensionUrl) {
      const { externalUrl } = extensionUrl;
      return res.redirect(externalUrl);
    }

    return res.render('default', { externalSourceUrl: extensionUrl.embeddedUrl, user: req.query.user || 'No User' })
  } catch (e) {
    next(e);
  }
});

router.post('/:extension/:appId', async (req, res, next) => {
  const body: { name: string, sourceUrl: string, externalLocation: string  } = req.body;

  if (!body.name) {
    return next(new BadRequestError('Parameter \'name\' is required.'));
  }

  const extensionProps: any = {
    ...body,
    appId: req.params.appId,
    extension: req.params.extension
  };

  if (body.externalLocation) {
    console.log('Processing request for customer-hosted app', body.externalLocation);
  } else if (body.sourceUrl) {
    console.log('Processing request for customer-hosted source code', body.sourceUrl);
  } else {
    const source = req.files?.source as UploadedFile | undefined;
    console.log('Processing request for sdm-hosted source code', source?.name);
  
    if (!source) {
      return next(new BadRequestError('Source file is required.'));
    }

    extensionProps.source = source;
  }

  const extension = await createExtension(extensionProps);
  console.log('Created extension', extension);

  return res.json({ ok: true });
});

export default (app: Express) => app.use('/provision', router);