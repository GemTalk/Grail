! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExceptStarReraisePositionTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExceptStarReraisePositionTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ExceptStarReraisePositionTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ExceptStarReraisePositionTestCase
!
! WHICH SOURCE A RE-RAISE OUT OF AN ``except*'' CLAUSE IS BLAMED ON.
!
! CPython blames the whole CLAUSE -- keyword through the end of its body -- so
! the frame renders TWO source lines.  That extent belongs to no AST node, so
! both paths work it out from the source text: the text stores a literal PEP 657
! span in ___curPos___, and the IR path records a position-map entry
! (TryAst>>___irExceptStarClauseSpanFor___:), both over one shared scan.
!
! THE IR PATH USED TO STAMP A POINT INSTEAD, and its own docstring argued that
! was equivalent -- lines derived from the captured ips rather than a stored
! position.  It is not: the frame in question is a SYNTHESISED catching frame
! with no ip of its own, and the reader answers a point with the smallest
! recorded RANGE containing it, which was the enclosing def's.
!
! TWO NESTINGS, because they failed differently and a fixture with only the
! first would have understated it: a module-level def lost just the second
! source line, while a def nested in a method reported the enclosing ``def''
! line and a three-line elided span.  The multi-clause case pins the opposite --
! neither path stamps a clause when there are several, because which one
! re-raised is a runtime fact that one compile-time span cannot name.
! ===============================================================================

doit
ExceptStarReraisePositionTestCase removeAllMethods.
ExceptStarReraisePositionTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ExceptStarReraisePositionTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'esrp_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'esrp_ir'.
	irModule := nil
%

category: 'Grail-Private'
method: ExceptStarReraisePositionTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/except_star_reraise_position.py'
%

category: 'Grail-Private'
method: ExceptStarReraisePositionTestCase
___keys___
	"Named rather than read from the dict, so a key that stops being produced
	fails here instead of silently dropping out of the comparison."

	^ #('module_blames_except_line' 'module_shows_except_keyword'
	    'module_shows_the_raise' 'module_has_no_def_line'
	    'module_has_no_elision'
	    'nested_blames_except_line' 'nested_shows_except_keyword'
	    'nested_shows_the_raise' 'nested_has_no_def_line'
	    'nested_has_no_elision'
	    'two_clauses_still_reports_a_frame' 'two_clauses_group_is_reported')
%

category: 'Grail-Private'
method: ExceptStarReraisePositionTestCase
___irModule___
	"The fixture with the seam FORCED ON.

	Forced rather than inherited: the text path is correct here, so a test
	gated on the ambient flag would be a no-op on the flag-off gate and would
	pass with the fix reverted."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'esrp_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'esrp_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___
		name: 'esrp_ir'.
	^ irModule
%

category: 'Grail-Private'
method: ExceptStarReraisePositionTestCase
___disagreeingKeys___
	| mod results expected bad |
	mod := self ___irModule___.
	results := mod @env1:___pyAttrLoad___: #'r'.
	expected := mod @env1:___pyAttrLoad___: #'EXPECTED'.
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := (results @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		want := (expected @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	^ bad
%

category: 'Grail-Tests - except* re-raise position'
method: ExceptStarReraisePositionTestCase
testTheReRaiseFrameBlamesTheWholeClauseUnderIR
	"MEASURED BOTH WAYS.  With the position entry reverted, five of these keys
	read False under IR -- the module def loses `module_shows_the_raise', and
	all four nested keys fail because that frame reports the enclosing `def'
	line with a three-line elided span."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: 'except* re-raise position disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - except* re-raise position'
method: ExceptStarReraisePositionTestCase
testSeveralClausesStillReportAFrame
	"The case that must NOT be stamped.

	Which clause re-raised is a runtime fact and one compile-time span cannot
	name a different one per run, so with several clauses the position stays
	whatever it was.  This pins that the frame is still reasonable -- kept
	separate so that a future cut narrowing the single-clause condition cannot
	quietly take this with it."

	| mod results |
	mod := self ___irModule___.
	results := mod @env1:___pyAttrLoad___: #'r'.
	self assert: (results @env1:__getitem__: 'two_clauses_still_reports_a_frame') == true
		description: 'a multi-clause except* re-raise reported no frame at all'.
	self assert: (results @env1:__getitem__: 'two_clauses_group_is_reported') == true
		description: 'a multi-clause except* re-raise did not report its group'
%

category: 'Grail-Tests - except* re-raise position'
method: ExceptStarReraisePositionTestCase
testTheIRArmDidNotFallBack
	"Correct answers prove nothing if the seam fell back to text -- and here the
	TEXT path is correct, so a fallback would score exactly like a pass."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'
%
