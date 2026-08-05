! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TracebackTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TracebackTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
TracebackTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TracebackTestCase - Phase 1 of the traceback design
! (docs/Python_Traceback_Design.md): the traceback DATA MODEL only.
!
!   * PyCode / PyFrame / PyTraceback linked-list objects
!   * exc.__traceback__ slot + with_traceback(tb)
!   * traceback.extract_tb / FrameSummary / StackSummary (incl. PEP 657 columns)
!
! Phase 1 does NOT populate tracebacks at runtime (that is Phase 2), so these
! tests build a traceback BY HAND -- from Smalltalk, where the PyCode / PyFrame
! / PyTraceback constructors live -- and a pure-Python fixture exercises the
! FrameSummary field/slicing/round-trip behaviour that needs no PyTraceback.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
TracebackTestCase removeAllMethods.
TracebackTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Traceback Runtime'
method: TracebackTestCase
testSysExcInfo
	"sys.exc_info() / sys.exception() report the exception currently being
	handled (set by TryAst around an except handler, restored on exit so nested
	handlers stack), instead of the old (None, None, None) stub.  Also drives
	traceback.format_exc().  See tests/python/sys_excinfo.py."

	| mod results |
	importlib @env1:modules removeKey: #'sys_excinfo' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/sys_excinfo.py')
		name: 'sys_excinfo'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#( 'baseline_none' 'inside_type' 'inside_value' 'inside_message'
	   'inside_exception_is_value' 'outside_is_none' 'nested'
	   'format_exc_has_message' ) do: [:k |
		self assert: ((results @env1:__getitem__: k) = true)
			description: 'sys.exc_info check failed: ' , k].
%

category: 'Grail-Tests - Traceback Runtime'
method: TracebackTestCase
testFinallyDuringPropagation
	"sys.exc_info() / sys.exception() inside a ``finally'' that runs because an
	exception is propagating report that in-flight exception (CPython), via
	BaseException>>___ensureFinally___:finally: emitted by TryAst in non-generator
	scopes.  Phase 3a covered except bodies; this covers finally bodies -- for a
	bare try/finally, a try/except/finally whose except does NOT match, and the
	save/restore interaction with an enclosing handler.  Also asserts the finally
	does not swallow the exception.  See tests/python/finally_propagation.py."

	| mod results |
	importlib @env1:modules removeKey: #'finally_propagation' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/finally_propagation.py')
		name: 'finally_propagation'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#( 'bare_sees_valueerror' 'normal_finally_none' 'finally_doesnt_swallow'
	   'except_finally_uncaught' 'nested_restore' ) do: [:k |
		self assert: ((results @env1:__getitem__: k) = true)
			description: 'finally-during-propagation check failed: ' , k].
%

category: 'Grail-Tests - Traceback Data Model'
method: TracebackTestCase
testTracebackDataModelFixture
	"Pure-Python data-model checks: FrameSummary PEP 657 column slicing, the
	4-tuple shape, StackSummary format, default __traceback__ is None, and
	with_traceback returning self.  See tests/python/traceback_data_model.py."

	| mod results |
	importlib @env1:modules removeKey: #'traceback_data_model' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/traceback_data_model.py')
		name: 'traceback_data_model'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#( 'frame_summary_slicing' 'frame_summary_tuple_shape' 'stacksummary_format'
	   'default_traceback_is_none' 'with_traceback_returns_self'
	   'extract_tb_of_none_is_empty' ) do: [:k |
		self assert: ((results @env1:__getitem__: k) = true)
			description: 'traceback data-model check failed: ' , k].
%

category: 'Grail-Tests - Traceback Data Model'
method: TracebackTestCase
testFuncCodeFirstlineno
	"Phase 2: a nested def carries a real func.__code__ (a PyCode) stamped at
	def-time; co_firstlineno is the 1-based line of the ``def'' keyword (what
	test_dictcomps.test_exception_locations reads as co.co_firstlineno).  See
	tests/python/func_code_firstlineno.py -- inner's def is on line 10."

	| mod results |
	importlib @env1:modules removeKey: #'func_code_firstlineno' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/func_code_firstlineno.py')
		name: 'func_code_firstlineno'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	self assert: ((results @env1:__getitem__: 'has_code') = true).
	self assert: ((results @env1:__getitem__: 'co_firstlineno_is_int') = true).
	self assert: ((results @env1:__getitem__: 'co_firstlineno') = 10)
		description: 'func.__code__.co_firstlineno must be the def line (10)'.
	self assert: ((results @env1:__getitem__: 'co_name') = 'inner').
%

category: 'Grail-Tests - Traceback Runtime'
method: TracebackTestCase
testCaughtExceptionHasFrame
	"General traceback population: a caught exception now carries a traceback
	whose frame is the CATCHING function located at the EXACT line it propagated
	from (TryAst's except-binding fallback + per-statement ___curPos___ tracking
	through SuiteAst bodies), so traceback.extract_tb / sys.exc_info() /
	traceback.format_exc are non-empty for ANY caught exception -- not just
	comprehensions.  _catch_deep pins the raise line inside a for loop several
	statements into the try body (would report the ``try'' header before the
	SuiteAst setPos fix).  See tests/python/general_traceback.py."

	| mod results |
	importlib @env1:modules removeKey: #'general_traceback' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/general_traceback.py')
		name: 'general_traceback'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#( 'nonempty' 'name_is_func' 'lineno_is_raise' 'exc_info_nonempty'
	   'format_exc_has_valueerror'
	   'deep_nonempty' 'deep_name' 'deep_lineno_is_raise' ) do: [:k |
		self assert: ((results @env1:__getitem__: k) = true)
			description: 'caught-exception-frame check failed: ' , k].
%

category: 'Grail-Tests - Traceback Runtime'
method: TracebackTestCase
testComprehensionExceptionTraceback
	"Phase 2 runtime population: an exception from a comprehension's iterator
	protocol carries a real traceback whose frame [0] is located at the iterable
	expression (PEP 657) inside the enclosing function.  This is the end-to-end
	path (def-time PyCode stamp + ComprehensionAst frame wrapper + extract_tb)
	that greens test_dictcomps/test_setcomps test_exception_locations.  See
	tests/python/comprehension_traceback.py."

	| mod results |
	importlib @env1:modules removeKey: #'comprehension_traceback' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/comprehension_traceback.py')
		name: 'comprehension_traceback'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#( 'has_frame' 'name_is_g' 'line_has_boom' 'colno_is_int'
	   'iterable_span_width' 'iterable_span_is_boom' ) do: [:k |
		self assert: ((results @env1:__getitem__: k) = true)
			description: 'comprehension-traceback check failed: ' , k].
%

category: 'Grail-Tests - Traceback Runtime'
method: TracebackTestCase
testForLoopExceptionPositions
	"PEP 657 for a FOR statement: an exception from evaluating the iterable, from
	__iter__, or from __next__ is attributed to the ITERATOR EXPRESSION's column
	span -- the for-statement twin of testComprehensionExceptionTraceback, and
	what greens test_iter's test_exception_locations (which died on ``None - int''
	because colno/end_colno/line were all None).

	Also asserts the two boundaries that make the mechanism trustworthy rather
	than merely passing: the position is re-pointed before EVERY __next__ (so an
	exception arriving after the body has run is still located at the iterable,
	not at the last body statement), and a BODY exception is NOT attributed to the
	iterable.  See tests/python/for_traceback_positions.py."

	| mod results |
	importlib @env1:modules removeKey: #'for_traceback_positions' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/for_traceback_positions.py')
		name: 'for_traceback_positions'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.
	#( 'init_span' 'next_span' 'iter_span'
	   'late_next_span' 'late_next_lineno_is_for'
	   'body_has_no_colno' 'body_lineno_is_body'
	   'tuple_target_span' 'tuple_target_has_colno' ) do: [:k |
		self assert: ((results @env1:__getitem__: k) = true)
			description: 'for-loop traceback position check failed: ' , k].
%

category: 'Grail-Tests - Traceback Data Model'
method: TracebackTestCase
testExtractTbWalksPyTracebackChain
	"Build a two-node PyTraceback chain (shallow frame -> deep frame, as an
	exception unwinds) and walk it through traceback.extract_tb.  extract_tb
	returns frames OUTERMOST first, so [0] is the shallow frame (the one that
	would catch), positioned at the comprehension iterable BrokenIter(...),
	with PEP 657 columns recovering that sub-expression."

	| tbMod line codeInit frameInit tbInner codeF frameF tbHead stack fs sliced |
	tbMod := importlib
		loadModuleFromPath: (importlib @env1:___moduleNameToPath___: 'traceback')
		name: 'traceback'.
	line := '                {x:x for x in BrokenIter(init_raises=True)}'.

	"Deep frame: BrokenIter.__init__ at the ``1 / 0``."
	codeInit := PyCode name: '__init__' qualname: 'BrokenIter.__init__'
		filename: '<support>' firstlineno: 190.
	frameInit := PyFrame code: codeInit lineno: 192 back: None globals: None.
	tbInner := PyTraceback frame: frameInit lineno: 192 next: None
		endLineno: 192 colno: 12 endColno: 17 line: '            1 / 0'.

	"Shallow frame: init_raises at the comprehension iterable expression."
	codeF := PyCode name: 'init_raises' qualname: 't.<locals>.init_raises'
		filename: '<test>' firstlineno: 10.
	frameF := PyFrame code: codeF lineno: 12 back: None globals: None.
	tbHead := PyTraceback frame: frameF lineno: 12 next: tbInner
		endLineno: 12 colno: 30 endColno: 58 line: line.

	stack := tbMod @env1:extract_tb: tbHead.
	self assert: (stack @env1:__len__) equals: 2.

	fs := stack @env1:__getitem__: 0.
	self assert: (fs @env1:___pyAttrLoad___: #'lineno') equals: 12.
	self assert: (fs @env1:___pyAttrLoad___: #'end_lineno') equals: 12.
	self assert: (fs @env1:___pyAttrLoad___: #'colno') equals: 30.
	self assert: (fs @env1:___pyAttrLoad___: #'end_colno') equals: 58.
	self assert: (fs @env1:___pyAttrLoad___: #'name') equals: 'init_raises'.
	self assert: (fs @env1:___pyAttrLoad___: #'filename') equals: '<test>'.

	"f.line[colno - 16 : end_colno - 16] -> Smalltalk 1-based copyFrom:to:."
	sliced := (fs @env1:___pyAttrLoad___: #'line') copyFrom: 30 - 16 + 1 to: 58 - 16.
	self assert: sliced equals: 'BrokenIter(init_raises=True)'.
%

category: 'Grail-Tests - Traceback Data Model'
method: TracebackTestCase
testWithTracebackRoundTripRealTb
	"with_traceback(tb) stores into the ___traceback___ slot and returns self;
	both the __traceback__ method and the ___pyAttrLoad___ (whitelist) read
	path return the stored PyTraceback -- NOT a BoundMethod-wrapped selector."

	| exc code frame tb returned |
	code := PyCode name: 'g' qualname: 'g' filename: '<test>' firstlineno: 1.
	frame := PyFrame code: code lineno: 3 back: None globals: None.
	tb := PyTraceback frame: frame lineno: 3 next: None
		endLineno: 3 colno: 4 endColno: 9 line: '    x = 1'.

	exc := ValueError new.
	returned := exc @env1:with_traceback: tb.
	self assert: returned == exc.
	self assert: (exc @env1:__traceback__) == tb.
	self assert: (exc @env1:___pyAttrLoad___: #'__traceback__') == tb.
%

set compile_env: 0
