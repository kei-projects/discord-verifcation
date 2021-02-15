import type verifyClient from './VerifyClient';
import * as sqlite from 'sqlite';
import sqlite3 from 'sqlite3';
import { join } from 'path';

export type DATABASE = sqlite.Database<sqlite3.Database, sqlite3.Statement>;
export interface guildConfigs {
  /**
   * ID of the guild/server
   */
  ID: string;
  /**
   * Welcome message channel
   */
  ChannelId?: string;
  /**
   * roles added to members when thay join, split by ','
   */
  Roles?: string;
  /**
   * Whether to dm the member on join
   */
  AllowDM: boolean | number;
  /**
   * The dmed message
   */
  DmMessage?: string;
  /**
   * main message send to the welcome channel
   */
  Message?: string;
  /**
   * Bots server prefix
   */
  Prefix?: string;
  /**
   * The language set to for the server
   * NOTE: not used but set for later on
   */
  Language?: 'en-us';
}

export default class datbaseMainger {
  private _db: DATABASE | null = null;
  public ready = false;
  private _cache = new Map<string, guildConfigs | undefined>();
  constructor(public client: verifyClient) {
    this.client = client;
  }

  /**
   * Only used once to start up the manager
   * this will also set up the guildconfigs table
   */
  public async startMain(): Promise<void> {
    const db = (this._db = await sqlite.open({
      filename: join(process.cwd(), 'database', 'db.sqlite'),
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
    }));

    (
      await db.prepare(`CREATE TABLE IF NOT EXISTS guildConfigs (
      ID TEXT NOT NULL PRIMARY KEY,
      ChannelId TEXT,
      Roles TEXT,
      AllowDM BOOL DEFAULT true,
      DmMessage TEXT NOT NULL DEFAULT "{user} welcome to {server} you have been given the {role}",
      Message TEXT NOT NULL DEFAULT "welcome to {server}",
      Prefix TEXT DEFAULT ';',
      Language TEXT DEFAULT 'en-us'
    )`)
    ).run();

    this.ready = true;
  }

  async get(ID: string, force: boolean = false): Promise<guildConfigs | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) reject(new Error('DB not open yet.'));
      if (!force && this._cache.has(ID)) return resolve(this._cache.get(ID));
      this.db
        ?.get<guildConfigs>('SELECT * FROM guildConfigs WHERE ID = ?', ID)
        .then(d => {
          d && this._cache.set(ID, d);
          return resolve(d);
        })
        .catch(reject);
    });
  }

  update(key: keyof guildConfigs, val: any, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) reject(new Error('DB not open yet.'));
      this._cache.delete(id);
      this.db
        ?.exec(`UPDATE guildConfigs SET ${key} = ${val} WHERE ID = ${id}`)
        .then(() => resolve())
        .catch(reject);
    });
  }

  async new(ID: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) reject(new Error('DB not open yet.'));
      this.db
        ?.exec(`INSERT INTO guildConfigs(ID) VALUES (${ID})`)
        .then(() => resolve())
        .catch(reject);
    });
  }

  async delete(ID: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) reject(new Error('DB not open yet.'));
      this._cache.delete(ID);
      this.db
        ?.exec(`DELETE FROM guildConfigs WHERE ID = ${ID}`)
        .then(() => resolve())
        .catch(reject);
    });
  }

  async migrate(configs?: sqlite.IMigrate.MigrationParams) {
    if (!this.db) return;
    await this.db.migrate({
      ...configs,
      migrationsPath: join(process.cwd(), 'database', 'migrations'),
    });
  }

  get db(): DATABASE | null {
    if (!this.ready) return null;
    return this._db;
  }
}
