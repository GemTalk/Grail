! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ForStarTargetTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ForStarTargetTestCase'
  instVarNames: #( irModule textModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ForStarTargetTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ForStarTargetTestCase
!
! A ``for'' TARGET HOLDING A STARRED ELEMENT, THROUGH THE DIRECT-TO-IR PATH.
!
! `cm:ForAst:tupleTargetShape' (3) refused ``for a, b, *rest in xs''.  Unlike
! most rows this family is a genuine EMIT GAP rather than an over-wide refusal,
! and the note said so exactly: ``the text's star shape needs a Smalltalk
! arithmetic send the IR emit does not yet make''.  The elements after the star
! are indexed from the END, which takes a subtraction on the sequence's length.
!
! THE SHAPE REPRODUCED IS THE FOR-LOOP'S, AND THAT IS A DELIBERATE CHOICE.
! Grail already had a starred unpack for ``a, *b = xs'':
! AbstractNode>>___emitIRUnpack___:from:holder:on: goes through
! ``___unpackSequence___ ___unpackCheck___:star:after:'' and reads the star with
! ``___getslice___:_:_:''.  Reusing it here would have been less code.  But
! printSmalltalkOn: does NOT spell a for-loop target that way -- it emits an
! explicit slice object and an arithmetic length -- and the emit rule is that
! the IR reproduces the sends the TEXT makes, not the best ones available.
!
! THE DIFFERENCE IS OBSERVABLE, which is why it is not a matter of taste.  With
! too few values to unpack, ``___unpackCheck___:star:after:'' raises CPython's
! ``ValueError: not enough values to unpack'' while the for-loop's slice shape
! runs off the end with an IndexError.  Had the IR borrowed the assignment's
! shape, a loop would have raised a DIFFERENT EXCEPTION under the flag than
! without it -- the one divergence the seam exists to prevent.  So the gap is
! reproduced, pinned as the fixture's XFAIL, and left for whoever fixes the
! text's loop unpack; testBothPathsAgreeOnTheTooFewError is what would notice.
! ===============================================================================

doit
ForStarTargetTestCase removeAllMethods.
ForStarTargetTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ForStarTargetTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'fst_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'fst_text' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'fst_ir'.
	self ___forgetCanonicalModule___: 'fst_text'.
	irModule := nil.
	textModule := nil
%

category: 'Grail-Private'
method: ForStarTargetTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/for_star_target.py'
%

category: 'Grail-Private'
method: ForStarTargetTestCase
___keys___
	"The fixture's XFAIL (``star_too_few'') is deliberately absent and has its
	own test below."

	^ #('star_at_the_end' 'star_in_the_middle' 'star_first' 'star_only'
	    'star_nested' 'star_over_a_string' 'plain_tuple_still_works'
	    'nested_plain_still_works')
%

category: 'Grail-Private'
method: ForStarTargetTestCase
___irModule___
	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'fst_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'fst_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'fst_ir'.
	^ irModule
%

category: 'Grail-Private'
method: ForStarTargetTestCase
___textModule___
	textModule ifNotNil: [^ textModule].
	(importlib @env1:modules) removeKey: #'fst_text' ifAbsent: [].
	self ___forgetCanonicalModule___: 'fst_text'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: false.
	textModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'fst_text'.
	^ textModule
%

category: 'Grail-Private'
method: ForStarTargetTestCase
___reprOf___: aModule key: aKey
	^ ((aModule @env1:___pyAttrLoad___: #'r') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString
%

category: 'Grail-Private'
method: ForStarTargetTestCase
___expectedReprOf___: aModule key: aKey
	^ ((aModule @env1:___pyAttrLoad___: #'EXPECTED') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString
%

category: 'Grail-Tests - a starred for target'
method: ForStarTargetTestCase
testEveryStarPositionAgreesWithCPythonUnderIR
	"Eight shapes: the star first, last, in the middle, alone, inside a nested
	tuple, over a STRING (where the leftover is a list of characters), and the
	two plain shapes that must keep working beside it."

	| bad |
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := self ___reprOf___: self ___irModule___ key: k.
		want := self ___expectedReprOf___: self ___irModule___ key: k.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	self assert: bad isEmpty
		description: 'starred for targets disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - a starred for target'
method: ForStarTargetTestCase
testTheLeftoverIsAListEvenWhenEmpty
	"The star always binds a LIST, never a tuple and never nil, and an
	exhausted one binds an EMPTY list rather than raising -- which is the half
	of the shape an index-from-the-end emit gets wrong most easily."

	| got |
	got := self ___reprOf___: self ___irModule___ key: 'star_at_the_end'.
	self assert: got = '[(1, 2, [3, 4]), (5, 6, [])]'
		description: 'the starred leftover is not the list CPython binds: ' , got
%

category: 'Grail-Tests - a starred for target'
method: ForStarTargetTestCase
testBothPathsAgreeOnTheTooFewError
	"THE REASON THIS EMIT COPIES THE TEXT RATHER THAN THE ASSIGNMENT UNPACK.

	With too few values CPython raises ValueError; Grail's for-loop shape --
	an explicit slice indexed from the end -- runs off the end with an
	IndexError, on BOTH paths.  Borrowing the assignment's
	``___unpackCheck___:star:after:'' would have raised CPython's ValueError
	under the flag and IndexError without it: a loop raising a different
	exception depending on the codegen path, which is the one thing the seam
	exists to prevent.

	So this asserts the two paths AGREE, not that either is right.  When the
	text's loop unpack is fixed, this fails and both sides move together."

	| ir text |
	ir := self ___reprOf___: self ___irModule___ key: 'star_too_few'.
	text := self ___reprOf___: self ___textModule___ key: 'star_too_few'.
	self assert: ir = text
		description: 'the two paths now raise different errors for a short '
			, 'unpack -- IR: ' , ir , ' text: ' , text.
	self assert: (ir includesString: 'IndexError')
		description: 'the short-unpack gap moved (CPython raises ValueError): ' , ir
%

category: 'Grail-Tests - a starred for target'
method: ForStarTargetTestCase
testTheIRArmActuallyCompiledTheFixture
	"A guard on the guard: correct answers prove nothing if the seam fell back
	to text, which is what the refusal used to make it do."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'.
	self assert: (stats at: #compiled) >= 8
		description: 'fewer defs compiled than the cut measured (8, against 2 '
			, 'with the refusal): compiled = ' , (stats at: #compiled) printString
%
