! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'PythonOffsetMapTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PythonOffsetMapTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PythonOffsetMapTestCase - a generated method carries a Python position map.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PythonOffsetMapTestCase removeAllMethods.
PythonOffsetMapTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Traceback'
method: PythonOffsetMapTestCase
___fixtureModule___
	"tests/python/python_offset_map.py, freshly imported.

	Freshly, because the map is emitted during CODEGEN: a module already in
	sys.modules from an earlier test would be warm-bound and this test would
	assert against methods some other run compiled."

	importlib @env1:modules removeKey: #'python_offset_map' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/python_offset_map.py')
		name: 'python_offset_map'
%

category: 'Grail-Tests - Traceback'
method: PythonOffsetMapTestCase
___mapSpanOfRaiseIn___: aBlock
	"Drive aBlock, and answer the position map's span for the INNERMOST frame
	that carries a map -- { beginLine. colno. endLine. endColno } -- or nil.

	Innermost-first is the order ___toPortableIps___: answers, and the frames
	above the Python one are Grail's own raise machinery (``Integer >>
	__truediv__:'', ``BaseException class >> ___signal___:''), which is
	hand-written Smalltalk and carries no map.  So ``the first frame that
	resolves'' IS the raising Python expression, without having to name the
	method it is in."

	| span |
	span := nil.
	[aBlock value]
		on: (Python at: #'ZeroDivisionError'), (Python at: #'NameError')
		do: [:ex |
			| st |
			st := BaseException ___toPortableIps___: ex _gsStack.
			2 to: st size by: 3 do: [:i |
				span isNil ifTrue: [
					span := BaseException
						___mapSpanForMethod___: (st at: i) ip: (st at: i + 1)]].
			ex return: nil].
	^ span
%

category: 'Grail-Tests - Traceback'
method: PythonOffsetMapTestCase
testTheMapAnswersCPythonsSpanOnEveryCompilePath
	"A raise resolves to the PEP 657 span CPython blames, through the map alone.

	WHAT THE MAP REPLACES.  Grail used to recover a frame's position by
	text-scanning the ``___curPos___'' store the codegen emits once per
	STATEMENT, so the answer was the whole statement: ``1 / 0 + 5'' underlined
	the addition.  GemStone already knows the harder half -- for any ip,
	``_previousStepPointForIp:'' then ``_sourceOffsetsAt:'' give the Smalltalk
	offset of the send in flight, and it lands on that send's SELECTOR -- and
	what was missing is Smalltalk offset -> Python node, which only the emitter
	knows.  So the emitter records it and the method carries the table.
	Resolution is then ``the smallest recorded range containing the step
	point'', which is CPython's rule arrived at with no per-shape special case:
	the division wins ``1 / 0 + 5'' because the ``/'' send sits inside the
	division's range and the ``+'' send does not.

	SEVEN COMPILE PATHS, because that is how many different routes there are
	from Python source to a compiled Smalltalk method, and each assembles its
	source differently.  Three matter more than the rest:

	  - the PROPERTY DELETER is the only caller that edits the source AFTER the
	    generator has finished with it, rewriting the leading selector to the
	    longer ``___propDeleter_x''.  That moves every offset the map
	    describes, so its map is written with a shift; get the shift wrong and
	    this check reports a span from the wrong part of the line.
	  - the MODULE BODY is compiled as ``''initialize'', lf, stream contents'',
	    so its offsets move by the length of that prefix -- a second, different
	    shift.  Its raise also happens in a BLOCK frame, which resolves against
	    the home method's map.
	  - UNDEFINED_GLOBAL raises NameError from inside a NAME's own emitted
	    text.  It is the boundary of the send-free rule (see
	    testASendFreeBodyCarriesNoMapAtAll): a name that reads a local emits a
	    bare Smalltalk temp and is dropped, but a name that reads a global
	    emits ``___signalUnbound___:'' and must be kept, or CPython's caret
	    under the name is lost.

	The expected numbers are CPython 3.14's, asserted in the fixture's own
	``__main__'' block so scripts/check_python_fixtures.sh keeps them honest."

	| mod |
	mod := self ___fixtureModule___.
	#( #( 'call_instance_method'  54 15 54 20 )
	   #( 'call_class_method'     58 22 58 27 )
	   #( 'call_static_method'    62 15 62 20 )
	   #( 'call_getter'           66 15 66 20 )
	   #( 'call_deleter'          70 23 70 28 )
	   #( 'module_function'       74 23 74 28 )
	   #( 'undefined_global'      78 11 78 27 ) ) do: [:each |
		| span expected |
		expected := (each copyFrom: 2 to: 5).
		span := self ___mapSpanOfRaiseIn___: [
			mod perform: (each at: 1) asSymbol env: 1 withArguments: #()].
		self assert: span notNil
			description: (each at: 1) , ': no frame carried a position map'.
		self assert: span asArray = expected asArray
			description: (each at: 1) , ': expected ' , expected printString
				, ' but the map answered ' , span printString]
%

category: 'Grail-Tests - Traceback'
method: PythonOffsetMapTestCase
testTheModuleBodyCarriesItsOwnMap
	"The module body is a compiled method too, and its raise resolves.

	Kept apart from the other six because it is not driven by calling a
	function: the raise happens WHILE THE MODULE IS EXECUTING, is caught by a
	module-level ``except'', and the exception is left in a module global.  So
	this reads the captured exception rather than provoking a new one, and it
	is the only check here whose frame is a block inside ``initialize''."

	| mod exc span st |
	mod := self ___fixtureModule___.
	exc := mod perform: #'MODULE_BODY_EXC' env: 1 withArguments: #().
	self assert: exc notNil
		description: 'the fixture did not capture a module-body exception'.
	st := BaseException ___toPortableIps___: exc _gsStack.
	span := nil.
	2 to: st size by: 3 do: [:i |
		span isNil ifTrue: [
			span := BaseException ___mapSpanForMethod___: (st at: i) ip: (st at: i + 1)]].
	self assert: span notNil
		description: 'the module body carried no position map'.
	self assert: span asArray = #(95 29 95 34)
		description: 'module body: expected #(95 29 95 34) but the map answered '
			, span printString
%

category: 'Grail-Tests - Traceback'
method: PythonOffsetMapTestCase
testAnFStringFieldIsBlamedOnItsOwnExpression
	"A raise inside an f-string replacement field resolves to THAT EXPRESSION,
	the way CPython blames it -- here the division, #(82 15 82 20).

	THIS TEST USED TO ASSERT THE COARSER SPAN #(82 11 82 23), the whole
	f-string, and said so deliberately.  A field is parsed by a CHILD
	PythonParser over ``(expr)'' alone -- which is what lets nested quotes and
	PEP 701 line breaks work -- so every node inside it claimed line 1, column 1,
	and those subtrees were marked (___markFragmentPositions___) and skipped by
	the map.  Skipping degraded the answer to the enclosing literal: the right
	line with a caret far too wide.

	The positions were never wrong, only UNTRANSLATED.  The tokenizer now records
	where each field begins in BOTH coordinate systems (PythonToken >>
	fieldStarts) and the parser rebases the child parse onto the module, so a
	field's nodes are first-class in the map.  FStringFieldPositionsTestCase pins
	the shapes that can break the arithmetic -- escapes decoded before the field,
	nested quotes, implicit concatenation, format specs, ``{expr=}'', raw
	prefixes.

	THE LINE-1 GUARD IS THE POINT OF THIS TEST AND IT STAYS.  A rebase that
	regressed would resolve to line 1 of the file -- in argparse alone that was
	74 entries -- so the line is asserted separately and first, with its own
	message, before the exact span."

	| mod span |
	mod := self ___fixtureModule___.
	span := self ___mapSpanOfRaiseIn___: [
		mod perform: #'in_an_f_string' env: 1 withArguments: #()].
	self assert: span notNil
		description: 'the f-string method carried no position map'.
	self assert: (span at: 1) = 82
		description: 'an f-string field must resolve to its OWN line, not the '
			, 'line 1 its child parse claims -- got ' , span printString.
	self assert: span asArray = #(82 15 82 20)
		description: 'f-string: expected the field''s own span #(82 15 82 20) '
			, '(CPython''s answer) but the map answered ' , span printString
%

category: 'Grail-Tests - Traceback'
method: PythonOffsetMapTestCase
testASendFreeBodyCarriesNoMapAtAll
	"A map entry earns its place only if a step point can land inside it.

	A node that emitted a bare identifier -- a local read, ``self'', ``nil'' --
	emitted no send, so nothing can ever be attributed to it and the entry is
	dead weight.  Measured over five stdlib modules that is 21% of all entries
	and 21% of the bytes, dropped with no loss of precision: the test is a
	SUPERSET (any space, colon or bracket keeps the entry), so it cannot discard
	one that could have won.

	``only_a_local'' is the degenerate case -- its whole body is one parameter
	read -- so its map is empty and the method must carry no marker at all,
	which also exercises the ``nothing recorded'' path through
	PrettyWriteStream >> mapCommentShiftedBy:."

	| mod cls src |
	mod := self ___fixtureModule___.
	cls := mod class.
	src := (cls compiledMethodAt: #'only_a_local:' environmentId: 1) sourceString.
	self assert: (src includesString: '___GRAILPOS___') not
		description: 'a body with no send must carry no position map, but '
			, 'only_a_local got one: ' , src printString
%
