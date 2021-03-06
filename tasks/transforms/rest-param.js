/**
 * Copyright 2013 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
var Syntax = require('esprima-fb').Syntax;
var utils = require('jstransform/src/utils');

function _nodeIsFunctionWithRestParam(node) {
  return (node.type === Syntax.FunctionDeclaration
          || node.type === Syntax.FunctionExpression
          || node.type === Syntax.ArrowFunctionExpression)
         && node.rest;
}

function visitFunctionParamsWithRestParam(traverse, node, path, state) {
  // Render params.
  if (node.params.length) {
    utils.catchup(node.params[node.params.length - 1].range[0], state);
    path.unshift(node);
    traverse(node.params[node.params.length - 1], path, state);
    path.shift();
    utils.catchup(node.params[node.params.length - 1].range[1], state);
  } else {
    // -3 is for ... of the rest.
    utils.catchup(node.rest.range[0] - 3, state);
  }
  utils.catchupWhiteSpace(node.rest.range[1], state);
}

visitFunctionParamsWithRestParam.test = function(node, path, state) {
  return _nodeIsFunctionWithRestParam(node);
};

function renderRestParamSetup(functionNode) {
  var name = functionNode.rest.name
    , len = functionNode.params.length;

  return 'var ' + name + ' = new Array(arguments.length - ' + len + ');' + 
    'for(var $__i = 0; $__i < (arguments.length -' + len + '); ++$__i){' + name + '[$__i] = arguments[$__i+'+len+'];}';
}

function visitFunctionBodyWithRestParam(traverse, node, path, state) {
  utils.catchup(node.range[0] + 1, state);
  var parentNode = path[0];
  utils.append(renderRestParamSetup(parentNode), state);
  traverse(node.body, path, state);
  return false;
}

visitFunctionBodyWithRestParam.test = function(node, path, state) {
  return node.type === Syntax.BlockStatement
         && _nodeIsFunctionWithRestParam(path[0]);
};

exports.renderRestParamSetup = renderRestParamSetup;
exports.visitorList = [
  visitFunctionParamsWithRestParam,
  visitFunctionBodyWithRestParam
];
