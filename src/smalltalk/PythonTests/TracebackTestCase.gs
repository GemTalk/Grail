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

category: 'Grail-Tests - Traceback Data Model'
method: TracebackTestCase
testMethodCodeFirstlineno
	"Phase 2a follow-up: a def that compiles to a real Smalltalk METHOD -- a
	class-body def or a module top-level def -- carries func.__code__ too, not
	just a nested def's ExecBlock.  Its PyCode lives in a class-side
	___methodCodeTable___ (ClassDefAst for a class body, importlib's top-level
	pass for a module), which BoundMethod / UnboundMethod >> __code__ find by
	walking the superclass chain.

	The CLASS-BODY read is the case that matters: ``callable_line =
	get_exception.__code__.co_firstlineno + 2'' runs while the class body is
	still executing, which is what blocked test.test_traceback at IMPORT.  It is
	why the table is emitted BEFORE the class-attribute statements rather than
	beside its sibling doc / signature / annotations tables at the end.

	See tests/python/method_code_firstlineno.py -- line numbers there are
	load-bearing."

	| mod results |
	importlib @env1:modules removeKey: #'method_code_firstlineno' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/method_code_firstlineno.py')
		name: 'method_code_firstlineno'.
	results := mod @env1:___pyAttrLoad___: #RESULTS.

	"Module top-level def."
	self assert: ((results @env1:__getitem__: 'mod_firstlineno') = 10)
		description: 'module-level def __code__.co_firstlineno must be its def line (10)'.
	self assert: ((results @env1:__getitem__: 'mod_name') = 'module_level').
	self assert: ((results @env1:__getitem__: 'mod_argcount') = 2)
		description: 'co_argcount counts positional params (a, b)'.
	self assert: ((results @env1:__getitem__: 'mod_kwonlyargcount') = 1).

	"Class-body read of a sibling def -- the test.test_traceback blocker shape."
	self assert: ((results @env1:__getitem__: 'classbody_callable_line') = 20)
		description: 'a class body must be able to read a sibling def''s __code__ (18 + 2)'.
	self assert: ((results @env1:__getitem__: 'classbody_line') = 27).
	self assert: ((results @env1:__getitem__: 'classbody_name') = 'm').
	self assert: ((results @env1:__getitem__: 'classbody_qualname') = 'Later.m')
		description: 'co_qualname of a class-body def is Class.method'.
	self assert: ((results @env1:__getitem__: 'classbody_argcount') = 3)
		description: 'co_argcount includes the implicit self, as in CPython'.
	self assert: ((results @env1:__getitem__: 'classbody_kwonlyargcount') = 1).

	"Bound and unbound access agree."
	self assert: ((results @env1:__getitem__: 'bound_firstlineno') = 27).
	self assert: ((results @env1:__getitem__: 'unbound_firstlineno') = 27)
		description: 'Cls.method.__code__ must match instance.method.__code__'.

	"An inherited method reports the code object from where it was DEFINED."
	self assert: ((results @env1:__getitem__: 'inherited_firstlineno') = 38).
	self assert: ((results @env1:__getitem__: 'inherited_qualname') = 'Base.inherited')
		description: 'an inherited method''s code object comes from its defining class'.

	"__code__ must stay ABSENT on a non-function: hasattr(x, ''__code__'') is
	how inspect / functools.wraps decide whether something is a function."
	self assert: ((results @env1:__getitem__: 'function_has_code') = true).
	self assert: ((results @env1:__getitem__: 'int_has_code') = false)
		description: 'an int must not grow a __code__'.
	self assert: ((results @env1:__getitem__: 'builtin_method_has_code') = false)
		description: 'a builtin method has no ___methodCodeTable___ entry -> AttributeError'.
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

category: 'Grail-Tests'
method: TracebackTestCase
testCodeObjectCarriesTheModulePath
	"co_filename was the '<grail>' placeholder for every code object, on the
	grounds that Grail has no file-backed ones.  But the emitters DO know the
	module's path at compile time -- it is on the ModuleAst -- and a real path
	is what lets linecache read the source, which is what makes
	FrameSummary.line possible.  Checked for all three def shapes, since each
	has its own PyCode emit site."

	| mod path |
	path := importlib grailDir , '/tests/python/code_filename.py'.
	mod := importlib loadModuleFromPath: path name: 'code_filename'.
	self assert: (mod @env1:module_level_filename) equals: path.
	self assert: (mod @env1:class_body_filename) equals: path.
	self assert: (mod @env1:nested_def_filename) equals: path.
	"A file-less compile keeps the placeholder -- there is no path to report."
	self assert: (self eval: 'def f(): pass
f.__code__.co_filename') equals: '<grail>'
%

category: 'Grail-Tests'
method: TracebackTestCase
testLinecacheReadsSourceForARealPath
	"The payoff: with a real co_filename, linecache can read the file.  It
	could not before, and two further gaps had to close for it to work at all
	-- there was no ``tokenize'' module (linecache imports it and returns []
	on ImportError, so EVERY lookup answered nothing), and os.stat answered a
	raw GsFileStat with no ``st_size'' / ``st_mtime''."

	| mod |
	mod := importlib loadModuleFromPath: (importlib grailDir , '/tests/python/code_filename.py')
		name: 'code_filename'.
	self assert: (mod @env1:linecache_reads_own_source)
%

category: 'Grail-Tests'
method: TracebackTestCase
testFrameSummaryLineCarriesSourceText
	"traceback.FrameSummary.line is CPython's LAZY property backed by
	linecache, not a plain attribute -- so a traceback prints the code line
	under its ``File ..., line N''.  It was always None before."

	| mod |
	mod := importlib loadModuleFromPath: (importlib grailDir , '/tests/python/code_filename.py')
		name: 'code_filename'.
	self assert: (mod @env1:frame_summary_has_source_line)
%

category: 'Grail-Tests'
method: TracebackTestCase
testFrameSummaryHonoursLookupLine
	"``lookup_line=False'' defers the linecache read; ``locals=`` captures
	repr()s.  Both are CPython parameters that were simply absent, so every
	lazy-lookup test raised TypeError on an unexpected keyword."

	| mod |
	mod := importlib loadModuleFromPath: (importlib grailDir , '/tests/python/code_filename.py')
		name: 'code_filename'.
	self assert: (mod @env1:lookup_line_is_honoured)
%

category: 'Grail-Tests'
method: TracebackTestCase
testOsStatAnswersStatResultFields
	"os.stat answers CPython's os.stat_result, not the raw GsFileStat: the
	fields are the same but Python reads them as st_size / st_mtime, which is
	what linecache and django's session backend do."

	| mod |
	mod := importlib loadModuleFromPath: (importlib grailDir , '/tests/python/code_filename.py')
		name: 'code_filename'.
	self assert: (mod @env1:stat_result_fields)
%

category: 'Grail-Tests - Traceback Runtime'
method: TracebackTestCase
testExceptionNotes
	"PEP 678: add_note text renders under the exception's own line, __notes__
	is a genuinely writable/deletable attribute, and a note that cannot be
	rendered is reported rather than escaping the formatter.  See
	tests/python/exception_notes.py."

	| mod |
	importlib @env1:modules removeKey: #'exception_notes' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exception_notes.py')
		name: 'exception_notes'.
	#( 'notes_render_under_the_message'
	   'notes_are_absent_until_the_first_add_note'
	   'notes_attribute_is_writable_and_deletable'
	   'non_list_notes_render_as_repr'
	   'unprintable_notes_do_not_escape_the_formatter'
	   'broken_getattr_is_reported_not_propagated' ) do: [:k |
		self assert: ((mod @env0:perform: k asSymbol env: 1) = true)
			description: '__notes__ check failed: ' , k].
%

category: 'Grail-Tests - Traceback Runtime'
method: TracebackTestCase
testTracebackExceptionEquality
	"TracebackException compares by CONTENT: CPython's __eq__ is a __dict__
	comparison, which works there because it stores the exception's MESSAGE
	rather than the exception.  A foreign operand gets NotImplemented, not
	False, so the other side's __eq__ still gets a turn."

	| mod |
	importlib @env1:modules removeKey: #'exception_notes' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exception_notes.py')
		name: 'exception_notes'.
	#( 'traceback_exception_equality_is_by_content'
	   'traceback_exception_equality_defers_to_other_types'
	   'notes_take_part_in_equality' ) do: [:k |
		self assert: ((mod @env0:perform: k asSymbol env: 1) = true)
			description: 'TracebackException equality check failed: ' , k].
%
