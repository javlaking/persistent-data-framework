import { ApplicationContext, RequestContext, UserContext } from "../models/request-context.model"
import {MongoClient,Db,ObjectID} from "mongodb"

export class MongoDbEntityManager {


    constructor(protected client : MongoClient) {
    }

    public init() {
        return this.client.connect();
        
    }

    public findOne(databaseName : string, objectType: string, query: Object, context : RequestContext) {
        let safeQuery = this.getJSONClone(query);
        delete safeQuery._metadata;
        let findQuery = this.getFindQuery(context,safeQuery);
        return this.client.db(databaseName).collection(objectType).findOne(findQuery)
    }

    public find(databaseName : string, objectType: string, query: Object, context : RequestContext) {

        let safeQuery = this.getJSONClone(query);
        delete safeQuery._metadata;
        let findQuery = this.getFindQuery(context,safeQuery);

        return this.client.db(databaseName).collection(objectType).find(findQuery)
    }

    public add(databaseName : string, objectType: string, object : any, context : RequestContext) {
        let safeObject = this.getJSONClone(object);
        safeObject['_metadata'] = this.getMetadataForNewObject(context);
        console.log("add object",safeObject);
        return this.client.db(databaseName).collection(objectType).insertOne(safeObject).then(a =>  {
            let historyObject =this.getJSONClone(a["ops"][0]);
            historyObject._id = historyObject._id+"-"+historyObject._metadata.state.objectVersion;
            this.client.db(databaseName+"_history").collection(objectType).insertOne(historyObject) 
            return a;
        }
         )

    }

    public update(databaseName : string, objectType: string, object : any, context : RequestContext, objectVersion : number = null) {
        let safeObject = this.getJSONClone(object);
        delete safeObject._id;
        
        let conditionQuery = this.getUpdateConditionQuery(context,object._id,objectVersion != null ? objectVersion -1 : null);
        let updateQuery = this.getUpdateQuery(context,safeObject, objectVersion)
        console.log("update object",conditionQuery,updateQuery);
        return this.client.db(databaseName).collection(objectType).findOneAndUpdate(conditionQuery,updateQuery, {returnOriginal: false}).then(a =>  {
            let historyObject =this.getJSONClone(a.value);
            historyObject._id = historyObject._id+"-"+historyObject._metadata.state.objectVersion;
            this.client.db(databaseName+"_history").collection(objectType).insertOne(historyObject) 
            return a;
        })
    }

    public remove(databaseName : string, objectType: string, object : any, context : RequestContext, objectVersion : number = null) {
        let conditionQuery = this.getUpdateConditionQuery(context,object._id,objectVersion != null ? objectVersion -1 : null);
        let updateQuery = this.getUpdateQuery(context,{},null,true);
        console.log("remove object",conditionQuery,updateQuery);
        return this.client.db(databaseName).collection(objectType).findOneAndUpdate(conditionQuery,updateQuery, {returnOriginal: false}).then(a =>  {
            let historyObject =this.getJSONClone(a.value);
            historyObject._id = historyObject._id+"-"+historyObject._metadata.state.objectVersion;
            this.client.db(databaseName+"_history").collection(objectType).insertOne(historyObject) 
            return a;
        })
    }

    private getJSONClone(object : any)  {
        let safeObject = JSON.parse(JSON.stringify(object));
        return safeObject;

    }

    private getFindQuery(context : RequestContext, query: any) {
        return {"$and": [query, {'_metadata.state.deleted':false},{$or:[ {"_metadata.owner.teanantId": context.userContext.tenantId}, {"_metadata.owner.teanantId":{"$exists":0}} ]}]};
    }

    private getUpdateConditionQuery(context : RequestContext, objectId : string, objectVersion : number = null) {
        let conditionQuery : any = {"_id":objectId, '_metadata.owner.teanantId': context.userContext.tenantId,'_metadata.state.deleted':false}

        if(objectVersion != null) {
            conditionQuery['_metadata.state.objectVersion'] = objectVersion;
        }

        return conditionQuery;
    }

    private getUpdateQuery(context : RequestContext, object : any = {}, objectVersion: number = null, deleteObject: boolean = null) {


        Object.entries(this.getMetadataForUpdatingObject(context,objectVersion,deleteObject)).forEach(([key, value]) => object['_metadata.'+key] = value);

        let updateQuery : any = {'$set': object };

        if(objectVersion == null) {
            updateQuery['$inc'] = {'_metadata.state.objectVersion':1};
        }
        
        return updateQuery;

    }
    private getMetadataForUpdatingObject(context : RequestContext, objectVersion: number = null, deleteObject: boolean = null) {

        let currentDate = new Date();
        let metaData : any = {
            'origin.modifiedBy': context.userContext.subjectId,
            'origin.modifiedAt': currentDate,
            'origin.applicationId': context.applicationContext.applicationId,
            'origin.requestId': context.requestId,
            'origin.schemaVersion': 'TODO'
        }

        if(objectVersion != null) {
            metaData['state.objectVersion'] = objectVersion;
        }
        
        if(deleteObject != null) {
            metaData['state.deleted'] = deleteObject;
        }

        return metaData;
    }

    private getMetadataForNewObject(context : RequestContext) {
        let currentDate = new Date();
        let metaData : any = {
            'origin':{
                'createdBy': context.userContext.subjectId,
                'modifiedBy': context.userContext.subjectId,
                'createdAt': currentDate,
                'modifiedAt': currentDate,
                'applicationId': context.applicationContext.applicationId,
                'requestId': context.requestId,
                'schemaVersion': 'TODO'
            },
            'owner': {
                'teanantId': context.userContext.tenantId
            },
            'state':{
                'objectVersion': 1,
                'deleted': false
            }};
        return metaData;

    }
}

let mdem = new MongoDbEntityManager(new MongoClient("mongodb://localhost:27017"));

let context = new RequestContext();
context.applicationContext = new ApplicationContext();
context.applicationContext.applicationId ="some-applicationID";
context.requestId = "some-request-id";
context.userContext = new UserContext();
context.userContext.subjectId = "some subject id"
context.userContext.tenantId ="some tenant id";
 mdem.init().then(
() => {

    mdem.add("test","test",{"hi":"hi"},context).then(a =>{

        console.log(a["ops"][0]);
        mdem.update("test","test",{"_id": a["ops"][0]._id,"hi":"se"},context).then((b) => 
        {
            console.log(b.value)
            mdem.remove("test","test",{"_id": b.value._id,"hi":"se"},context).then((c) => console.log(c.value))
        })

    })
   
}

)
console.log("run");