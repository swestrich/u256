'use strict';

var u256 = require('./');
var expect = require("chai").expect;

describe("u256 based arithmatic", function() {
  describe("creation", function() {
    it("string", function() {
      expect(new u256("123").u32).to.deep.equal([0,0,0,0,0,0,0,123]);
    });
    it("empty string", function() {
      expect(new u256("").u32).to.deep.equal([0,0,0,0,0,0,0,0]);
    });
  });
});