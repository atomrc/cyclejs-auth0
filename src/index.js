"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.protect = exports.makeAuth0Driver = undefined;

var _makeAuth0Driver = require("./makeAuth0Driver");

var _makeAuth0Driver2 = _interopRequireDefault(_makeAuth0Driver);

var _protectComponent = require("./protectComponent");

var _protectComponent2 = _interopRequireDefault(_protectComponent);

var _auth0Lock = require("auth0-lock");

var _auth0Lock2 = _interopRequireDefault(_auth0Lock);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var makeAuth0Driver = exports.makeAuth0Driver = (0, _makeAuth0Driver2.default)(_auth0Lock2.default, window.localStorage);
var protect = exports.protect = _protectComponent2.default;
exports.default = makeAuth0Driver;