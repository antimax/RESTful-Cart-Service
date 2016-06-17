'use strict';

var should  = require('should');
var request = require('request');
var actionheroPrototype = require('actionhero').actionheroPrototype;
var actionhero = new actionheroPrototype();
var api;
var url;

var halContentType = 'application/hal+json';
var contentType = 'application/json';
var headers = { 'Content-type': contentType };
var cart = { items: [ { quantity: 3, title: 'Galaxy S7 edge' }, { quantity: 2, title: 'Samsung Gear S2' } ] };
var anotherCart = { items: [
  { quantity: 1, title: 'Samsung 78” Class KS9800 9-Series Curved 4K SUHD TV (2016 Model)' },
  { quantity: 1, title: 'Samsung 4K Ultra HD Blu-ray Player' }
] };

before('Starting actionhero web service', done => {
  actionhero.start((error, a) => {
    api = a;
    url = 'http://localhost:' + api.config.servers.web.port;
    done();
  });
});

describe('Cart Endpoint', () => {
  beforeEach('Storage reset', () => { api.storage._reset() });

  let requestPost = function(path, headers, body, callback) {
    return request.post(url + path, { body: JSON.stringify(body), headers: headers }, callback);
  };

  let requestGet = function(path, headers, callback) {
    return request.get(url + path, {headers: headers}, callback);
  };

  let requestHead = function(path, headers, callback) {
    return request.head(url + path, {headers: headers}, callback);
  };

  let requestDelete = function(path, headers, callback) {
    return request.delete(url + path, {headers: headers}, callback);
  };

  let requestPut = function(path, headers, body, callback) {
    return request.put(url + path, { body: JSON.stringify(body), headers: headers }, callback);
  };

  let requestPatch = function(path, headers, body, callback) {
    return request.patch(url + path, { body: JSON.stringify(body), headers: headers }, callback);
  };

  let cachingResponseHeadersValidators = function(error, response, body) {
    it('Respone headers: should contain the valid weak Etag header', () => {
      response().headers.etag.should.match(/^W\/\"[^\"]+\"$/);
    });

    it('Respone headers: should contain the Cache-Control header', () => {
      response().headers.should.have.property('cache-control');
    });
  }

  let dataResponseHeadersValidators = function(error, response, body) {
    cachingResponseHeadersValidators(error, response, body);

    it('Respone headers: status code should be 200', () => {
      response().statusCode.should.be.equal(200);
    });

    it('Respone headers: Content-Type header should be \"' + halContentType + '\"', () => {
      response().headers['content-type'].should.be.equal(halContentType);
    });
  }

  let cartResponseBodyValidators = function(error, response, body, expectedResponseItems) {
    it('Respone body: links should contain an expected number of item references', () => {
      let resp = JSON.parse(body());
      resp._links.item.length.should.be.equal((expectedResponseItems || []).length);
    });

    it('Respone body: links should contain \"self\" and \"curies\" relations', () => {
      let resp = JSON.parse(body());
      resp._links.should.have.properties('self', 'curies');
    });

    it('Respone body: item count should be an expected value' , () => {
      let resp = JSON.parse(body());
      resp.itemCount.should.be.equal((expectedResponseItems || []).length);
    });

    it('Respone body: total quantity should be an expected value' , () => {
      let resp = JSON.parse(body());
      resp.totalQuantity.should.be.equal((expectedResponseItems || []).reduce((prev, curr) => { return prev + curr.quantity }, 0));
    });

    it('Respone body: should have all expected items embedded' , () => {
      let resp = JSON.parse(body());
      resp._embedded.item.forEach((current, index) => {
        if (current.title != expectedResponseItems[index].title || current.quantity != expectedResponseItems[index].quantity) {
          resp.should.fail(current, expectedResponseItems[index]);
        }
      });
    });
  }

  let cartItemResponseBodyValidators = function(error, response, body, expectedItem) {
    it('Respone body: links should contain \"self\" and \"curies\" relations', () => {
      let resp = JSON.parse(body());
      resp._links.should.have.properties('self', 'curies');
    });

    it('Respone body: should have an expected item' , () => {
      let resp = JSON.parse(body());
      if (resp.title != expectedItem.title || resp.quantity != expectedItem.quantity) { resp.should.fail(resp, expectedItem) };
    });
  }

  let bodylessResponseValidators = function(error, response, body, statusCode) {
    it('Respone headers: status code should be ' + statusCode, () => {
      response().statusCode.should.be.equal(statusCode);
    });

    it('Respone body: should be empty', () => {
      body().should.be.empty();
    });
  }

  let createCartRequestWrapper = function(requestBody) {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, requestBody, (e, r, b) => {
        error = e;
        response = r;
        body = b;
        done();
      });
    });

    dataResponseHeadersValidators(() => error, () => response, () => body);
    cartResponseBodyValidators(() => error, () => response, () => body, requestBody.items);
  }

  // Cart create

  describe('Create cart', () => {
    createCartRequestWrapper(cart);
  });

  describe('Create cart with empty items list', () => {
    createCartRequestWrapper({ items: [] });
  });

  describe('Create empty cart', () => {
    createCartRequestWrapper({});
  });

  // Cart GET

  describe('GET cart by the self link', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestGet(resp._links.self.href, {}, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    dataResponseHeadersValidators(() => error, () => response, () => body);
    cartResponseBodyValidators(() => error, () => response, () => body, cart.items);
  });

  describe('GET cart by an invalid link', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestGet(resp._links.self.href + 'something', {}, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 404);
  });

  describe('GET cart by a valid link with current If-None-Match header value', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestGet(resp._links.self.href, { 'If-None-Match': r.headers.etag }, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 304);
  });

  describe('GET cart by a valid link with non-current If-None-Match header value', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestGet(resp._links.self.href, { 'If-None-Match': r.headers.etag + 'something' }, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    dataResponseHeadersValidators(() => error, () => response, () => body);
    cartResponseBodyValidators(() => error, () => response, () => body, cart.items);
  });

  // Cart HEAD

  describe('HEAD cart by the self link', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._links.self.href, {}, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 200);
    cachingResponseHeadersValidators(() => error, () => response, () => body);
  });

  describe('HEAD cart by an invalid link', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._links.self.href + 'something', {}, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 404);
  });

  describe('HEAD cart by a valid link with current If-None-Match header value', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._links.self.href, { 'If-None-Match': r.headers.etag }, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 304);
  });

  describe('HEAD cart by a valid link with non-current If-None-Match header value', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._links.self.href, { 'If-None-Match': r.headers.etag + 'something' }, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 200);
    cachingResponseHeadersValidators(() => error, () => response, () => body);
  });

  // cart DELETE

  describe('DELETE cart by an invalid link', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestDelete(resp._links.self.href + 'something', {}, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 404);
  });

  describe('DELETE cart without If-Match header', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestDelete(resp._links.self.href, {}, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 412);
  });

  describe('DELETE cart with an invalid If-Match header', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestDelete(resp._links.self.href, { 'If-Match': r.headers.etag + 'something' }, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 412);
  });

  describe('DELETE cart with a valid If-Match header', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestDelete(resp._links.self.href, { 'If-Match': r.headers.etag }, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 204);
  });

  describe('DELETE cart with a valid If-Match header, subsequent request', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestDelete(resp._links.self.href, { 'If-Match': r.headers.etag }, (e, r, b) => {
          requestGet(resp._links.self.href, {}, (e, r, b) => {
            error = e;
            response = r;
            body = b;
            done();
          })
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 404);
  });

  // Cart item GET

  describe('GET cart item by the item link', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestGet(resp._links.item[0].href, {}, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    dataResponseHeadersValidators(() => error, () => response, () => body);
    cartItemResponseBodyValidators(() => error, () => response, () => body, cart.items[0]);
  });

  describe('GET cart item by the embedded self link', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestGet(resp._embedded.item[0]._links.self.href, {}, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    dataResponseHeadersValidators(() => error, () => response, () => body);
    cartItemResponseBodyValidators(() => error, () => response, () => body, cart.items[0]);
  });

  describe('GET cart item by an invalid link', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestGet(resp._links.item[0].href + 'something', {}, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 404);
  });

  describe('GET cart item by a valid link with current If-None-Match header value', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestGet(resp._links.item[0].href, {}, (e, r, b) => {
          requestGet(resp._links.item[0].href, { 'If-None-Match': r.headers.etag }, (e, r, b) => {
            error = e;
            response = r;
            body = b;
            done();
          })
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 304);
  });

  describe('GET cart item by a valid link with non-current If-None-Match header value', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestGet(resp._links.item[0].href, {}, (e, r, b) => {
          requestGet(resp._links.item[0].href, { 'If-None-Match': r.headers.etag + 'something' }, (e, r, b) => {
            error = e;
            response = r;
            body = b;
            done();
          })
        })
      });
    });

    dataResponseHeadersValidators(() => error, () => response, () => body);
    cartItemResponseBodyValidators(() => error, () => response, () => body, cart.items[0]);
  });

  // Cart item HEAD

  describe('HEAD cart item by the item link', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._links.item[0].href, {}, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 200);
    cachingResponseHeadersValidators(() => error, () => response, () => body);
  });

  describe('HEAD cart item by the embedded self link', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._embedded.item[0]._links.self.href, {}, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 200);
    cachingResponseHeadersValidators(() => error, () => response, () => body);
  });

  describe('HEAD cart item by an invalid link', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._links.item[0].href + 'something', {}, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 404);
  });

  describe('HEAD cart item by a valid link with current If-None-Match header value', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._links.item[0].href, {}, (e, r, b) => {
          requestHead(resp._links.item[0].href, { 'If-None-Match': r.headers.etag }, (e, r, b) => {
            error = e;
            response = r;
            body = b;
            done();
          })
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 304);
  });

  describe('HEAD cart item by a valid link with non-current If-None-Match header value', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._links.item[0].href, {}, (e, r, b) => {
          requestHead(resp._links.item[0].href, { 'If-None-Match': r.headers.etag + 'something' }, (e, r, b) => {
            error = e;
            response = r;
            body = b;
            done();
          })
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 200);
    cachingResponseHeadersValidators(() => error, () => response, () => body);
  });

  // cart DELETE

  describe('DELETE cart item by an invalid link', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestDelete(resp._links.item[0].href + 'something', {}, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 404);
  });

  describe('DELETE cart item without If-Match header', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestDelete(resp._links.item[0].href, {}, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 412);
  });

  describe('DELETE cart item with an invalid If-Match header', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestDelete(resp._links.item[0].href, { 'If-Match': 'something' }, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 412);
  });

  describe('DELETE cart item with a valid If-Match header', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._links.item[0].href, {}, (e, r, b) => {
          requestDelete(resp._links.item[0].href, { 'If-Match': r.headers.etag }, (e, r, b) => {
            error = e;
            response = r;
            body = b;
            done();
          })
        });
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 204);
  });

  describe('DELETE cart item with a valid If-Match header, subsequent get item request', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._links.item[0].href, {}, (e, r, b) => {
          requestDelete(resp._links.item[0].href, { 'If-Match': r.headers.etag }, (e, r, b) => {
            requestHead(resp._links.item[0].href, {}, (e, r, b) => {
              error = e;
              response = r;
              body = b;
              done();
            })
          })
        });
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 404);
  });

  describe('DELETE cart item with a valid If-Match header, subsequent get cart request', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._links.item[0].href, {}, (e, r, b) => {
          requestDelete(resp._links.item[0].href, { 'If-Match': r.headers.etag }, (e, r, b) => {
            requestGet(resp._links.self.href, {}, (e, r, b) => {
              error = e;
              response = r;
              body = b;
              done();
            })
          })
        });
      });
    });

    dataResponseHeadersValidators(() => error, () => response, () => body);
    cartResponseBodyValidators(() => error, () => response, () => body, [cart.items[1]]);
  });

  describe('DELETE all cart items one by one, subsequent get cart request', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._links.item[0].href, {}, (e, r, b) => {
          requestDelete(resp._links.item[0].href, { 'If-Match': r.headers.etag }, (e, r, b) => {
            requestHead(resp._links.item[1].href, {}, (e, r, b) => {
              requestDelete(resp._links.item[1].href, { 'If-Match': r.headers.etag }, (e, r, b) => {
                requestGet(resp._links.self.href, {}, (e, r, b) => {
                  error = e;
                  response = r;
                  body = b;
                  done();
                })
              })
            })
          })
        });
      });
    });

    dataResponseHeadersValidators(() => error, () => response, () => body);
    cartResponseBodyValidators(() => error, () => response, () => body, []);
  });

  // cart PUT

  describe('PUT cart items by an invalid link', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestPut(resp._links.self.href + 'something', headers, anotherCart, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 404);
  });

  describe('PUT cart items without If-Match header', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestPut(resp._links.self.href, headers, anotherCart, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 412);
  });

  describe('PUT cart items with an invalid If-Match header', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestPut(resp._links.self.href, { 'Content-type': contentType, 'If-Match': r.headers.etag + 'something' }, anotherCart, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 412);
  });

  describe('PUT cart items with a valid If-Match header', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestPut(resp._links.self.href, { 'Content-type': contentType, 'If-Match': r.headers.etag }, anotherCart, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    dataResponseHeadersValidators(() => error, () => response, () => body);
    cartResponseBodyValidators(() => error, () => response, () => body, anotherCart.items);
  });

  describe('PUT empty cart items with a valid If-Match header', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestPut(resp._links.self.href, { 'Content-type': contentType, 'If-Match': r.headers.etag }, { items: [] }, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    dataResponseHeadersValidators(() => error, () => response, () => body);
    cartResponseBodyValidators(() => error, () => response, () => body, []);
  });

  // cart POST

  describe('POST cart items by an invalid link', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestPost(resp._links.self.href + 'something', headers, anotherCart, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 404);
  });

  describe('POST cart items without If-Match header', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestPost(resp._links.self.href, headers, anotherCart, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 412);
  });

  describe('POST cart items with an invalid If-Match header', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestPost(resp._links.self.href, { 'Content-type': contentType, 'If-Match': r.headers.etag + 'something' }, anotherCart, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 412);
  });

  describe('POST empty cart items with a valid If-Match header', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestPost(resp._links.self.href, { 'Content-type': contentType, 'If-Match': r.headers.etag }, { items: [] }, (e, r, b) => {
          error = e;
          response = r;
          body = b;
          done();
        })
      });
    });

    dataResponseHeadersValidators(() => error, () => response, () => body);
    cartResponseBodyValidators(() => error, () => response, () => body, cart.items);
  });

  // cart item PUT

  describe('PUT cart item by an invalid link', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._links.item[0].href, headers,(e, r, b) => {
          requestPut(resp._links.item[0].href + 'something', headers, { item: anotherCart.items[0] }, (e, r, b) => {
            error = e;
            response = r;
            body = b;
            done();
          })
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 404);
  });

  describe('PUT cart item without If-Match header', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._links.item[0].href, headers,(e, r, b) => {
          requestPut(resp._links.item[0].href, headers, { item: anotherCart.items[0] }, (e, r, b) => {
            error = e;
            response = r;
            body = b;
            done();
          })
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 412);
  });

  describe('PUT cart item with an invalid If-Match header', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._links.item[0].href, headers,(e, r, b) => {
          requestPut(resp._links.item[0].href, { 'Content-type': contentType, 'If-Match': r.headers.etag + 'something' }, { item: anotherCart.items[0] }, (e, r, b) => {
            error = e;
            response = r;
            body = b;
            done();
          })
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 412);
  });

  describe('PUT cart item with a valid If-Match header', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._links.item[0].href, headers,(e, r, b) => {
          requestPut(resp._links.item[0].href, { 'Content-type': contentType, 'If-Match': r.headers.etag }, { item: anotherCart.items[0] }, (e, r, b) => {
            error = e;
            response = r;
            body = b;
            done();
          })
        })
      });
    });

    dataResponseHeadersValidators(() => error, () => response, () => body);
    cartItemResponseBodyValidators(() => error, () => response, () => body, anotherCart.items[0]);
  });

  describe('PUT cart item with a valid If-Match header, subsequent cart request', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._links.item[0].href, headers,(e, r, b) => {
          requestPut(resp._links.item[0].href, { 'Content-type': contentType, 'If-Match': r.headers.etag }, { item: anotherCart.items[0] }, (e, r, b) => {
            requestGet(resp._links.self.href, headers,(e, r, b) => {
              error = e;
              response = r;
              body = b;
              done();
            })
          })
        })
      });
    });

    dataResponseHeadersValidators(() => error, () => response, () => body);
    cartResponseBodyValidators(() => error, () => response, () => body, [ anotherCart.items[0], cart.items[1] ]);
  });

  // cart item PATCH

  describe('PATCH cart item by an invalid link', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._links.item[0].href, headers,(e, r, b) => {
          requestPatch(resp._links.item[0].href + 'something', headers, { item: anotherCart.items[0] }, (e, r, b) => {
            error = e;
            response = r;
            body = b;
            done();
          })
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 404);
  });
  describe('PATCH cart item without If-Match header', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._links.item[0].href, headers,(e, r, b) => {
          requestPatch(resp._links.item[0].href, headers, { item: anotherCart.items[0] }, (e, r, b) => {
            error = e;
            response = r;
            body = b;
            done();
          })
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 412);
  });

  describe('PATCH cart item with an invalid If-Match header', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._links.item[0].href, headers,(e, r, b) => {
          requestPatch(resp._links.item[0].href, { 'Content-type': contentType, 'If-Match': r.headers.etag + 'something' }, { item: anotherCart.items[0] }, (e, r, b) => {
            error = e;
            response = r;
            body = b;
            done();
          })
        })
      });
    });

    bodylessResponseValidators(() => error, () => response, () => body, 412);
  });

  describe('PATCH cart item title with a valid If-Match header', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._links.item[0].href, headers,(e, r, b) => {
          requestPatch(resp._links.item[0].href, { 'Content-type': contentType, 'If-Match': r.headers.etag }, { item: { title: anotherCart.items[0].title } }, (e, r, b) => {
            error = e;
            response = r;
            body = b;
            done();
          })
        })
      });
    });

    dataResponseHeadersValidators(() => error, () => response, () => body);
    cartItemResponseBodyValidators(() => error, () => response, () => body, { title: anotherCart.items[0].title, quantity: cart.items[0].quantity });
  });

  describe('PATCH cart item title with a valid If-Match header, subsequent cart request', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._links.item[0].href, headers,(e, r, b) => {
          requestPatch(resp._links.item[0].href, { 'Content-type': contentType, 'If-Match': r.headers.etag }, { item: { title: anotherCart.items[0].title } }, (e, r, b) => {
            requestGet(resp._links.self.href, headers,(e, r, b) => {
              error = e;
              response = r;
              body = b;
              done();
            })
          })
        })
      });
    });

    dataResponseHeadersValidators(() => error, () => response, () => body);
    cartResponseBodyValidators(() => error, () => response, () => body, [ { title: anotherCart.items[0].title, quantity: cart.items[0].quantity }, cart.items[1] ]);
  });

  describe('PATCH cart item quantity with a valid If-Match header', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._links.item[0].href, headers,(e, r, b) => {
          requestPatch(resp._links.item[0].href, { 'Content-type': contentType, 'If-Match': r.headers.etag }, { item: { quantity: anotherCart.items[0].quantity } }, (e, r, b) => {
            error = e;
            response = r;
            body = b;
            done();
          })
        })
      });
    });

    dataResponseHeadersValidators(() => error, () => response, () => body);
    cartItemResponseBodyValidators(() => error, () => response, () => body, { title: cart.items[0].title, quantity: anotherCart.items[0].quantity });
  });

  describe('PATCH cart item quantity with a valid If-Match header, subsequent cart request', () => {
    let error;
    let response;
    let body;

    before(done => {
      requestPost('/cart', headers, cart, (e, r, b) => {
        let resp = JSON.parse(b);
        requestHead(resp._links.item[0].href, headers,(e, r, b) => {
          requestPatch(resp._links.item[0].href, { 'Content-type': contentType, 'If-Match': r.headers.etag }, { item: { quantity: anotherCart.items[0].quantity } }, (e, r, b) => {
            requestGet(resp._links.self.href, headers,(e, r, b) => {
              error = e;
              response = r;
              body = b;
              done();
            })
          })
        })
      });
    });

    dataResponseHeadersValidators(() => error, () => response, () => body);
    cartResponseBodyValidators(() => error, () => response, () => body, [ { title: cart.items[0].title, quantity: anotherCart.items[0].quantity }, cart.items[1] ]);
  });
});
