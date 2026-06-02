fileformat utf8
set compile_env: 0
! ------------------- Class definition for CPythonObjectForwarderTestCase
expectvalue /Class
doit
CPythonTestCase subclass: 'CPythonObjectForwarderTestCase'
  instVarNames: #( reModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: EmbeddedPythonTests
  options: #()

%
expectvalue /Class
doit
CPythonObjectForwarderTestCase comment:
'Round-trip coverage for CPythonObjectForwarder: non-replicable PyObjects
come back as forwarders whose DNU forwards to the underlying Python
object.'
%
expectvalue /Class
doit
CPythonObjectForwarderTestCase category: 'Grail-SUnit'
%
! ------------------- Remove existing behavior from CPythonObjectForwarderTestCase
removeallmethods CPythonObjectForwarderTestCase
removeallclassmethods CPythonObjectForwarderTestCase
! ------------------- Class methods for CPythonObjectForwarderTestCase
! ------------------- Instance methods for CPythonObjectForwarderTestCase
category: 'Grail-Setup'
method: CPythonObjectForwarderTestCase
setUp

	super setUp.
	reModule := self track: (pythonLibrary importModule: 're').
%
category: 'Grail-Helpers'
method: CPythonObjectForwarderTestCase
compilePatternFor: aString

	| compileFunction pythonString pythonPattern |
	compileFunction := self track: (reModule getAttribute: 'compile').
	pythonString := self track: (CPythonObject fromString: aString).
	pythonPattern := self track: (compileFunction callWithArguments: { pythonString }).

	^ PythonReplicator new pythonToGemStone: pythonPattern
%
category: 'Tests - Compile returns forwarder'
method: CPythonObjectForwarderTestCase
testCompileReturnsForwarder

	| pattern |
	pattern := self compilePatternFor: 'x'.

	self assert: (pattern isKindOf: CPythonObjectForwarder).
%
category: 'Tests - Pattern search'
method: CPythonObjectForwarderTestCase
testSearchReturnsMatchForwarder
	"Uses @env1: so the env-aware DNU fires."

	| pattern match |
	pattern := self compilePatternFor: 'x'.

	match := pattern @env1:search: 'xy'.

	self assert: (match isKindOf: CPythonObjectForwarder).
	self assert: match @env1:group equals: 'x'
%
category: 'Tests - Pattern search'
method: CPythonObjectForwarderTestCase
testMatchOfNoMatchReturnsNone
	"Python None maps to the Grail None singleton, not nil and not a forwarder."

	| pattern match |
	pattern := self compilePatternFor: 'x'.

	match := pattern @env1:match: 'no-x-at-front'.

	self assert: match == None
%
category: 'Tests - Identity'
method: CPythonObjectForwarderTestCase
testForwarderIdentityIsCached
	"Same PyObject* address yields the same forwarder instance."

	| pattern sameForwarder |
	pattern := self compilePatternFor: 'x'.

	sameForwarder := PythonReplicator forwarderFor: pattern cpythonObject.

	self assert: pattern == sameForwarder
%
category: 'Tests - NamedIntConstant arg'
method: CPythonObjectForwarderTestCase
testNamedIntConstantUnboxesThroughIndex
	"PEP 357: env-1 __index__ unboxes to a Python int.
	NamedIntConstant (from re._constants) is the concrete case."

	| namedConstant asPythonInt |
	namedConstant := NamedIntConstant value: 16 name: 'LITERAL'.

	asPythonInt := self track: (PythonReplicator new gemStoneToPython: namedConstant).

	self assert: asPythonInt asInteger equals: 16
%
category: 'Tests - Generic call protocol'
method: CPythonObjectForwarderTestCase
testCallableForwarderInvokedThroughGenericProtocol
	"'f = pat.search; f('xy')': a callable forwarder obtained as a bare
	attribute and then called routes through ___pyCallValue___:kw:, not
	the fused recv.attr(args) DNU branch.  Must dispatch to the call, not
	raise 'object is not callable'."

	| pattern searchFunction match |
	pattern := self compilePatternFor: 'x'.
	searchFunction := pattern @env1:___pyAttrLoad___: #search.
	self assert: searchFunction isCallable.

	match := searchFunction @env1:___pyCallValue___: { 'xy' } kw: nil.

	self assert: (match isKindOf: CPythonObjectForwarder).
	self assert: match @env1:group equals: 'x'
%
category: 'Tests - Generic call protocol'
method: CPythonObjectForwarderTestCase
testForwarderCallThroughPerformEnv
	"Explicit perform:env:withArguments: lands in cantPerform:withArguments:env:,
	which must mirror DNU so the CPython dispatch still fires."

	| pattern match |
	pattern := self compilePatternFor: 'x'.

	match := pattern perform: #'search:' env: 1 withArguments: { 'xy' }.

	self assert: (match isKindOf: CPythonObjectForwarder).
	self assert: match @env1:group equals: 'x'
%
category: 'Tests - Python protocol'
method: CPythonObjectForwarderTestCase
testReprForwardsToUnderlyingObject
	"repr(forwarder) reflects the wrapped PyObject, not the Smalltalk
	forwarder class."

	| pattern repr |
	pattern := self compilePatternFor: 'x'.

	repr := pattern @env1:__repr__.

	self deny: (repr includesString: 'CPythonObjectForwarder').
	self assert: (repr includesString: 'x')
%
category: 'Tests - Python protocol'
method: CPythonObjectForwarderTestCase
testClassForwardsToPythonType
	"type(forwarder) is the underlying Python type, not the Smalltalk class."

	| pattern type |
	pattern := self compilePatternFor: 'x'.

	type := pattern @env1:__class__.

	self deny: (type == CPythonObjectForwarder).
	self assert: (type isKindOf: CPythonObjectForwarder)
%
category: 'Tests - Python protocol'
method: CPythonObjectForwarderTestCase
testHashForwardsToUnderlyingObject
	"hash(forwarder) forwards to the PyObject; equal compiled patterns of
	the cached forwarder hash to the wrapped object's hash."

	| pattern expected |
	pattern := self compilePatternFor: 'x'.

	expected := (self track: (pattern cpythonObject send: '__hash__' withArguments: #())) asInteger.

	self assert: pattern @env1:__hash__ equals: expected
%
