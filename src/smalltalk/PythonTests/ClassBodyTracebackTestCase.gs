! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassBodyTracebackTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassBodyTracebackTestCase'
  instVarNames: #( irModule textModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassBodyTracebackTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassBodyTracebackTestCase
!
! AN EXCEPTION RAISED WHILE A METHOD-LOCAL CLASS BODY RUNS, ON THE IR PATH.
!
! Not an eligibility cut: nothing here moves a census row.  It fixes a wrong
! answer that the IR path gave for a shape it ALREADY compiled, and that is why
! it is worth its own test class.
!
! WHAT WAS WRONG.  The IR path compiles a method-local class body into a HELPER
! METHOD of its own (ClassDefAst>>___irHelperSelector___:).  That helper had
! neither a Python NAME nor a derivable LINE, so BaseException's traceback
! capture walk skipped it -- ``a non-nil derived line is what IDENTIFIES a
! Python frame'' -- and the innermost entry became the ENCLOSING def, suspended
! at its ``class C:'' statement.  The line where the failure actually happened
! was simply absent:
!
!     CPython     make @ 'class C:'   +   C @ 'b = 1 // 0'
!     Grail text  make @ 'b = 1 // 0'         (the body is inlined in make)
!     Grail IR    make @ 'class C:'           (the failing line is GONE)
!
! THE THREE PIECES, each necessary and none sufficient:
!
!   * the helper's source now carries the ___GRAILPOS___ POSITION MAP the class
!     emit already built -- the generating PrettyWriteStream had it all along
!     and nobody harvested it (ClassDefAst>>___irHelperSourceWithSelector___:);
!   * ___tracebackLineForMethod___: consults that map even when the
!     ``___curPos___'' scan found nothing, which is the same "is this generated
!     Python" test read off a better source: only codegen writes either;
!   * ___pythonFrameNameForMethod___: recognises the helper's selector shape and
!     answers the CLASS NAME, which is what CPython calls a class-body frame.
!
! THE RESULT IS CLOSER TO CPYTHON THAN THE TEXT PATH, which has no class-body
! frame at all and reports the body's line against the enclosing def's name.
! That asymmetry is deliberate and is pinned by
! testTheTextPathStillHasNoClassBodyFrame below, so nobody has to wonder
! whether it was noticed.
!
! ONE SHAPE IS AN XFAIL: a class nested INSIDE a method-local class body.  Only
! the outermost body becomes a helper, so the inner build is inline within it
! and the failing line is reported under the OUTER class's name -- one frame
! short of CPython, but the line is there, which is what was lost.
! ===============================================================================

doit
ClassBodyTracebackTestCase removeAllMethods.
ClassBodyTracebackTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassBodyTracebackTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'cbt_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'cbt_text' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'cbt_ir'.
	self ___forgetCanonicalModule___: 'cbt_text'.
	irModule := nil.
	textModule := nil
%

category: 'Grail-Private'
method: ClassBodyTracebackTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/class_body_traceback.py'
%

category: 'Grail-Private'
method: ClassBodyTracebackTestCase
___keys___
	"The fixture's XFAIL (``a_nested_class_body'') is deliberately absent and
	has its own test below."

	^ #('a_simple_class_body' 'a_class_body_calling_a_function'
	    'raises_outside_any_class')
%

category: 'Grail-Private'
method: ClassBodyTracebackTestCase
___irModule___
	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'cbt_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbt_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'cbt_ir'.
	^ irModule
%

category: 'Grail-Private'
method: ClassBodyTracebackTestCase
___textModule___
	textModule ifNotNil: [^ textModule].
	(importlib @env1:modules) removeKey: #'cbt_text' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbt_text'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: false.
	textModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'cbt_text'.
	^ textModule
%

category: 'Grail-Private'
method: ClassBodyTracebackTestCase
___reprOf___: aModule key: aKey
	^ ((aModule @env1:___pyAttrLoad___: #'r') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString
%

category: 'Grail-Private'
method: ClassBodyTracebackTestCase
___expectedReprOf___: aModule key: aKey
	^ ((aModule @env1:___pyAttrLoad___: #'EXPECTED') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString
%

category: 'Grail-Tests - class body traceback'
method: ClassBodyTracebackTestCase
testTheClassBodyFrameIsReportedUnderIR
	"The cut.  Three shapes: a class body whose attribute value raises, one
	whose value raises inside a CALL, and -- as the control that the ordinary
	path is untouched -- a raise with no class involved at all."

	| bad |
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := self ___reprOf___: self ___irModule___ key: k.
		want := self ___expectedReprOf___: self ___irModule___ key: k.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	self assert: bad isEmpty
		description: 'class-body traceback frames disagreeing with CPython under '
			, 'IR: ' , bad asArray printString
%

category: 'Grail-Tests - class body traceback'
method: ClassBodyTracebackTestCase
testTheFailingLineIsNotLost
	"The defect stated on its own, and the assertion that fails if any ONE of
	the three pieces is reverted.

	Named by the source TEXT rather than a line number so editing the fixture
	does not rewrite it."

	| got |
	got := self ___reprOf___: self ___irModule___ key: 'a_simple_class_body'.
	self assert: (got includesString: 'b = 1 // 0')
		description: 'the failing line of a class body is missing from the '
			, 'traceback again: ' , got
%

category: 'Grail-Tests - class body traceback'
method: ClassBodyTracebackTestCase
testTheTextPathStillHasNoClassBodyFrame
	"THE ASYMMETRY, pinned as a measurement rather than left in a comment.

	The text inlines a method-local class build into the enclosing def, so
	there is no frame to name and the body's line is reported against the
	ENCLOSING def.  The IR path has a real helper method and so can carry
	CPython's class-body frame; this is one of the few places where the IR
	path is the more accurate of the two.

	Fails when the text path grows a class-body frame, which is when the note
	in the class comment retires."

	| got |
	got := self ___reprOf___: self ___textModule___ key: 'a_simple_class_body'.
	self assert: (got includesString: '''C''') not
		description: 'the text path now reports a class-body frame -- retire the '
			, 'asymmetry note: ' , got
%

category: 'Grail-Tests - class body traceback'
method: ClassBodyTracebackTestCase
testANestedClassBodyIsStillOneFrameShort
	"The fixture's XFAIL.  Only the OUTERMOST method-local class body becomes a
	helper of its own, so a class nested inside it is built inline within that
	helper and its failing line is reported under the OUTER class's name.  The
	LINE is present, which is what this cut was about; the missing frame is a
	separate cut.  When it lands, this fails."

	| got |
	got := self ___reprOf___: self ___irModule___ key: 'a_nested_class_body'.
	self assert: ((got includesString: 'w = 1 // 0')
		and: [(got includesString: '''Inner''') not])
		description: 'the nested class-body frame changed -- retire the fixture''s '
			, 'XFAIL: ' , got
%

category: 'Grail-Tests - class body traceback'
method: ClassBodyTracebackTestCase
testTheIRArmActuallyCompiledTheFixture
	"Correct frames prove nothing if the seam fell back to text, which reports
	the body's line under the enclosing def's name and would satisfy a
	line-only assertion."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'
%
