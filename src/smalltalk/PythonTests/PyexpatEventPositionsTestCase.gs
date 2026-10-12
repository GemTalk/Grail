! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PyexpatEventPositionsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PyexpatEventPositionsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PyexpatEventPositionsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PyexpatEventPositionsTestCase - where pyexpat.py says an event is (#1386)
!
! Inside a handler, expat's CurrentLineNumber, CurrentColumnNumber and
! CurrentByteIndex give the START of the event being dispatched; pyexpat.py
! gave the position after it, and never set CurrentByteIndex.
!
! tests/python/pyexpat_event_positions.py holds the 12 checks, with CPython
! 3.14's C pyexpat as the oracle, run by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PyexpatEventPositionsTestCase removeAllMethods.
PyexpatEventPositionsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests'
method: PyexpatEventPositionsTestCase
testEveryEventReportsWhereItStarts
	"Every check in the fixture agrees with expat: tags, text pieces, comments,
	PIs, CDATA, entity expansions, UTF-8 / UTF-16 / Latin-1 byte indexes, a BOM,
	CRLF, the position after Parse, and the position an error pins."

	| mod results expected b keys |
	importlib @env1:modules removeKey: #'pyexpat_event_positions' ifAbsent: [].
	[mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pyexpat_event_positions.py')
		name: 'pyexpat_event_positions'.
	 results := mod @env1:___pyAttrLoad___: #'r'.
	 expected := mod @env1:___pyAttrLoad___: #'EXPECTED'.
	 keys := mod @env1:___pyAttrLoad___: #'KEYS'.
	 b := builtins @env1:instance.
	 self assert: (keys @env1:__len__) equals: 12.
	 0 to: (keys @env1:__len__) - 1 do: [:i |
		| k got want |
		k := keys @env1:__getitem__: i.
		got := (b @env1:repr: (results @env1:__getitem__: k)) asString.
		want := (b @env1:repr: (expected @env1:__getitem__: k)) asString.
		self assert: got equals: want
			description: k asString , ': got ' , got , ' want ' , want]]
		ensure: [
			importlib @env1:modules removeKey: #'pyexpat_event_positions' ifAbsent: []]
%
