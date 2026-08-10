! ------------------- Superclass check
run
BaseException ifNil: [self error: 'BaseException is not defined. Check file ordering.'].
%

! ------- BaseExceptionGroup (Python 3.11+)
expectvalue /Class
doit
BaseException subclass: 'BaseExceptionGroup'
  instVarNames: #( message exceptions )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
BaseExceptionGroup comment:
'A group of unrelated exceptions.

Introduced in Python 3.11 to support exception groups.

Instance variables:
  message - description of the exception group
  exceptions - sequence of exceptions in the group
'
%

expectvalue /Class
doit
BaseExceptionGroup category: 'Grail-Exceptions'
%

! ===============================================================================
! BaseExceptionGroup methods (Python 3.11+, PEP 654)
! ===============================================================================
! ``message'' and ``exceptions'' are derived from ``args'' rather than stored:
! a group is constructed like any other exception (___args___: is what every
! raise path already populates), so the declared instVars above were never
! written by anything and both attributes read as absent.
!
! Compiled with environmentId 1 (Python), like the other exception types.
! ===============================================================================

expectvalue /Metaclass3
doit
BaseExceptionGroup removeAllMethods: 1.
BaseExceptionGroup class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Exception Groups'
method: BaseExceptionGroup
message
	"``eg.message'' — PEP 654: the group's own description, args[0]."

	| a |
	a := self args.
	^ (a @env0:size @env0:>= 1) ifTrue: [a @env0:at: 1] ifFalse: ['']
%

category: 'Grail-Exception Groups'
method: BaseExceptionGroup
exceptions
	"``eg.exceptions'' — PEP 654: the contained exceptions, args[1].

	Answered as a TUPLE even though the group is almost always constructed
	from a list literal (``ExceptionGroup('A', [ValueError()])''), because
	CPython's is a tuple and callers index and len() it -- traceback's group
	rendering does both."

	| a subs |
	a := self args.
	(a @env0:size @env0:>= 2) ifFalse: [^ tuple @env0:withAll: #()].
	subs := a @env0:at: 2.
	(subs @env0:class @env0:= tuple) ifTrue: [^ subs].
	^ tuple @env0:withAll: (subs @env0:asArray)
%

category: 'Grail-Exception Groups'
method: BaseExceptionGroup
__str__
	"``str(eg)'' — CPython renders the MESSAGE plus a sub-exception count,
	``A (2 sub-exceptions)'', NOT the args tuple.

	Without this the inherited BaseException>>__str__ saw two args and fell
	back to ``args.__repr__'', so every group stringified as
	``('A', [ValueError('B')])'' -- which is also what traceback's
	format_exception_only emitted, since that is built on str()."

	| n |
	n := self exceptions @env0:size.
	^ (self message @env0:asString) @env0:asUnicodeString
		@env0:, ' (' @env0:, n @env0:printString
		@env0:, (n @env0:= 1 ifTrue: [' sub-exception)'] ifFalse: [' sub-exceptions)'])
%

set compile_env: 0

category: 'Grail-Python Attribute Hook'
classmethod: BaseExceptionGroup
___pythonValueAttrs___
	"``eg.message'' / ``eg.exceptions'' are VALUE attributes in CPython, not
	callables, so a read must invoke the accessor rather than answer a
	BoundMethod wrapping the selector -- ``len(eg.exceptions)'' and
	``eg.message'' are how both the tests and traceback's group rendering
	consume them.  Extends BaseException's set (args, __notes__,
	__traceback__, the chaining trio); see the discussion there."

	^ super ___pythonValueAttrs___
		add: #'message';
		add: #'exceptions';
		yourself
%

! Back to env 0 for whatever is filed next -- ExceptionGroup.gs immediately
! follows and its ``BaseExceptionGroup subclass: ...'' doit must not run in
! env 1 (it fails there with a MessageNotUnderstood for #subclass:...).
set compile_env: 0
