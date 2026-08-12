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

category: 'Grail-Tests - Traceback Runtime'
method: TracebackTestCase
testModuleLoaderAndLazyLinecache
	"Every module carries a PEP 302 __loader__, and linecache resolves a
	filename that is not on disk through the CALLING module's loader -- which
	is how a traceback shows source for a frame whose co_filename does not
	name a readable file.  See tests/python/module_loader.py."

	| mod |
	importlib @env1:modules removeKey: #'module_loader' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_loader.py')
		name: 'module_loader'.
	#( 'module_has_a_loader'
	   'loader_answers_the_modules_source'
	   'loader_reports_filename_and_package'
	   'loader_rejects_a_foreign_name'
	   'lazycache_resolves_through_the_loader'
	   'lazycache_without_globals_finds_nothing' ) do: [:k |
		self assert: ((mod @env0:perform: k asSymbol env: 1) = true)
			description: '__loader__ / linecache check failed: ' , k].
%

category: 'Grail-Tests - Traceback Runtime'
method: TracebackTestCase
testExtractTbOnADuckTypedTraceback
	"extract_tb must not require Grail's own tb_line / tb_colno extras -- only
	tb_frame / tb_lineno / tb_next are the documented protocol, with the PEP 657
	columns coming off the code object's co_positions().  Requiring them made
	extract_tb raise AttributeError, which TracebackException swallowed into an
	empty stack, so the caller saw IndexError from stack[0]."

	| mod |
	importlib @env1:modules removeKey: #'module_loader' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/module_loader.py')
		name: 'module_loader'.
	#( 'extract_tb_accepts_a_duck_typed_traceback'
	   'lookup_lines_false_defers_the_linecache_read'
	   'capture_locals_snapshots_reprs' ) do: [:k |
		self assert: ((mod @env0:perform: k asSymbol env: 1) = true)
			description: 'extract_tb check failed: ' , k].
%

category: 'Grail-Tests - Traceback Runtime'
method: TracebackTestCase
testExceptionNaming
	"How a traceback names an exception: CPython uses __qualname__ and
	qualifies it with the defining module unless that module is builtins or
	__main__ -- so ValueError is unchanged while a library's own exception
	renders module-qualified.  A non-str __module__ renders as <unknown>.
	See tests/python/exception_naming.py.

	NOTE the nesting check asserts against Outer.Inner.__qualname__ rather than
	a literal: Grail answers 'Inner' nested one level short of CPython (an
	'Outer.Inner' where CPython would include every enclosing scope).  That is
	a separate __qualname__ gap, so this test pins the FORMATTER's rule -- use
	__qualname__, qualify with __module__ -- and not that bug."

	| mod |
	importlib @env1:modules removeKey: #'exception_naming' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exception_naming.py')
		name: 'exception_naming'.
	#( 'builtin_exceptions_are_not_module_qualified'
	   'library_exceptions_are_module_qualified'
	   'nested_exceptions_use_qualname'
	   'a_non_str_module_renders_as_unknown' ) do: [:k |
		self assert: ((mod @env0:perform: k asSymbol env: 1) = true)
			description: 'exception naming check failed: ' , k].
%

category: 'Grail-Tests - Traceback Runtime'
method: TracebackTestCase
testExceptionMessageRendering
	"str(exc) for a single argument is str(args[0]) -- the PYTHON str protocol.
	Smalltalk #asString answered the argument's printString instead, so
	``raise Exception(None)'' rendered ``Exception: aNoneType''.  And a None
	EXCEPTION is not special-cased: type(None) is NoneType, so
	print_exception(None) renders ``NoneType: None''."

	| mod |
	importlib @env1:modules removeKey: #'exception_naming' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exception_naming.py')
		name: 'exception_naming'.
	#( 'a_none_exception_renders_as_nonetype_none'
	   'a_legacy_type_with_no_value_keeps_the_bare_name'
	   'a_none_argument_is_not_a_missing_message'
	   'non_string_arguments_use_python_str'
	   'a_broken_str_is_reported_not_propagated'
	   'print_exc_takes_limit_first'
	   'print_last_reads_sys_last_exc' ) do: [:k |
		self assert: ((mod @env0:perform: k asSymbol env: 1) = true)
			description: 'message rendering check failed: ' , k].
%

category: 'Grail-Tests - Traceback Runtime'
method: TracebackTestCase
loadFrameDepthFixture
	importlib @env1:modules removeKey: #'frame_depth' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/frame_depth.py')
		name: 'frame_depth'
%

category: 'Grail-Tests - Traceback Runtime'
method: TracebackTestCase
testTracebackSpansEveryFrame
	"A traceback is the WHOLE propagation path, outermost first, built from the
	VM's raise-time stack capture (#GemExceptionSignalCapturesStack).  It used
	to be a single frame -- the catching function -- so tb_next was always None.
	Per-frame Python line numbers come from the ``___curPos___ := N'' literals in
	the generated source, located via GsNMethod>>_sourceAtIp: (§9.9), so no
	compile-time ip->line map is needed.  See tests/python/frame_depth.py."

	| mod |
	mod := self loadFrameDepthFixture.
	#( 'traceback_spans_every_frame'
	   'the_traceback_stops_at_the_catching_function'
	   'tb_next_chains_inward'
	   'every_frame_names_its_source_file'
	   'every_frame_resolves_its_source_line' ) do: [:k |
		self assert: ((mod @env0:perform: k asSymbol env: 1) = true)
			description: 'frame-depth check failed: ' , k].
%

category: 'Grail-Tests - Traceback Runtime'
method: TracebackTestCase
testTracebackFrameLimits
	"CPython's limit rules, which are subtler than one number: a positive limit
	keeps the FIRST N frames, a negative one the LAST abs(N) (so the walk cannot
	stop early), and sys.tracebacklimit supplies the default -- except that a
	NEGATIVE tracebacklimit means ``show nothing'' rather than ``show the last
	N''.  test.test_traceback's LimitTests asserts both halves."

	| mod |
	mod := self loadFrameDepthFixture.
	#( 'a_positive_limit_keeps_the_first_frames'
	   'a_negative_limit_keeps_the_last_frames'
	   'sys_tracebacklimit_supplies_the_default'
	   'format_exception_honours_limit' ) do: [:k |
		self assert: ((mod @env0:perform: k asSymbol env: 1) = true)
			description: 'traceback limit check failed: ' , k].
%

category: 'Grail-Tests - Traceback Runtime'
method: TracebackTestCase
testGeneratorRaiseSpansTheBoundary
	"A raise inside a generator body spans BOTH sides.  The body runs in a forked
	GsProcess whose captured stack holds none of the consumer's frames, so the two
	captures are spliced (§9.12).

	This test used to pin the OPPOSITE -- the single-frame fallback -- and §9.9
	called it the one that would catch the behaviour change when the consumer's
	stack was spliced.  It would not have: it asserted ``len(frames) >= 1''.  It
	is exact now.  The detailed shapes are testGeneratorTracebackSpansTheBoundary."

	self assert: ((self loadFrameDepthFixture
		@env0:perform: #'a_generator_raise_spans_the_consumer_and_the_generator'
		env: 1) = true)
%

category: 'Grail-Tests - Traceback Runtime'
method: TracebackTestCase
testBareReraiseSplicesFrames
	"A bare ``raise'' re-raises the SAME exception, which already carries a
	traceback.  CPython adds a frame for every function it then unwinds through --
	each at the line where the exception ENTERED that function, not at the
	``raise'' -- and each function once.  Grail used to stop at the first
	traceback it found, losing everything above the re-raise; the walk now rebuilds
	from the live captured stack, which still holds the original chain because
	Smalltalk runs a handler ON TOP of the frames that signalled (§9.9 item 5).

	Every expectation in the fixture is verified against real CPython by running
	the file directly -- see its docstring.  See tests/python/reraise_frames.py."

	| mod |
	importlib @env1:modules removeKey: #'reraise_frames' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/reraise_frames.py')
		name: 'reraise_frames'.
	#( 'a_bare_reraise_keeps_the_deeper_frames_and_adds_the_catcher'
	   'the_reraising_frame_is_reported_at_the_original_call'
	   'each_function_appears_once'
	   'a_passed_through_function_gets_a_frame_too'
	   'nested_reraises_each_add_their_frame'
	   'the_reraised_exception_is_the_same_object'
	   'a_reraised_traceback_renders_every_frame' ) do: [:k |
		self assert: ((mod @env0:perform: k asSymbol env: 1) = true)
			description: 'bare-re-raise check failed: ' , k].
%

category: 'Grail-Tests - Traceback Runtime'
method: TracebackTestCase
testRaiseInsideHandlerHasItsOwnFrames
	"An exception raised while another is being handled gets its OWN traceback;
	the handled exception's frames belong to __context__, not to it.  Grail read
	them off the live Smalltalk stack, which still holds them -- a handler runs ON
	TOP of the frames that signalled rather than after unwinding them -- so a
	wrapping raise reported the frames it was wrapping, and located its own frame
	at the try body instead of at the ``raise'' (§9.10 item 7).

	Not simply ``stop at the handler'': a function CALLED from the handler does
	contribute its frames, which a_function_called_from_the_handler_gets_its_own_frame
	pins.  Every expectation is verified against real CPython by running the fixture
	directly -- see its docstring.  See tests/python/handler_context_frames.py."

	| mod |
	importlib @env1:modules removeKey: #'handler_context_frames' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/handler_context_frames.py')
		name: 'handler_context_frames'.
	#( 'the_wrapping_raise_reports_only_its_own_frames'
	   'the_handler_frame_is_at_the_raise_not_at_the_try'
	   'no_frame_from_the_handled_exception_leaks_in'
	   'raise_from_behaves_the_same'
	   'a_function_called_from_the_handler_gets_its_own_frame'
	   'the_handled_exceptions_own_traceback_survives'
	   'raise_from_sets_cause'
	   'the_rendered_traceback_names_only_the_new_frames' ) do: [:k |
		self assert: ((mod @env0:perform: k asSymbol env: 1) = true)
			description: 'handler-context check failed: ' , k].
%

category: 'Grail-Tests - Traceback Runtime'
method: TracebackTestCase
testGeneratorTracebackSpansTheBoundary
	"§9.9's item 6, the last of them.  A generator body runs in its own forked
	GsProcess, so the stack captured when it raises holds the body and the fork
	plumbing and NOTHING of the consumer.  PythonGenerator stows such an exception
	and re-signals it on the consumer, which is where the consumer's half is
	captured; the two are spliced, one stashed level per generator so that
	``yield from'' reports both bodies.

	Every expectation is verified against real CPython by running the fixture
	directly -- see its docstring.  See tests/python/generator_frames.py."

	| mod |
	importlib @env1:modules removeKey: #'generator_frames' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/generator_frames.py')
		name: 'generator_frames'.
	#( 'the_generators_own_frame_is_reported'
	   'the_consumers_frame_is_reported_too'
	   'advancing_with_next_gives_the_same_chain'
	   'every_consumer_frame_appears'
	   'yield_from_reports_both_generators'
	   'throw_reports_the_generators_frame'
	   'an_exception_caught_inside_the_generator_is_invisible'
	   'pep479_still_converts_stopiteration'
	   'the_rendered_traceback_names_both' ) do: [:k |
		self assert: ((mod @env0:perform: k asSymbol env: 1) = true)
			description: 'generator-frame check failed: ' , k].
%

category: 'Grail-Tests - Traceback Runtime'
method: TracebackTestCase
testExceptionChaining
	"__cause__ / __context__ chaining, both halves.  Grail had __cause__
	(``raise X from Y'') and __suppress_context__, but never set __context__ and
	rendered only the outermost exception -- so a wrapped error lost the one that
	caused it.  Implicit context now comes from the exception TryAst records in
	___currentException___, on every raise path (constructed, bare class, and an
	already-built instance), and format_exception / TracebackException.format walk
	the chain with CPython's two connector lines.

	Every expectation is verified against real CPython by running the fixture
	directly -- see its docstring.  See tests/python/exception_chaining.py."

	| mod |
	importlib @env1:modules removeKey: #'exception_chaining' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exception_chaining.py')
		name: 'exception_chaining'.
	#( 'a_raise_inside_a_handler_records_the_context'
	   'an_implicit_context_renders_the_during_handling_line'
	   'an_explicit_cause_sets_both_and_suppresses'
	   'raise_from_none_suppresses_the_context_but_keeps_it'
	   'a_bare_class_raise_chains_too'
	   'a_cyclic_chain_terminates_and_renders_once'
	   'reraising_the_handled_exception_does_not_self_chain'
	   'a_context_link_keeps_its_own_traceback'
	   'chain_false_renders_only_the_outermost'
	   'tracebackexception_captures_the_chain' ) do: [:k |
		self assert: ((mod @env0:perform: k asSymbol env: 1) = true)
			description: 'exception-chaining check failed: ' , k].
%

category: 'Grail-Tests - Traceback Runtime'
method: TracebackTestCase
testAttributeErrorSuggestions
	"CPython's ``Did you mean: 'blech'?'' on a misspelled attribute.

	Three separate gaps had to close before a suggestion was computable, and the
	fixture pins each one because each was independently missing:

	dir(instance) reported NEITHER the class's data attributes (they compile to
	accessors on the metaclass, so only dir(TheClass) saw them) NOR the
	instance's own (dynamic instVars) -- object>>__dir__ scanned env-1 selectors
	only, so every candidate list was empty.

	AttributeError carried no ``name'' / ``obj''.  CPython has exposed both since
	3.10, and the suggestion needs both: ``name'' is the misspelling to match,
	``obj'' supplies the candidates.

	A bare ``raise AttributeError()'' from a user __getattr__ gets those stamped
	on by the attribute machinery, as CPython's set_attribute_error_context does
	-- otherwise the shape test_getattr_suggestions_no_args uses (no message, no
	name) could never be helped.

	The edit costs and tie-breaks are CPython's own (Python/suggestions.c), which
	is what makes the ordering checks meaningful: substitution beats elimination
	beats addition, and a case change beats all three.  Verified against real
	CPython by running the fixture directly; see
	tests/python/attr_suggestions.py."

	| mod |
	importlib @env1:modules removeKey: #'attr_suggestions' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/attr_suggestions.py')
		name: 'attr_suggestions'.
	#( 'dir_of_an_instance_reports_class_and_instance_attributes'
	   'an_attributeerror_carries_name_and_obj'
	   'a_close_attribute_is_suggested'
	   'the_suggestion_follows_cpythons_edit_costs'
	   'an_instance_attribute_can_be_suggested'
	   'a_bare_attributeerror_still_gets_a_suggestion'
	   'a_wildly_wrong_name_gets_no_suggestion'
	   'an_exact_match_is_never_suggested'
	   'an_underscored_candidate_is_hidden_from_a_plain_typo'
	   'a_non_string_candidate_is_ignored'
	   'an_unrenderable_message_does_not_break_the_line' ) do: [:k |
		self assert: ((mod @env0:perform: k asSymbol env: 1) = true)
			description: 'attribute-suggestion check failed: ' , k].
%

category: 'Grail-Tests - Traceback Runtime'
method: TracebackTestCase
testImplicitContextReleasesTheCapturedStack
	"An exception stored as another's __context__ must keep its TRACEBACK and drop
	its raise-time CAPTURE.

	Primitive 2022 fills _gsStack with the whole Smalltalk stack at every raise.
	That is what makes multi-frame tracebacks affordable (§9.2) -- nothing per
	call -- but the capture is only raw material, and holding it after the
	traceback is built makes a long chain quadratic: every link retains a
	full-stack capture, so a runaway that raises once per level retains O(depth^2)
	triples.  At the depth Grail reaches (~6645 levels, ~16 Smalltalk frames each)
	that is ~350 million triples and the gem runs out of temporary object memory
	outright -- tripling GEM_TEMPOBJ_CACHE_SIZE does not help.

	___applyImplicitContext___ releases it, which is the one point where the
	exception is provably spent: we are raising from inside its handler, so its
	traceback is built and it is no longer propagating.  Releasing EARLIER, when
	the traceback is first built, is wrong -- a bare re-raise rebuilds by walking
	that same capture again with a wider trim, and testBareReraiseSplicesFrames
	catches it.

	Asserted on the Smalltalk slot because _gsStack is not reachable from Python.
	The companion fixture check (the context keeps its own traceback) is in
	tests/python/exception_chaining.py."

	| mod exc ctx |
	"Capture is enabled lazily, on the first traceback build, so in a fresh
	session the very first raise happens with it OFF and _gsStack stays nil for a
	reason that has nothing to do with releasing it.  Enable it up front, or this
	test asserts nothing -- it passed with the release removed until this line was
	added."
	BaseException ___ensureStackCapture___.
	importlib @env1:modules removeKey: #'exception_chaining' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exception_chaining.py')
		name: 'exception_chaining'.
	exc := mod @env0:perform: #'implicit_context' env: 1.
	ctx := exc @env0:dynamicInstVarAt: #'___context___'.
	self deny: ctx isNil
		description: 'the ValueError should have the ZeroDivisionError as __context__'.
	self assert: ctx _gsStack isNil
		description: 'a context link must not retain its raise-time _gsStack capture'.
	"The traceback built FROM that capture has to survive it."
	self deny: (ctx @env0:instVarAt: 2) isNil
		description: 'releasing the capture must not discard the context traceback'.
%

category: 'Grail-Tests - Traceback Runtime'
method: TracebackTestCase
testRecursionContextChain
	"The context chain a RUNAWAY RECURSION produces, and rendering a chain too
	long to walk recursively.

	Two fixes meet here.  ___recursionGuard___ converts GemStone's
	AlmostOutOfStack into a catchable RecursionError, but built the replacement
	with ___new___ alone -- so unlike every other raise it took no implicit
	__context__, and a chain CPython renders as one block per level rendered as a
	single traceback.  And TracebackException captured the chain by RECURSING per
	link, which overflows on a chain longer than the stack (reachable because
	__context__ is a writable attribute, so a loop can build one of any length);
	it now expands from a queue, as CPython's does for this same reason.

	Each check is evaluated INSIDE ___recursionGuard___, which is what the
	CPython-suite harness does around every test for the same reason -- without
	it the runaway's AlmostOutOfStack escapes into Smalltalk instead of reaching
	the fixture's ``except RecursionError''.

	The depth reached is a property of the gem's stack configuration, not of
	Grail (188 levels here, 6645 under the CPython suite's deeper stack), so the
	fixture asserts RELATIONS -- one link per level, one block per link -- rather
	than counts.  Every expectation is verified against real CPython by running
	the fixture directly; see tests/python/recursion_chain.py."

	| mod |
	importlib @env1:modules removeKey: #'recursion_chain' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/recursion_chain.py')
		name: 'recursion_chain'.
	#( 'a_runaway_recursion_raises_a_catchable_recursionerror'
	   'the_recursionerror_records_the_handled_exception_as_context'
	   'the_context_chain_is_as_long_as_the_recursion'
	   'the_long_chain_renders_one_block_per_link'
	   'format_exception_renders_the_long_chain_too'
	   'a_chain_longer_than_the_stack_is_still_constructible'
	   'the_long_chain_still_renders_every_link'
	   'a_cycle_in_an_assigned_context_still_terminates' ) do: [:k |
		self assert: ((BaseException @env1:___recursionGuard___: [
				mod @env0:perform: k asSymbol env: 1]) = true)
			description: 'recursion-chain check failed: ' , k].
%

