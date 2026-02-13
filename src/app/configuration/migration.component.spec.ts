import { MigrationComponent } from './migration.component';
import { stringToHex } from '../shared/utils';

describe('MigrationComponent', () => {
  let component: MigrationComponent;

  beforeEach(() => {
    component = new MigrationComponent(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
  });

  it('accepts userdb names when encoded planet and user values are valid and round-trip decode', () => {
    const dbName = `userdb-${stringToHex('my-planet')}-${stringToHex('alice')}`;

    expect(component.isUserDbForPlanet(dbName, 'my-planet')).toBeTrue();
  });

  it('rejects userdb names when encoded values are not hex', () => {
    expect(component.isUserDbForPlanet('userdb-nothex-zz', 'my-planet')).toBeFalse();
  });

  it('rejects userdb names when decoded planet code does not match', () => {
    const dbName = `userdb-${stringToHex('other-planet')}-${stringToHex('alice')}`;

    expect(component.isUserDbForPlanet(dbName, 'my-planet')).toBeFalse();
  });
});
