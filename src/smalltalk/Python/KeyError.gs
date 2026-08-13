! ------------------- Superclass check
run
LookupError ifNil: [self error: 'LookupError is not defined. Check file ordering.'].
%

! ------- KeyError (subclass of LookupError which maps to GemStone LookupError)
expectvalue /Class
doit
LookupError subclass: 'KeyError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
KeyError category: 'Grail-Exceptions'
%

set compile_env: 1

category: 'Grail-String Representation'
method: KeyError
__str__
	"CPython's KeyError_str: the REPR of the single argument, not its str.

	KeyError is the one built-in exception whose message quotes itself, and it is
	deliberate -- a missing key is usually a string, and ``KeyError: missing''
	reads as prose where ``KeyError: 'missing''' shows you the value you actually
	looked up.  It also distinguishes the empty string, ``KeyError: ''''', from no
	message at all.

	The rule is uniform for one argument, not str-specific: ``KeyError(1)'' gives
	``1'', ``KeyError(None)'' gives ``None'', ``KeyError(('t', 1))'' gives
	``('t', 1)'' -- all of them repr.  With no arguments or several, CPython falls
	straight back to BaseException_str, so this does too rather than reimplementing
	the empty / tuple cases.

	Consequence worth knowing: every traceback rendering a KeyError changes, since
	traceback.py reports an exception through str().  ``KeyError: 'missing''' is
	CPython's line and was not Grail's."

	| argsArray |
	argsArray := self args.
	argsArray @env0:size == 1 ifFalse: [^ super __str__].
	^ (builtins instance) repr: (argsArray @env0:at: 1)
%

set compile_env: 0
