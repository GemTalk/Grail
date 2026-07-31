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
