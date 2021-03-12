export class RequestContext {
    applicationContext : ApplicationContext;
    userContext : UserContext;
    
    public requestId : string
}

export class ApplicationContext {
    public applicationId : string
    public schemaVersion : string//don't fit here
    
}


export class UserContext {
    public tenantId : string
    public subjectId: string
}
