import knex from 'knex';
import knexConfig from './knexfile';
import { config } from './index';

const environment = config.nodeEnv || 'development';
const db = knex(knexConfig[environment]);

export default db;
