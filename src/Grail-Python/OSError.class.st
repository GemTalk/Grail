"Python OSError exception.

Instance variables:
  errno - error number
  strerror - error message string
  filename - name of the file involved (if any)
  filename2 - second filename (for operations involving two files)

"
Class {
	#name : 'OSError',
	#superclass : 'Exception',
	#instVars : [
		'errno',
		'strerror',
		'filename',
		'filename2'
	],
	#category : 'Grail-Exceptions'
}

{ #category : 'Grail-Python Attribute Hook' }
OSError class >> ___pythonValueAttrs___ [
	"``e.errno'', not ``e.errno()''.  The four accessors above are DEFAULTS for
	fields that were never stored, and without this hook ___pyAttrLoad___
	answers a BoundMethod for them -- which is truthy, so ``if e.errno:'' takes
	the wrong branch and every comparison against an errno silently fails
	instead of erroring.

	The names are only reached when no dynamic instVar of the same name exists
	(dynamic instVars are probed first), so listing them here does not shadow a
	supplied value.

	Extends the inherited set (args / __traceback__ / the chaining trio) rather
	than replacing it; BaseException builds a fresh IdentitySet per call, so
	adding to the answer is safe."

	^ super ___pythonValueAttrs___
		add: #'errno';
		add: #'strerror';
		add: #'filename';
		add: #'filename2';
		yourself

]

{ #category : 'Grail-Initialization' }
OSError >> ___newArgs___: anArray [
	"OSError_new parses its arguments itself (Objects/exceptions.c:2133-2193),
	so errno, strerror and the filenames are set before any __init__ runs, and
	OSError_init is then a no-op.  A subclass that parses in its __init__
	instead never gets here: OSError class >> ___allocateForNew:kw: answers it
	with empty args."

	self @env1:___args___: anArray

]
