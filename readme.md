# RESTful Cart Service

## Overview

I have implemented the API in the RESTful manner, which implies that the cart service manages resources uniquely identified by opaque URIs. API clients request the state of these resources as well as change their state by navigating links (hypermedia-based API discovery) provided as a part of resource state response. The semantics of the links is explained through associated link relation types.

Cart API has two types of resources: cart, which is a collection of other type of resource - cart item. I use Hypertext Application Language (http://stateless.co/hal_specification.html) as a more or less standardized communication format which is advertised and enforced by the usage of their recommended MIME type (application/hal+json) for both request and response 'Content-Type' headers. HAL format defines the way to provide hypermedia links as well as their relations. I use standard IANA link relation types whenever it is possible. For not-standard link relation types I use HAL-standardized 'curies' relation type which nicely maps a custom relation identifier to the URL of the document which describes a relation in the both human and machine-readable manner.

```
"_links": {
    "self": {
      "href": "/cart/ac7ca39a-39ab-47f3-9a8c-95bda83e1c4d"
    },
    "curies": [
      {
        "name": "cart",
        "href": "/public/rels/{rel}",
        "templated": true
      }
    ],
}
```

which, for instance, maps the 'cart:delete' link relation type to the '/public/rels/delete' document, thus providing details about this relation.

The API leverages various HTTP protocol features to implement optimistic concurrency (Etag header in response, 'If-Match' header in a state modifying request), cached resource state validation (HEAD and GET requests with 'If-None-Match' header), potential protection from API hammering ('Cache-Control' header set to 'max-age=10, must-revalidate, public' for all responses containing resource state). A wide range of HTTP response status codes is used to provide user with meaningful requests results (200, 204, 304, 404, 405, 412, 422). The API implementation explicitly distinguishes resource validation request from resource state requests which potentially allows to receive requested resource state metadata from in-memory metadata storage skipping long travel to a primary data storage.  

The discovery of the API is starts by sending 'OPTIONS' request to the service endpoint ('/cart'). The response is supposed to contain a list of allowed HTTP verbs in the 'Alowed' header and a URL to the API documentation in the body.

```
HTTP/1.1 200 OK
Cache-Control: max-age=10, must-revalidate, public
Content-Length: 32
Date: Wed, 15 Jun 2016 19:11:09 GMT
Connection: keep-alive

Documentation: /public/docs/cart
```

Unfortunately, the framework which I chose to base the API on has its own OPTIONS request handler (probably to take care of CORS requests) and I was not able to find a way to override the default handler in the given time frame.

Further discovery of the API is based on hypermedia links provided in resource state responses and the related documents describing standard and custom link relation types.

I have also created 30+ functional tests which can server as a pretty good definition of API's public contract. To run tests please use 'npm test' after installation (described below).

## API Summary

/cart - POST - creates a new cart
/cart/{id} - POST - adds items into a cart
/cart/{id} - PUT - replaces all items in a cart
/cart/{id} - DELETE - deletes a cart
/cart/item/{id} - PUT - replaces item in a cart
/cart/item/{id} - PATCH - patches item in a cart  
/cart/item/{id} - DELETE - deletes item from a cart    

## Implementation

The API implementation is based on the 'actionhero' web service framework. It uses 'mocha' as a testing framework and 'should' for fluent assertions. Conceptually, the implementation has three layers.

Controller (actions\cart.js) layer - classically routes data between model and views.

API or model (initializes\cart.js) layer - responsible for the data validation and normalization and routing the data to and from storage providers.

Storage layer (initializes\storage.js) - abstracts storage API and provides its in-memory implementation.

intializers\view.js - common response rendering code.

intializers\action.js - common controller code.

intializers\middleware.js - actionhero middleware (http://www.actionherojs.com/images/connection_flow.png) definitions. Contains a single middleware that enforces usage of the HAL content type (application/hal+json) in a resource state response.

In spite of the fact that there is a shared global state (the in-memory storage), the implementation does not address race conditions because, as far as I understand, they are not an issue with node.js where asynchrony is based on assignment of threads from teh worker thread pool to a task by the task scheduler (similar to async-await task-based asynchrony pattern in .NET). Task scheduler does not assign a new task to a user code if the previous assignment has not returned yet. This ensures a sequential handling of incoming HTTP requests, effectively preventing race conditions. Though, since this is literally the very first time when I use node.js, I can be wrong and some extra work to avoid race conditions may be required.

## Installation

actionhero requires node.js ( >= v4.0.0) and npm.

1. Create a new directory: mkdir ~/antipin && cd ~/antipin
2. Checkout the actionhero source: npm install actionhero
3. Use the generator to create a template project: ./node_modules/.bin/actionhero generate
3. Remove obsolete template project data: rm -rf actions config initializers public test package.json
4. Unzip the provided archive into the project's directory: unzip antipin.zip -d ~/antipin
5. Install dependencies: npm install
6. Run tests: npm test
7. Run service: npm start
