! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
CPythonShim ifNil: [self error: 'CPythonShim is not defined. Check file ordering.'].
%

! ------- _statistics class (C extension module via shim)
expectvalue /Class
doit
module subclass: '_statistics'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
_statistics comment:
'Python _statistics C extension module.

Provides the _normal_dist_inv_cdf function used internally by the
statistics module. This wrapper delegates to CPythonShim which calls
the actual C implementation compiled against cpython.h.

Usage (from Python source):
    from _statistics import _normal_dist_inv_cdf
    result = _normal_dist_inv_cdf(0.5, 0.0, 1.0)   # => 0.0
'
%

expectvalue /Class
doit
_statistics category: 'Modules'
%

expectvalue /Metaclass3
doit
_statistics removeAllMethods.
_statistics class removeAllMethods.
%

! ===============================================================================
! env 0 class methods — bridge to CPythonShim
! ===============================================================================

set compile_env: 0

category: 'Private'
classmethod: _statistics
callNormalDistInvCdf: anArray
	"Call _normal_dist_inv_cdf(p, mu, sigma) via CPythonShim."

	^ CPythonShim current
		callModule: '_statistics'
		method: '_normal_dist_inv_cdf'
		doubles: anArray
%

! ===============================================================================
! env 1 instance methods — fast-path callables
! ===============================================================================

set compile_env: 1

category: 'Python-Initialization'
method: _statistics
initialize
	"No-op — all methods are real fast-path methods."
%

category: 'Python-Built-in Functions'
method: _statistics
_normal_dist_inv_cdf: p _: mu _: sigma
	"_normal_dist_inv_cdf(p, mu, sigma) -> float.
	Fast path: 3-arg direct send."

	^ self @env0:class @env0:callNormalDistInvCdf: { p. mu. sigma }
%

set compile_env: 0
