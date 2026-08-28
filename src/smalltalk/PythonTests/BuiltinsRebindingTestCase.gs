! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'BuiltinsRebindingTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
BuiltinsRebindingTestCase comment:
'Runtime rebinding of builtins, honoured by compiled call sites.

``len(x)'' compiles to a direct Smalltalk send on the builtins singleton,
so ``builtins.len = fake'' used to be invisible.  The repair is
STORE-side: builtins >> ___pyAttrStore___:put: (and the delete) sync the
compiled selector surface -- the first override captures the original
method sources and compiles forwarders reading the dynamic slot at call
time, storing the original back (recognised as the BoundMethod the read
path caches) recompiles them.  The rare rebinder pays; ordinary calls
stay direct sends.  First-class reads route through
___globalAt___:otherwise:, gaining override-awareness AND stable
identity (``len is len'' was False before -- a fresh BoundMethod per
read).  A doit compiled against caller-provided globals treats a seeded
builtin name as shadowed (the ___pythonBindingShadows___: doit clause).

Decided boundaries in docs/Issues.md: per-module globals()-store
shadowing and live dict-subclass doit globals stay unemulated.
test_dynamic went 7 -> 3, the rest decided/documented.

See tests/python/builtins_rebinding.py (15 checks, CPython-validated
first).'
%

expectvalue /Class
doit
BuiltinsRebindingTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
BuiltinsRebindingTestCase removeAllMethods: 0.
BuiltinsRebindingTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: BuiltinsRebindingTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'builtins_rebinding' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtins_rebinding.py')
		name: 'builtins_rebinding'.
%

category: 'Grail-Helpers'
method: BuiltinsRebindingTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: BuiltinsRebindingTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: BuiltinsRebindingTestCase
testRebindingReachesCompiledCallSites
	"The forwarder path: rebind seen by calls, by a mid-flight generator,
	by a leaf function's second rebinding -- and unwound on restore."

	self assertAll: #('baseline' 'call_sees_rebind' 'attribute_read_sees_rebind'
		'restore' 'generator_first' 'generator_sees_rebind_mid_flight'
		'restore_after_generator' 'leaf_function_percolates'
		'restore_after_leaf' 'call_back_to_original')
%

category: 'Grail-Tests'
method: BuiltinsRebindingTestCase
testFirstClassReadsAndDoitGlobals
	"Stable identity, override-aware reads whose capture survives restore,
	and eval against caller-provided globals shadowing the builtin."

	self assertAll: #('identity_stable' 'first_class_read_sees_override'
		'first_class_capture_survives_restore' 'eval_custom_globals_shadow'
		'eval_plain_globals_still_builtin')
%
