'use strict';

const get = require('lodash.get');
const isEmpty = require('lodash.isempty');

const DEFAULT_MAX_REQUESTS_PER_SECOND = 10000;
const DEFAULT_MAX_CONCURRENT_REQUESTS = 5000;

const isApiGatewayEndpoint = event => {
  return event.http ? true : false;
}

class ApiGatewayEndpointThrottlingSettings {
  constructor(functionName, event, globalSettings) {
    this.functionName = functionName;

    if (typeof (event.http) === 'string') {
      let parts = event.http.split(' ');
      this.method = parts[0];
      this.path = parts[1];
    }
    else {
      this.path = event.http.path;
      this.method = event.http.method;
    }

    const throttlingDisabled = get(event.http.throttling, 'disabled') == true;
    if (throttlingDisabled) {
      // https://github.com/DianaIonita/serverless-api-gateway-throttling/issues/5
      // -1 disables for a specific endpoint
      this.maxConcurrentRequests = -1;
      this.maxRequestsPerSecond = -1;
    }
    else {
      this.maxRequestsPerSecond = get(event.http.throttling, 'maxRequestsPerSecond', globalSettings.maxRequestsPerSecond);
      this.maxConcurrentRequests = get(event.http.throttling, 'maxConcurrentRequests', globalSettings.maxConcurrentRequests);
    }
  }
}
class ApiGatewayThrottlingSettings {
  constructor(serverless, options) {
    if (!get(serverless, 'service.custom.apiGatewayThrottling')) {
      serverless.cli.log('[serverless-api-gateway-throttling] Warning: throttling settings not found, the plugin won\'t perform any actions.');
      return;
    }
    if (options) {
      this.stage = options.stage || serverless.service.provider.stage;
      this.region = options.region || serverless.service.provider.region;
    } else {
      this.stage = serverless.service.provider.stage;
      this.region = serverless.service.provider.region;
    }
    this.maxRequestsPerSecond = serverless.service.custom.apiGatewayThrottling.maxRequestsPerSecond || DEFAULT_MAX_REQUESTS_PER_SECOND;
    this.maxConcurrentRequests = serverless.service.custom.apiGatewayThrottling.maxConcurrentRequests || DEFAULT_MAX_CONCURRENT_REQUESTS;

    this.endpointSettings = [];

    for (let functionName in serverless.service.functions) {
      let functionSettings = serverless.service.functions[functionName];
      if (isEmpty(functionSettings.events)) {
        continue;
      }
      for (let event of functionSettings.events) {
        if (isApiGatewayEndpoint(event)) {
          this.endpointSettings.push(new ApiGatewayEndpointThrottlingSettings(functionName, event, this))
        }
      }
    }
  }
}

module.exports = ApiGatewayThrottlingSettings;
