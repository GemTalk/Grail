"Python _statistics C extension module.

Provides the _normal_dist_inv_cdf function used internally by the
statistics module. This wrapper delegates to CPythonShim which calls
the actual C implementation compiled against cpython.h.

Usage (from Python source):
    from _statistics import _normal_dist_inv_cdf
    result = _normal_dist_inv_cdf(0.5, 0.0, 1.0)   # => 0.0

"
Class {
	#name : '_statistics',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Private' }
_statistics class >> callNormalDistInvCdf: anArray [
	"Call _normal_dist_inv_cdf(p, mu, sigma) via CPythonShim."

	^ CPythonShim current
		callModule: '_statistics'
		method: '_normal_dist_inv_cdf'
		doubles: anArray

]
