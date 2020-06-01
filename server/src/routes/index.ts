import ProvisionRouter from './provision';
import { Express } from 'express';

export default (app: Express) => [
  ProvisionRouter
].map(route => route(app));