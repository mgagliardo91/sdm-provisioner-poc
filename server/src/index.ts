import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import handlebars from 'express-handlebars';
import fileUpload from 'express-fileupload';
import { PORT } from './config/constants';
import createRoutes from './routes';
import { postgresReady } from './database';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const hbs = handlebars.create({
  helpers: {
    section: function(name: string, options: any){
      if(!this._sections) this._sections = {};
      this._sections[name] = options.fn(this);
      return null;
    }
  }
})

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.enable('view cache');

app.use(fileUpload({
  tempFileDir : '/tmp/'
}));

app.use('/static', express.static(path.join(__dirname, '../static')));

createRoutes(app);

app.use((error: any, _1: Request, res: Response, _2: NextFunction) => {
  res.status(error.status || 500).json({
    error: {
    status: error.status || 500,
    message: error.message || 'Internal Server Error',
   },
  });
});

(async () => {
  await postgresReady();
  app.listen(PORT, () => {
      console.log(`Server is listening on port ${PORT}`);
  });
})();
