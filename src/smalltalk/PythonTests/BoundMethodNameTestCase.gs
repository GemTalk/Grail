! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BoundMethodNameTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BoundMethodNameTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BoundMethodNameTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BoundMethodNameTestCase
!
! Regression: ``BoundMethod >> __name__`` / ``__qualname__'' / ``__module__'',
! the Python identifying-metadata accessors decorator consumers rely on
! (Flask's ``@app.route'' inspects ``view_func.__name__'' when registering
! the rule, functools.wraps copies the metadata across).  Pre-fix, reading
! the attribute raised ``BoundMethod object has no attribute __name__''.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BoundMethodNameTestCase removeAllMethods.
BoundMethodNameTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - BoundMethod Names'
method: BoundMethodNameTestCase
testNameReturnsSelectorString
	"``bm.__name__'' returns the bound selector as a String."

	| bm |
	bm := BoundMethod @env1:receiver: 'hello' selector: #'upper'.
	self assert: bm @env1:__name__ equals: 'upper'
%

category: 'Grail-Tests - BoundMethod Names'
method: BoundMethodNameTestCase
testQualnameMatchesName
	"``bm.__qualname__'' returns the same identifier as __name__
	until Grail tracks lexical nesting on BoundMethods."

	| bm |
	bm := BoundMethod @env1:receiver: 'hello' selector: #'lower'.
	self assert: bm @env1:__qualname__ equals: bm @env1:__name__
%

category: 'Grail-Tests - BoundMethod Names'
method: BoundMethodNameTestCase
testModuleReturnsReceiverClassName
	"``bm.__module__'' falls back to the receiver class name as a
	best-effort identifier — Grail BoundMethods don't track the
	defining module."

	| bm |
	bm := BoundMethod @env1:receiver: 'hello' selector: #'lower'.
	self assert: bm @env1:__module__ equals: 'Unicode7'
%

category: 'Grail-Tests - BoundMethod Names'
method: BoundMethodNameTestCase
testUnboundFormFallsBackToReceiverClassName
	"An unbound class-method BoundMethod (receiver isNil) returns
	the placeholder receiver's class name for ``__name__''.  Matches
	the no-receiver path used by class-body forward refs."

	| bm |
	bm := BoundMethod @env1:receiver: nil selector: nil.
	self assert: bm @env1:__name__ equals: 'UndefinedObject'
%
