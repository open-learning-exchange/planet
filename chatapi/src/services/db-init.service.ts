import nano from 'nano';

export class DbInitService {
  db: any;

  constructor(databaseUrl: string, databaseName: string) {
    const nanoDB = nano(databaseUrl);
    this.db = nanoDB.use(databaseName);
  }
}
