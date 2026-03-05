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
! env 2 instance methods — Python-compatible callables
! ===============================================================================

set compile_env: 1

category: 'Python-Initialization'
method: _statistics
initialize
	self initialize__normal_dist_inv_cdf
%

category: 'Python-Initialization'
method: _statistics
initialize__normal_dist_inv_cdf
	"_normal_dist_inv_cdf(p, mu, sigma) -> float"
	self ___at___: #_normal_dist_inv_cdf put: [:positional :keywords |
		self ___class___ perform: #'callNormalDistInvCdf:' env: 0
			withArguments: {
				{
					positional ___at___: 1 .
					positional ___at___: 2 .
					positional ___at___: 3
				}
			}
	]
%

category: 'Python-Accessors'
method: _statistics
_normal_dist_inv_cdf
	^ self ___at___: #_normal_dist_inv_cdf
%

set compile_env: 0
