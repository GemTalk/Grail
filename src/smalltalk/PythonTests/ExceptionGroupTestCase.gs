! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExceptionGroupTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExceptionGroupTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
ExceptionGroupTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ExceptionGroupTestCase - Tests for Python ExceptionGroup
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ExceptionGroupTestCase removeAllMethods.
ExceptionGroupTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-ExceptionGroup'
method: ExceptionGroupTestCase
test_creation
	"Test creating a ExceptionGroup instance."
	
	| exc |
	exc := ExceptionGroup ___new___:  ExceptionGroup .
	self assert: exc notNil.
%

category: 'Grail-Tests-ExceptionGroup'
method: ExceptionGroupTestCase
test_inheritance
	"Test that ExceptionGroup inherits from BaseExceptionGroup."
	
	| exc |
	exc := ExceptionGroup ___new___:  ExceptionGroup .
	self assert: (exc isKindOf: BaseExceptionGroup).
%

category: 'Grail-Tests'
method: ExceptionGroupTestCase
testGroupStrIsMessagePlusCount
	"``str(eg)'' is CPython's ``A (2 sub-exceptions)'', NOT the args tuple.
	BaseExceptionGroup had no methods at all -- its declared ``message'' /
	``exceptions'' instVars were never written -- so the inherited
	BaseException>>__str__ saw two args and fell back to args.__repr__,
	rendering ``('A', [ValueError('B')])''.  That string is also what
	traceback.format_exception_only emitted, since it is built on str()."

	self assert: (self eval: 'str(ExceptionGroup("A", [ValueError("B"), TypeError("C")]))')
		equals: 'A (2 sub-exceptions)'.
	"Singular for exactly one, as CPython."
	self assert: (self eval: 'str(ExceptionGroup("A", [ValueError("B")]))')
		equals: 'A (1 sub-exception)'.
	self assert: (self eval: 'str(BaseExceptionGroup("A", [BaseException("B")]))')
		equals: 'A (1 sub-exception)'
%

category: 'Grail-Tests'
method: ExceptionGroupTestCase
testGroupMessageAndExceptionsAreValueAttributes
	"PEP 654: both are VALUE attributes, so a read must answer the value and
	not a BoundMethod wrapping the accessor.  ``exceptions'' is a TUPLE even
	though a group is nearly always built from a list literal, because
	CPython's is and callers index and len() it."

	self assert: (self eval: 'ExceptionGroup("A", [ValueError("B")]).message')
		equals: 'A'.
	self assert: (self eval: 'eg = ExceptionGroup("A", [ValueError("B"), TypeError("C")])
[len(eg.exceptions), type(eg.exceptions).__name__,
 str(eg.exceptions[0]), str(eg.exceptions[1])]') asArray
		equals: #( 2 'tuple' 'B' 'C' )
%
