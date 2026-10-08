! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PythonCallSitePositionsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PythonCallSitePositionsTestCase'
  instVarNames: #(textModule irModule stmtModule registrySnapshot)
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
! and their source-index companions (issue #1137):
!     BaseException class >> pythonPositionForMethod:atSourceIndex:
!     BaseException class >> pythonSendSitesIn:selector:
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
	method some other session compiled, on whichever path THAT session was on.

	Each import happens on FIRST USE (___textModule___ / ___irModule___), not
	here.  The fixture is 4800 lines and costs ~11s a compile locally, and every
	test used to pay for both: 22 compiles for 11 tests, 250s, which made this
	the single most expensive class in the suite and the reason its shard ran
	twice as long as the next.  Five of the tests read neither module and each
	of the others reads one, so 8 compiles are all the tests need.  Every
	import is still cold, in its own test, with the seam forced its own way."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'callsite_pos_text' ifAbsent: [].
	mods removeKey: #'callsite_pos_ir' ifAbsent: [].
	mods removeKey: #'callsite_pos_module' ifAbsent: [].
	self ___forgetCanonicalModule___: 'callsite_pos_text'.
	self ___forgetCanonicalModule___: 'callsite_pos_ir'.
	self ___forgetCanonicalModule___: 'callsite_pos_module'.
	registrySnapshot := importlib ___canonicalRegistrySnapshot___.
	textModule := nil.
	irModule := nil.
	stmtModule := nil.
%

category: 'Grail-Private'
method: PythonCallSitePositionsTestCase
___textModule___
	"The fixture imported with the IR seam forced OFF -- a text-path method."

	textModule ifNil: [
		importlib ___irCodegenForce___: false.
		textModule := importlib
			loadModuleFromPath: (importlib grailDir , '/tests/python/ir_codegen_smoke.py')
			name: 'callsite_pos_text'].
	^ textModule
%

category: 'Grail-Private'
method: PythonCallSitePositionsTestCase
___irModule___
	"The fixture imported with the IR seam forced ON -- an IR method."

	irModule ifNil: [
		importlib ___irCodegenForce___: true.
		irModule := importlib
			loadModuleFromPath: (importlib grailDir , '/tests/python/ir_codegen_smoke.py')
			name: 'callsite_pos_ir'].
	^ irModule
%

category: 'Grail-Setup'
method: PythonCallSitePositionsTestCase
tearDown
	| mods |
	importlib ___irCodegenEnabledInvalidate___.
	mods := importlib @env1:modules.
	mods removeKey: #'callsite_pos_text' ifAbsent: [].
	mods removeKey: #'callsite_pos_ir' ifAbsent: [].
	mods removeKey: #'callsite_pos_module' ifAbsent: [].
	registrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		registrySnapshot := nil].
	self ___forgetCanonicalModule___: 'callsite_pos_text'.
	self ___forgetCanonicalModule___: 'callsite_pos_ir'.
	self ___forgetCanonicalModule___: 'callsite_pos_module'.
	textModule := nil.
	irModule := nil.
	stmtModule := nil.
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
___stmtModuleInit___
	"The module body of tests/python/frame_line_in_module_statement.py.  The
	module defines classes and functions, so its body embeds the source of each
	method it compiles as a string literal, stores and all -- the shape issue
	#1137 is about.  A module body is text-compiled on both codegen paths, so
	the seam is left as the worker has it."

	stmtModule ifNil: [
		stmtModule := importlib
			loadModuleFromPath:
				(importlib grailDir , '/tests/python/frame_line_in_module_statement.py')
			name: 'callsite_pos_module'].
	^ stmtModule class compiledMethodAt: #initialize environmentId: 1
%

category: 'Grail-Private'
method: PythonCallSitePositionsTestCase
___stmtFixtureLines___
	| file src |
	file := GsFile
		open: importlib grailDir , '/tests/python/frame_line_in_module_statement.py'
		mode: 'rb' onClient: false.
	src := file contentsAsUtf8 decodeToUnicode.
	file close.
	^ BaseException ___splitLinesOf___: src
%

category: 'Grail-Private'
method: PythonCallSitePositionsTestCase
___defBodyLinesIn___: srcLines
	"The line numbers of srcLines that lie inside a def body, at any depth --
	found by indentation, the way Python does: a line is in a body while some
	enclosing def line is indented less than it.  Blank and comment lines are
	ignored, so they neither open nor close anything."

	| out stack |
	out := Set new.
	stack := OrderedCollection new.
	1 to: srcLines size do: [:i |
		| ln t indent |
		ln := srcLines at: i.
		t := ln trimSeparators.
		(t isEmpty or: [(t at: 1) == $#]) ifFalse: [
			indent := 0.
			[indent < ln size and: [(ln at: indent + 1) isSeparator]]
				whileTrue: [indent := indent + 1].
			[stack notEmpty and: [stack last >= indent]] whileTrue: [stack removeLast].
			stack notEmpty ifTrue: [out add: i].
			(t indexOfSubCollection: 'def ') = 1 ifTrue: [stack addLast: indent]]].
	^ out
%

category: 'Grail-Private'
method: PythonCallSitePositionsTestCase
___plainCountOf___: aPattern in: aString
	"How often aPattern occurs in aString, literals and all -- what the readers
	USED to count, kept here as the positive control."

	| n i |
	n := 0.
	i := 1.
	[i := aString indexOfSubCollection: aPattern startingAt: i.
	 i > 0] whileTrue: [n := n + 1. i := i + 1].
	^ n
%

category: 'Grail-Private'
method: PythonCallSitePositionsTestCase
___fixtureLinesOfDef___: aName in: srcLines
	"The {lineNumber. text} of every non-blank line of the fixture's top-level
	``def aName('', from the def line through the last line before the next
	unindented one -- the answer an IR method for it should give."

	| out inDef |
	out := OrderedCollection new.
	inDef := false.
	1 to: srcLines size do: [:i |
		| ln |
		ln := srcLines at: i.
		(ln notEmpty and: [(ln at: 1) isSeparator not]) ifTrue: [
			inDef := (ln indexOfSubCollection: 'def ' , aName , '(') = 1].
		(inDef and: [ln trimSeparators notEmpty]) ifTrue: [
			out add: (Array with: i with: ln)]].
	^ out
%

category: 'Grail-Private'
method: PythonCallSitePositionsTestCase
___textMethod___
	^ self ___textModule___ class compiledMethodAt: #answer environmentId: 1
%

category: 'Grail-Private'
method: PythonCallSitePositionsTestCase
___irMethod___
	^ self ___irModule___ class compiledMethodAt: #answer environmentId: 1
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
	"An IR method's source is its def's slice of the module, so a line's index
	in it, rebased by the def's first module line, is its module line number.
	This pins that rebase: the def line reported must match where ``def
	answer'' really is in the fixture."

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
test_ir_positions_are_exactly_the_defs_own_lines
	"The WHOLE answer, not one line of it: an IR method's positions are the
	non-blank lines of its def, each at its module line with its own text, and
	nothing else.

	Asserted on defs that SEND something, because only those carry a
	___GRAILPOS___ map, and the map comment is what used to leak: it came back
	as one more ``line'', past the def's end, on a module line that belongs to
	the next def (poly_local reported line 100, which is ``def ir_raiser():'').
	``answer'' sends nothing, carries no map, and so could never show it -- which
	is why the method is checked to carry one before its answer is trusted."

	| srcLines |
	importlib ___irCodegenSupported___ ifFalse: [^ self].
	srcLines := BaseException ___splitLinesOf___: self ___fixtureSource___.
	#(#'poly_local:' 'poly_local' #'sign:' 'sign') pairsDo: [:sel :name |
		| m got expected |
		m := self ___irModule___ class compiledMethodAt: sel environmentId: 1.
		self assert: (BaseException pythonPositionKindForMethod: m) equals: #irSource.
		self assert: (m sourceString includesString: '___GRAILPOS___')
			description: name , ' carries no position map, so this proves nothing'.
		got := (BaseException pythonPositionsForMethod: m)
			collect: [:p | Array with: (p at: 1) with: (p at: 5) asString].
		expected := (self ___fixtureLinesOfDef___: name in: srcLines)
			collect: [:each | Array with: (each at: 1) with: (each at: 2) asString].
		self assert: expected notEmpty description: 'fixture has no def ' , name.
		self assert: got asArray equals: expected asArray]
%

category: 'Grail-Tests-CallSitePositions'
method: PythonCallSitePositionsTestCase
test_ir_slice_trailer_is_cut_by_position_not_by_prefix
	"The metadata after a def slice is recognised by WHERE it is -- at the end --
	not by what a line starts with, so a user comment shaped like the trailer
	inside the def is source and keeps its position."

	| lf lines |
	lf := String with: Character lf.
	lines := BaseException ___splitLinesOf___:
		'def f():' , lf , '    # line 3 of the recipe' , lf , '    return g()' , lf ,
		'# line 40 file /x.py' , lf , lf , '"___GRAILPOS___ 1 2 41 4 41 7 "'.
	self assert: (BaseException ___irSliceSourceLineCountIn___: lines) equals: 3.
	"The map without a ``# line'' comment: only the map is cut."
	lines := BaseException ___splitLinesOf___:
		'def f():' , lf , '    return g()' , lf , lf , '"___GRAILPOS___ 1 2 1 4 1 7 "'.
	self assert: (BaseException ___irSliceSourceLineCountIn___: lines) equals: 2.
	"No trailer at all: every line is source."
	lines := BaseException ___splitLinesOf___: 'def f():' , lf , '    pass'.
	self assert: (BaseException ___irSliceSourceLineCountIn___: lines) equals: 2.
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

category: 'Grail-Tests-CallSitePositions'
method: PythonCallSitePositionsTestCase
test_a_module_body_answers_only_its_own_positions
	"Issue #1137.  A module body embeds the source of every method it compiles
	as a string literal, with that method's ___curPos___ stores in it, and the
	reader searched the whole text.  On _grail_session's module body it
	answered 17 positions where 2 are its own, the last of them line 81, inside
	SessionDict.items().

	The positive control comes first: the stores really are embedded, or a
	reader that never looked would pass too."

	| m src own pos bodies |
	m := self ___stmtModuleInit___.
	src := m sourceString.
	own := BaseException ___ownCurPosStoresIn___: src.
	self assert: own notEmpty description: 'the module body carries no stores'.
	self assert: (self ___plainCountOf___: '___curPos___ := ' in: src) > own size
		description: 'the module body embeds no stores, so this proves nothing'.
	self assert: (BaseException pythonPositionKindForMethod: m) equals: #curPos.
	pos := BaseException pythonPositionsForMethod: m.
	self assert: pos size equals: own size.
	bodies := self ___defBodyLinesIn___: self ___stmtFixtureLines___.
	self assert: bodies notEmpty.
	pos do: [:p |
		self deny: (bodies includes: (p at: 1))
			description: 'a module-body position is inside a def body: ' , p printString].
%

category: 'Grail-Tests-CallSitePositions'
method: PythonCallSitePositionsTestCase
test_send_sites_of_a_module_body_are_its_own
	"The sends come from the compiled method, so a send that appears only in an
	embedded method's source is not one of the module body's.  Every site lands
	on a module-level line, in source order, and the plain call on the module's
	last statement is among them."

	| m sites srcLines bodies prev controlLine sel only |
	m := self ___stmtModuleInit___.
	sites := BaseException pythonSendSitesIn: m selector: nil.
	self assert: sites notEmpty description: 'the module body made no sends'.
	srcLines := self ___stmtFixtureLines___.
	controlLine := (1 to: srcLines size)
		detect: [:i |
			((srcLines at: i) indexOfSubCollection: 'caller_line(''plain_call_control''') = 1]
		ifNone: [nil].
	self assert: controlLine notNil description: 'the fixture lost its control call'.
	bodies := self ___defBodyLinesIn___: srcLines.
	prev := 0.
	sites do: [:s |
		self assert: s size equals: 4.
		self assert: (s at: 2) >= prev description: 'sites are not in source order'.
		prev := s at: 2.
		self assert: (s at: 3) notNil
			description: 'a module-body send has no position: ' , s printString.
		self deny: (bodies includes: ((s at: 3) at: 1))
			description: 'a module-body send is placed in a def body: ' , s printString].
	self assert: (sites detect: [:s | ((s at: 3) at: 1) = controlLine] ifNone: [nil]) notNil
		description: 'no send on the control call''s line ' , controlLine printString.
	"Filtering by selector answers exactly that selector's sites, and a String
	names the same selector as a Symbol."
	sel := (sites at: 1) at: 1.
	only := BaseException pythonSendSitesIn: m selector: sel.
	self assert: only size equals: (sites select: [:s | (s at: 1) == sel]) size.
	only do: [:s | self assert: (s at: 1) == sel].
	self assert: (BaseException pythonSendSitesIn: m selector: sel asString) size
		equals: only size.
%

category: 'Grail-Tests-CallSitePositions'
method: PythonCallSitePositionsTestCase
test_send_sites_on_the_ir_path
	"What a text search cannot do at all: an IR method's source is the user's
	Python, so there is no generated Smalltalk to search -- yet its sends still
	have positions, with columns from the map, on the def's own lines."

	importlib ___irCodegenSupported___ ifFalse: [^ self].
	self ___assertSendSitesOf___: #'poly_local:' named: 'poly_local'
		in: self ___irModule___ kind: #irSource
%

category: 'Grail-Tests-CallSitePositions'
method: PythonCallSitePositionsTestCase
test_send_sites_on_the_text_path
	self ___assertSendSitesOf___: #'poly_local:' named: 'poly_local'
		in: self ___textModule___ kind: #curPos
%

category: 'Grail-Private'
method: PythonCallSitePositionsTestCase
___assertSendSitesOf___: aSelector named: aName in: aModule kind: aKind
	"Every send site of the fixture's def aName has a position on one of the
	def's own lines that agrees with pythonPositionForMethod:atSourceIndex:,
	its node range holds it, and at least one site carries columns."

	| m sites defLines first last |
	m := aModule class compiledMethodAt: aSelector environmentId: 1.
	self assert: (BaseException pythonPositionKindForMethod: m) equals: aKind.
	sites := BaseException pythonSendSitesIn: m selector: nil.
	self assert: sites notEmpty description: aName , ' made no sends'.
	defLines := self ___fixtureLinesOfDef___: aName
		in: (BaseException ___splitLinesOf___: self ___fixtureSource___).
	first := (defLines at: 1) at: 1.
	last := (defLines at: defLines size) at: 1.
	sites do: [:s |
		| pos range |
		pos := s at: 3.
		self assert: pos notNil description: 'a site without a position: ' , s printString.
		self assert: ((pos at: 1) between: first and: last)
			description: 'a site outside def ' , aName , ': ' , s printString.
		self assert: (BaseException pythonPositionForMethod: m atSourceIndex: (s at: 2))
			equals: pos.
		range := s at: 4.
		range ifNotNil: [
			self assert: ((s at: 2) between: (range at: 1) and: (range at: 2))
				description: 'a node range does not hold its send: ' , s printString]].
	self assert: (sites detect: [:s | ((s at: 3) at: 2) notNil] ifNone: [nil]) notNil
		description: 'no site of ' , aName , ' carried columns: ' , sites printString.
%

category: 'Grail-Tests-CallSitePositions'
method: PythonCallSitePositionsTestCase
test_code_occurrences_skip_literals_comments_and_characters
	"The lexer the own-store readers stand on.  Only the two stores in CODE
	count: not one in a string (behind a doubled quote, which must not end the
	string), not one in a comment, not one in a symbol, and a $' character
	literal must not open a string that swallows the store after it."

	| m src got |
	m := '___curPos___ := '.
	src := 'a := 1. ' , m , '5. s := ''it''''s ' , m , '8''. ' ,
		(String with: $") , m , '7' , (String with: $") ,
		' c := $''. ' , m , '6. d := $' , (String with: $") , '. e := #''' , m , '9''.'.
	got := BaseException ___codeOccurrencesOf___: m in: src.
	self assert: got size equals: 2.
	self assert: ((BaseException ___parsePositionAt___: (got at: 1) + 16 in: src) at: 1)
		equals: 5.
	self assert: ((BaseException ___parsePositionAt___: (got at: 2) + 16 in: src) at: 1)
		equals: 6.
	"An unterminated string hides everything after it."
	self assert: (BaseException ___codeOccurrencesOf___: m in: 'x := ''' , m , '1.') isEmpty.
	"A pattern that itself contains a quote is lexed through, not skipped."
	self assert: (BaseException ___codeOccurrencesOf___: 'f: '''
			in: 'f: ''a''. ''f: ''''b''''''. f: ''c''') size
		equals: 2.
%

category: 'Grail-Tests-CallSitePositions'
method: PythonCallSitePositionsTestCase
test_the_source_index_api_does_not_over_claim
	"nil and an empty Array, never a guess: for a method that is not generated
	Python, and for an index outside the method's source."

	| m |
	m := Object compiledMethodAt: #printString otherwise: nil.
	self assert: (BaseException pythonPositionForMethod: m atSourceIndex: 1) equals: nil.
	self assert: (BaseException pythonSendSitesIn: m selector: nil) equals: #().
	self assert: (BaseException pythonPositionForMethod: nil atSourceIndex: 1) equals: nil.
	self assert: (BaseException pythonSendSitesIn: nil selector: nil) equals: #().
	m := self ___textMethod___.
	self assert: (BaseException pythonPositionForMethod: m atSourceIndex: 0) equals: nil.
	self assert: (BaseException pythonPositionForMethod: m
			atSourceIndex: m sourceString size + 1)
		equals: nil.
%
