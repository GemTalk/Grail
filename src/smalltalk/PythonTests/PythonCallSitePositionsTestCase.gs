! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PythonCallSitePositionsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PythonCallSitePositionsTestCase'
  instVarNames: #(textModule irModule registrySnapshot)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
PythonCallSitePositionsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PythonCallSitePositionsTestCase - the public static position readers
! (issue #883):
!     BaseException class >> pythonPositionsForMethod:
!     BaseException class >> pythonPositionKindForMethod:
!
! The property under test is that BOTH codegen paths answer, since the whole
! complaint is that a text scan reads nothing under GRAIL_IR_CODEGEN.  So the
! fixture is imported TWICE, once with the seam forced off and once forced on,
! and neither arm is allowed to pass vacuously.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PythonCallSitePositionsTestCase removeAllMethods: 0.
PythonCallSitePositionsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: PythonCallSitePositionsTestCase
setUp
	"Import tests/python/ir_codegen_smoke.py twice under two names, with the IR
	seam FORCED each way, so one arm is a text-path method and the other an IR
	method.  Forced rather than inherited: a worker starts with the flag off, so
	an inherited run would exercise only half of what this is about.

	Cold both times -- ___forgetCanonicalModule___: before the snapshot -- for
	the reason IRCodegenSmokeTestCase documents: a warm bind would answer from a
	method some other session compiled, on whichever path THAT session was on."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'callsite_pos_text' ifAbsent: [].
	mods removeKey: #'callsite_pos_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'callsite_pos_text'.
	self ___forgetCanonicalModule___: 'callsite_pos_ir'.
	registrySnapshot := importlib ___canonicalRegistrySnapshot___.
	importlib ___irCodegenForce___: false.
	textModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/ir_codegen_smoke.py')
		name: 'callsite_pos_text'.
	importlib ___irCodegenForce___: true.
	irModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/ir_codegen_smoke.py')
		name: 'callsite_pos_ir'.
%

category: 'Grail-Setup'
method: PythonCallSitePositionsTestCase
tearDown
	| mods |
	importlib ___irCodegenEnabledInvalidate___.
	mods := importlib @env1:modules.
	mods removeKey: #'callsite_pos_text' ifAbsent: [].
	mods removeKey: #'callsite_pos_ir' ifAbsent: [].
	registrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		registrySnapshot := nil].
	self ___forgetCanonicalModule___: 'callsite_pos_text'.
	self ___forgetCanonicalModule___: 'callsite_pos_ir'.
	textModule := nil.
	irModule := nil.
%

category: 'Grail-Private'
method: PythonCallSitePositionsTestCase
___fixtureSource___
	"The fixture file's own text, read the way importlib reads a module."

	| file src |
	file := GsFile open: importlib grailDir , '/tests/python/ir_codegen_smoke.py'
		mode: 'rb' onClient: false.
	src := file contentsAsUtf8 decodeToUnicode.
	file close.
	^ src
%

category: 'Grail-Private'
method: PythonCallSitePositionsTestCase
___textMethod___
	^ textModule class compiledMethodAt: #answer environmentId: 1
%

category: 'Grail-Private'
method: PythonCallSitePositionsTestCase
___irMethod___
	^ irModule class compiledMethodAt: #answer environmentId: 1
%

category: 'Grail-Tests-CallSitePositions'
method: PythonCallSitePositionsTestCase
test_text_path_kind_is_curPos
	self assert: (BaseException pythonPositionKindForMethod: self ___textMethod___)
		equals: #curPos.
%

category: 'Grail-Tests-CallSitePositions'
method: PythonCallSitePositionsTestCase
test_text_path_answers_positions
	| pos |
	pos := BaseException pythonPositionsForMethod: self ___textMethod___.
	self assert: pos size > 0
		description: 'text-path method carried no positions'.
	pos do: [:p |
		self assert: p size equals: 5.
		self assert: ((p at: 1) isKindOf: Integer).
		self assert: (p at: 1) > 0].
%

category: 'Grail-Tests-CallSitePositions'
method: PythonCallSitePositionsTestCase
test_text_path_carries_a_full_pep657_span
	"At least one store is the 5-element literal form, decoded whole -- which is
	the layout an outside consumer would otherwise have to assume."

	| pos spans |
	pos := BaseException pythonPositionsForMethod: self ___textMethod___.
	spans := pos select: [:p |
		((p at: 2) notNil) and: [(p at: 3) notNil and: [(p at: 4) notNil]]].
	self assert: spans size > 0
		description: 'no position carried colno/endLine/endColno; got ' , pos printString.
%

category: 'Grail-Tests-CallSitePositions'
method: PythonCallSitePositionsTestCase
test_ir_path_answers_positions_too
	"THE POINT OF THE ISSUE.  A text scan reads nothing here -- an IR method
	carries no ___curPos___ store at all -- so an embedder's hand-rolled parser
	silently degrades to ``no position available'' on a gem whose environment
	nobody set deliberately."

	| m pos |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	m := self ___irMethod___.
	self assert: (BaseException ___isIRPythonMethod___: m)
		description: 'the forced-IR arm did not produce an IR method'.
	self assert: (BaseException pythonPositionKindForMethod: m) equals: #irSource.
	pos := BaseException pythonPositionsForMethod: m.
	self assert: pos size > 0
		description: 'IR method carried no positions'.
	pos do: [:p |
		self assert: ((p at: 1) isKindOf: Integer).
		self assert: (p at: 5) notNil
			description: 'IR position lacked its source line: ' , p printString].
%

category: 'Grail-Tests-CallSitePositions'
method: PythonCallSitePositionsTestCase
test_ir_line_numbers_are_absolute
	"An IR method's source is prefixed with (beginLine - 1) newlines, so a
	line's index IS its module line number.  Splitting with ``subStrings:''
	would drop those empty lines and renumber everything, so this pins it: the
	def line reported must match where ``def answer'' really is in the fixture."

	| m pos defLine fileLine srcLines |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	m := self ___irMethod___.
	pos := BaseException pythonPositionsForMethod: m.
	self assert: pos size > 0.
	defLine := (pos detect: [:p | ((p at: 5) indexOfSubCollection: 'def answer') > 0]
		ifNone: [nil]).
	self assert: defLine notNil
		description: 'no reported position was the def line; got ' , pos printString.
	srcLines := BaseException ___splitLinesOf___: (self ___fixtureSource___).
	fileLine := 0.
	1 to: srcLines size do: [:i |
		(fileLine = 0 and: [((srcLines at: i) indexOfSubCollection: 'def answer') > 0])
			ifTrue: [fileLine := i]].
	self assert: fileLine > 0 description: 'fixture has no ``def answer'' line'.
	self assert: (defLine at: 1) equals: fileLine.
%

category: 'Grail-Tests-CallSitePositions'
method: PythonCallSitePositionsTestCase
test_a_non_python_method_answers_nothing
	"Must not over-claim: an ordinary Smalltalk method is not a Python method,
	and the kind says so rather than the caller having to infer it from an
	empty Array."

	| m |
	m := Object compiledMethodAt: #printString otherwise: nil.
	self assert: m notNil description: 'could not fetch a plain Smalltalk method'.
	self assert: (BaseException pythonPositionKindForMethod: m) equals: nil.
	self assert: (BaseException pythonPositionsForMethod: m) equals: #().
	self assert: (BaseException pythonPositionKindForMethod: nil) equals: nil.
	self assert: (BaseException pythonPositionsForMethod: nil) equals: #().
%

category: 'Grail-Tests-CallSitePositions'
method: PythonCallSitePositionsTestCase
test_decodes_a_bare_line_store
	"The other emitted shape: a bare beginLine with no span."

	| p |
	p := BaseException ___parsePositionAt___: 1 in: '117.'.
	self assert: p notNil.
	self assert: (p at: 1) equals: 117.
	self assert: (p at: 2) equals: nil.
	self assert: (p at: 5) equals: nil.
%

category: 'Grail-Tests-CallSitePositions'
method: PythonCallSitePositionsTestCase
test_decodes_a_source_line_containing_quotes
	"___pyPositionLiteralArray doubles every quote in the source line, so a
	Python statement with an apostrophe in it is where a naive ``read to the
	next quote'' parser truncates -- and truncation here is a wrong answer, not
	an error."

	| p |
	p := BaseException ___parsePositionAt___: 1 in: '#(7 4 7 20 ''s = "it''''s"'')'.
	self assert: p notNil description: 'quoted source line failed to parse'.
	self assert: (p at: 1) equals: 7.
	self assert: (p at: 2) equals: 4.
	self assert: (p at: 3) equals: 7.
	self assert: (p at: 4) equals: 20.
	self assert: (p at: 5) equals: 's = "it''s"'.
%

category: 'Grail-Tests-CallSitePositions'
method: PythonCallSitePositionsTestCase
test_decodes_a_nil_source_line
	"A node parsed outside a module has no source line, and codegen emits the
	bare token ``nil'' for it."

	| p |
	p := BaseException ___parsePositionAt___: 1 in: '#(7 4 7 20 nil)'.
	self assert: p notNil.
	self assert: (p at: 1) equals: 7.
	self assert: (p at: 5) equals: nil.
%
