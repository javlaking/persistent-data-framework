import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import { SinonStub, match, createSandbox } from 'sinon';
import {MongoDbEntityManager} from '../../../src/manager/mongodb-entity.manager';
import {MongoClient} from "mongodb"
chai.use(sinonChai);
chai.use(chaiAsPromised);
const sb = createSandbox();


describe('MongodbEntityManager', () => {

    beforeEach(() => {

    });

    describe('#findOne()', () => {

        it('should search for a single object within tenant scope', () => {

        });
    });
});