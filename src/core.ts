import { Injectable, Optional, Inject } from '@angular/core';
import { noop } from 'rxjs/util/noop';

import { ICollection } from './interfaces';
import { Service } from './service';
import { Resource } from './resource';
import { Base } from './services/base';
import { JsonapiConfig } from './jsonapi-config';
import { Http as JsonapiHttp } from './sources/http.service';
import { StoreService as JsonapiStore } from './sources/store.service';
import { IRelationship } from 'src';
import { forEach } from '../demo/foreach';

@Injectable()
export class Core {
    public static me: Core;
    public static injectedServices: {
        JsonapiStoreService: any;
        JsonapiHttp: any;
        rsJsonapiConfig: JsonapiConfig;
    };

    private resourceServices: { [type:string]: Service } = {};
    public loadingsCounter: number = 0;
    public loadingsStart: Function = noop;
    public loadingsDone: Function = noop;
    public loadingsError: Function = noop;
    public loadingsOffline: Function = noop;

    public config: JsonapiConfig;

    public constructor(
        @Optional() user_config: JsonapiConfig,
        jsonapiStoreService: JsonapiStore,
        jsonapiHttp: JsonapiHttp
    ) {
        this.config = new JsonapiConfig();
        for (let k in this.config)
            (<any>this.config)[k] = ((<any>this.config)[k] !== undefined ? (<any>this.config)[k] : (<any>this.config)[k]);

        Core.me = this;
        Core.injectedServices = {
            JsonapiStoreService: jsonapiStoreService,
            JsonapiHttp: jsonapiHttp,
            rsJsonapiConfig: this.config
        };
    }

    public registerService(clase: Service): Service | false {
        if (clase.type in this.resourceServices) {
            return false;
        }
        this.resourceServices[clase.type] = clase;

        return clase;
    }

    public getResourceService(type: string): Service {
        return this.resourceServices[type];
    }

    public refreshLoadings(factor: number): void {
        this.loadingsCounter += factor;
        if (this.loadingsCounter === 0) {
            this.loadingsDone();
        } else if (this.loadingsCounter === 1) {
            this.loadingsStart();
        }
    }

    public clearCache(): boolean {
        Core.injectedServices.JsonapiStoreService.clearCache();

        return true;
    }

    // just an helper
    public duplicateResource(resource: Resource, ...relations_alias_to_duplicate_too: Array<string>): Resource {
        let newresource = <Resource>this.getResourceService(resource.type).new();
        newresource.attributes = { ...newresource.attributes, ...resource.attributes };
        newresource.attributes.name = newresource.attributes.name + ' xXx';

        forEach(resource.relationships, (relationship: IRelationship, alias: string) => {
            if ('id' in relationship.data) {
                // relation hasOne
                if (relations_alias_to_duplicate_too.indexOf(alias) > -1) {
                    newresource.addRelationship(this.duplicateResource(<Resource>relationship.data), alias);
                } else {
                    newresource.addRelationship(<Resource>relationship.data, alias);
                }
            } else {
                // relation hasMany
                if (relations_alias_to_duplicate_too.indexOf(alias) > -1) {
                    Base.forEach(relationship.data, relationresource => {
                        newresource.addRelationship(this.duplicateResource(relationresource), alias);
                    });
                } else {
                    newresource.addRelationships(<ICollection>relationship.data, alias);
                }
            }
        });

        return newresource;
    }
}
